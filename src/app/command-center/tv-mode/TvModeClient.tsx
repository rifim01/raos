"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AirportStat } from "@/lib/alert-engine";

const STATUS_COLOR: Record<string, string>  = {
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

interface Props {
  initialAirports: AirportStat[];
}

export default function TvModeClient({ initialAirports }: Props) {
  const [airports, setAirports] = useState<AirportStat[]>(initialAirports);
  const [clock, setClock] = useState("");
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const tick = () =>
      setClock(
        new Date().toLocaleTimeString("id-ID", {
          hour: "2-digit", minute: "2-digit", second: "2-digit",
        })
      );
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/command-center/stats", { cache: "no-store" });
      if (res.ok) {
        const { stats } = await res.json();
        setAirports(stats);
      }
    } catch {}
  }, []);

  const debouncedFetch = useCallback(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(fetchStats, 1500);
  }, [fetchStats]);

  useEffect(() => {
    const supabase = createClient();
    const ch = supabase
      .channel("tv-queue")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pickup_queues" },
        debouncedFetch
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [debouncedFetch]);

  const displayAirports = airports.filter((a) =>
    ["DJB001", "PKU001", "BTH001", "BPN001", "MDC001", "UPG001"].includes(a.airport_code)
  );

  const today = new Date().toLocaleDateString("id-ID", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div
      className="fixed inset-0 flex flex-col overflow-hidden"
      style={{ background: "#050a14", color: "#e2e8f0" }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-8 py-3 flex-shrink-0"
        style={{ background: "#030712", borderBottom: "1px solid #1e3a5f" }}
      >
        <div className="flex items-center gap-4">
          <p className="font-black text-2xl tracking-widest" style={{ color: "#3b82f6" }}>RAOS</p>
          <div className="w-px h-8" style={{ background: "#1e3a5f" }} />
          <div>
            <p className="text-xs font-semibold" style={{ color: "#64748b" }}>AIRPORT COMMAND CENTER</p>
            <p className="text-[10px]" style={{ color: "#334155" }}>PT RIFIM INTERNATIONAL GEMILANG</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-mono text-3xl font-black" style={{ color: "#60a5fa" }}>{clock}</p>
          <p className="text-xs" style={{ color: "#475569" }}>{today}</p>
        </div>
      </div>

      {/* Airport Grid: 3 columns × 2 rows */}
      <div className="flex-1 grid grid-cols-3 gap-3 p-4 overflow-hidden">
        {displayAirports.map((ap) => {
          const statusColor = STATUS_COLOR[ap.airport_status] ?? "#64748b";
          const statusBg    = STATUS_BG[ap.airport_status]    ?? "#0f172a";
          return (
            <div
              key={ap.airport_code}
              className="relative rounded-2xl flex flex-col overflow-hidden"
              style={{
                background: "#070f20",
                border: `1px solid ${statusColor}44`,
                boxShadow: `0 0 24px ${statusColor}11`,
              }}
            >
              {/* Status bar */}
              <div className="h-1 w-full" style={{ background: statusColor }} />

              <div className="flex-1 flex flex-col items-center justify-center p-4 gap-2">
                {/* Airport code */}
                <p
                  className="font-mono font-black tracking-widest"
                  style={{ fontSize: "clamp(1rem, 2.5vw, 1.8rem)", color: statusColor }}
                >
                  {ap.airport_code}
                </p>
                <p className="text-xs font-semibold" style={{ color: "#64748b" }}>
                  {ap.airport_city}
                </p>

                {/* Current called number */}
                <div className="my-2 text-center">
                  <p className="text-[10px] uppercase tracking-widest mb-1" style={{ color: "#334155" }}>
                    Dipanggil
                  </p>
                  <p
                    className="font-mono font-black leading-none"
                    style={{ fontSize: "clamp(3rem, 8vw, 7rem)", color: statusColor }}
                  >
                    {padNum(ap.current_called_number)}
                  </p>
                  {ap.next_waiting_number && (
                    <p className="text-xs mt-1 font-mono" style={{ color: "#334155" }}>
                      Berikutnya: <span style={{ color: "#475569" }}>{padNum(ap.next_waiting_number)}</span>
                    </p>
                  )}
                </div>

                {/* Stats strip */}
                <div
                  className="w-full grid grid-cols-4 gap-1 rounded-xl px-3 py-2"
                  style={{ background: "#0d1f3a" }}
                >
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

              {/* Status badge */}
              <div
                className="py-1.5 text-center text-xs font-black tracking-widest"
                style={{ background: statusBg, color: statusColor }}
              >
                {ap.airport_status}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer ticker */}
      <div
        className="px-4 py-1 text-[10px] flex items-center justify-between flex-shrink-0"
        style={{ background: "#030712", borderTop: "1px solid #0d1f38", color: "#334155" }}
      >
        <span>RIFIM AIRPORT OPERATING SYSTEM · TV WALL MODE</span>
        <span>Data realtime — update otomatis</span>
        <span>© PT RIFIM INTERNATIONAL GEMILANG</span>
      </div>
    </div>
  );
}
