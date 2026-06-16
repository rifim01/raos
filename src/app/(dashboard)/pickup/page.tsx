import { redirect } from "next/navigation";
import { getCurrentUser, hasMinRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import QueueBoardClient from "@/components/queue/QueueBoardClient";

export const dynamic = "force-dynamic";

export default async function PickupPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasMinRole(user, "AIRPORT_COORDINATOR")) redirect("/");

  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  let airportId = user.airport_id ?? "";
  let airportCode = user.airport_code ?? "";

  if (!airportId && user.role_level >= 4) {
    const { data: firstAirport } = await (supabase as any)
      .from("airports")
      .select("id, code")
      .in("code", ["DJB001", "PKU001", "BTH001", "BPN001", "MDC001", "UPG001"])
      .order("code")
      .limit(1)
      .single();
    airportId   = firstAirport?.id ?? "";
    airportCode = firstAirport?.code ?? "";
  }

  const { data: queueData } = await (supabase as any)
    .from("pickup_queues")
    .select("id, queue_number, position, status, priority, check_in_time, call_time, no_show_count, drivers(nama, driver_code)")
    .eq("airport_id", airportId)
    .eq("tanggal", today)
    .not("status", "in", '("COMPLETED","NO_SHOW")')
    .order("status")
    .order("position");

  const { data: statsData } = await (supabase as any)
    .from("pickup_queues")
    .select("status")
    .eq("airport_id", airportId)
    .eq("tanggal", today);

  const counts = (statsData ?? []).reduce((acc: Record<string, number>, r: { status: string }) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});

  const stats = {
    waiting:   counts["WAITING"]   ?? 0,
    called:    counts["CALLED"]    ?? 0,
    pickup:    counts["PICKUP"]    ?? 0,
    completed: counts["COMPLETED"] ?? 0,
    suspended: counts["SUSPENDED"] ?? 0,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black" style={{ color: "var(--text-primary)" }}>
          Queue & Pickup
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
          Manajemen antrian driver pickup · {new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {!airportId ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6 text-center">
          <p className="font-semibold text-yellow-800">Airport tidak dikonfigurasi</p>
          <p className="text-sm text-yellow-600 mt-1">Hubungi admin untuk mengatur airport pada akun Anda.</p>
        </div>
      ) : (
        <QueueBoardClient
          airportId={airportId}
          airportCode={airportCode}
          initialQueue={queueData ?? []}
          stats={stats}
        />
      )}
    </div>
  );
}
