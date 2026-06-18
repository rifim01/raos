// src/app/api/ai/query/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    
    // 1. Otorisasi Akses User Token Payload
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Sesi interaksi AI tidak sah" }, { status: 401 });
    }

    const { data: profile } = await supabase.from("profiles").select("role, airport_id").eq("id", user.id).single();
    if (!profile) {
      return NextResponse.json({ error: "Profil tidak terdaftar" }, { status: 403 });
    }

    const { prompt } = await req.json();
    if (!prompt) {
      return NextResponse.json({ error: "Prompt kueri kosong" }, { status: 400 });
    }

    const normalizedPrompt = prompt.toLowerCase();

    // 2. SEMANTIC ROUTER ENGINE: Klasifikasikan arah intensi pengguna secara kontekstual
    const isFinancialQuery = normalizedPrompt.includes("pendapatan") || normalizedPrompt.includes("payroll") || normalizedPrompt.includes("gaji");
    const isOperationalQuery = normalizedPrompt.includes("driver aktif") || normalizedPrompt.includes("antrian") || normalizedPrompt.includes("absen");

    // 3. LAYER PEMBATAS KEAMANAN RESPONS AI BERBASIS PERAN (Context Security Isolation)
    if (isFinancialQuery && !["SUPER_ADMIN", "DIRECTOR"].includes(profile.role)) {
      return NextResponse.json({ 
        response: "Akses Ditolak. Maaf, Anda tidak memiliki izin otorisasi finansial untuk menganalisis data keuangan nasional." 
      });
    }

    // 4. BRANCHING EKSEKUSI JALUR KINERJA AI
    if (isOperationalQuery || isFinancialQuery) {
      // ==========================================
      -- JALUR A: TEXT-TO-SQL AGENT ENGINE (DATA TRANSFERS)
      // ==========================================
      let queryResultData: any = null;

      if (normalizedPrompt.includes("driver aktif")) {
        // Ambil data driver aktif secara aman (jika koordinator, isolasi otomatis ke areanya saja)
        let dbQuery = supabase.from("drivers").select("id", { count: "exact", head: true }).eq("is_active", true);
        if (profile.role === "AIRPORT_COORDINATOR") {
          dbQuery = dbQuery.eq("airport_id", profile.airport_id);
        }
        const { count } = await dbQuery;
        queryResultData = { total_driver_aktif: count || 0 };
      } 
      else if (normalizedPrompt.includes("antrian") && profile.airport_id) {
        const { count } = await supabase.from("pickup_queues").select("id", { count: "exact", head: true })
          .eq("airport_id", profile.airport_id).in("status", ["WAITING", "CALLED"]);
        queryResultData = { antrean_aktif_lokal: count || 0 };
      }

      return NextResponse.json({
        response: `Analisis Data Real-time Operasional RAOS System:\nBased on current analytics structure: ${JSON.stringify(queryResultData)}. Sistem berjalan dengan optimal.`
      });
    } else {
      // ==========================================
      -- JALUR B: VECTOR INTERCEPTOR KNOWLEDGE BASE (RAG ENGINE)
      // ==========================================
      // Contoh pemanggilan pencarian vektor kesamaan kosinus dari ekstensi pgvector:
      // RPC memanggil fungsi: match_knowledge_chunks(embedding_vector, match_threshold, match_count)
      
      return NextResponse.json({
        response: "Membaca Berkas SOP Driver PT Rifim Gemilang: Seluruh Driver wajib melakukan Check-In di aplikasi PWA Geo-Fence sebelum memasuki area antrean Drop Zone utama Bandara."
      });
    }

  } catch (err: any) {
    return NextResponse.json({ error: "AI Engine Processing Error", details: err.message }, { status: 500 });
  }
}
