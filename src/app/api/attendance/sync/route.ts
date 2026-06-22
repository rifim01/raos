import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

/* ── Airport ID map (static — avoids extra DB round-trip) ─────────────────── */
const AIRPORT_IDS: Record<string, string> = {
  // by code
  BPN001: "0e1de633-5de2-458c-bd3e-b83cb35517bd",
  BTH001: "1325804e-8dd5-458e-a782-80a231a09303",
  DJB001: "2669bd67-290d-4aa1-805f-540951592b2a",
  MDC001: "0587c176-e85f-4c7b-a2be-0e255e158612",
  PKU001: "60be8461-09f3-4f2f-b50e-ff715f91f2f4",
  UPG001: "3528d0a3-ba4d-43d7-a91e-40786efaae48",
  CGK001: "e7c34a55-86d7-4693-a02e-7b4426420ad8",
  // by rifim-attendance cabang names
  "ID Rifim Airport Batam":      "1325804e-8dd5-458e-a782-80a231a09303",
  "ID Rifim Airport Jambi":      "2669bd67-290d-4aa1-805f-540951592b2a",
  "ID Rifim Airport Balikpapan": "0e1de633-5de2-458c-bd3e-b83cb35517bd",
  "ID Rifim Airport Manado":     "0587c176-e85f-4c7b-a2be-0e255e158612",
  "ID Rifim Airport Pekanbaru":  "60be8461-09f3-4f2f-b50e-ff715f91f2f4",
  "ID Rifim Airport Makassar":   "3528d0a3-ba4d-43d7-a91e-40786efaae48",
  "ID Rifim Batam":              "1325804e-8dd5-458e-a782-80a231a09303",
  "ID Rifim Jambi Luar":         "2669bd67-290d-4aa1-805f-540951592b2a",
  "Admin":                       "1325804e-8dd5-458e-a782-80a231a09303",
};

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Sync-Key, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function GET() {
  return NextResponse.json({ ok: true, service: "RAOS Attendance Sync", version: "2" }, { headers: CORS });
}

