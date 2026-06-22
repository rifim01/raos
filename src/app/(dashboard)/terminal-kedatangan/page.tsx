import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import TerminalKedatanganClient from "./TerminalKedatanganClient";

export const dynamic = "force-dynamic";

export const AIRPORT_LIST = [
  { code: "BTH", dbCode: "BTH001", kota: "Batam",       bandara: "Hang Nadim",          iata: "BTH", live: true  },
  { code: "DJB", dbCode: "DJB001", kota: "Jambi",       bandara: "Sultan Thaha",        iata: "DJB", live: true  },
  { code: "PKU", dbCode: "PKU001", kota: "Pekanbaru",   bandara: "Sultan Syarif Kasim II", iata: "PKU", live: true  },
  { code: "BPN", dbCode: "BPN001", kota: "Balikpapan",  bandara: "Sultan Aji M. Sulaiman", iata: "BPN", live: true  },
  { code: "MDC", dbCode: "MDC001", kota: "Manado",      bandara: "Sam Ratulangi",       iata: "MDC", live: true  },
  { code: "UPG", dbCode: "UPG001", kota: "Makassar",    bandara: "Sultan Hasanuddin",   iata: "UPG", live: false },
];

export default async function TerminalKedatanganPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  // Command center aggregates per airport
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: commandStats } = await (supabase as any)
    .from("vw_command_center_per_airport")
    .select("*");

  // Active queue entries for today across all airports
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: todayQueue } = await (supabase as any)
    .from("queue")
    .select(`
      id, queue_number, status, tanggal, call_time, serve_time, done_time, created_at,
      driver:driver_id(id, nama, driver_code, airport_id,
        airport:airport_id(id, code)
      )
    `)
    .eq("tanggal", today)
    .in("status", ["WAITING", "CALLED", "PICKUP", "SERVING", "VIOLATION"])
    .order("queue_number", { ascending: true });

  // Recent queue activity for activity feed
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: recentActivity } = await (supabase as any)
    .from("queue")
    .select(`
      id, queue_number, status, call_time, serve_time, done_time, created_at,
      driver:driver_id(id, nama, driver_code,
        airport:airport_id(id, code)
      )
    `)
    .eq("tanggal", today)
    .order("created_at", { ascending: false })
    .limit(30);

  // Driver last-known locations
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: driverLocations } = await (supabase as any)
    .from("driver_locations")
    .select("driver_id, latitude, longitude, status, airport_id, last_seen")
    .order("last_seen", { ascending: false });

  // Per-airport zone capacities
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: layoutConfigs } = await (supabase as any)
    .from("terminal_layout_config")
    .select("airport_id, zone_a_capacity, zone_b_capacity");

  // Cached flight arrivals for today
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: flightCache } = await (supabase as any)
    .from("flight_arrival_cache")
    .select("*")
    .eq("flight_date", today)
    .order("scheduled_time", { ascending: true })
    .limit(10);

  return (
    <TerminalKedatanganClient
      airports={AIRPORT_LIST}
      commandStats={commandStats ?? []}
      todayQueue={todayQueue ?? []}
      recentActivity={recentActivity ?? []}
      driverLocations={driverLocations ?? []}
      layoutConfigs={layoutConfigs ?? []}
      flightCache={flightCache ?? []}
      userRoleLevel={user.role_level ?? 2}
      userAirportCode={null}
    />
  );
}
