import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser, hasMinRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !hasMinRole(user, "AIRPORT_COORDINATOR"))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const airportId = searchParams.get("airportId");
  const bulan     = Number(searchParams.get("bulan"));
  const tahun     = Number(searchParams.get("tahun"));

  if (!airportId || !bulan || !tahun)
    return NextResponse.json({ error: "Missing params" }, { status: 400 });

  const supabase = await createClient();
  const { data, error } = await (supabase as any)
    .from("payroll")
    .select("id,status,periode,gaji_pokok,bpjs,kuota,bonus,lembur,denda_telat,potongan_alpha,kasbon,deposit,total_pendapatan,total_potongan,gaji_bersih,total_hadir,total_terlambat,total_alpha,jam_lembur,staff(nama,jabatan,staff_code)")
    .eq("airport_id", airportId)
    .eq("periode_bulan", bulan)
    .eq("periode_tahun", tahun)
    .order("created_at");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
