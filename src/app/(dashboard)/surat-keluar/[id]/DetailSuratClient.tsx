"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { generateSuratHTML, DEFAULT_TEMPLATE, type SuratData } from "@/lib/surat/pdf";

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface AuditEntry { id: string; aktivitas: string; keterangan: string | null; created_at: string; user_id: string; }
interface Me { id: string; role_id: number; full_name: string; }

/* ─── Status flow ─────────────────────────────────────────────────────────── */
const STATUS_NEXT: Record<string, string | null> = {
  "Draft":                "Menunggu Persetujuan",
  "Menunggu Persetujuan": null, // Direktur action
  "Disetujui":            "Diterbitkan",
  "Ditolak":              "Draft",
  "Diterbitkan":          "Diarsipkan",
  "Diarsipkan":           null,
};

const STATUS_STYLE: Record<string, string> = {
  "Draft":                "bg-gray-100 text-gray-600 border-gray-200",
  "Menunggu Persetujuan": "bg-yellow-100 text-yellow-700 border-yellow-200",
  "Disetujui":            "bg-blue-100 text-blue-700 border-blue-200",
  "Ditolak":              "bg-red-100 text-red-700 border-red-200",
  "Diterbitkan":          "bg-green-100 text-green-700 border-green-200",
  "Diarsipkan":           "bg-gray-200 text-gray-500 border-gray-300",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`text-sm font-bold px-3 py-1 rounded-full border ${STATUS_STYLE[status] ?? "bg-gray-100 text-gray-500 border-gray-200"}`}>
      {status}
    </span>
  );
}

function formatTanggal(d: string) {
  return new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
}

/* ══════════════════════════════════════════════════════════════════════════ */
interface Props {
  surat: any; auditLog: AuditEntry[]; pengaturan: any;
  me: Me; isDirector: boolean; isCoordinator: boolean;
}

