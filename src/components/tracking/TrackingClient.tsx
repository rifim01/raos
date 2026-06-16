"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { DriverLocation, Airport } from "./TrackingMap";

const TrackingMap = dynamic(() => import("./TrackingMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-blue-50">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-blue-600 font-medium">Memuat peta...</p>
      </div>
    </div>
  ),
});

interface TrackingClientProps {
  airports: Airport[];
  initialLocations: DriverLocation[];
}

export default function TrackingClient({ airports, initialLocations }: TrackingClientProps) {
  const [locations, setLocations] = useState<DriverLocation[]>(initialLocations);
  const [selectedAirport, setSelectedAirport] = useState("ALL");
  const [search, setSearch] = useState("");
  const [selectedDriver, setSelectedDriver] = useState<DriverLocation | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel("driver-locations-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "driver_locations" },
        (payload) => {
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const incoming = payload.new as DriverLocation;
            setLocations((prev) => {
              const idx = prev.findIndex((l) => l.driver_id === incoming.driver_id);
              if (idx >= 0) {
                const next = [...prev];
                next[idx] = { ...next[idx], ...incoming };
                return next;
              }
              return [incoming, ...prev];
            });
          } else if (payload.eventType === "DELETE") {
            setLocations((prev) =>
              prev.filter((l) => l.id !== (payload.old as DriverLocation).id)
            );
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const filtered = locations.filter((loc) => {
    const airportMatch =
      selectedAirport === "ALL" ||
      (() => {
        const ap = airports.find((a) => a.code === selectedAirport);
        return ap ? loc.airport_id === ap.id : true;
      })();
    const searchMatch =
      !search ||
      (loc.drivers?.nama ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (loc.drivers?.driver_code ?? "").toLowerCase().includes(search.toLowerCase());
    return airportMatch && searchMatch;
  });

  const online = locations.filter((l) => l.status === "ONLINE").length;
  const onDuty = locations.filter((l) => l.status === "ON_DUTY").length;
  const offline = locations.filter((l) => l.status === "OFFLINE" || !l.status).length;

  function statusColor(status: string | null) {
    if (status === "ON_DUTY") return "bg-blue-500";
    if (status === "ONLINE") return "bg-green-500";
    return "bg-gray-300";
  }

  function statusLabel(status: string | null) {
    if (status === "ON_DUTY") return "On Duty";
    if (status === "ONLINE") return "Online";
    return "Offline";
  }

  function timeAgo(ts: string) {
    const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
    if (diff < 60) return `${diff} dtk lalu`;
    if (diff < 3600) return `${Math.floor(diff / 60)} mnt lalu`;
    return `${Math.floor(diff / 3600)} jam lalu`;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-black" style={{ color: "var(--text-primary)" }}>
          Driver Tracking
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
          Pantau lokasi driver real-time via OpenStreetMap
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Driver", value: locations.length, color: "text-gray-700", bg: "bg-gray-100" },
          { label: "Online", value: online, color: "text-green-700", bg: "bg-green-50" },
          { label: "On Duty", value: onDuty, color: "text-blue-700", bg: "bg-blue-50" },
          { label: "Offline", value: offline, color: "text-gray-500", bg: "bg-gray-50" },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} rounded-xl p-4`}>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs font-medium text-gray-600 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Map */}
        <div className="lg:col-span-2 bg-white rounded-2xl card-shadow border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="font-bold text-gray-800">Peta Tracking Driver</h3>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse-dot" />
                <span className="text-xs font-semibold text-green-600">LIVE</span>
              </div>
            </div>
            <select
              value={selectedAirport}
              onChange={(e) => setSelectedAirport(e.target.value)}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">Semua Bandara</option>
              {airports.map((ap) => (
                <option key={ap.code} value={ap.code}>
                  {ap.code} — {ap.city}
                </option>
              ))}
            </select>
          </div>
          <div className="h-[450px] relative">
            <TrackingMap
              locations={locations}
              airports={airports}
              selectedAirport={selectedAirport}
              onDriverClick={setSelectedDriver}
            />
          </div>
          {/* Legend */}
          <div className="px-4 py-2 border-t border-gray-100 flex items-center gap-4 flex-wrap">
            {[
              { color: "bg-green-500", label: "Online" },
              { color: "bg-blue-500", label: "On Duty" },
              { color: "bg-gray-300", label: "Offline" },
              { color: "border-2 border-dashed border-blue-500", label: "Geofence" },
            ].map((l) => (
              <div key={l.label} className="flex items-center gap-1.5">
                <span className={`w-3 h-3 rounded-full ${l.color}`} />
                <span className="text-xs text-gray-500">{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Driver list */}
        <div className="bg-white rounded-2xl card-shadow border border-gray-100 flex flex-col">
          <div className="px-4 py-3 border-b border-gray-100">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari driver..."
              className="w-full bg-gray-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          {filtered.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
              {locations.length === 0 ? "Belum ada data lokasi driver" : "Tidak ada driver ditemukan"}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto divide-y divide-gray-50 max-h-[480px]">
              {filtered.map((loc) => (
                <button
                  key={loc.driver_id}
                  onClick={() => setSelectedDriver(loc)}
                  className={`w-full px-4 py-3 hover:bg-gray-50 text-left transition-colors ${
                    selectedDriver?.driver_id === loc.driver_id ? "bg-blue-50" : ""
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${statusColor(loc.status)}`}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        {loc.drivers?.nama ?? "—"}
                      </p>
                      <p className="text-xs text-gray-400">
                        {loc.drivers?.driver_code} · {statusLabel(loc.status)}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[10px] text-gray-400">{timeAgo(loc.last_seen)}</p>
                      {loc.speed != null && (
                        <p className="text-[10px] text-blue-500">{loc.speed} km/h</p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
          <div className="px-4 py-2 border-t border-gray-100 text-xs text-gray-400 text-center">
            {filtered.length} driver {selectedAirport !== "ALL" ? `di ${selectedAirport}` : "aktif"}
          </div>
        </div>
      </div>

      {/* Selected driver detail */}
      {selectedDriver && (
        <div className="bg-white rounded-2xl card-shadow border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-800">Detail Driver</h3>
            <button
              onClick={() => setSelectedDriver(null)}
              className="text-gray-400 hover:text-gray-600 text-lg leading-none"
            >
              ×
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-gray-500 text-xs">Nama</p>
              <p className="font-semibold">{selectedDriver.drivers?.nama ?? "—"}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Kode Driver</p>
              <p className="font-semibold">{selectedDriver.drivers?.driver_code ?? "—"}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Status</p>
              <p className="font-semibold">{statusLabel(selectedDriver.status)}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Kecepatan</p>
              <p className="font-semibold">{selectedDriver.speed ?? 0} km/h</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Koordinat</p>
              <p className="font-mono text-xs">
                {selectedDriver.latitude.toFixed(5)}, {selectedDriver.longitude.toFixed(5)}
              </p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Update Terakhir</p>
              <p className="text-xs">{timeAgo(selectedDriver.last_seen)}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
