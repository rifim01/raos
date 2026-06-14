import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const AIRPORT_IDS: Record<string, string> = {
  "BPN001": "0e1de633-5de2-458c-bd3e-b83cb35517bd",
  "BTH001": "1325804e-8dd5-458e-a782-80a231a09303",
  "DJB001": "2669bd67-290d-4aa1-805f-540951592b2a",
  "MDC001": "0587c176-e85f-4c7b-a2be-0e255e158612",
  "PKU001": "60be8461-09f3-4f2f-b50e-ff715f91f2f4",
  "UPG001": "3528d0a3-ba4d-43d7-a91e-40786efaae48",
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const airportCode = searchParams.get("airport") ?? "BTH001";
    const airportId = AIRPORT_IDS[airportCode];
    if (!airportId) return NextResponse.json({ staff: [] });

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("staff")
      .select("id, full_name, position, department, salary_base")
      .eq("airport_id", airportId)
      .eq("status", "ACTIVE")
      .order("full_name");

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ staff: data ?? [] });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown" }, { status: 500 });
  }
}
