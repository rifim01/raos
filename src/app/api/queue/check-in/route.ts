import { NextRequest, NextResponse } from "next/server";
import { qmsCheckIn } from "@/lib/queue-engine";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { driverId, airportId } = await req.json();
  if (!driverId || !airportId) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  const result = await qmsCheckIn(driverId, airportId);
  if (result.error) return NextResponse.json({ error: result.error }, { status: 422 });
  return NextResponse.json(result.data);
}
