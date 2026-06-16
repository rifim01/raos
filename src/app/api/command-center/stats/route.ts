import { NextResponse } from "next/server";
import { getCurrentUser, hasMinRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !hasMinRole(user, "DIRECTOR"))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClient();
  const [{ data: stats }, { data: alerts }] = await Promise.all([
    (supabase as any).from("vw_command_center_per_airport").select("*").order("airport_code"),
    (supabase as any)
      .from("notifications")
      .select("id, title, message, type, is_read, created_at, airport_id, data, airports(code, city)")
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  return NextResponse.json({ stats: stats ?? [], alerts: alerts ?? [] });
}