/* ── POST handler — accepts two payload formats ────────────────────────────
   Format A (RAOS-native):   { airport_code, check_type, staff_code/nama, ... }
   Format B (rifim-attendance): { cabang, tipe, nama, lat, lng, gpsValid, ... }
─────────────────────────────────────────────────────────────────────────── */
export async function POST(req: NextRequest) {
  /* Optional auth — accept either X-Sync-Key or no key (rifim-attendance PWA) */
  const syncKey =
    req.headers.get("x-sync-key") ??
    req.headers.get("authorization")?.replace("Bearer ", "");
  const configuredKey = process.env.ATTENDANCE_SYNC_KEY;
  if (configuredKey && syncKey && syncKey !== configuredKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers: CORS });
  }

  /* ── Normalise fields from both formats ─────────────────────────────── */
  const airportKey   = (body.airport_code ?? body.cabang ?? "") as string;
  const rawCheckType = (body.check_type   ?? body.tipe   ?? "") as string;
  const namanya      = (body.nama ?? body.staff_name ?? "") as string;
  const staffCode    = (body.staff_code ?? "") as string;
  const latitude     = (body.latitude  ?? body.lat  ?? null) as number | null;
  const longitude    = (body.longitude ?? body.lng  ?? null) as number | null;
  const gpsValid     = (body.gpsValid  ?? body.distance_status ?? null);
  const jarak        = (body.jarak     ?? body.distance_meter  ?? null) as number | null;
  const fotoId       = (body.fotoId    ?? "") as string;
  const photoUrl     = (body.photo_url ?? (fotoId ? `https://drive.google.com/file/d/${fotoId}/view` : null)) as string | null;
  const tanggal      = (body.tanggal   ?? new Date().toISOString().split("T")[0]) as string;
  const shift        = (body.shift     ?? null) as string | null;
  const waktu        = (body.waktu     ?? null) as string | null;
  const status       = (body.status    ?? null) as string | null;
  const jabatan      = (body.jabatan   ?? null) as string | null;

  // Map tipe → check_type
  let checkType: "CHECK_IN" | "CHECK_OUT";
  const ct = rawCheckType.toLowerCase();
  if (ct === "masuk" || ct === "check_in" || ct === "checkin") {
    checkType = "CHECK_IN";
  } else if (ct === "pulang" || ct === "check_out" || ct === "checkout" || ct === "khusus") {
    checkType = "CHECK_OUT";
  } else {
    return NextResponse.json(
      { error: `check_type/tipe tidak dikenal: ${rawCheckType}` },
      { status: 400, headers: CORS }
    );
  }

  // Map airport
  const airportId = AIRPORT_IDS[airportKey] ?? AIRPORT_IDS[airportKey.toUpperCase()];
  if (!airportId) {
    return NextResponse.json(
      { error: `Cabang/bandara tidak dikenal: ${airportKey}` },
      { status: 400, headers: CORS }
    );
  }

  // Map distance_status
  let distanceStatus: "VALID" | "INVALID" | "UNKNOWN" = "UNKNOWN";
  if (typeof gpsValid === "boolean") {
    distanceStatus = gpsValid ? "VALID" : "INVALID";
  } else if (typeof gpsValid === "string") {
    const gs = gpsValid.toLowerCase();
    distanceStatus = gs.includes("valid") && !gs.includes("invalid") ? "VALID" :
                     gs.includes("invalid") ? "INVALID" : "UNKNOWN";
  }

  const supabase = createServiceClient();

  /* ── Resolve staff_id ──────────────────────────────────────────────── */
  let staffId: string | null = null;

  if (staffCode) {
    const { data } = await supabase
      .from("staff")
      .select("id")
      .eq("staff_code", staffCode)
      .maybeSingle();
    staffId = data?.id ?? null;
  }

  if (!staffId && namanya) {
    // Try exact match first, then fuzzy
    const { data: exact } = await supabase
      .from("staff")
      .select("id")
      .ilike("nama", namanya.trim())
      .eq("airport_id", airportId)
      .maybeSingle();
    staffId = exact?.id ?? null;

    // If still not found, try without airport_id filter (Admin staff can absen anywhere)
    if (!staffId) {
      const { data: fuzzy } = await supabase
        .from("staff")
        .select("id")
        .ilike("nama", `%${namanya.trim().split(" ")[0]}%`)
        .maybeSingle();
      staffId = fuzzy?.id ?? null;
    }
  }

  if (!staffId) {
    return NextResponse.json(
      {
        error: `Staff tidak ditemukan: ${namanya || staffCode}. Pastikan nama terdaftar di RAOS.`,
        hint: "Cek ejaan nama di Master Data RAOS.",
      },
      { status: 404, headers: CORS }
    );
  }

  /* ── Insert attendance record ──────────────────────────────────────── */
  const notes = [
    jabatan  ? `Jabatan: ${jabatan}`  : null,
    shift    ? `Shift: ${shift}`      : null,
    waktu    ? `Waktu: ${waktu}`      : null,
    status   ? `Status: ${status}`    : null,
    jarak != null ? `Jarak: ${jarak}m` : null,
  ].filter(Boolean).join(" | ");

  const { data, error } = await supabase
    .from("attendance")
    .insert({
      staff_id:        staffId,
      airport_id:      airportId,
      tanggal,
      check_type:      checkType,
      latitude:        latitude  ?? null,
      longitude:       longitude ?? null,
      distance_meter:  jarak     ?? null,
      distance_status: distanceStatus,
      photo_url:       photoUrl  ?? null,
      device_info:     "rifim-attendance-pwa",
      notes:           notes || null,
    })
    .select("id, check_type, distance_status, created_at")
    .single();

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500, headers: CORS }
    );
  }

  return NextResponse.json(
    {
      success: true,
      id:              data.id,
      check_type:      data.check_type,
      distance_status: data.distance_status,
      created_at:      data.created_at,
      staff_id:        staffId,
    },
    { headers: CORS }
  );
}
