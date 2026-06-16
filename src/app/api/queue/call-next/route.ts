import { NextRequest, NextResponse } from "next/server";
import { qmsCallNext } from "@/lib/queue-engine";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role_level < 3) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { airportId } = await req.json();
  if (!airportId) return NextResponse.json({ error: "Missing airportId" }, { status: 400 });

  // Get auth user id for logging
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const result = await qmsCallNext(airportId, authUser.id);
  if (result.error) return NextResponse.json({ error: result.error }, { status: 422 });
  return NextResponse.json(result.data);
}
