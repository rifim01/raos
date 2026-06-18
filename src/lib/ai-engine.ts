import { createClient } from "@/lib/supabase/server";
import OpenAI from "openai";

// Lazy init — prevents OpenAI SDK from throwing at Next.js build time when GROQ_API_KEY is absent
let _groq: OpenAI | null = null;
export function getGroqClient(): OpenAI {
  if (!_groq) {
    _groq = new OpenAI({
      apiKey: process.env.GROQ_API_KEY || "not-configured",
      baseURL: "https://api.groq.com/openai/v1",
    });
  }
  return _groq;
}

export interface AIMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AiConversationRow {
  id: string;
  question: string;
  answer: string;
  created_at: string;
  model: string;
}

// Detect what live operational data to fetch based on the question
export function detectIntent(query: string): string[] {
  const q = query.toLowerCase();
  const intents: string[] = [];
  if (/driver|sopir|pengemudi/.test(q)) intents.push("driver");
  if (/absen|hadir|kehadiran|masuk/.test(q)) intents.push("attendance");
  if (/antrian|queue|waiting|panggil|pickup|antri/.test(q)) intents.push("queue");
  if (/payroll|gaji|upah|slip|lembur|kasbon|insentif/.test(q)) intents.push("payroll");
  if (/keuangan|pendapatan|income|revenue|tagihan|transaksi|profit|pemasukan/.test(q)) intents.push("finance");
  return intents;
}

// Smart Scoring & Token Guard Search - Dioptimalkan untuk Groq 6000 TPM Limit
export async function searchKnowledge(
  query: string,
  airportId: string | null,
  roleLevel: number
): Promise<string> {
  if (!query?.trim()) return "";

  try {
    const supabase = await createClient();

    // 1. Tarik data dari tabel basis pengetahuan
    const { data: allKnowledge, error } = await (supabase as any)
      .from("company_knowledge")
      .select("content, file_path");

    if (error || !allKnowledge || allKnowledge.length === 0) return "";

    // 2. Daftar kata eliminasi (Stop Words) agar pencarian fokus pada inti pertanyaan
    const stopWords = new Set([
      "siapa", "apa", "bagaimana", "mengapa", "kapan", "yang", 
      "dan", "di", "ke", "dari", "untuk", "adalah", "tentang", 
      "rifim", "raos", "pt", "saya", "kamu", "bisa", "tolong"
    ]);

    const cleanQuery = query.toLowerCase().replace(/[?.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
    const keywords = cleanQuery.split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w));

    if (keywords.length === 0) return "";

    // 3. Hitung bobot relevansi kecocokan kata kunci pada tiap dokumen
    const scoredDocs = allKnowledge.map((doc: any) => {
      const contentLower = (doc.content || "").toLowerCase();
      const filePathLower = (doc.file_path || "").toLowerCase();
      
      let score = 0;
      keywords.forEach(word => {
        // Berikan bonus skor besar jika kata kunci ada di judul/jalur file
        if (filePathLower.includes(word)) score += 10;
        
        // Hitung frekuensi kemunculan kata kunci di dalam isi teks dokumen
        const matches = contentLower.match(new RegExp(word, "g"));
        if (matches) score += matches.length;
      });

      return { ...doc, score };
    });

    // 4. Saring dokumen bernilai, urutkan dari yang paling relevan, ambil maksimal 2 file saja
    // Perbaikan Eksplisit Tipe Data (doc: any), (a: any), dan (b: any) untuk meloloskan Vercel Build Checker
    const bestDocs = scoredDocs
      .filter((doc: any) => doc.score > 0)
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 2);

    // 5. Gabungkan isi dokumen dan batasi panjang teks maksimal 1800 karakter agar aman dari limitasi Groq
    const contextText = bestDocs
      .map((doc: any) => {
        if (doc.content.length > 1800) {
          return doc.content.substring(0, 1800) + "\n...(Teks dipotong demi efisiensi sistem)";
        }
        return doc.content;
      })
      .join("\n\n");

    return contextText;
  } catch (err) {
    console.error("[RIFIM AI] Kendala pada searchKnowledge engine:", err);
    return "";
  }
}

