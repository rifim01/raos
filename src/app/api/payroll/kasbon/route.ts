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
    if (!airportId) return NextResponse.json({ rows: [] });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = await createClient() as any;
    const { data, error } = await supabase
      .from("kasbon")
      .select("*, staff:staff_id (full_name, position)")
      .eq("airport_id", airportId)
      .order("created_at", { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const rows = ((data ?? []) as Array<Record<string, unknown>>).map(r => {
      const staff = r.staff as Record<string, string> | null;
      return {
        id: r.id,
        staff_id: r.staff_id,
        staff_name: staff?.full_name ?? "-",
        position: staff?.position ?? "-",
        amount: Number(r.amount ?? 0),
        remaining: Number(r.remaining ?? 0),
        monthly_installment: Number(r.monthly_installment ?? 0),
        purpose: r.purpose ?? "",
        date: r.date ?? "",
        status: r.status ?? "ACTIVE",
      };
    });

    return NextResponse.json({ rows });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      staff_id: string; amount: string; monthly_installment: string;
      purpose: string; date: string; airport_code: string;
    };

    const airportId = AIRPORT_IDS[body.airport_code?.toUpperCase()];
    if (!airportId) return NextResponse.json({ error: "Airport tidak dikenal" }, { status: 400 });
    if (!body.staff_id) return NextResponse.json({ error: "Pilih staff terlebih dahulu" }, { status: 400 });

    const amount = parseFloat(body.amount);
    const installment = parseFloat(body.monthly_installment);
    if (!amount || amount <= 0) return NextResponse.json({ error: "Jumlah kasbon tidak valid" }, { status: 400 });
    if (!installment || installment <= 0) return NextResponse.json({ error: "Cicilan tidak valid" }, { status: 400 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = await createClient() as any;
    const { error } = await supabase.from("kasbon").insert({
      staff_id: body.staff_id,
      airport_id: airportId,
      amount,
      remaining: amount,
      monthly_installment: installment,
      purpose: body.purpose ?? "",
      date: body.date || new Date().toISOString().split("T")[0],
      status: "ACTIVE",
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown" }, { status: 500 });
  }
}
