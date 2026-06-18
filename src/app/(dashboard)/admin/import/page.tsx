"use client";

import { useState } from "react";
import { PRESET_SHEETS, type PresetSheet } from "@/lib/import/sheets";

const AIRPORTS = [
  { code: "BTH001", label: "Batam (BTH001)" },
  { code: "DJB001", label: "Jambi (DJB001)" },
  { code: "UPG001", label: "Makassar (UPG001)" },
  { code: "BPN001", label: "Balikpapan (BPN001)" },
  { code: "MDC001", label: "Manado (MDC001)" },
  { code: "PKU001", label: "Pekanbaru (PKU001)" },
  { code: "CGK001", label: "Tangerang (CGK001)" },
];

function presetDisplayLabel(preset: PresetSheet): string {
  if (preset.type === "staff") return `📋 ${preset.label}`;
  if (preset.type === "driver_external") return `🚕 ${preset.label.replace("Ext.", "External")}`;
  return `🚕 ${preset.label}`;
}

function parseTSV(text: string): Record<string, string>[] {
  const lines = text.trim().split("\n").filter(l => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split("\t").map(h => h.trim());
  return lines.slice(1).map(line => {
    const cells = line.split("\t");
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = (cells[i] || "").trim(); });
    return row;
  }).filter(r => Object.values(r).some(v => v));
}

type Mode = "url" | "paste";

