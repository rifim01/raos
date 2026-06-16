import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, hasMinRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !hasMinRole(user, "AIRPORT_COORDINATOR"))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const ids: string[] = Array.isArray(body.ids) ? body.ids : [];
  if (!ids.length) return NextResponse.json({ ok: true });

  const supabase = await createClient();
  await (supabase as any)
    .from("notifications")
    .update({ is_read: true })
    .in("id", ids);

  return NextResponse.json({ ok: true });
}