export default function DetailSuratClient({ surat, auditLog, pengaturan, me, isDirector, isCoordinator }: Props) {
  const router  = useRouter();
  const supabase = createClient();
  const [acting, startAct]     = useTransition();
  const [toast,  setToast]     = useState<{ msg: string; ok: boolean } | null>(null);
  const [alasan, setAlasan]    = useState("");
  const [showTolak, setShowTolak] = useState(false);
  const [activeTab, setActiveTab] = useState<"detail"|"audit"|"preview">("detail");

  const canEdit    = (surat.status === "Draft" || surat.status === "Ditolak") &&
                     (isDirector || isCoordinator);
  const canSubmit  = surat.status === "Draft" && (isDirector || isCoordinator);
  const canApprove = surat.status === "Menunggu Persetujuan" && isDirector;
  const canPublish = surat.status === "Disetujui" && isDirector;
  const canArchive = surat.status === "Diterbitkan" && isDirector;

  async function updateStatus(newStatus: string, extra?: Record<string,any>) {
    const payload: any = { status: newStatus, updated_at: new Date().toISOString(), ...extra };

    // Generate nomor surat when publishing
    if (newStatus === "Diterbitkan" && !surat.nomor_surat) {
      const { data: nomorData, error: nErr } = await (supabase as any)
        .rpc("generate_nomor_surat", {
          p_lokasi_id:  surat.lokasi_id,
          p_jenis_kode: surat.jenis_surat?.kode_surat ?? "GEN",
          p_tanggal:    surat.tanggal_surat,
        });
      if (nErr) { setToast({ msg: nErr.message, ok: false }); return; }
      payload.nomor_surat = nomorData;
    }

    const { error } = await (supabase as any)
      .from("surat_keluar").update(payload).eq("id", surat.id);
    if (error) { setToast({ msg: error.message, ok: false }); return; }

    // Audit log
    const aktLabels: Record<string,string> = {
      "Menunggu Persetujuan": "Surat diajukan",
      "Disetujui": "Surat disetujui",
      "Ditolak": "Surat ditolak",
      "Diterbitkan": "Surat diterbitkan",
      "Diarsipkan": "Surat diarsipkan",
    };
    await (supabase as any).from("audit_surat").insert({
      surat_id:  surat.id,
      user_id:   me.id,
      aktivitas: aktLabels[newStatus] ?? newStatus,
      keterangan: extra?.alasan_tolak ? `Alasan: ${extra.alasan_tolak}` : `Oleh ${me.full_name}`,
    });

    setToast({ msg: `Status diubah ke "${newStatus}"`, ok: true });
    setTimeout(() => { router.refresh(); }, 800);
  }

  function handleSubmit() { startAct(() => updateStatus("Menunggu Persetujuan")); }
  function handleApprove() { startAct(() => updateStatus("Disetujui", { approved_by: me.id })); }
  function handleTolak() {
    if (!alasan.trim()) { setToast({ msg: "Isi alasan penolakan", ok: false }); return; }
    startAct(() => updateStatus("Ditolak", { alasan_tolak: alasan }));
    setShowTolak(false);
  }
  function handlePublish() { startAct(() => updateStatus("Diterbitkan")); }
  function handleArchive() { startAct(() => updateStatus("Diarsipkan")); }

  /* ── PDF print ─────────────────────────────── */
  function printSurat() {
    const templateIsi = surat.template?.isi_template ?? DEFAULT_TEMPLATE;
    const data: SuratData = {
      nomor_surat:            surat.nomor_surat ?? "(Draft — belum bernomor)",
      tanggal_surat:          formatTanggal(surat.tanggal_surat),
      perihal:                surat.perihal,
      tujuan:                 surat.tujuan,
      lampiran:               surat.lampiran,
      isi_surat:              surat.isi_surat ?? "",
      data_surat:             surat.data_surat,
      nama_penandatangan:     surat.penandatangan?.nama,
      jabatan_penandatangan:  surat.penandatangan?.jabatan,
      ttd_url:                surat.penandatangan?.ttd_url,
      stempel_url:            pengaturan?.stempel_url,
      logo_url:               pengaturan?.logo_url,
      nama_perusahaan:        pengaturan?.nama_perusahaan ?? "PT. Rifim International Gemilang",
      alamat:                 pengaturan?.alamat,
      telepon:                pengaturan?.telepon,
      website:                pengaturan?.website,
    };
    const html = generateSuratHTML(data, templateIsi);
    const win  = window.open("", "_blank");
    if (!win) return;
    win.document.write(html);
    win.document.close();
    setTimeout(() => { win.print(); }, 400);

    // Audit log for print
    (supabase as any).from("audit_surat").insert({
      surat_id: surat.id, user_id: me.id,
      aktivitas: "PDF dicetak", keterangan: `Dicetak oleh ${me.full_name}`,
    });
  }

  /* ── Render ──────────────────────────────────────────────────────────── */
  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-2xl text-sm font-semibold shadow-xl
          ${toast.ok ? "bg-emerald-500 text-white" : "bg-red-500 text-white"}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/surat-keluar")}
            className="p-2 rounded-xl hover:bg-gray-100 text-gray-400">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
          </button>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-black text-gray-900">
                {surat.nomor_surat ?? <span className="text-gray-400 italic text-base">Draft — belum bernomor</span>}
              </h1>
              <StatusBadge status={surat.status} />
            </div>
            <p className="text-xs text-gray-400 mt-0.5">{surat.perihal}</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 flex-wrap">
          <button onClick={printSurat}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 font-semibold hover:bg-gray-50">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/>
              <rect x="6" y="14" width="12" height="8"/>
            </svg>
            Cetak / PDF
          </button>
          {canEdit && (
            <button onClick={() => router.push(`/surat-keluar/buat?edit=${surat.id}`)}
              className="px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 font-semibold hover:bg-gray-50">
              Edit
            </button>
          )}
          {canSubmit && (
            <button onClick={handleSubmit} disabled={acting}
              className="px-4 py-2 rounded-xl bg-yellow-500 text-white font-bold text-sm hover:bg-yellow-600 disabled:opacity-50">
              Ajukan Approval
            </button>
          )}
          {canApprove && (
            <>
              <button onClick={() => setShowTolak(true)} disabled={acting}
                className="px-4 py-2 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 disabled:opacity-50">
                Tolak
              </button>
              <button onClick={handleApprove} disabled={acting}
                className="px-4 py-2 rounded-xl bg-green-700 text-white font-bold text-sm hover:bg-green-800 disabled:opacity-50">
                {acting ? "..." : "✓ Setujui"}
              </button>
            </>
          )}
          {canPublish && (
            <button onClick={handlePublish} disabled={acting}
              className="px-4 py-2 rounded-xl bg-green-700 text-white font-bold text-sm hover:bg-green-800 disabled:opacity-50">
              {acting ? "..." : "Terbitkan + Generate Nomor"}
            </button>
          )}
          {canArchive && (
            <button onClick={handleArchive} disabled={acting}
              className="px-4 py-2 rounded-xl border border-gray-300 text-gray-600 font-semibold text-sm hover:bg-gray-50 disabled:opacity-50">
              Arsipkan
            </button>
          )}
        </div>
      </div>

      {/* QR Verification link — only for Diterbitkan */}
      {surat.status === "Diterbitkan" && surat.id && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center justify-between">
          <div className="text-sm">
            <span className="font-bold text-green-800">✓ Surat Resmi Diterbitkan</span>
            <span className="text-green-600 ml-2 text-xs">Nomor: {surat.nomor_surat}</span>
          </div>
          <a href={`/verifikasi-surat/${surat.id}`} target="_blank" rel="noopener noreferrer"
            className="text-xs font-bold text-green-700 hover:text-green-900 underline">
            Link Verifikasi QR →
          </a>
        </div>
      )}

      {/* Rejection note */}
      {surat.status === "Ditolak" && surat.alasan_tolak && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <p className="text-sm font-bold text-red-800">Alasan Penolakan:</p>
          <p className="text-sm text-red-700 mt-1">{surat.alasan_tolak}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-0 border-b border-gray-100">
        {(["detail","audit","preview"] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-5 py-3 text-sm font-bold capitalize transition-colors border-b-2 ${
              activeTab === tab ? "border-green-600 text-green-700" : "border-transparent text-gray-400 hover:text-gray-700"
            }`}>
            {tab === "detail" ? "Detail Surat" : tab === "audit" ? "Audit Log" : "Preview"}
          </button>
        ))}
      </div>

      {/* ─── Detail Tab ─────────────────────────────────────────── */}
      {activeTab === "detail" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            {[
              ["Nomor Surat",  surat.nomor_surat ?? "(belum bernomor)"],
              ["Jenis",        `${surat.jenis_surat?.kode_surat} — ${surat.jenis_surat?.nama_surat}`],
              ["Lokasi",       `${surat.lokasi?.kode_lokasi} — ${surat.lokasi?.nama_lokasi}`],
              ["Tanggal",      formatTanggal(surat.tanggal_surat)],
              ["Lampiran",     surat.lampiran ?? "—"],
              ["Template",     surat.template?.nama_template ?? "Tanpa template"],
            ].map(([k, v]) => (
              <div key={k} className="space-y-0.5">
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wide">{k}</p>
                <p className="font-semibold text-gray-800">{v}</p>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-50 pt-4">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Kepada</p>
            <p className="text-gray-800">{surat.tujuan}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Perihal</p>
            <p className="text-gray-800">{surat.perihal}</p>
          </div>
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Isi Surat</p>
            <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-700 whitespace-pre-wrap font-serif leading-relaxed max-h-64 overflow-y-auto">
              {surat.isi_surat}
            </div>
          </div>

          {/* Data tabel dinamis */}
          {surat.data_surat?.tabel?.length > 0 && (
            <div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Tabel Lampiran</p>
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr>
                      {(surat.data_surat.kolom ?? Object.keys(surat.data_surat.tabel[0])).map((c: string) => (
                        <th key={c} className="px-3 py-2 text-left font-bold text-gray-600">{c}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {surat.data_surat.tabel.map((row: any, i: number) => (
                      <tr key={i} className="hover:bg-gray-50">
                        {(surat.data_surat.kolom ?? Object.keys(row)).map((c: string) => (
                          <td key={c} className="px-3 py-2 text-gray-700">{row[c]}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Penandatangan */}
          {surat.penandatangan && (
            <div className="border-t border-gray-50 pt-4 flex items-center gap-4">
              {surat.penandatangan.ttd_url && (
                <img src={surat.penandatangan.ttd_url} alt="TTD"
                  className="h-16 object-contain border border-gray-200 rounded-xl p-2 bg-white" />
              )}
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1">Penandatangan</p>
                <p className="font-bold text-gray-800">{surat.penandatangan.nama}</p>
                <p className="text-sm text-gray-500">{surat.penandatangan.jabatan}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Audit Tab ──────────────────────────────────────────── */}
      {activeTab === "audit" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50">
          {auditLog.length === 0 && (
            <div className="py-12 text-center text-gray-400 text-sm">Belum ada aktivitas tercatat</div>
          )}
          {auditLog.map(a => (
            <div key={a.id} className="flex items-start gap-4 px-5 py-4">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg viewBox="0 0 24 24" fill="none" stroke="#15803D" strokeWidth="2" className="w-4 h-4">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-800 text-sm">{a.aktivitas}</p>
                {a.keterangan && <p className="text-xs text-gray-400 mt-0.5">{a.keterangan}</p>}
              </div>
              <p className="text-xs text-gray-400 whitespace-nowrap">
                {new Date(a.created_at).toLocaleString("id-ID", { dateStyle:"short", timeStyle:"short" })}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ─── Preview Tab ─────────────────────────────────────────── */}
      {activeTab === "preview" && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm font-bold text-gray-700">Preview Surat (format cetak)</p>
            <button onClick={printSurat}
              className="px-4 py-2 rounded-xl bg-green-700 text-white text-sm font-bold hover:bg-green-800">
              Cetak / Export PDF
            </button>
          </div>
          <div className="border border-gray-200 rounded-xl overflow-hidden bg-gray-50 p-4 text-xs text-gray-500 text-center py-12">
            <p className="text-2xl mb-2">📄</p>
            <p className="font-semibold">Klik "Cetak / Export PDF" untuk buka preview surat dalam tab baru</p>
            <p className="mt-1">Gunakan Ctrl+P atau menu Print browser untuk save sebagai PDF</p>
          </div>
        </div>
      )}

      {/* ─── Tolak Modal ─────────────────────────────────────────── */}
      {showTolak && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setShowTolak(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="font-black text-gray-900 mb-4">Tolak Surat</h3>
            <textarea value={alasan} onChange={e => setAlasan(e.target.value)} rows={4}
              placeholder="Alasan penolakan (wajib diisi)..."
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-300" />
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowTolak(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50">
                Batal
              </button>
              <button onClick={handleTolak} disabled={acting || !alasan.trim()}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 disabled:opacity-50">
                {acting ? "..." : "Tolak Surat"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