export default function ImportPage() {
  const [mode, setMode] = useState<Mode>("url");
  const [sheetsUrl, setSheetsUrl] = useState("");
  const [dataType, setDataType] = useState<"driver" | "driver_external" | "staff">("staff");
  const [airportCode, setAirportCode] = useState("");
  const [pasteData, setPasteData] = useState("");
  const [preview, setPreview] = useState<Record<string, string>[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success?: boolean; imported?: number; rows_fetched?: number; headers?: string[]; error?: string } | null>(null);

  function applyPreset(preset: PresetSheet) {
    setSheetsUrl(preset.url);
    setDataType(preset.type === "driver_external" ? "driver_external" : preset.type as "driver" | "staff");
    setAirportCode(preset.airport);
    setResult(null);
  }

  async function handleUrlImport() {
    if (!sheetsUrl.trim()) return;
    setLoading(true);
    setResult(null);
    const res = await fetch("/api/import/from-sheets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: sheetsUrl,
        airport_code: airportCode || "BTH001",
        data_type: dataType === "driver_external" ? "driver" : dataType,
        driver_type: dataType === "driver_external" ? "EXTERNAL" : "INTERNAL",
      }),
    });
    const data = await res.json();
    setResult(data);
    setLoading(false);
  }

  function handleParse() {
    setPreview(parseTSV(pasteData));
    setResult(null);
  }

  async function handlePasteImport() {
    if (!preview.length) return;
    setLoading(true);
    setResult(null);
    const endpoint = dataType === "staff" ? "/api/import/staff" : "/api/import/drivers";
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows: preview, airport_code: airportCode || "BTH001", type: dataType === "driver_external" ? "EXTERNAL" : "INTERNAL" }),
    });
    const data = await res.json();
    setResult(data);
    setLoading(false);
    if (data.success) { setPasteData(""); setPreview([]); }
  }

  const previewHeaders = preview.length ? Object.keys(preview[0]) : (result?.headers ?? []);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-gray-800">Import Data dari Google Sheets</h1>
        <p className="text-gray-500 text-sm mt-1">Sync data driver & staff langsung dari Google Sheets ke database RAOS</p>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl mb-6 w-fit">
        {[{ k: "url", label: "🔗 Dari Link Google Sheets" }, { k: "paste", label: "📋 Copy-Paste Manual" }].map(m => (
          <button key={m.k} onClick={() => { setMode(m.k as Mode); setResult(null); }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${mode === m.k ? "bg-white text-[#1565C0] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            {m.label}
          </button>
        ))}
      </div>

      {mode === "url" ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          {/* Preset buttons */}
          <div className="mb-5">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Pilih Sheet Cepat</p>
            <div className="flex flex-wrap gap-2">
              {PRESET_SHEETS.map((p, i) => (
                <button key={i} onClick={() => applyPreset(p)}
                  className="px-3 py-1.5 bg-gray-50 hover:bg-blue-50 hover:text-[#1565C0] border border-gray-200 hover:border-blue-200 rounded-lg text-xs font-medium transition-all">
                  {presetDisplayLabel(p)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 mb-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Link Google Sheets</label>
              <input type="url" value={sheetsUrl} onChange={e => { setSheetsUrl(e.target.value); setResult(null); }}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1565C0]" />
              <p className="text-xs text-amber-600 mt-1">⚠️ Sheet harus diset "Anyone with link can view" agar bisa diakses</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Jenis Data</label>
                <select value={dataType} onChange={e => setDataType(e.target.value as typeof dataType)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1565C0]">
                  <option value="staff">Staff</option>
                  <option value="driver">Driver Internal</option>
                  <option value="driver_external">Driver External</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Bandara</label>
                <select value={airportCode} onChange={e => setAirportCode(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1565C0]">
                  <option value="">Auto-detect dari kolom</option>
                  {AIRPORTS.map(a => <option key={a.code} value={a.code}>{a.label}</option>)}
                </select>
              </div>
            </div>
          </div>

          <button onClick={handleUrlImport} disabled={!sheetsUrl.trim() || loading}
            className="w-full py-3 rounded-xl bg-[#1565C0] hover:bg-[#0d47a1] text-white font-bold text-sm disabled:opacity-50 transition-all flex items-center justify-center gap-2">
            {loading ? (<><svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Mengambil & Mengimpor...</>) : "⬆ Import dari Google Sheets"}
          </button>

          {result && (
            <div className={`mt-4 p-4 rounded-xl text-sm font-medium ${result.success ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-700"}`}>
              {result.success
                ? `✅ Berhasil import ${result.imported} data dari ${result.rows_fetched} baris sheet!`
                : `❌ ${result.error}`}
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Jenis Data</label>
              <select value={dataType} onChange={e => setDataType(e.target.value as typeof dataType)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1565C0]">
                <option value="staff">Staff</option>
                <option value="driver">Driver Internal</option>
                <option value="driver_external">Driver External</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Bandara</label>
              <select value={airportCode} onChange={e => setAirportCode(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1565C0]">
                {AIRPORTS.map(a => <option key={a.code} value={a.code}>{a.label}</option>)}
              </select>
            </div>
          </div>
          <textarea value={pasteData} onChange={e => { setPasteData(e.target.value); setPreview([]); }}
            placeholder={"Buka Google Sheets → Ctrl+A → Ctrl+C → Ctrl+V di sini\n\nBaris pertama harus berisi header kolom."}
            rows={8} className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1565C0] resize-y mb-3" />
          <div className="flex gap-3">
            <button onClick={handleParse} disabled={!pasteData.trim()}
              className="px-5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-semibold text-gray-700 disabled:opacity-50 transition-all">
              👁 Preview ({parseTSV(pasteData).length} baris)
            </button>
            <button onClick={handlePasteImport} disabled={!preview.length || loading}
              className="px-5 py-2.5 rounded-xl bg-[#1565C0] hover:bg-[#0d47a1] text-white text-sm font-semibold disabled:opacity-50 transition-all flex items-center gap-2">
              {loading ? "Mengimpor..." : `⬆ Import ${preview.length} Data`}
            </button>
          </div>
          {result && (
            <div className={`mt-4 p-4 rounded-xl text-sm font-medium ${result.success ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-700"}`}>
              {result.success ? `✅ Berhasil import ${result.imported} data!` : `❌ ${result.error}`}
            </div>
          )}
        </div>
      )}

      {/* Preview table */}
      {previewHeaders.length > 0 && preview.length > 0 && (
        <div className="mt-6 bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
          <p className="text-sm font-semibold text-gray-700 mb-3">Preview ({preview.length} baris)</p>
          <div className="overflow-x-auto rounded-xl border border-gray-100">
            <table className="w-full text-xs">
              <thead className="bg-gray-50"><tr>
                <th className="px-3 py-2 text-left text-gray-400">#</th>
                {previewHeaders.map(h => <th key={h} className="px-3 py-2 text-left text-gray-500 font-semibold whitespace-nowrap">{h}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {preview.slice(0, 8).map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-400">{i+1}</td>
                    {previewHeaders.map(h => <td key={h} className="px-3 py-2 text-gray-700 whitespace-nowrap max-w-[130px] truncate">{row[h] || <span className="text-gray-300">-</span>}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
            {preview.length > 8 && <p className="px-3 py-2 text-xs text-gray-400 bg-gray-50">+{preview.length - 8} baris lagi</p>}
          </div>
        </div>
      )}
    </div>
  );
}
