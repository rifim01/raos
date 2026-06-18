// src/app/api/queue/transition/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(req: NextRequest) {
  try {
    const supabase = await createClient();
    
    // 1. Validasi Sesi Pengguna
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Sesi tidak valid atau kedaluwarsa" }, { status: 401 });
    }

    // 2. Ekstraksi Profil & Validasi Role
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, airport_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profil otorisasi tidak ditemukan" }, { status: 403 });
    }

    const { queueId, transitionTo } = await req.json();
    if (!queueId || !transitionTo) {
      return NextResponse.json({ error: "Payload parameter tidak lengkap" }, { status: 400 });
    }

    // 3. Ambil data antrean untuk verifikasi perimeter bandara
    const { data: targetQueue, error: queueFetchError } = await supabase
      .from("pickup_queues")
      .select("airport_id, status")
      .eq("id", queueId)
      .single();

    if (queueFetchError || !targetQueue) {
      return NextResponse.json({ error: "Data antrean tidak ditemukan" }, { status: 404 });
    }

    // Koordinator Bandara tidak boleh memanipulasi wilayah bandara lain
    if (profile.role === "AIRPORT_COORDINATOR" && profile.airport_id !== targetQueue.airport_id) {
      return NextResponse.json({ error: "Pelanggaran Perimeter Hak Akses Bandara" }, { status: 403 });
    }

    // 4. Mutasi Transisi Data Status Antrean
    const updatePayload: Record<string, any> = {
      status: transitionTo,
      updated_at: new Date().toISOString(),
    };

    if (["COMPLETED", "SUSPENDED", "NO_SHOW"].includes(transitionTo)) {
      updatePayload.position = -1;
    }

    const { data: updatedData, error: updateError } = await supabase
      .from("pickup_queues")
      .update(updatePayload)
      .eq("id", queueId)
      .select()
      .single();

    if (updateError) throw updateError;

    // 5. Otomasi Penataan Ulang Nomor Antrean Sisa (Rapatkan Posisi)
    if (["COMPLETED", "SUSPENDED", "NO_SHOW"].includes(transitionTo)) {
      const { data: remainingQueues } = await supabase
        .from("pickup_queues")
        .select("id")
        .eq("airport_id", targetQueue.airport_id)
        .in("status", ["WAITING", "CALLED", "PICKUP"])
        .order("position", { ascending: true });

      if (remainingQueues && remainingQueues.length > 0) {
        const runReordering = remainingQueues.map((item, index) =>
          supabase
            .from("pickup_queues")
            .update({ position: index + 1 })
            .eq("id", item.id)
        );
        await Promise.all(runReordering);
      }
    }

    return NextResponse.json({ success: true, updatedData });
  } catch (err: any) {
    return NextResponse.json({ error: "Internal Server Error", details: err.message }, { status: 500 });
  }
}
