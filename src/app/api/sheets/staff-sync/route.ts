import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Sync-Key",
};

const AIRPORT_MAP: Record<string, string> = {
  "ID Rifim Airport Batam":      "1325804e-8dd5-458e-a782-80a231a09303",
  "ID Rifim Airport Jambi":      "2669bd67-290d-4aa1-805f-540951592b2a",
  "ID Rifim Airport Makassar":   "3528d0a3-ba4d-43d7-a91e-40786efaae48",
  "ID Rifim Airport Balikpapan": "0e1de633-5de2-458c-bd3e-b83cb35517bd",
  "ID Rifim Airport Manado":     "0587c176-e85f-4c7b-a2be-0e255e158612",
  "ID Rifim Airport Pekanbaru":  "60be8461-09f3-4f2f-b50e-ff715f91f2f4",
  "Admin":                        null,
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: NextRequest) {
  const syncKey = req.headers.get("x-sync-key");
  if (syncKey !== process.env.ATTENDANCE_SYNC_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: CORS_HEADERS });
  }

  let rows: {
    email: string;
    nama: string;
    staff_code: string;
    jabatan: string;
    id_cabang: string;
    gaji_pokok?: number;
  }[];

  try {
    const body = await req.json();
    rows = body.rows ?? body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers: CORS_HEADERS });
  }

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: "rows array required" }, { status: 400, headers: CORS_HEADERS });
  }

  const supabase = createServiceClient();
  const results = { upserted: 0, skipped: 0, errors: [] as string[] };

  for (const row of rows) {
    const airportId = AIRPORT_MAP[row.id_cabang?.trim()] ?? null;

    try {
      const { error } = await supabase
        .from("staff")
        .upsert(
          {
            staff_code:  row.staff_code?.trim(),
            nama:        row.nama?.trim(),
            email:       row.email?.trim().toLowerCase(),
            jabatan:     row.jabatan?.trim(),
            airport_id:  airportId,
            gaji_pokok:  row.gaji_pokok ?? null,
            status:      "ACTIVE",
          },
          { onConflict: "staff_code", ignoreDuplicates: false }
        );

      if (error) {
        results.errors.push(`${row.staff_code}: ${error.message}`);
      } else {
        results.upserted++;
      }
    } catch (e) {
      results.errors.push(`${row.staff_code}: unexpected error`);
      results.skipped++;
    }
  }

  return NextResponse.json({ success: true, ...results }, { headers: CORS_HEADERS });
}