// Fetch live operational data per detected intent
export async function fetchLiveData(
  intents: string[],
  airportId: string | null,
  roleLevel: number
): Promise<string> {
  if (!intents.length) return "";
  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];
  const now = new Date();
  const parts: string[] = [];

  for (const intent of intents) {
    if (intent === "driver") {
      const { data } = await (supabase as any)
        .from("drivers")
        .select("status, airports(city)");
      if (data) {
        const map: Record<string, Record<string, number>> = {};
        for (const d of data) {
          const city = (d.airports as any)?.city ?? "N/A";
          if (!map[city]) map[city] = {};
          map[city][d.status] = (map[city][d.status] || 0) + 1;
        }
        const totalOnline = data.filter((d: any) => ["ACTIVE", "ON_DUTY"].includes(d.status)).length;
        const lines = Object.entries(map)
          .map(([city, st]) => `  ${city}: ${Object.entries(st).map(([s, n]) => `${s}=${n}`).join(", ")}`)
          .join("\n");
        parts.push(`DATA DRIVER (Total online: ${totalOnline}):\n${lines}`);
      }
    }

    if (intent === "attendance") {
      let q = (supabase as any)
        .from("attendance")
        .select("check_type, airports(city)")
        .eq("tanggal", today);
      if (roleLevel < 4 && airportId) q = q.eq("airport_id", airportId);
      const { data } = await q;
      if (data) {
        const map: Record<string, { ci: number; co: number }> = {};
        for (const a of data) {
          const city = (a.airports as any)?.city ?? "N/A";
          if (!map[city]) map[city] = { ci: 0, co: 0 };
          if (a.check_type === "CHECK_IN") map[city].ci++;
          else map[city].co++;
        }
        const lines = Object.entries(map)
          .map(([city, s]) => `  ${city}: ${s.ci} check-in, ${s.co} check-out`)
          .join("\n");
        parts.push(`DATA ABSENSI HARI INI (${today}):\n${lines || "  Belum ada data"}`);
      }
    }

    if (intent === "queue") {
      let q = (supabase as any)
        .from("pickup_queues")
        .select("status, airports(city)")
        .eq("tanggal", today);
      if (roleLevel < 4 && airportId) q = q.eq("airport_id", airportId);
      const { data } = await q;
      if (data) {
        const map: Record<string, Record<string, number>> = {};
        for (const item of data) {
          const city = (item.airports as any)?.city ?? "N/A";
          if (!map[city]) map[city] = {};
          map[city][item.status] = (map[city][item.status] || 0) + 1;
        }
        const lines = Object.entries(map)
          .map(([city, st]) => `  ${city}: ${Object.entries(st).map(([s, n]) => `${s}=${n}`).join(", ")}`)
          .join("\n");
        parts.push(`DATA ANTRIAN HARI INI (${today}):\n${lines || "  Antrian kosong"}`);
      }
    }

    if (intent === "payroll") {
      const bulan = now.getMonth() + 1;
      const tahun = now.getFullYear();
      let q = (supabase as any)
        .from("payroll")
        .select("status, gaji_bersih, airports(city)")
        .eq("bulan", bulan)
        .eq("tahun", tahun);
      if (roleLevel < 4 && airportId) q = q.eq("airport_id", airportId);
      const { data } = await q;
      if (data) {
        const total = data.reduce((s: number, p: any) => s + Number(p.gaji_bersih || 0), 0);
        const byStatus: Record<string, number> = {};
        for (const p of data) byStatus[p.status] = (byStatus[p.status] || 0) + 1;
        parts.push(
          `DATA PAYROLL ${bulan}/${tahun}:\n  ${data.length} record, Total: Rp ${total.toLocaleString("id-ID")}\n  Status: ${Object.entries(byStatus).map(([s, n]) => `${s}=${n}`).join(", ")}`
        );
      }
    }

    if (intent === "finance") {
      const bulanStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      let q = (supabase as any)
        .from("finance_transactions")
        .select("jenis, nominal, airports(city)")
        .gte("tanggal", `${bulanStr}-01`);
      if (roleLevel < 4 && airportId) q = q.eq("airport_id", airportId);
      const { data } = await q;
      if (data) {
        let masuk = 0,
          keluar = 0;
        for (const t of data) {
          if (t.jenis === "PEMASUKAN") masuk += Number(t.nominal || 0);
          else keluar += Number(t.nominal || 0);
        }
        parts.push(
          `DATA KEUANGAN BULAN INI:\n  Pemasukan: Rp ${masuk.toLocaleString("id-ID")}\n  Pengeluaran: Rp ${keluar.toLocaleString("id-ID")}\n  Net: Rp ${(masuk - keluar).toLocaleString("id-ID")}`
        );
      }
    }
  }

  return parts.join("\n\n");
}

// Persist conversation to DB
export async function saveConversation(
  userId: string,
  airportId: string | null,
  question: string,
  answer: string,
  tokensUsed: number
) {
  const supabase = await createClient();
  await (supabase as any).from("ai_conversations").insert({
    user_id: userId,
    airport_id: airportId,
    question,
    answer,
    tokens_used: tokensUsed,
    model: "groq/llama-3.1-8b-instant",
    context_chunks: [],
  });
}

// Load recent conversation history for a user
export async function getAIHistory(userId: string, limit = 30): Promise<AiConversationRow[]> {
  const supabase = await createClient();
  const { data } = await (supabase as any)
    .from("ai_conversations")
    .select("id, question, answer, created_at, model")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as AiConversationRow[]) ?? [];
}
