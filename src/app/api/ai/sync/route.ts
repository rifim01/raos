import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ error: "Environment variables Supabase belum lengkap di Vercel" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Bersihkan data lama di database
    await supabase.from("company_knowledge").delete().neq("id", 0);

    // 2. Baca seluruh folder dokumen lokal
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

        // 3. Langsung simpan teks ke Supabase (Proses instan & tanpa biaya token)
        await supabase.from("company_knowledge").insert({
          content,
          file_path: `${folder}/${file}`
        });

        totalFilesSynced++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `🎉 Murni Groq Engine: Sukses menyelaraskan ${totalFilesSynced} berkas ke database RAOS.` 
    });

  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
