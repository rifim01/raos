"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { AirportStat } from "@/lib/alert-engine";

const STATUS_COLOR: Record<string, string> = {
  NORMAL:   "#10b981",
  PADAT:    "#f59e0b",
  OVERLOAD: "#ef4444",
};
const STATUS_BG: Record<string, string> = {
  NORMAL:   "#052e16",
  PADAT:    "#3d2e00",
  OVERLOAD: "#3d0000",
};

const padNum = (n: number | null | undefined) =>
  n != null ? String(n).padStart(3, "0") : "---";

interface Props { initialAirports: AirportStat[] }

export default function TvModeClient({ initialAirports }: Props) {
  const [airports, setAirports] = useState<AirportStat[]>(initialAirports);
  const [clock, setClock] = useState("");
  const [lastRefresh, setLastRefresh] = useState("");
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClock(now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/command-center/stats", { cache: "no-store" });
      if (res.ok) {
        const { stats } = await res.json();
        if (Array.isArray(stats) && stats.length > 0) {
          setAirports(stats);
          setLastRefresh(new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
        }
      }
    } catch {}
  }, []);

  const debouncedFetch = useCallback(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(fetchStats, 1500);
  }, [fetchStats]);

  // Auto-refresh every 60s
  useEffect(() => {
    fetchStats();
    const id = setInterval(fetchStats, 60_000);
    return () => clearInterval(id);
  }, [fetchStats]);

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient();
    const ch = supabase
      .channel("tv-queue")
      .on("postgres_changes", { event: "*", schema: "public", table: "pickup_queues" }, debouncedFetch)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [debouncedFetch]);

  const displayAirports = airports.filter((a) =>
    ["DJB001", "PKU001", "BTH001", "BPN001", "MDC001", "UPG001", "CGK001"].includes(a.airport_code)
  );

  const today = new Date().toLocaleDateString("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden" style={{ background: "#050a14", color: "#e2e8f0" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-2.5 flex-shrink-0"
        style={{ background: "#030712", borderBottom: "1px solid #1e3a5f" }}>
        <div className="flex items-center gap-4">
          <p className="font-black text-2xl tracking-widest" style={{ color: "#3b82f6" }}>RAOS</p>
          <div className="w-px h-8" style={{ background: "#1e3a5f" }} />
          <div>
            <p className="text-xs font-semibold" style={{ color: "#64748b" }}>AIRPORT COMMAND CENTER</p>
            <p className="text-[10px]" style={{ color: "#334155" }}>PT RIFIM INTERNATIONAL GEMILANG</p>
          </div>
        </div>

        {/* Center: action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={fetchStats}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
            style={{ background: "#0d1f3a", color: "#60a5fa", border: "1px solid #1e3a5f" }}
            title="Refresh data"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
              <path d="M23 4v6h-6M1 20v-6h6"/>
              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
            </svg>
            Refresh
          </button>
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
            style={{ background: "#1a0a0a", color: "#f87171", border: "1px solid #3d1515" }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
            </svg>
            Keluar
          </button>
        </div>

        <div className="text-right">
          <p className="font-mono text-3xl font-black" style={{ color: "#60a5fa" }}>{clock}</p>
          <p className="text-xs" style={{ color: "#475569" }}>{today}</p>
        </div>
      </div>

      {/* Airport Grid */}
      <div className="flex-1 grid grid-cols-3 gap-3 p-4 overflow-hidden">
        {displayAirports.length === 0 ? (
          // Fallback when no data
          <div className="col-span-3 flex flex-col items-center justify-center gap-4" style={{ color: "#334155" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-16 h-16 opacity-30">
              <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21 4 19 2c-2-2-4-2-5.5-.5L10 5 1.8 6.2A.8.8 0 001.5 7.6L5 11l-1 3-2 1 1 2 2-1 3-1 3.5 3.5z"/>
            </svg>
            <p className="text-lg font-semibold" style={{ color: "#475569" }}>Memuat data bandara...</p>
            <button onClick={fetchStats}
              className="px-4 py-2 rounded-lg text-sm font-semibold"
              style={{ background: "#0d1f3a", color: "#60a5fa", border: "1px solid #1e3a5f" }}>
              Coba Lagi
            </button>
          </div>
        ) : displayAirports.map((ap) => {
          const statusColor = STATUS_COLOR[ap.airport_status] ?? "#64748b";
          const statusBg    = STATUS_BG[ap.airport_status]    ?? "#0f172a";
          return (
            <div key={ap.airport_code} className="relative rounded-2xl flex flex-col overflow-hidden"
              style={{ background: "#070f20", border: `1px solid ${statusColor}44`, boxShadow: `0 0 24px ${statusColor}11` }}>
              <div className="h-1 w-full" style={{ background: statusColor }} />
              <div className="flex-1 flex flex-col items-center justify-center p-4 gap-2">
                <p className="font-mono font-black tracking-widest"
                  style={{ fontSize: "clamp(1rem,2.5vw,1.8rem)", color: statusColor }}>
                  {ap.airport_code}
                </p>
                <p className="text-xs font-semibold" style={{ color: "#64748b" }}>{ap.airport_city}</p>

                <div className="my-2 text-center">
                  <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: "#334155" }}>Dipanggil</p>
                  <p className="font-mono font-black leading-none"
                    style={{ fontSize: "clamp(3rem,8vw,7rem)", color: statusColor }}>
                    {padNum(ap.current_called_number)}
                  </p>
                  {ap.next_waiting_number && (
                    <p className="text-xs mt-1 font-mono" style={{ color: "#334155" }}>
                      Berikutnya: <span style={{ color: "#475569" }}>{padNum(ap.next_waiting_number)}</span>
                    </p>
                  )}
                </div>

                <div className="w-full grid grid-cols-4 gap-1 rounded-xl px-3 py-2" style={{ background: "#0d1f3a" }}>
                  {[
                    { label: "Menunggu", value: ap.queue_waiting,   color: "#f59e0b" },
                    { label: "Pickup",   value: ap.queue_pickup,    color: "#60a5fa" },
                    { label: "Selesai",  value: ap.pickup_hari_ini, color: "#10b981" },
                    { label: "Online",   value: ap.driver_online,   color: "#a78bfa" },
                  ].map((s) => (
                    <div key={s.label} className="text-center">
                      <p className="font-black text-base" style={{ color: s.color }}>{s.value ?? 0}</p>
                      <p className="text-[9px] uppercase" style={{ color: "#334155" }}>{s.label}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="py-1.5 text-center text-xs font-black tracking-widest"
                style={{ background: statusBg, color: statusColor }}>
                {ap.airport_status}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-4 py-1 text-[10px] flex items-center justify-between flex-shrink-0"
        style={{ background: "#030712", borderTop: "1px solid #0d1f38", color: "#334155" }}>
        <span>RIFIM AIRPORT OPERATING SYSTEM · TV WALL MODE</span>
        <span>Data realtime — update otomatis{lastRefresh ? ` · Terakhir: ${lastRefresh}` : ""}</span>
        <span>© PT RIFIM INTERNATIONAL GEMILANG</span>
      </div>
    </div>
  );
}
