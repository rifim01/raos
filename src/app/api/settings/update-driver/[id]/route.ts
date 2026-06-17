import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, hasMinRole } from "@/lib/auth";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const actor = await getCurrentUser();
  if (!actor || !hasMinRole(actor, "AIRPORT_COORDINATOR")) {
    return NextResponse.json({ error: "Tidak ada akses" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();

  const allowed = ["nama", "driver_code", "nomor_hp", "driver_type", "status"];
  const updates: Record<string, string> = {};
  for (const key of allowed) {
    if (key in body) updates[key] = body[key];
  }
  if (!Object.keys(updates).length) {
    return NextResponse.json({ error: "Tidak ada field yang diubah" }, { status: 400 });
  }

  const supabase = await createClient();
  const { error } = await (supabase as any).from("drivers").update(updates).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
