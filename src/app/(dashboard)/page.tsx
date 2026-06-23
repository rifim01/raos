import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import StaffDashboard from "@/components/dashboard/StaffDashboard";
import DriverDashboard from "@/components/dashboard/DriverDashboard";
import { createClient } from "@/lib/supabase/server";
import NationalDashboardClient from "@/components/dashboard/NationalDashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (user.role_level === 1) return <DriverDashboard user={user} />;
  if (user.role_level === 2) return <StaffDashboard user={user} />;
  if (user.role_level === 3 && user.airport_code) redirect(`/airports/${user.airport_code}`);

  // Director / Super Admin — national dashboard
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = await createClient() as any;
  const today = new Date().toISOString().split("T")[0];
  const todayStartISO = `${today}T00:00:00.000Z`;

  const [
    { count: totalDrivers },
    { count: activeDrivers },
    { count: totalStaff },
    { count: activeStaff },
    { count: todayQueue },
    { data: airportStats },
    { data: recentActivity },
  ] = await Promise.all([
    supabase.from("drivers").select("*", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("drivers").select("*", { count: "exact", head: true }).eq("is_active", true).eq("status", "ACTIVE"),
    supabase.from("staff").select("*", { count: "exact", head: true }).eq("is_active", true),
    supabase.from("staff").select("*", { count: "exact", head: true }).eq("is_active", true).eq("status", "ACTIVE"),
    supabase.from("queue").select("*", { count: "exact", head: true }).gte("created_at", todayStartISO),
    supabase.from("vw_command_center_per_airport").select("*"),
    supabase.from("queue")
      .select(`id, queue_number, status, created_at, driver:driver_id(id, nama, driver_code, airport:airport_id(id, code))`)
      .eq("tanggal", today)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const stats = {
    totalDrivers:    totalDrivers    ?? 0,
    activeDrivers:   activeDrivers   ?? 0,
    totalStaff:      totalStaff      ?? 0,
    activeStaff:     activeStaff     ?? 0,
    todayQueue:      todayQueue      ?? 0,
    totalAirports:   6,
    monthlyRevenue:  178_000_000,
    kpiNational:     87,
  };

  return (
    <NationalDashboardClient
      stats={stats}
      airportStats={airportStats ?? []}
      recentActivity={recentActivity ?? []}
    />
  );
}
