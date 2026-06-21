/**
 * AI Knowledge Upload — /api/ai/knowledge/upload
 *
 * Upload dokumen ke company_knowledge untuk digunakan AI Assistant.
 * Memerlukan role AIRPORT_COORDINATOR atau lebih tinggi.
 *
 * POST body: { title, content, category?, airport_id? }
 * GET       : list knowledge (difilter per airport jika bukan SUPER_ADMIN/DIRECTOR)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, hasMinRole } from "@/lib/auth";
import { createServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !hasMinRole(user, "AIRPORT_COORDINATOR")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  let query = supabase
    .from("company_knowledge")
    .select("id, title, file_path, created_at, airport_id")
    .order("created_at", { ascending: false })
    .limit(100);

  // Filter per airport untuk coordinator (bukan director/super_admin)
  if (!hasMinRole(user, "DIRECTOR") && user.airport_id) {
    query = query.or(`airport_id.eq.${user.airport_id},airport_id.is.null`);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ knowledge: data ?? [] });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !hasMinRole(user, "AIRPORT_COORDINATOR")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    title: string;
    content: string;
    category?: string;
    airport_id?: string | null;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.title?.trim() || !body.content?.trim()) {
    return NextResponse.json({ error: "title dan content wajib diisi" }, { status: 400 });
  }

  // Koordinator hanya bisa upload untuk airport sendiri
  const airportId = hasMinRole(user, "DIRECTOR")
    ? (body.airport_id ?? null)
    : user.airport_id ?? null;

  // Buat file_path unik: category/timestamp-title-slug
  const slug     = body.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60);
  const category = body.category?.trim() || "general";
  const filePath = `${category}/${Date.now()}-${slug}.txt`;

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("company_knowledge")
    .insert({
      title:      body.title.trim(),
      content:    body.content.trim(),
      file_path:  filePath,
      airport_id: airportId,
    })
    .select("id, title, file_path, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, knowledge: data }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !hasMinRole(user, "DIRECTOR")) {
    return NextResponse.json({ error: "Unauthorized — hanya Director ke atas" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const supabase = createServiceClient();
  const { error } = await supabase.from("company_knowledge").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
