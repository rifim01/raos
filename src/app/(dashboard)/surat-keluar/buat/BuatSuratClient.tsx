"use client";

import { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { DEFAULT_TEMPLATE } from "@/lib/surat/pdf";

/* ─── Types ──────────────────────────────────────────────────────────────── */
interface Lokasi      { id: string; kode_lokasi: string; nama_lokasi: string; status: string; }
interface JenisSurat  { id: string; kode_surat: string;  nama_surat: string; }
interface Penandatangan { id: string; nama: string; jabatan: string; lokasi: string; ttd_url: string | null; }
interface Template    { id: string; nama_template: string; kode_surat: string; isi_template: string; }
interface Me          { id: string; role_id: number; airport_id: string; full_name: string; }

interface TabelRow { [key: string]: string; }

/* ─── Table editor ───────────────────────────────────────────────────────── */
function TabelEditor({ kolom, rows, onChange }: {
  kolom: string[]; rows: TabelRow[];
  onChange: (r: TabelRow[]) => void;
}) {
  function updateCell(ri: number, col: string, val: string) {
    const next = rows.map((r, i) => i === ri ? { ...r, [col]: val } : r);
    onChange(next);
  }
  function addRow() { onChange([...rows, Object.fromEntries(kolom.map(c => [c, ""]))]); }
  function delRow(i: number) { onChange(rows.filter((_, j) => j !== i)); }

  if (kolom.length === 0) return null;
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full text-xs">
        <thead className="bg-gray-50">
          <tr>
            {kolom.map(c => <th key={c} className="px-3 py-2 text-left font-bold text-gray-600">{c}</th>)}
            <th className="w-8" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row, ri) => (
            <tr key={ri}>
              {kolom.map(c => (
                <td key={c} className="px-1 py-1">
                  <input value={row[c] ?? ""} onChange={e => updateCell(ri, c, e.target.value)}
                    className="w-full px-2 py-1 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-green-400 bg-white" />
                </td>
              ))}
              <td className="px-1">
                <button onClick={() => delRow(ri)} className="text-red-400 hover:text-red-600 font-bold px-1">×</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <button onClick={addRow}
        className="w-full py-2 text-xs font-semibold text-green-700 hover:bg-green-50 transition-colors border-t border-gray-100">
        + Tambah Baris
      </button>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
interface Props {
  lokasi: Lokasi[]; jenisSurat: JenisSurat[]; penandatangan: Penandatangan[];
  templates: Template[]; pengaturan: any;
  me: Me; isDirector: boolean; userLokasiId: string | null;
}

export default function BuatSuratClient({
  lokasi, jenisSurat, penandatangan, templates, pengaturan,
  me, isDirector, userLokasiId,
}: Props) {
  const router  = useRouter();
  const supabase = createClient();
  const [saving, startSave] = useTransition();
  const [toast,  setToast]  = useState<string | null>(null);
  const [step,   setStep]   = useState(1);

  /* ── Form state ── */
  const [lokasiId,         setLokasiId]         = useState(userLokasiId ?? "");
  const [jenisSuratId,     setJenisSuratId]     = useState("");
  const [perihal,          setPerihal]          = useState("");
  const [tujuan,           setTujuan]           = useState("");
  const [lampiran,         setLampiran]         = useState("");
  const [tanggalSurat,     setTanggalSurat]     = useState(new Date().toISOString().slice(0,10));
  const [isiSurat,         setIsiSurat]         = useState("");
  const [templateId,       setTemplateId]       = useState("");
  const [penandatanganId,  setPenandatanganId]  = useState("");
  const [hasTabel,         setHasTabel]         = useState(false);
  const [tabelKolom,       setTabelKolom]       = useState<string[]>(["No","Nama","Keterangan"]);
  const [tabelRows,        setTabelRows]        = useState<TabelRow[]>([]);
  const [kolomInput,       setKolomInput]       = useState("No,Nama,Keterangan");
  const [submitLangsung,   setSubmitLangsung]   = useState(false);

  // Auto-fill template when jenis changes
  useEffect(() => {
    if (!jenisSuratId) return;
    const jenis = jenisSurat.find(j => j.id === jenisSuratId);
    const tpl   = templates.find(t => t.kode_surat === jenis?.kode_surat);
    if (tpl) { setTemplateId(tpl.id); setIsiSurat(tpl.isi_template); }
    else      { setTemplateId(""); }
  }, [jenisSuratId, jenisSurat, templates]);

  function applyKolom() {
    const cols = kolomInput.split(",").map(s => s.trim()).filter(Boolean);
    setTabelKolom(cols);
    setTabelRows([Object.fromEntries(cols.map(c => [c, ""]))]);
  }

  const selJenis     = jenisSurat.find(j => j.id === jenisSuratId);
  const selPenanda   = penandatangan.find(p => p.id === penandatanganId);
  const selLokasi    = lokasi.find(l => l.id === lokasiId);

  async function handleSave(asDraft: boolean) {
    if (!lokasiId || !jenisSuratId || !perihal || !tujuan) {
      setToast("Isi semua field wajib: lokasi, jenis, perihal, tujuan"); return;
    }

    startSave(async () => {
      const dataSurat = hasTabel ? { tabel: tabelRows, kolom: tabelKolom } : null;
      const status = asDraft ? "Draft" : "Menunggu Persetujuan";

      const payload: any = {
        lokasi_id:        lokasiId,
        jenis_surat_id:   jenisSuratId,
        perihal,
        tujuan,
        lampiran:         lampiran || null,
        tanggal_surat:    tanggalSurat,
        isi_surat:        isiSurat,
        data_surat:       dataSurat,
        template_id:      templateId || null,
        penandatangan_id: penandatanganId || null,
        status,
        created_by:       me.id,
      };

      const { data: newSurat, error } = await (supabase as any)
        .from("surat_keluar")
        .insert(payload)
        .select("id")
        .single();

      if (error) { setToast(error.message); return; }

      // Audit log
      await (supabase as any).from("audit_surat").insert({
        surat_id:  newSurat.id,
        user_id:   me.id,
        aktivitas: status === "Draft" ? "Surat dibuat" : "Surat diajukan",
        keterangan: `Dibuat oleh ${me.full_name}`,
      });

      router.push(`/surat-keluar/${newSurat.id}`);
    });
  }

  /* ── Step indicator ─────────────────────────── */
  const steps = ["Informasi Dasar", "Isi Surat", "Penandatangan"];

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-5 py-3 rounded-2xl bg-red-500 text-white text-sm font-semibold shadow-xl">
          {toast}
          <button onClick={() => setToast(null)} className="ml-3 opacity-70 hover:opacity-100">×</button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => router.push("/surat-keluar")}
          className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 transition-colors">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
        </button>
        <div>
          <h1 className="text-xl font-black text-gray-900">Buat Surat Keluar</h1>
          <p className="text-xs text-gray-400">PT Rifim International Gemilang</p>
        </div>
      </div>

      {/* Step indicator */}
      <div className="flex gap-0">
        {steps.map((s, i) => (
          <button key={i} onClick={() => setStep(i+1)}
            className={`flex-1 py-3 text-xs font-bold border-b-2 transition-colors ${
              step === i+1 ? "border-green-600 text-green-700 bg-green-50" :
              step > i+1   ? "border-green-300 text-green-500 bg-green-50/30" :
              "border-gray-200 text-gray-400 bg-white"
            }`}>
            <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] mr-1.5 font-black
              ${step >= i+1 ? "bg-green-600 text-white" : "bg-gray-200 text-gray-500"}`}>{i+1}</span>
            {s}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">

        {/* ─── Step 1: Informasi Dasar ─────────────────────────── */}
        {step === 1 && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">
                  Lokasi / Cabang <span className="text-red-500">*</span>
                </label>
                <select value={lokasiId} onChange={e => setLokasiId(e.target.value)}
                  disabled={!isDirector && !!userLokasiId}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-300 disabled:bg-gray-50 disabled:text-gray-500">
                  <option value="">-- Pilih Lokasi --</option>
                  {lokasi.map(l => (
                    <option key={l.id} value={l.id}>
                      {l.kode_lokasi} — {l.nama_lokasi}{l.status === "planned" ? " (Ekspansi)" : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">
                  Jenis Surat <span className="text-red-500">*</span>
                </label>
                <select value={jenisSuratId} onChange={e => setJenisSuratId(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-300">
                  <option value="">-- Pilih Jenis --</option>
                  {jenisSurat.map(j => <option key={j.id} value={j.id}>{j.kode_surat} — {j.nama_surat}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">
                Perihal <span className="text-red-500">*</span>
              </label>
              <input value={perihal} onChange={e => setPerihal(e.target.value)}
                placeholder="Contoh: Permohonan Member Parkir Karyawan PT. Rifim"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300" />
            </div>

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">
                Kepada (Tujuan) <span className="text-red-500">*</span>
              </label>
              <input value={tujuan} onChange={e => setTujuan(e.target.value)}
                placeholder="Contoh: Yth. Direktur PT. Angkasa Pura Indonesia"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">Tanggal Surat</label>
                <input type="date" value={tanggalSurat} onChange={e => setTanggalSurat(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">Lampiran</label>
                <input value={lampiran} onChange={e => setLampiran(e.target.value)}
                  placeholder="Contoh: 1 (satu) berkas"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-300" />
              </div>
            </div>

            {/* Format nomor info */}
            {selJenis && selLokasi && (
              <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 text-xs text-green-700">
                <span className="font-bold">Format nomor:</span>{" "}
                <span className="font-mono">{pengaturan?.format_nomor_surat?.replace("{nomor}", "XXX").replace("{jenis}", selJenis.kode_surat).replace("{lokasi}", selLokasi.kode_lokasi).replace("{bulan_romawi}", ["I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII"][new Date(tanggalSurat).getMonth()]).replace("{tahun}", String(new Date(tanggalSurat).getFullYear()))}</span>
                {" "}(nomor urut ditentukan otomatis saat diterbitkan)
              </div>
            )}

            <div className="flex justify-end">
              <button onClick={() => setStep(2)} disabled={!lokasiId || !jenisSuratId || !perihal || !tujuan}
                className="px-6 py-2.5 rounded-xl bg-green-700 text-white font-bold text-sm hover:bg-green-800 disabled:opacity-40 transition-colors">
                Lanjut →
              </button>
            </div>
          </>
        )}

        {/* ─── Step 2: Isi Surat ───────────────────────────────── */}
        {step === 2 && (
          <>
            {templateId && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-2 text-xs text-blue-700">
                Template: <strong>{templates.find(t=>t.id===templateId)?.nama_template}</strong>
                {" — edit isi di bawah atau hapus untuk input bebas."}
              </div>
            )}

            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">Isi Surat</label>
              <textarea value={isiSurat} onChange={e => setIsiSurat(e.target.value)} rows={10}
                placeholder="Tulis isi surat di sini. Gunakan placeholder: {{perihal}}, {{tujuan}}, {{tabel_lampiran}} untuk tabel dinamis..."
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-mono resize-y focus:outline-none focus:ring-2 focus:ring-green-300" />
              <p className="text-[11px] text-gray-400 mt-1">
                Placeholder: {"{{perihal}} {{tujuan}} {{nomor_surat}} {{tanggal}} {{tabel_lampiran}}"}
              </p>
            </div>

            {/* Dynamic table */}
            <div className="border border-gray-100 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <input type="checkbox" id="hasTabel" checked={hasTabel}
                  onChange={e => setHasTabel(e.target.checked)}
                  className="w-4 h-4 accent-green-600" />
                <label htmlFor="hasTabel" className="text-sm font-semibold text-gray-700">
                  Tambah tabel data dinamis ({"{{tabel_lampiran}}"})
                </label>
              </div>
              {hasTabel && (
                <>
                  <div className="flex gap-2">
                    <input value={kolomInput} onChange={e => setKolomInput(e.target.value)}
                      placeholder="Kolom1,Kolom2,Kolom3"
                      className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-300" />
                    <button onClick={applyKolom}
                      className="px-4 py-2 rounded-xl bg-green-700 text-white text-sm font-bold hover:bg-green-800">
                      Set Kolom
                    </button>
                  </div>
                  <TabelEditor kolom={tabelKolom} rows={tabelRows} onChange={setTabelRows} />
                </>
              )}
            </div>

            <div className="flex justify-between">
              <button onClick={() => setStep(1)} className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50">
                ← Kembali
              </button>
              <button onClick={() => setStep(3)} disabled={!isiSurat}
                className="px-6 py-2.5 rounded-xl bg-green-700 text-white font-bold text-sm hover:bg-green-800 disabled:opacity-40">
                Lanjut →
              </button>
            </div>
          </>
        )}

        {/* ─── Step 3: Penandatangan & Submit ──────────────────── */}
        {step === 3 && (
          <>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5 block">Penandatangan</label>
              <select value={penandatanganId} onChange={e => setPenandatanganId(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-300">
                <option value="">-- Pilih Penandatangan (opsional) --</option>
                {penandatangan.map(p => (
                  <option key={p.id} value={p.id}>{p.nama} — {p.jabatan}</option>
                ))}
              </select>
              {selPenanda && (
                <div className="mt-2 flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                  {selPenanda.ttd_url
                    ? <img src={selPenanda.ttd_url} alt="ttd" className="h-12 object-contain border border-gray-200 rounded-lg p-1 bg-white" />
                    : <div className="h-12 w-24 border border-dashed border-gray-300 rounded-lg flex items-center justify-center text-[10px] text-gray-400">Belum upload TTD</div>
                  }
                  <div>
                    <p className="font-semibold text-sm text-gray-800">{selPenanda.nama}</p>
                    <p className="text-xs text-gray-400">{selPenanda.jabatan}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Summary */}
            <div className="bg-gray-50 rounded-2xl p-4 space-y-2 text-sm">
              <p className="font-bold text-gray-700 text-xs uppercase tracking-wide mb-3">Ringkasan Surat</p>
              {[
                ["Lokasi", selLokasi ? `${selLokasi.kode_lokasi} — ${selLokasi.nama_lokasi}` : "—"],
                ["Jenis", selJenis ? `${selJenis.kode_surat} — ${selJenis.nama_surat}` : "—"],
                ["Perihal", perihal],
                ["Tujuan", tujuan],
                ["Tanggal", tanggalSurat],
                ["Lampiran", lampiran || "—"],
              ].map(([k, v]) => (
                <div key={k} className="flex gap-3">
                  <span className="text-gray-400 w-20 flex-shrink-0 text-xs">{k}</span>
                  <span className="text-gray-700 font-medium text-xs flex-1 truncate">{v}</span>
                </div>
              ))}
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800">
              <strong>Approval Wajib:</strong> Semua surat wajib mendapat persetujuan Direktur sebelum diterbitkan.
              Surat akan berstatus "Menunggu Persetujuan" setelah diajukan.
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50">
                ← Kembali
              </button>
              <button onClick={() => handleSave(true)} disabled={saving}
                className="flex-1 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-semibold text-sm hover:bg-gray-50 disabled:opacity-50 transition-colors">
                {saving ? "Menyimpan..." : "Simpan Draft"}
              </button>
              <button onClick={() => handleSave(false)} disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-green-700 text-white font-bold text-sm hover:bg-green-800 disabled:opacity-50 transition-colors">
                {saving ? "Mengajukan..." : "Ajukan untuk Approval"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
