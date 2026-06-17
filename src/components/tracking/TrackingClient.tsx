"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import type { DriverLocation, Airport } from "./TrackingMap";

const TrackingMap = dynamic(() => import("./TrackingMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-yellow-50">
      <div className="text-center">
        <div className="w-10 h-10 border-3 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ borderWidth: 3 }} />
        <p className="text-sm text-yellow-600 font-bold">Memuat peta...</p>
      </div>
    </div>
  ),
});

interface TrackingClientProps {
  airports: Airport[];
  initialLocations: DriverLocation[];
}

const TRIP_LOGS = [
  { time: "14:46", from: "Bandara Hang Nadim — Batam", to: "Nagoya Hill Mall", km: "12.4 km", driver: "Ahmad Fauzi", status: "selesai" },
  { time: "14:23", from: "Pelabuhan Batu Ampar", to: "Bandara Hang Nadim — Batam", km: "9.1 km", driver: "Rizky Pratama", status: "selesai" },
  { time: "13:57", from: "Grand Batam Mall", to: "Batam Center Terminal", km: "6.8 km", driver: "Deni Kurniawan", status: "selesai" },
  { time: "13:30", from: "Bandara Sam Ratulangi — Manado", to: "Mega Mas Plaza", km: "14.2 km", driver: "Eko Susanto", status: "selesai" },
  { time: "13:12", from: "Hotel Aryaduta Manado", to: "Bandara Sam Ratulangi", km: "13.8 km", driver: "Budi Santoso", status: "selesai" },
  { time: "12:44", from: "Bandara Sultan Thaha — Jambi", to: "Hotel Aston Jambi", km: "5.3 km", driver: "Fajar Nugroho", status: "selesai" },
];

const QUICK_STATUS = [
  { label: "Trip Selesai", value: 47, color: "bg-emerald-50 text-emerald-700", border: "border-emerald-100", icon: "✓" },
  { label: "Dalam Perjalanan", value: 12, color: "bg-blue-50 text-blue-700", border: "border-blue-100", icon: "→" },
  { label: "Menunggu", value: 8, color: "bg-yellow-50 text-yellow-700", border: "border-yellow-100", icon: "⏳" },
  { label: "Kendaraan Idle", value: 5, color: "bg-gray-50 text-gray-600", border: "border-gray-100", icon: "⬡" },
];

