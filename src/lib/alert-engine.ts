"use server";

import { createClient } from "@/lib/supabase/server";

export type AlertType = "INFO" | "WARNING" | "SUCCESS" | "ERROR" | "QUEUE" | "PAYROLL" | "FINANCE" | "ATTENDANCE";

export async function insertAlert({
  airportId,
  title,
  message,
  type,
  data,
}: {
  airportId?: string;
  title: string;
  message: string;
  type: AlertType;
  data?: Record<string, unknown>;
}) {
  const supabase = await createClient();
  const { error } = await (supabase as any).from("notifications").insert({
    airport_id: airportId ?? null,
    title,
    message,
    type,
    is_read: false,
    data: data ?? {},
  });
  if (error) throw new Error(error.message);
}

export async function markAlertsRead(ids: string[]) {
  if (!ids.length) return;
  const supabase = await createClient();
  await (supabase as any)
    .from("notifications")
    .update({ is_read: true })
    .in("id", ids);
}

export async function getRecentAlerts(limit = 30) {
  const supabase = await createClient();
  const { data } = await (supabase as any)
    .from("notifications")
    .select("id, title, message, type, is_read, created_at, airport_id, data, airports(code, city)")
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as Alert[];
}

export async function getCommandCenterStats() {
  const supabase = await createClient();
  const { data } = await (supabase as any)
    .from("vw_command_center_per_airport")
    .select("*")
    .order("airport_code");
  return (data ?? []) as AirportStat[];
}

export interface Alert {
  id: string;
  title: string;
  message: string;
  type: AlertType;
  is_read: boolean;
  created_at: string;
  airport_id: string | null;
  data: Record<string, unknown>;
  airports?: { code: string; city: string } | null;
}

export interface AirportStat {
  airport_id: string;
  airport_code: string;
  airport_city: string;
  latitude: number;
  longitude: number;
  queue_waiting: number;
  queue_called: number;
  queue_pickup: number;
  queue_completed: number;
  queue_aktif: number;
  driver_total: number;
  driver_online: number;
  driver_on_duty: number;
  staff_total: number;
  staff_hadir: number;
  pickup_hari_ini: number;
  income_hari_ini: number;
  airport_status: "NORMAL" | "PADAT" | "OVERLOAD";
  current_called_number: number | null;
  next_waiting_number: number | null;
}
