import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import SettingsClient from "./SettingsClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();

  /* All users with role info (for password management) */
  const { data: rawUsers } = await (supabase as any)
    .from("users")
    .select("id, auth_user_id, full_name, email, is_active, roles(name, level), airports(code)")
    .order("full_name");

  const users = ((rawUsers ?? []) as any[]).map((u) => ({
    id:            u.id,
    auth_user_id:  u.auth_user_id,
    full_name:     u.full_name,
    email:         u.email,
    role:          u.roles?.name ?? "STAFF",
    airport_code:  u.airports?.code ?? null,
    is_active:     u.is_active,
  }));

  /* Staff list */
  const { data: staffList } = await (supabase as any)
    .from("staff")
    .select("id, staff_code, nama, jabatan, department, status, shift, nomor_hp, airports(code)")
    .order("nama")
    .limit(200);

  /* Driver list */
  const { data: driverList } = await (supabase as any)
    .from("drivers")
    .select("id, driver_code, nama, nomor_hp, driver_type, status, airports(code)")
    .order("nama")
    .limit(200);

  return (
    <SettingsClient
      currentUser={{ auth_user_id: user.auth_user_id, email: user.email, role_level: user.role_level }}
      users={users}
      staffList={staffList ?? []}
      driverList={driverList ?? []}
    />
  );
}
