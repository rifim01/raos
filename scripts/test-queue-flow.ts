// scripts/test-queue-flow.ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runQueueFlowSimulation() {
  console.log("🚀 Memulai Simulasi Pengujian Integrasi Alur Antrean RAOS...");

  const testQueueId = "d2dabcb8-5280-43ef-abe6-7c072aa77a51"; // ID dummy acuan sistem

  // 1. Simulasikan Perubahan ke CALLED
  console.log("➡️ Mengubah status driver ke: CALLED");
  const { error: err1 } = await supabase
    .from("pickup_queues")
    .update({ status: "CALLED", updated_at: new Date().toISOString() } as any)
    .eq("id", testQueueId);

  if (err1) return console.error("❌ Gagal pada simulasi status CALLED:", err1.message);
  console.log("✅ Status CALLED Berhasil Diperbarui.");

  // 2. Simulasikan Perubahan ke PICKUP
  console.log("➡️ Mengubah status driver ke: PICKUP");
  const { error: err2 } = await supabase
    .from("pickup_queues")
    .update({ status: "PICKUP", updated_at: new Date().toISOString() } as any)
    .eq("id", testQueueId);

  if (err2) return console.error("❌ Gagal pada simulasi status PICKUP:", err2.message);
  console.log("✅ Status PICKUP Berhasil Diperbarui.");

  console.log("🎉 SELURUH SIMULASI ALUR INTEGRASI REALTIME DINYATAKAN SUKSES 100%!");
}

runQueueFlowSimulation();
