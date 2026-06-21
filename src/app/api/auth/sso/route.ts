/**
 * SSO Bridge — /api/auth/sso
 *
 * Flow:
 *   1. User sudah login di RAOS
 *   2. Buka ?redirect_to=https://radms-dashboard.vercel.app/sso-callback
 *   3. Endpoint baca session, redirect ke target dengan token di URL
 *   4. Target app panggil supabase.auth.setSession() lalu redirect ke home
 *
 * Query params:
 *   redirect_to  — URL tujuan (wajib, harus dalam ALLOWED_ORIGINS)
 *   app          — "radms" | "attendance" (opsional, untuk logging)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_ORIGINS = [
  "https://radms-dashboard.vercel.app",
  "https://rifim01.github.io",
  "https://raos-ten.vercel.app",
  // Local dev
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:4173",
];

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const redirectTo = searchParams.get("redirect_to");

  if (!redirectTo) {
    return NextResponse.json({ error: "redirect_to required" }, { status: 400 });
  }

  // Validate origin to prevent open redirect
  let targetUrl: URL;
  try {
    targetUrl = new URL(redirectTo);
  } catch {
    return NextResponse.json({ error: "Invalid redirect_to URL" }, { status: 400 });
  }

  const originAllowed = ALLOWED_ORIGINS.some(
    (o) => targetUrl.origin === new URL(o).origin
  );
  if (!originAllowed) {
    return NextResponse.json({ error: "Redirect target not allowed" }, { status: 403 });
  }

  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    // Not logged in — send to RAOS login with SSO continue param
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect_to", `/api/auth/sso?redirect_to=${encodeURIComponent(redirectTo)}`);
    return NextResponse.redirect(loginUrl);
  }

  // Append tokens to target URL
  targetUrl.searchParams.set("access_token",  session.access_token);
  targetUrl.searchParams.set("refresh_token", session.refresh_token);
  targetUrl.searchParams.set("expires_at",    String(session.expires_at ?? ""));
  targetUrl.searchParams.set("sso_source",    "raos");

  return NextResponse.redirect(targetUrl.toString());
}
