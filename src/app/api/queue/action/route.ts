import { NextRequest, NextResponse } from "next/server";
import {
  qmsConfirmPickup,
  qmsComplete,
  qmsNoShow,
  qmsSuspend,
  qmsPrioritize,
  qmsSkip,
} from "@/lib/queue-engine";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role_level < 3) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { action, queueId, reason } = await req.json();
  if (!action || !queueId) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  let result;
  switch (action) {
    case "confirm_pickup": result = await qmsConfirmPickup(queueId); break;
    case "complete":       result = await qmsComplete(queueId); break;
    case "no_show":        result = await qmsNoShow(queueId, authUser.id); break;
    case "suspend":        result = await qmsSuspend(queueId, reason ?? "Pelanggaran", authUser.id); break;
    case "prioritize":     result = await qmsPrioritize(queueId, authUser.id); break;
    case "skip":           result = await qmsSkip(queueId, authUser.id); break;
    default: return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }

  if (result.error) return NextResponse.json({ error: result.error }, { status: 422 });
  return NextResponse.json(result.data);
}
