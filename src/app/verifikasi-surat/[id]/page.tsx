import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function formatTanggal(d: string) {
  return new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
}

export default async function VerifikasiSuratPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();

  const { data: surat } = await (supabase as any)
    .from("surat_keluar")
    .select(`
      id, nomor_surat, perihal, tujuan, tanggal_surat, status, created_at,
      jenis_surat:jenis_surat_id(nama_surat),
      lokasi:lokasi_id(nama_lokasi, kode_lokasi),
      penandatangan:penandatangan_id(nama, jabatan)
    `)
    .eq("id", params.id)
    .is("deleted_at", null)
    .single();

  if (!surat) notFound();

  const isValid = surat.status === "Diterbitkan";

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Branding */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl overflow-hidden mx-auto mb-3 shadow-sm">
            <img src="/icons/icon-512.png" alt="RIFIM" className="w-full h-full object-cover" />
          </div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            PT Rifim International Gemilang
          </p>
          <p className="text-xs text-gray-400 mt-0.5">Sistem Verifikasi Surat Digital</p>
        </div>

        {/* Card */}
        <div className={`bg-white rounded-3xl shadow-lg border-2 overflow-hidden
          ${isValid ? "border-green-200" : "border-red-200"}`}>

          {/* Status Banner */}
          <div className={`px-6 py-4 flex items-center gap-3 ${isValid ? "bg-green-50" : "bg-red-50"}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl flex-shrink-0
              ${isValid ? "bg-green-100" : "bg-red-100"}`}>
              {isValid ? "✓" : "✗"}
            </div>
            <div>
              <p className={`font-black text-base ${isValid ? "text-green-800" : "text-red-800"}`}>
                {isValid ? "Surat Resmi Terverifikasi" : "Surat Tidak Valid"}
              </p>
              <p className={`text-xs mt-0.5 ${isValid ? "text-green-600" : "text-red-600"}`}>
                {isValid
                  ? "Dokumen ini adalah surat resmi PT Rifim International Gemilang"
                  : `Status dokumen: ${surat.status} — bukan surat yang sudah diterbitkan`}
              </p>
            </div>
          </div>

          {/* Detail */}
          <div className="px-6 py-5 space-y-4">
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Nomor Surat</p>
              <p className="font-black text-gray-900 font-mono text-lg">{surat.nomor_surat ?? "—"}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Jenis</p>
                <p className="font-semibold text-gray-800 text-sm">{surat.jenis_surat?.nama_surat ?? "—"}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Tanggal</p>
                <p className="font-semibold text-gray-800 text-sm">{formatTanggal(surat.tanggal_surat)}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Asal</p>
                <p className="font-semibold text-gray-800 text-sm">
                  {surat.lokasi?.nama_lokasi} ({surat.lokasi?.kode_lokasi})
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Status</p>
                <p className={`font-bold text-sm ${isValid ? "text-green-700" : "text-red-600"}`}>{surat.status}</p>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Perihal</p>
              <p className="font-semibold text-gray-800">{surat.perihal}</p>
            </div>

            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Kepada</p>
              <p className="font-semibold text-gray-800">{surat.tujuan}</p>
            </div>

            {surat.penandatangan && (
              <div className="border-t border-gray-50 pt-4">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Penandatangan</p>
                <p className="font-bold text-gray-900">{surat.penandatangan.nama}</p>
                <p className="text-sm text-gray-500">{surat.penandatangan.jabatan}</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
            <p className="text-[10px] text-gray-400 text-center">
              Verifikasi dilakukan pada{" "}
              {new Date().toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" })}
            </p>
            <p className="text-[10px] text-gray-400 text-center mt-0.5">
              ID Dokumen: <span className="font-mono">{surat.id}</span>
            </p>
          </div>
        </div>

        <p className="text-center text-[10px] text-gray-400 mt-4">
          Halaman ini dapat diakses publik untuk memverifikasi keaslian surat.
        </p>
      </div>
    </div>
  );
}
