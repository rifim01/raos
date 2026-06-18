import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { resolveAirportId } from "@/lib/import/airports";
import { importStaff } from "@/lib/import/staff";
import { importLog } from "@/lib/import/logger";
import type { SheetRow } from "@/lib/import/types";

export async function POST(req: NextRequest) {
  try {
    let body: { rows?: SheetRow[]; airport_code?: string };

    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ success: false, error: "Request body harus JSON valid" }, { status: 400 });
    }

    const { rows, airport_code } = body;

    if (!rows?.length) {
      importLog("warn", "staff import: empty rows");
      return NextResponse.json({ success: false, error: "No rows" }, { status: 400 });
    }

    if (!airport_code?.trim()) {
      return NextResponse.json({ success: false, error: "airport_code wajib diisi" }, { status: 400 });
    }

    const supabase = createServiceClient();
    const airportId = await resolveAirportId(supabase, airport_code);

    if (!airportId) {
      importLog("error", "staff import: unknown airport", { airport_code });
      return NextResponse.json(
        { success: false, error: `Airport tidak dikenal: ${airport_code}` },
        { status: 400 }
      );
    }

    const result = await importStaff(supabase, rows, airportId, { fixedAirport: true });

    if (!result.success) {
      const primaryError = result.errors[0]?.message ?? "Import staff gagal";
      importLog("error", "staff import failed", { result });
      return NextResponse.json(
        {
          ...result,
          success: false,
          error: primaryError,
        },
        { status: result.imported > 0 ? 207 : 500 }
      );
    }

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    importLog("error", "staff import unhandled error", { message });
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
