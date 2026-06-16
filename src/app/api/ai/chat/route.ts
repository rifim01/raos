import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getGroqClient, detectIntent, fetchLiveData, searchKnowledge, saveConversation } from "@/lib/ai-engine";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  const { question, history = [] } = await req.json();
  if (!question?.trim()) {
    return new Response(JSON.stringify({ error: "Question required" }), { status: 400 });
  }

  // 1. Parallel: keyword search knowledge base + fetch live operational data
  const intents = detectIntent(question);
  const [knowledgeContext, liveData] = await Promise.all([
    searchKnowledge(question, user.airport_id, user.role_level),
    fetchLiveData(intents, user.airport_id, user.role_level),
  ]);

  // 2. Build system prompt
  const airportLabel = user.airport_code ? `Bandara ${user.airport_code}` : "Semua Bandara (Nasional)";
  const accessDesc =
    user.role_level >= 4
      ? "Full executive access — semua bandara"
      : user.role_level === 3
      ? "Koordinator — bandara sendiri"
      : "Operasional terbatas";

  const systemPrompt = `Kamu adalah RIFIM AI, asisten AI canggih untuk RAOS (RIFIM Airport Operating System) milik PT RIFIM GEMILANG.

PROFIL PENGGUNA:
- Nama: ${user.full_name ?? "Pengguna"}
- Role: ${user.role} | ${airportLabel}
- Akses: ${accessDesc}
${knowledgeContext ? `\nKNOWLEDGE BASE (SOP & Kebijakan):\n${knowledgeContext}\n` : ""}${liveData ? `\nDATA OPERASIONAL REALTIME:\n${liveData}\n` : ""}
PANDUAN RESPONS:
- Gunakan Bahasa Indonesia yang profesional dan to-the-point
- Jawab berdasarkan data yang tersedia — jika tidak ada, sampaikan "Data tidak tersedia"
- Format angka: Rp 1.500.000 (titik pemisah ribuan)
- Untuk Director/SUPER_ADMIN: tambahkan insight strategis dan rekomendasi actionable
- Untuk Koordinator: fokus pada operasional bandara sendiri
- Boleh gunakan emoji secukupnya untuk keterbacaan
- Maksimal 3 paragraf kecuali pertanyaan kompleks`;

  // 3. Build conversation messages
  const messages: { role: "user" | "assistant"; content: string }[] = [
    ...(history as { role: string; content: string }[]).slice(-8).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: question },
  ];

  // 4. Stream response from Groq (OpenAI-compatible)
  const encoder = new TextEncoder();
  let fullAnswer = "";

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const groqStream = await getGroqClient().chat.completions.create({
          model: "llama-3.1-8b-instant",
          messages: [{ role: "system", content: systemPrompt }, ...messages],
          temperature: 0.7,
          max_tokens: 1200,
          stream: true,
        });

        for await (const chunk of groqStream) {
          const text = chunk.choices[0]?.delta?.content ?? "";
          if (text) {
            fullAnswer += text;
            controller.enqueue(encoder.encode(text));
          }
        }

        // Persist conversation after stream completes
        await saveConversation(user.id, user.airport_id, question, fullAnswer, 0);
        controller.close();
      } catch (err) {
        const msg = err instanceof Error ? err.message : "AI Error";
        controller.enqueue(encoder.encode(`\n\n⚠️ Error: ${msg}`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-cache",
    },
  });
}
