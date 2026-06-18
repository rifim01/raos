// scripts/sync-knowledge.ts
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import { OpenAI } from "openai"; // Atau SDK embedding pilihan kamu

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function syncKnowledgeBase() {
  console.log("⏳ Memulai sinkronisasi otomatis Knowledge Base ke Supabase...");
  
  // Kosongkan data lama di tabel agar segar
  await supabase.from("company_knowledge").delete().neq("id", 0);

  const kbPath = path.join(process.cwd(), "knowledge-base");
  const folders = ["ai", "architecture", "company", "faq", "operational", "payroll", "sop"];

  for (const folder of folders) {
    const dirPath = path.join(kbPath, folder);
    if (!fs.existsSync(dirPath)) continue;

    const files = fs.readdirSync(dirPath);
    for (const file of files) {
      if (!file.endsWith(".md")) continue;

      const filePath = path.join(dirPath, file);
      const content = fs.readFileSync(filePath, "utf-8");

      // Generate koordinat pintar (Embedding) lewat AI
      const embeddingResponse = await openai.embeddings.create({
        model: "text-embedding-3-small",
        input: content,
      });

      const [{ embedding }] = embeddingResponse.data;

      // Masukkan ke database Supabase
      await supabase.from("company_knowledge").insert({
        content,
        file_path: `${folder}/${file}`,
        embedding
      });
      
      console.log(`✅ File ${folder}/${file} berhasil di-index ke Supabase!`);
    }
  }
  console.log("🎉 Sinkronisasi Selesai! Otak RIFIM AI sekarang sudah update.");
}

syncKnowledgeBase();
