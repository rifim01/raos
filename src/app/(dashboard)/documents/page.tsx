import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import DocumentsClient from "./DocumentsClient";

export const dynamic = "force-dynamic";

export default async function DocumentsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();

  const [{ data: suratList }, { data: jenisList }, { data: lokasiList }, { data: penandatanganList }] = await Promise.all([
    (supabase as any)
      .from("surat_keluar")
      .select(`
        id, nomor_surat, perihal, tujuan, status, tanggal_surat, created_at,
        jenis_surat:jenis_surat_id(kode_surat, nama_surat),
        lokasi:lokasi_id(kode_lokasi, nama_lokasi),
        penandatangan:signed_by(nama, jabatan),
        pembuat:created_by(full_name)
      `)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(200),

    (supabase as any).from("master_jenis_surat").select("id, kode_surat, nama_surat").eq("aktif", true).order("kode_surat"),
    (supabase as any).from("master_lokasi_surat").select("id, kode_lokasi, nama_lokasi").eq("aktif", true).order("kode_lokasi"),
    (supabase as any).from("master_penandatangan").select("id, nama, jabatan").eq("aktif", true).order("nama"),
  ]);

  return (
    <DocumentsClient
      suratList={suratList ?? []}
      jenisList={jenisList ?? []}
      lokasiList={lokasiList ?? []}
      penandatanganList={penandatanganList ?? []}
      userRoleLevel={user.role_level}
      userId={user.id}
    />
  );
}
