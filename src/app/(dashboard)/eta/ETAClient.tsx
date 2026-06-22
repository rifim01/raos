"use client";

import { useState, useEffect, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";

interface Airport { id: string; code: string; city: string; latitude: number; longitude: number; radius_meter: number; }
interface Driver  { id: string; nama: string; kode_driver: string; tipe: string; status: string; airports: any; }
interface ETARow  {
  id: string; jarak_km: number; eta_menit: number; eta_tiba_at: string;
  status: string; tiba_at: string | null; durasi_aktual_menit: number | null;
  created_at: string; lat_driver: number; lng_driver: number;
  driver: { id: string; nama: string; kode_driver: string; tipe: string } | null;
}

interface Props {
  airports: Airport[]; etaList?: ETARow[]; drivers?: Driver[];
  userRoleLevel: number; userAirportId: string | null;
}

/* ─── Haversine distance ─── */
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

function etaMinutes(km: number, avgKmh = 40): number {
  return Math.round((km / avgKmh) * 60);
}

function formatETA(menit: number): string {
  if (menit <= 0) return "Sudah tiba";
  if (menit < 60) return `${menit} mnt`;
  const h = Math.floor(menit/60);
  const m = menit % 60;
  return `${h}j ${m}m`;
}

function statusColor(status: string) {
  if (status === "ARRIVED") return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (status === "ON_WAY")  return "bg-blue-100 text-blue-700 border-blue-200";
  return "bg-gray-100 text-gray-500 border-gray-200";
}

function etaColor(menit: number) {
  if (menit <= 5)  return "text-emerald-600";
  if (menit <= 15) return "text-yellow-600";
  return "text-red-500";
}

export default function ETAClient({ airports, etaList = [], drivers = [], userRoleLevel, userAirportId }: Props) {
  const [rows, setRows] = useState<ETARow[]>(etaList);
  const [selAirport, setSelAirport] = useState<Airport | null>(airports[0] ?? null);
  const [form, setForm] = useState({ driver_id: "", lat: "", lng: "" });
  const [saving, startSave] = useTransition();
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [now, setNow] = useState(new Date());
  const supabase = createClient();

  // Tick setiap menit untuk update countdown
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  // Supabase Realtime subscription
  useEffect(() => {
    const ch = supabase
      .channel("eta_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "eta_records" }, payload => {
        if (payload.eventType === "INSERT") {
          setRows(r => [payload.new as ETARow, ...r.slice(0, 49)]);
        } else if (payload.eventType === "UPDATE") {
          setRows(r => r.map(x => x.id === (payload.new as ETARow).id ? payload.new as ETARow : x));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  function handleSave() {
    startSave(async () => {
      if (!form.driver_id || !selAirport) { setToast({ msg: "Pilih driver dan bandara", ok: false }); return; }
      const lat = parseFloat(form.lat);
      const lng = parseFloat(form.lng);
      if (isNaN(lat) || isNaN(lng)) { setToast({ msg: "Koordinat tidak valid", ok: false }); return; }

      const km = haversine(lat, lng, selAirport.latitude, selAirport.longitude);
      const menit = etaMinutes(km);
      const etaTiba = new Date(Date.now() + menit * 60000).toISOString();

      const { error } = await (supabase as any).from("eta_records").insert({
        driver_id: form.driver_id,
        airport_id: selAirport.id,
        lat_driver: lat, lng_driver: lng,
        lat_airport: selAirport.latitude, lng_airport: selAirport.longitude,
        jarak_km: km.toFixed(2),
        eta_menit: menit,
        eta_tiba_at: etaTiba,
        status: "ON_WAY",
      });

      if (error) { setToast({ msg: error.message, ok: false }); }
      else {
        setToast({ msg: `ETA dihitung: ${formatETA(menit)} (${km.toFixed(1)} km)`, ok: true });
        setForm(f => ({ ...f, driver_id: "", lat: "", lng: "" }));
        setTimeout(() => setToast(null), 4000);
      }
    });
  }

  async function markArrived(id: string) {
    const tiba = new Date().toISOString();
    const row = rows.find(r => r.id === id);
    const durasi = row ? Math.round((Date.now() - new Date(row.created_at).getTime()) / 60000) : null;
    await (supabase as any).from("eta_records").update({ status: "ARRIVED", tiba_at: tiba, durasi_aktual_menit: durasi }).eq("id", id);
    setRows(r => r.map(x => x.id === id ? { ...x, status: "ARRIVED", tiba_at: tiba, durasi_aktual_menit: durasi } : x));
    setToast({ msg: "Driver sudah tiba!", ok: true });
    setTimeout(() => setToast(null), 3000);
  }

  const onWay   = rows.filter(r => r.status === "ON_WAY");
  const arrived = rows.filter(r => r.status === "ARRIVED");

  return (
    <div className="space-y-6">
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-2xl text-sm font-semibold shadow-xl ${toast.ok ? "bg-emerald-500 text-white" : "bg-red-500 text-white"}`}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-2xl font-black" style={{ color: "var(--text-primary)" }}>ETA Monitoring</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
          Estimasi waktu tiba driver ke bandara — realtime
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
          <p className="text-3xl font-black text-blue-700">{onWay.length}</p>
          <p className="text-xs font-bold uppercase tracking-wide text-blue-500 mt-1">Dalam Perjalanan</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
          <p className="text-3xl font-black text-emerald-700">{arrived.length}</p>
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-500 mt-1">Sudah Tiba</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <p className="text-3xl font-black text-amber-700">
            {onWay.length > 0 ? Math.round(onWay.reduce((s, r) => s + (r.eta_menit ?? 0), 0) / onWay.length) : "—"}
          </p>
          <p className="text-xs font-bold uppercase tracking-wide text-amber-500 mt-1">Avg ETA (menit)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─── Input Panel ─── */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
            <h2 className="font-bold text-gray-800 text-sm flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-[#FFD600] text-black text-xs font-black flex items-center justify-center">+</span>
              Tambah ETA Driver
            </h2>

            {/* Airport selector */}
            <div>
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5 block">Bandara Tujuan</label>
              <select value={selAirport?.id ?? ""} onChange={e => setSelAirport(airports.find(a => a.id === e.target.value) ?? null)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-yellow-300">
                {airports.map(a => <option key={a.id} value={a.id}>✈ {a.city} ({a.code})</option>)}
              </select>
              {selAirport && (
                <p className="text-xs text-gray-400 mt-1">
                  📍 {selAirport.latitude.toFixed(6)}, {selAirport.longitude.toFixed(6)} · radius {selAirport.radius_meter}m
                </p>
              )}
            </div>

            {/* Driver */}
            <div>
              <label className="text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5 block">Driver</label>
              <select value={form.driver_id} onChange={e => setForm(f => ({ ...f, driver_id: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-yellow-300">
                <option value="">-- Pilih Driver --</option>
                {drivers.map((d: Driver) => <option key={d.id} value={d.id}>{d.nama} ({d.tipe})</option>)}
              </select>
            </div>

            {/* Koordinat driver */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-bold text-gray-600 mb-1.5 block">Latitude Driver</label>
                <input type="number" step="0.000001" value={form.lat}
                  onChange={e => setForm(f => ({ ...f, lat: e.target.value }))}
                  placeholder="-1.260194"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-600 mb-1.5 block">Longitude Driver</label>
                <input type="number" step="0.000001" value={form.lng}
                  onChange={e => setForm(f => ({ ...f, lng: e.target.value }))}
                  placeholder="116.900083"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300" />
              </div>
            </div>

            {/* Preview kalkulasi */}
            {form.lat && form.lng && selAirport && !isNaN(parseFloat(form.lat)) && !isNaN(parseFloat(form.lng)) && (
              <div className="rounded-xl bg-blue-50 border border-blue-200 p-3">
                {(() => {
                  const km = haversine(parseFloat(form.lat), parseFloat(form.lng), selAirport.latitude, selAirport.longitude);
                  const mnt = etaMinutes(km);
                  return (
                    <>
                      <p className="text-xs font-bold text-blue-700">Preview ETA</p>
                      <p className="text-2xl font-black text-gray-900 mt-1">{formatETA(mnt)}</p>
                      <p className="text-xs text-gray-500">Jarak: {km.toFixed(1)} km · Avg 40 km/h</p>
                    </>
                  );
                })()}
              </div>
            )}

            <button onClick={handleSave} disabled={saving}
              className="w-full py-2.5 rounded-xl bg-[#FFD600] text-black font-bold text-sm hover:bg-yellow-400 disabled:opacity-60 shadow-md shadow-yellow-200">
              {saving ? "Menghitung..." : "Hitung & Simpan ETA"}
            </button>
          </div>

          {/* Geofence info */}
          <div className="mt-4 bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
            <h2 className="font-bold text-gray-800 text-sm mb-3">Geofence Bandara</h2>
            <div className="space-y-2">
              {airports.map(a => (
                <div key={a.id} className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-gray-700">✈ {a.city}</span>
                  <span className="text-gray-400 font-mono">{a.radius_meter}m</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ─── ETA List ─── */}
        <div className="lg:col-span-2 space-y-4">

          {/* On the way */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
              <span className="font-bold text-gray-800 text-sm">Dalam Perjalanan ({onWay.length})</span>
            </div>
            <div className="divide-y divide-gray-100">
              {onWay.map(row => {
                const etaTiba = new Date(row.eta_tiba_at);
                const remainingMs = etaTiba.getTime() - now.getTime();
                const remainingMnt = Math.max(0, Math.round(remainingMs / 60000));
                return (
                  <div key={row.id} className="px-5 py-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[#FFD600] flex items-center justify-center font-bold text-sm text-black flex-shrink-0">
                      {row.driver?.nama?.[0]?.toUpperCase() ?? "D"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-800 text-sm truncate">{row.driver?.nama ?? "—"}</p>
                      <p className="text-xs text-gray-400">{row.driver?.kode_driver} · {(row.jarak_km ?? 0).toFixed(1)} km</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className={`text-xl font-black ${etaColor(remainingMnt)}`}>
                        {formatETA(remainingMnt)}
                      </p>
                      <p className="text-xs text-gray-400">
                        Tiba: {etaTiba.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <button onClick={() => markArrived(row.id)}
                      className="flex-shrink-0 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200 hover:bg-emerald-100 transition-colors">
                      Tiba ✓
                    </button>
                  </div>
                );
              })}
              {onWay.length === 0 && (
                <div className="px-5 py-10 text-center">
                  <p className="text-3xl mb-2">🛣️</p>
                  <p className="text-gray-400 text-sm">Tidak ada driver dalam perjalanan</p>
                </div>
              )}
            </div>
          </div>

          {/* Sudah tiba */}
          {arrived.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="font-bold text-gray-800 text-sm">Sudah Tiba Hari Ini ({arrived.length})</span>
              </div>
              <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto">
                {arrived.slice(0, 20).map(row => (
                  <div key={row.id} className="px-5 py-3 flex items-center gap-4">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center font-bold text-xs text-emerald-700 flex-shrink-0">
                      ✓
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-700 text-sm truncate">{row.driver?.nama ?? "—"}</p>
                      <p className="text-xs text-gray-400">{row.driver?.kode_driver}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-emerald-600">
                        {row.durasi_aktual_menit ? `${row.durasi_aktual_menit} mnt` : "—"}
                      </p>
                      <p className="text-xs text-gray-400">
                        {row.tiba_at ? new Date(row.tiba_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "—"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
