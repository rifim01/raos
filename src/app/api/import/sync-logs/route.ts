import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data, error } = await (supabase as any)
    .from("sync_logs")
    .select("id, triggered_by, started_at, finished_at, status, total_imported, total_skipped, total_failed, details, error_message")
    .order("started_at", { ascending: false })
    .limit(20);
  if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, data });
}
