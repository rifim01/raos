import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SuratKeluarClient from "./SuratKeluarClient";

export const dynamic = "force-dynamic";

export default async function SuratKeluarPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await (supabase as any)
    .from("users")
    .select("id, role_id, airport_id, full_name")
    .eq("auth_user_id", user.id)
    .single();

  if (!me || me.role_id > 4) redirect("/");

  const isDirector    = me.role_id <= 2;
  const isCoordinator = me.role_id === 3;

  // Lokasi user (koordinator → airport code → master_lokasi_surat)
  let userLokasiId: string | null = null;
  if (isCoordinator && me.airport_id) {
    const { data: ap } = await (supabase as any)
      .from("airports").select("code").eq("id", me.airport_id).single();
    if (ap) {
      const { data: lok } = await (supabase as any)
        .from("master_lokasi_surat").select("id").eq("kode_lokasi", ap.code).single();
      userLokasiId = lok?.id ?? null;
    }
  }

  const [
    { data: suratList },
    { data: lokasi },
    { data: jenisSurat },
    { data: penandatangan },
    { data: pengaturan },
  ] = await Promise.all([
    // Surat — filter by lokasi for coordinator
    (async () => {
      let q = (supabase as any)
        .from("surat_keluar")
        .select(`
          id, nomor_surat, perihal, tujuan, status, tanggal_surat,
          lampiran, created_at,
          jenis_surat:jenis_surat_id(kode_surat, nama_surat),
          lokasi:lokasi_id(kode_lokasi, nama_lokasi)
        `)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(100);
      if (!isDirector && userLokasiId) q = q.eq("lokasi_id", userLokasiId);
      return q;
    })(),
    (supabase as any).from("master_lokasi_surat").select("id, kode_lokasi, nama_lokasi, status").order("nama_lokasi"),
    (supabase as any).from("master_jenis_surat").select("id, kode_surat, nama_surat").eq("aktif", true).order("kode_surat"),
    (supabase as any).from("master_penandatangan").select("id, nama, jabatan, lokasi, ttd_url").eq("aktif", true),
    (supabase as any).from("pengaturan_surat").select("*").single(),
  ]);

  return (
    <SuratKeluarClient
      suratList={suratList ?? []}
      lokasi={lokasi ?? []}
      jenisSurat={jenisSurat ?? []}
      penandatangan={penandatangan ?? []}
      pengaturan={pengaturan}
      me={me}
      isDirector={isDirector}
      isCoordinator={isCoordinator}
      userLokasiId={userLokasiId}
    />
  );
}
