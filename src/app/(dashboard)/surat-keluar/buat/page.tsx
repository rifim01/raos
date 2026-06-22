import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BuatSuratClient from "./BuatSuratClient";

export const dynamic = "force-dynamic";

export default async function BuatSuratPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await (supabase as any)
    .from("users")
    .select("id, role_id, airport_id, full_name")
    .eq("auth_user_id", user.id)
    .single();

  if (!me || me.role_id > 3) redirect("/surat-keluar");

  const isDirector = me.role_id <= 2;

  // Find user's lokasi
  let userLokasiId: string | null = null;
  if (!isDirector && me.airport_id) {
    const { data: ap } = await (supabase as any)
      .from("airports").select("code").eq("id", me.airport_id).single();
    if (ap) {
      const { data: lok } = await (supabase as any)
        .from("master_lokasi_surat").select("id").eq("kode_lokasi", ap.code).single();
      userLokasiId = lok?.id ?? null;
    }
  }

  const [
    { data: lokasi },
    { data: jenisSurat },
    { data: penandatangan },
    { data: templates },
    { data: pengaturan },
  ] = await Promise.all([
    (supabase as any).from("master_lokasi_surat").select("id, kode_lokasi, nama_lokasi, status").order("nama_lokasi"),
    (supabase as any).from("master_jenis_surat").select("id, kode_surat, nama_surat").eq("aktif", true).order("kode_surat"),
    (supabase as any).from("master_penandatangan").select("id, nama, jabatan, lokasi, ttd_url").eq("aktif", true),
    (supabase as any).from("template_surat").select("id, nama_template, kode_surat, isi_template").eq("aktif", true),
    (supabase as any).from("pengaturan_surat").select("*").single(),
  ]);

  return (
    <BuatSuratClient
      lokasi={lokasi ?? []}
      jenisSurat={jenisSurat ?? []}
      penandatangan={penandatangan ?? []}
      templates={templates ?? []}
      pengaturan={pengaturan}
      me={me}
      isDirector={isDirector}
      userLokasiId={userLokasiId}
    />
  );
}
