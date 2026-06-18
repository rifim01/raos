import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
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

// Mesin Pencari Relevansi Pintar - Kebal Typo & Dioptimalkan untuk Batasan Groq TPM
export async function searchKnowledge(
  query: string,
  airportId: string | null,
  roleLevel: number
): Promise<string> {
  if (!query?.trim()) return "";

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    const supabaseAdmin = createAdminClient(supabaseUrl, supabaseServiceKey);

    // 1. Tarik seluruh dokumen internal dari database via Jalur Admin (Bypass RLS)
    const { data: allKnowledge, error } = await supabaseAdmin
      .from("company_knowledge")
      .select("content, file_path");

    if (error || !allKnowledge || allKnowledge.length === 0) return "";

    // 2. Normalisasi string pertanyaan dan pecah menjadi array kata pencari
    const cleanQuery = query.toLowerCase().replace(/[?.,\/#!$%\^&\*;:{}=\-_`~()]/g, " ");
    const words = cleanQuery.split(/\s+/).filter(w => w.length > 1);

    if (words.length === 0) return "";

    // 3. Lakukan kalkulasi pembobotan nilai kecocokan teks
    const scoredDocs = allKnowledge.map((doc: any) => {
      const contentLower = (doc.content || "").toLowerCase();
      const filePathLower = (doc.file_path || "").toLowerCase();
      let score = 0;

      words.forEach(word => {
        // Logika Toleransi Typo: Petakan variasi kata kunci populer ke kata asli dokumen
        const targetWords = [word];
        if (word === "profile" || word === "pofile") targetWords.push("profil");
        if (word === "sopir" || word === "pengemudi") targetWords.push("driver");
        if (word === "gaji") targetWords.push("payroll");

        targetWords.forEach(tWord => {
          // Bonus Skor Utama (+30 poin) jika kata kunci tertera di nama berkas
          if (filePathLower.includes(tWord)) score += 30;
          
          // Tambah Skor Frekuensi (+2 poin per kata) untuk setiap kata yang cocok di dalam isi dokumen
          const escapedWord = tWord.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
          const matches = contentLower.match(new RegExp(escapedWord, "g"));
          if (matches) score += matches.length * 2;
        });
      });

      return { ...doc, score };
    });

    // 4. Saring berkas valid, urutkan dari skor tertinggi, ambil 2 dokumen terbaik
    const bestDocs = scoredDocs
      .filter((doc: any) => doc.score > 0)
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, 2);

    if (bestDocs.length === 0) return "";

    // 5. Satukan potongan referensi dan batasi ketat pada 2500 karakter agar aman dari limitasi Groq
    const contextText = bestDocs
      .map((doc: any) => doc.content)
      .join("\n\n")
      .substring(0, 2500);

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
