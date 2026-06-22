/**
 * POST /api/geofence/check
 * Body: { lat: number, lng: number, airport_id: string }
 * Returns: { within, distance_m, radius_m, margin_m, airport_code, airport_city, radius_confirmed }
 * Uses PostgreSQL geofence_check() function (Haversine, server-side).
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  let body: { lat?: number; lng?: number; airport_id?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { lat, lng, airport_id } = body;
  if (lat == null || lng == null || !airport_id) {
    return NextResponse.json({ error: "lat, lng, airport_id wajib diisi" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await (supabase as any).rpc("geofence_check", {
    driver_lat: lat,
    driver_lng: lng,
    branch_id: airport_id,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return NextResponse.json({ error: "Airport tidak ditemukan" }, { status: 404 });

  return NextResponse.json({
    within:           row.within,
    distance_m:       Math.round(row.distance_m),
    radius_m:         row.radius_m,
    margin_m:         Math.round(row.margin_m),
    airport_code:     row.airport_code,
    airport_city:     row.airport_city,
    radius_confirmed: row.radius_confirmed,
    message: row.within
      ? `Anda berada ${Math.round(row.margin_m)}m di dalam radius bandara.`
      : `Anda berada ${Math.abs(Math.round(row.margin_m))}m di luar radius ${row.radius_m}m yang diizinkan.`,
  });
}
