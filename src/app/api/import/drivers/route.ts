import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const AIRPORT_CODES: Record<string, string> = {
  "BPN001": "0e1de633-5de2-458c-bd3e-b83cb35517bd",
  "BTH001": "1325804e-8dd5-458e-a782-80a231a09303",
  "DJB001": "2669bd67-290d-4aa1-805f-540951592b2a",
  "MDC001": "0587c176-e85f-4c7b-a2be-0e255e158612",
  "PKU001": "60be8461-09f3-4f2f-b50e-ff715f91f2f4",
  "UPG001": "3528d0a3-ba4d-43d7-a91e-40786efaae48",
  "CGK001": "e7c34a55-86d7-4693-a02e-7b4426420ad8",
  "BATAM": "1325804e-8dd5-458e-a782-80a231a09303",
  "JAMBI": "2669bd67-290d-4aa1-805f-540951592b2a",
  "MAKASSAR": "3528d0a3-ba4d-43d7-a91e-40786efaae48",
  "BALIKPAPAN": "0e1de633-5de2-458c-bd3e-b83cb35517bd",
  "MANADO": "0587c176-e85f-4c7b-a2be-0e255e158612",
  "PEKANBARU": "60be8461-09f3-4f2f-b50e-ff715f91f2f4",
};

export async function POST(req: NextRequest) {
  try {
    const { rows, airport_code, type = "INTERNAL" } = await req.json();

    if (!rows?.length) return NextResponse.json({ error: "No rows" }, { status: 400 });

    const airportId = AIRPORT_CODES[airport_code?.toUpperCase()];
    if (!airportId) return NextResponse.json({ error: `Airport tidak dikenal: ${airport_code}` }, { status: 400 });

    const supabase = await createClient();

    const { data, error } = await supabase.rpc("import_drivers", {
      p_rows: rows,
      p_airport_id: airportId,
      p_type: type,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json(data);
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown error" }, { status: 500 });
  }
}