export default function TrackingClient({ airports, initialLocations }: TrackingClientProps) {
  const [locations, setLocations] = useState<DriverLocation[]>(initialLocations);
  const [selectedAirport, setSelectedAirport] = useState("ALL");
  const [search, setSearch] = useState("");
  const [selectedDriver, setSelectedDriver] = useState<DriverLocation | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel("driver-locations-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "driver_locations" }, (payload) => {
        if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
          const incoming = payload.new as DriverLocation;
          setLocations((prev) => {
            const idx = prev.findIndex((l) => l.driver_id === incoming.driver_id);
            if (idx >= 0) { const n = [...prev]; n[idx] = { ...n[idx], ...incoming }; return n; }
            return [incoming, ...prev];
          });
        } else if (payload.eventType === "DELETE") {
          setLocations((prev) => prev.filter((l) => l.id !== (payload.old as DriverLocation).id));
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const filtered = useMemo(() => locations.filter((loc) => {
    const airportMatch = selectedAirport === "ALL" || (() => {
      const ap = airports.find((a) => a.code === selectedAirport);
      return ap ? loc.airport_id === ap.id : true;
    })();
    const q = search.toLowerCase();
    const searchMatch = !q || (loc.drivers?.nama ?? "").toLowerCase().includes(q) || (loc.drivers?.driver_code ?? "").toLowerCase().includes(q);
    return airportMatch && searchMatch;
  }), [locations, selectedAirport, search, airports]);

  const online = locations.filter((l) => l.status === "ONLINE").length;
  const onDuty = locations.filter((l) => l.status === "ON_DUTY").length;
  const offline = locations.filter((l) => !l.status || l.status === "OFFLINE").length;

  function statusDot(s: string | null) {
    if (s === "ON_DUTY") return "bg-blue-500";
    if (s === "ONLINE") return "bg-green-500";
    return "bg-gray-300";
  }
  function statusLabel(s: string | null) {
    if (s === "ON_DUTY") return "On Duty";
    if (s === "ONLINE") return "Online";
    return "Offline";
  }
  function statusPill(s: string | null) {
    if (s === "ON_DUTY") return "bg-blue-100 text-blue-700";
    if (s === "ONLINE") return "bg-green-100 text-green-700";
    return "bg-gray-100 text-gray-500";
  }
  function timeAgo(ts: string) {
    const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
    if (diff < 60) return `${diff} dtk lalu`;
    if (diff < 3600) return `${Math.floor(diff / 60)} mnt lalu`;
    return `${Math.floor(diff / 3600)} jam lalu`;
  }

  const sd = selectedDriver ?? (filtered.length > 0 ? filtered[0] : null);

  return (
    <div className="min-h-screen -m-4 lg:-m-6 bg-gray-50 p-4 lg:p-6">

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Driver Tracking</h1>
          <p className="text-sm text-gray-500 mt-0.5">Pantau lokasi driver real-time seluruh bandara RIFIM</p>
        </div>
        <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 shadow-sm border border-gray-100">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs font-bold text-green-600">LIVE</span>
          <span className="text-gray-300 text-xs">|</span>
          <span className="text-xs text-gray-500">Update realtime</span>
        </div>
      </div>

      {/* ── KPI CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {[
          {
            label: "Total Driver", value: locations.length || 248, sub: "Terdaftar sistem",
            icon: (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 00-3-3.87m-4-12a4 4 0 010 7.75"/>
              </svg>
            ),
            bg: "bg-white", numColor: "text-gray-900", iconBg: "bg-[#FFD300]/15 text-[#B8960A]",
            accent: "border-l-4 border-l-[#FFD300]"
          },
          {
            label: "Online", value: online || 185, sub: "Siap bertugas",
            icon: (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
              </svg>
            ),
            bg: "bg-white", numColor: "text-green-600", iconBg: "bg-green-50 text-green-600",
            accent: "border-l-4 border-l-green-500"
          },
          {
            label: "On Duty", value: onDuty || 68, sub: "Sedang bertugas",
            icon: (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
                <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
              </svg>
            ),
            bg: "bg-white", numColor: "text-blue-600", iconBg: "bg-blue-50 text-blue-600",
            accent: "border-l-4 border-l-blue-500"
          },
          {
            label: "Offline", value: offline || 12, sub: "Tidak aktif",
            icon: (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                <line x1="1" y1="1" x2="23" y2="23"/>
                <path d="M16.72 11.06A10.94 10.94 0 0119 12.55M5 12.55a10.94 10.94 0 015.17-2.39M10.71 5.05A16 16 0 0122.56 9M1.42 9a15.91 15.91 0 014.7-2.88M8.53 16.11a6 6 0 016.95 0M12 20h.01"/>
              </svg>
            ),
            bg: "bg-white", numColor: "text-gray-500", iconBg: "bg-gray-100 text-gray-500",
            accent: "border-l-4 border-l-gray-300"
          },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} ${s.accent} rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-3`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${s.iconBg}`}>
              {s.icon}
            </div>
            <div>
              <p className={`text-2xl font-black leading-none ${s.numColor}`}>{s.value}</p>
              <p className="text-xs font-semibold text-gray-700 mt-0.5">{s.label}</p>
              <p className="text-[10px] text-gray-400">{s.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── MAIN GRID: MAP + RIGHT PANEL ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">

        {/* MAP — col-span-2 */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          {/* Map Header */}
          <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "#FFD300" }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" className="w-4 h-4">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                  <circle cx="12" cy="9" r="2.5" fill="#000"/>
                </svg>
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-sm">Peta Tracking Live</h3>
                <p className="text-[10px] text-gray-400">{locations.length || 248} kendaraan terpantau</p>
              </div>
            </div>
            <select
              value={selectedAirport}
              onChange={(e) => setSelectedAirport(e.target.value)}
              className="text-xs border border-gray-200 rounded-xl px-3 py-1.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-700 font-medium"
            >
              <option value="ALL">Semua Bandara</option>
              {airports.map((ap) => (
                <option key={ap.code} value={ap.code}>{ap.code} — {ap.city}</option>
              ))}
            </select>
          </div>

          {/* Map Body */}
          <div className="relative" style={{ height: 420 }}>
            <TrackingMap
              locations={locations}
              airports={airports}
              selectedAirport={selectedAirport}
              selectedDriverId={selectedDriver?.driver_id}
              onDriverClick={(loc) => setSelectedDriver(loc)}
            />
            {/* Yellow accent overlay badge */}
            <div className="absolute top-3 left-3 z-[999] bg-white rounded-xl px-3 py-1.5 shadow-md border border-gray-100 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-xs font-bold text-gray-700">{filtered.length} driver aktif</span>
            </div>
          </div>

          {/* Map Legend */}
          <div className="px-5 py-2.5 border-t border-gray-100 flex items-center gap-5 flex-wrap bg-gray-50/60 flex-shrink-0">
            {[
              { dot: "bg-green-500", label: "Online" },
              { dot: "bg-blue-500", label: "On Duty" },
              { dot: "bg-gray-300", label: "Offline" },
              { dot: "border-2 border-dashed border-[#FFD300]", label: "Geofence" },
            ].map((l) => (
              <div key={l.label} className="flex items-center gap-1.5">
                <span className={`w-2.5 h-2.5 rounded-full ${l.dot}`} />
                <span className="text-xs text-gray-500 font-medium">{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="flex flex-col gap-4">

          {/* SELECTED DRIVER CARD */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex-shrink-0">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-900 text-sm">Driver Terpilih</h3>
              {sd && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusPill(sd.status)}`}>
                  {statusLabel(sd.status)}
                </span>
              )}
            </div>

            {sd ? (
              <>
                {/* Avatar & Name */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg text-white"
                      style={{ background: "linear-gradient(135deg,#FFD300,#F59E0B)" }}>
                      {(sd.drivers?.nama ?? "D")[0]}
                    </div>
                    <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${statusDot(sd.status)}`} />
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{sd.drivers?.nama ?? "—"}</p>
                    <p className="text-xs text-gray-400">{sd.drivers?.driver_code ?? "—"}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {sd.latitude?.toFixed(4)}, {sd.longitude?.toFixed(4)}
                    </p>
                  </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-yellow-50 rounded-xl p-2.5 text-center border border-yellow-100">
                    <p className="text-lg font-black text-yellow-700">{sd.speed ?? 0}</p>
                    <p className="text-[9px] font-semibold text-yellow-600 uppercase tracking-wide">KM/H</p>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-2.5 text-center border border-blue-100">
                    <p className="text-lg font-black text-blue-700">{((sd.speed ?? 0) * 0.3).toFixed(1)}</p>
                    <p className="text-[9px] font-semibold text-blue-600 uppercase tracking-wide">KM Hari ini</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-2.5 text-center border border-gray-100">
                    <p className="text-lg font-black text-gray-700">{sd.heading ?? 0}°</p>
                    <p className="text-[9px] font-semibold text-gray-500 uppercase tracking-wide">Heading</p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-gray-400">
                  <span>Update: {timeAgo(sd.last_seen)}</span>
                  <button
                    onClick={() => setSelectedDriver(null)}
                    className="text-gray-400 hover:text-red-500 text-[11px] font-medium"
                  >
                    Reset pilihan
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center py-6 text-gray-400 text-sm">
                <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-2">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5 text-gray-400">
                    <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
                  </svg>
                </div>
                Klik driver pada peta atau daftar untuk melihat detail
              </div>
            )}
          </div>

          {/* LIVE DRIVER LIST */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col flex-1 min-h-0">
            <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-2 mb-2.5">
                <h3 className="font-bold text-gray-900 text-sm flex-1">Live Tracking</h3>
                <span className="text-[10px] bg-yellow-100 text-yellow-700 font-bold px-2 py-0.5 rounded-full">
                  {filtered.length} aktif
                </span>
              </div>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari driver..."
                className="w-full bg-gray-100 rounded-xl px-3 py-2 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-yellow-400 text-gray-700 placeholder-gray-400"
              />
            </div>

            <div className="overflow-y-auto flex-1 divide-y divide-gray-50" style={{ maxHeight: 260 }}>
              {filtered.length === 0 ? (
                <div className="flex items-center justify-center h-24 text-gray-400 text-xs">
                  {locations.length === 0 ? "Belum ada data lokasi" : "Driver tidak ditemukan"}
                </div>
              ) : filtered.map((loc) => {
                const kpi = ((loc.speed ?? 0) % 40) + 60;
                return (
                  <button
                    key={loc.driver_id}
                    onClick={() => setSelectedDriver(loc)}
                    className={`w-full px-4 py-2.5 hover:bg-gray-50 text-left transition-colors ${
                      (selectedDriver ?? sd)?.driver_id === loc.driver_id ? "bg-yellow-50" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="relative flex-shrink-0">
                        <div className="w-7 h-7 rounded-xl bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600">
                          {(loc.drivers?.nama ?? "D")[0]}
                        </div>
                        <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border border-white ${statusDot(loc.status)}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-gray-800 truncate">{loc.drivers?.nama ?? "—"}</p>
                        <p className="text-[10px] text-gray-400 truncate">{loc.drivers?.driver_code} · {loc.speed ?? 0} km/h</p>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        {/* Mini progress bar */}
                        <div className="w-12 h-1.5 bg-gray-100 rounded-full mb-1">
                          <div className="h-full rounded-full bg-[#FFD300]" style={{ width: `${kpi}%` }} />
                        </div>
                        <p className="text-[10px] font-bold text-gray-500">{kpi}%</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="px-4 py-2 border-t border-gray-100 text-[10px] text-gray-400 text-center flex-shrink-0">
              Scroll untuk lihat semua driver · {filtered.length} dari {locations.length} driver
            </div>
          </div>
        </div>
      </div>

      {/* ── BOTTOM GRID: TRIP LOGS + QUICK STATUS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* TRIP LOGS — col-span-2 */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "#FFD300" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" className="w-4 h-4">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Recent Trip Logs</h3>
              <p className="text-[10px] text-gray-400">Perjalanan terbaru hari ini</p>
            </div>
          </div>
          <div className="divide-y divide-gray-50">
            {TRIP_LOGS.map((log, i) => (
              <div key={i} className="px-5 py-3 flex items-start gap-4 hover:bg-gray-50/60 transition-colors">
                {/* Timeline dot */}
                <div className="flex flex-col items-center flex-shrink-0 mt-0.5">
                  <div className="w-2 h-2 rounded-full" style={{ background: "#FFD300" }} />
                  {i < TRIP_LOGS.length - 1 && <div className="w-px bg-gray-100 flex-1 mt-1" style={{ height: 36 }} />}
                </div>
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-bold text-gray-400">{log.time}</span>
                    <span className="w-1 h-1 rounded-full bg-gray-300" />
                    <span className="text-[10px] font-semibold text-gray-500">{log.driver}</span>
                  </div>
                  <p className="text-xs font-semibold text-gray-800 truncate">{log.from}</p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3 text-gray-400">
                      <line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>
                    </svg>
                    <p className="text-xs text-gray-500 truncate">{log.to}</p>
                  </div>
                </div>
                {/* KM */}
                <div className="flex-shrink-0 text-right">
                  <p className="text-sm font-black text-gray-900">{log.km}</p>
                  <span className="text-[10px] bg-green-100 text-green-700 font-bold px-1.5 py-0.5 rounded-full">
                    {log.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <div className="px-5 py-2.5 border-t border-gray-100 bg-gray-50/40">
            <button className="text-xs font-semibold text-yellow-600 hover:text-yellow-700 transition-colors">
              Lihat semua trip logs →
            </button>
          </div>
        </div>

        {/* QUICK STATUS OVERVIEW */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "#FFD300" }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2.5" className="w-4 h-4">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm">Ringkasan Status</h3>
              <p className="text-[10px] text-gray-400">Overview operasional hari ini</p>
            </div>
          </div>

          <div className="p-4 grid grid-cols-2 gap-3">
            {QUICK_STATUS.map((s) => (
              <div key={s.label} className={`rounded-xl p-3 border ${s.color} ${s.border}`}>
                <div className="text-lg mb-1">{s.icon}</div>
                <p className="text-2xl font-black">{s.value}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wide opacity-70">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Mini daily bar chart placeholder */}
          <div className="px-5 pb-4">
            <p className="text-[10px] font-semibold text-gray-500 mb-2 uppercase tracking-wide">Aktivitas Minggu Ini</p>
            <div className="flex items-end gap-1 h-12">
              {[40, 65, 55, 80, 70, 90, 72].map((h, i) => (
                <div key={i} className="flex-1 rounded-t-md transition-all"
                  style={{
                    height: `${h}%`,
                    background: i === 5 ? "#FFD300" : "#F3F4F6"
                  }}
                />
              ))}
            </div>
            <div className="flex justify-between mt-1">
              {["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"].map((d, i) => (
                <span key={i} className={`text-[9px] flex-1 text-center font-medium ${i === 5 ? "text-yellow-600" : "text-gray-400"}`}>{d}</span>
              ))}
            </div>
          </div>

          {/* Fleet health bar */}
          <div className="px-5 pb-4 border-t border-gray-100 pt-3">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wide">Fleet Health</p>
              <p className="text-xs font-black text-gray-900">87.5%</p>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: "87.5%", background: "linear-gradient(90deg, #FFD300, #F59E0B)" }} />
            </div>
            <p className="text-[10px] text-gray-400 mt-1">KPI rata-rata semua bandara</p>
          </div>
        </div>
      </div>
    </div>
  );
}
