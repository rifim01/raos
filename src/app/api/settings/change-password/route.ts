import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser, hasMinRole } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const actor = await getCurrentUser();
  if (!actor) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { target_auth_user_id, new_password, current_password } = await req.json();

  if (!new_password || new_password.length < 6) {
    return NextResponse.json({ error: "Password minimal 6 karakter" }, { status: 400 });
  }

  /* Ganti password sendiri */
  if (!target_auth_user_id || target_auth_user_id === actor.auth_user_id) {
    if (!current_password) {
      return NextResponse.json({ error: "Password saat ini diperlukan" }, { status: 400 });
    }
    const supabase = await createClient();
    /* re-auth check */
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: actor.email ?? "",
      password: current_password,
    });
    if (signInErr) return NextResponse.json({ error: "Password saat ini salah" }, { status: 400 });

    const { error } = await supabase.auth.updateUser({ password: new_password });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  }

  /* Ganti password user lain — butuh min AIRPORT_COORDINATOR */
  if (!hasMinRole(actor, "AIRPORT_COORDINATOR")) {
    return NextResponse.json({ error: "Tidak ada akses" }, { status: 403 });
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(target_auth_user_id, {
    password: new_password,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
