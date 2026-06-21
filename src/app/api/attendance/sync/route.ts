import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

const AIRPORT_CODES: Record<string, string> = {
  BPN001: "0e1de633-5de2-458c-bd3e-b83cb35517bd",
  BTH001: "1325804e-8dd5-458e-a782-80a231a09303",
  DJB001: "2669bd67-290d-4aa1-805f-540951592b2a",
  MDC001: "0587c176-e85f-4c7b-a2be-0e255e158612",
  PKU001: "60be8461-09f3-4f2f-b50e-ff715f91f2f4",
  UPG001: "3528d0a3-ba4d-43d7-a91e-40786efaae48",
  CGK001: "e7c34a55-86d7-4693-a02e-7b4426420ad8",
  BATAM: "1325804e-8dd5-458e-a782-80a231a09303",
  JAMBI: "2669bd67-290d-4aa1-805f-540951592b2a",
  MAKASSAR: "3528d0a3-ba4d-43d7-a91e-40786efaae48",
  BALIKPAPAN: "0e1de633-5de2-458c-bd3e-b83cb35517bd",
  MANADO: "0587c176-e85f-4c7b-a2be-0e255e158612",
  PEKANBARU: "60be8461-09f3-4f2f-b50e-ff715f91f2f4",
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Sync-Key, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: NextRequest) {
  // Verify sync key (rifim-attendance sends this in X-Sync-Key header)
  const syncKey =
    req.headers.get("x-sync-key") ??
    req.headers.get("authorization")?.replace("Bearer ", "");

  if (syncKey !== process.env.ATTENDANCE_SYNC_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS_HEADERS });
  }

  let body: {
    staff_code?: string;
    nama?: string;
    airport_code: string;
    check_type: "CHECK_IN" | "CHECK_OUT";
    latitude?: number;
    longitude?: number;
    photo_url?: string;
    device_info?: string;
    notes?: string;
    tanggal?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers: CORS_HEADERS });
  }

  const { airport_code, check_type, latitude, longitude, photo_url, device_info, notes, tanggal } = body;

  if (!airport_code || !check_type) {
    return NextResponse.json(
      { error: "airport_code and check_type are required" },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const airportId = AIRPORT_CODES[airport_code.toUpperCase()];
  if (!airportId) {
    return NextResponse.json(
      { error: `Airport tidak dikenal: ${airport_code}` },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  const supabase = createServiceClient();

  // Lookup staff by staff_code or nama within this airport
  let staffId: string | null = null;

  if (body.staff_code) {
    const { data } = await supabase
      .from("staff")
      .select("id")
      .eq("airport_id", airportId)
      .eq("staff_code", body.staff_code)
      .maybeSingle();
    staffId = data?.id ?? null;
  }

  // Fallback: lookup by nama
  if (!staffId && body.nama) {
    const { data } = await supabase
      .from("staff")
      .select("id")
      .eq("airport_id", airportId)
      .ilike("nama", body.nama.trim())
      .maybeSingle();
    staffId = data?.id ?? null;
  }

  if (!staffId) {
    return NextResponse.json(
      { error: "Staff tidak ditemukan. Pastikan staff_code atau nama sudah terdaftar di RAOS." },
      { status: 404, headers: CORS_HEADERS }
    );
  }

  const { data, error } = await supabase
    .from("attendance")
    .insert({
      staff_id: staffId,
      airport_id: airportId,
      tanggal: tanggal ?? new Date().toISOString().split("T")[0],
      check_type,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      photo_url: photo_url ?? null,
      device_info: device_info ?? null,
      notes: notes ?? null,
    })
    .select("id, check_type, created_at, distance_status")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: CORS_HEADERS });
  }

  return NextResponse.json(
    { success: true, id: data.id, check_type: data.check_type, distance_status: data.distance_status },
    { headers: CORS_HEADERS }
  );
}
