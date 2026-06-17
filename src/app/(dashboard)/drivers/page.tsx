import { createClient } from "@/lib/supabase/server";
import DriversClient from "./DriversClient";

async function getDrivers() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("drivers")
      .select("id, driver_code, nama, nomor_hp, driver_type, status, airport_id, airports(code, name, city)")
      .order("nama");
    if (error) throw error;
    return data ?? [];
  } catch {
    return [];
  }
}

export default async function DriversPage() {
  const drivers = await getDrivers();
  return <DriversClient drivers={drivers} />;
}
