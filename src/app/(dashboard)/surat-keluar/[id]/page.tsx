import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DetailSuratClient from "./DetailSuratClient";

export const dynamic = "force-dynamic";

export default async function DetailSuratPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await (supabase as any)
    .from("users")
    .select("id, role_id, airport_id, full_name")
    .eq("auth_user_id", user.id)
    .single();

  if (!me) redirect("/login");

  const isDirector    = me.role_id <= 2;
  const isCoordinator = me.role_id === 3;

  const { data: surat } = await (supabase as any)
    .from("surat_keluar")
    .select(`
      *,
      jenis_surat:jenis_surat_id(id, kode_surat, nama_surat),
      lokasi:lokasi_id(id, kode_lokasi, nama_lokasi),
      penandatangan:penandatangan_id(id, nama, jabatan, ttd_url),
      template:template_id(id, nama_template, isi_template)
    `)
    .eq("id", params.id)
    .is("deleted_at", null)
    .single();

  if (!surat) notFound();

  const { data: auditLog } = await (supabase as any)
    .from("audit_surat")
    .select("id, aktivitas, keterangan, created_at, user_id")
    .eq("surat_id", params.id)
    .order("created_at", { ascending: false });

  const { data: pengaturan } = await (supabase as any)
    .from("pengaturan_surat").select("*").single();

  return (
    <DetailSuratClient
      surat={surat}
      auditLog={auditLog ?? []}
      pengaturan={pengaturan}
      me={me}
      isDirector={isDirector}
      isCoordinator={isCoordinator}
    />
  );
}
