import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const openAiKey = process.env.OPENAI_API_KEY;

    if (!supabaseUrl || !supabaseServiceKey || !openAiKey) {
      return NextResponse.json({ error: "Environment variables tidak lengkap di Vercel" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const openai = new OpenAI({ apiKey: openAiKey });

    // 1. Bersihkan memori lama di tabel Supabase
    await supabase.from("company_knowledge").delete().neq("id", 0);

    // 2. Ambil berkas dari folder knowledge-base di Vercel
    const kbPath = path.join(process.cwd(), "knowledge-base");
    const folders = ["ai", "architecture", "company", "faq", "operational", "payroll", "sop"];
    let totalFilesSynced = 0;

    for (const folder of folders) {
      const dirPath = path.join(kbPath, folder);
      if (!fs.existsSync(dirPath)) continue;

      const files = fs.readdirSync(dirPath);
      for (const file of files) {
        if (!file.endsWith(".md")) continue;

        const filePath = path.join(dirPath, file);
        const content = fs.readFileSync(filePath, "utf-8");

        // Konversi dokumen teks menjadi koordinat Vector (Embedding)
        const embeddingResponse = await openai.embeddings.create({
          model: "text-embedding-3-small",
          input: content,
        });

        const [{ embedding }] = embeddingResponse.data;

        // Masukkan data vektor ke database Supabase
        await supabase.from("company_knowledge").insert({
          content,
          file_path: `${folder}/${file}`,
          embedding
        });

        totalFilesSynced++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `🎉 Sinkronisasi berhasil! Total ${totalFilesSynced} berkas knowledge-base telah masuk ke otak RIFIM AI.` 
    });

  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
