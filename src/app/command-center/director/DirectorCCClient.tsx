"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Alert, AirportStat } from "@/lib/alert-engine";

// Airport SVG positions on a 600×280 viewBox
// x = 20 + (lon - 95) / 46 * 560
// y = 20 + (6 - lat) / 17 * 240
const AIRPORT_MAP_POS: Record<string, { x: number; y: number; label: string }> = {
  PKU001: { x: 98,  y: 98,  label: "Pekanbaru" },
  DJB001: { x: 125, y: 128, label: "Jambi" },
  BTH001: { x: 131, y: 89,  label: "Batam" },
  CGK001: { x: 162, y: 191, label: "Tangerang" },
  BPN001: { x: 287, y: 123, label: "Balikpapan" },
  UPG001: { x: 319, y: 176, label: "Makassar" },
  MDC001: { x: 384, y: 83,  label: "Manado" },
};

const STATUS_COLOR: Record<string, string> = {
  NORMAL:   "#10b981",
  PADAT:    "#f59e0b",
  OVERLOAD: "#ef4444",
};

const ALERT_COLOR: Record<string, string> = {
  INFO:       "#3b82f6",
  WARNING:    "#f59e0b",
  SUCCESS:    "#10b981",
  ERROR:      "#ef4444",
  QUEUE:      "#8b5cf6",
  PAYROLL:    "#06b6d4",
  FINANCE:    "#f59e0b",
  ATTENDANCE: "#ec4899",
};

const ALERT_BG: Record<string, string> = {
  INFO:       "#1e3a5f",
  WARNING:    "#3d2e00",
  SUCCESS:    "#052e16",
  ERROR:      "#3d0000",
  QUEUE:      "#2e1065",
  PAYROLL:    "#0c2a4a",
  FINANCE:    "#3d2e00",
  ATTENDANCE: "#3d0024",
};

const fmt = (n: number) => new Intl.NumberFormat("id-ID").format(n);
const fmtCur = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);
const padNum = (n: number | null | undefined) =>
  n != null ? String(n).padStart(3, "0") : "—";
const timeAgo = (iso: string) => {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return `${s}d`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  return `${Math.floor(s / 3600)}j`;
};

interface Props {
  initialAirports: AirportStat[];
  initialAlerts: Alert[];
}

export default function DirectorCCClient({ initialAirports, initialAlerts }: Props) {
  const [airports, setAirports] = useState<AirportStat[]>(initialAirports);
  const [alerts, setAlerts] = useState<Alert[]>(initialAlerts);
  const [clock, setClock] = useState("");
  const [hoveredCode, setHoveredCode] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Live clock
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
        const { stats, alerts: newAlerts } = await res.json();
        setAirports(stats);
        setAlerts(newAlerts);
      }
    } catch {}
  }, []);

  const debouncedFetch = useCallback(() => {
    if (refreshTimer.current) clearTimeout(refreshTimer.current);
    refreshTimer.current = setTimeout(fetchStats, 1500);
  }, [fetchStats]);

  // Supabase Realtime
  useEffect(() => {
    const supabase = createClient();

    const notifChannel = supabase
      .channel("director-notif")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          setAlerts((prev) => [payload.new as Alert, ...prev].slice(0, 50));
        }
      )
      .subscribe();

    const queueChannel = supabase
      .channel("director-queue")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pickup_queues" },
        debouncedFetch
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notifChannel);
      supabase.removeChannel(queueChannel);
    };
  }, [debouncedFetch]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const totalWaiting   = airports.reduce((a, x) => a + Number(x.queue_waiting   ?? 0), 0);
  const totalOnline    = airports.reduce((a, x) => a + Number(x.driver_online   ?? 0), 0);
  const totalPickup    = airports.reduce((a, x) => a + Number(x.pickup_hari_ini ?? 0), 0);
  const totalIncome    = airports.reduce((a, x) => a + Number(x.income_hari_ini ?? 0), 0);
  const unreadCount    = alerts.filter((a) => !a.is_read).length;
  const overloadCount  = airports.filter((a) => a.airport_status === "OVERLOAD").length;
  const today = new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const markRead = async (id: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, is_read: true } : a)));
    await fetch("/api/command-center/mark-read", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id] }),
    });
  };

  return (
    <div
      className="fixed inset-0 flex flex-col overflow-hidden select-none"
      style={{ background: "#0A0F1E", color: "#e2e8f0", fontFamily: "'Segoe UI', sans-serif" }}
    >
      {/* ── TOP BAR ── */}
      <div
        className="flex items-center justify-between px-5 py-2 flex-shrink-0 border-b"
        style={{ borderColor: "#1e3a5f", background: "#060c18" }}
      >
        <div className="flex items-center gap-4">
          <div>
            <p className="font-black text-lg tracking-widest" style={{ color: "#60a5fa" }}>RAOS</p>
            <p className="text-[9px] tracking-widest uppercase" style={{ color: "#475569" }}>Airport Operating System</p>
          </div>
          <div className="w-px h-8 mx-2" style={{ background: "#1e3a5f" }} />
          <div className="text-xs" style={{ color: "#64748b" }}>
            <p className="font-bold text-sm" style={{ color: "#94a3b8" }}>{clock}</p>
            <p>{today}</p>
          </div>
          {overloadCount > 0 && (
            <div
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold animate-pulse"
              style={{ background: "#3d0000", color: "#ef4444", border: "1px solid #ef4444" }}
            >
              <span>⚠</span>
              <span>{overloadCount} OVERLOAD</span>
            </div>
          )}
        </div>

        {/* National KPI Strip */}
        <div className="flex items-center gap-6">
          {[
            { label: "Menunggu",   value: fmt(totalWaiting),   color: "#f59e0b" },
            { label: "Driver Online", value: fmt(totalOnline), color: "#10b981" },
            { label: "Pickup Hari Ini", value: fmt(totalPickup), color: "#60a5fa" },
            { label: "Pendapatan",  value: fmtCur(totalIncome), color: "#a78bfa" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-lg font-black" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[9px] uppercase tracking-wider" style={{ color: "#475569" }}>{s.label}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {unreadCount > 0 && (
            <div
              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black"
              style={{ background: "#ef4444", color: "white" }}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </div>
          )}
          <button
            onClick={() => (window.location.href = "/")}
            className="text-xs px-3 py-1 rounded-lg"
            style={{ background: "#1e3a5f", color: "#94a3b8" }}
          >
            Dashboard
          </button>
          <button
            onClick={toggleFullscreen}
            className="text-xs px-3 py-1 rounded-lg"
            style={{ background: "#1e3a5f", color: "#94a3b8" }}
          >
            {isFullscreen ? "Exit FS" : "Fullscreen"}
          </button>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT: Alert Feed */}
        <div
          className="w-72 flex-shrink-0 flex flex-col overflow-hidden border-r"
          style={{ borderColor: "#1e3a5f", background: "#060c18" }}
        >
          <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "#1e3a5f" }}>
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#475569" }}>Live Alerts</p>
            <span className="text-xs" style={{ color: "#475569" }}>{alerts.length} notifikasi</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {alerts.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-xs" style={{ color: "#334155" }}>Tidak ada alert</p>
              </div>
            ) : (
              <div className="divide-y" style={{ borderColor: "#0f1f38" }}>
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="px-3 py-2.5 cursor-pointer transition-opacity"
                    style={{
                      background: alert.is_read ? "transparent" : ALERT_BG[alert.type] + "55",
                      opacity: alert.is_read ? 0.5 : 1,
                    }}
                    onClick={() => !alert.is_read && markRead(alert.id)}
                  >
                    <div className="flex items-start gap-2">
                      <div
                        className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                        style={{ background: ALERT_COLOR[alert.type] ?? "#64748b" }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-bold truncate" style={{ color: ALERT_COLOR[alert.type] ?? "#94a3b8" }}>
                            {alert.title}
                          </p>
                          <span className="text-[9px] flex-shrink-0" style={{ color: "#334155" }}>
                            {timeAgo(alert.created_at)}
                          </span>
                        </div>
                        <p className="text-[10px] mt-0.5 leading-snug" style={{ color: "#64748b" }}>
                          {alert.message}
                        </p>
                        {alert.airports && (
                          <p className="text-[9px] mt-0.5" style={{ color: "#334155" }}>
                            {alert.airports.code} · {alert.airports.city}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* CENTER: Indonesia Map */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 relative flex items-center justify-center p-4">
            <div className="w-full h-full relative">
              <svg
                viewBox="0 0 600 280"
                className="w-full h-full"
                style={{ maxHeight: "100%" }}
              >
                {/* Ocean */}
                <rect width="600" height="280" fill="#060f20" />

                {/* Grid */}
                {[60, 120, 180, 240].map((y) => (
                  <line key={y} x1="0" y1={y} x2="600" y2={y} stroke="#0d2240" strokeWidth="0.5" />
                ))}
                {[100, 200, 300, 400, 500].map((x) => (
                  <line key={x} x1={x} y1="0" x2={x} y2="280" stroke="#0d2240" strokeWidth="0.5" />
                ))}

                {/* Equator line */}
                <line x1="0" y1="91" x2="600" y2="91" stroke="#1e3a5f" strokeWidth="1" strokeDasharray="6,6" />
                <text x="4" y="89" fill="#1e3a5f" fontSize="7" fontFamily="monospace">0°</text>

                {/* ── Simplified Island Shapes ── */}
                {/* Sumatra */}
                <path
                  d="M22,22 Q45,30 68,55 Q90,80 108,110 Q120,135 118,158 Q114,175 100,178 Q85,178 72,165 Q55,148 38,120 Q20,92 16,60 Z"
                  fill="#0d2240" stroke="#1e3a5f" strokeWidth="0.5"
                />
                {/* Java */}
                <path
                  d="M134,192 Q158,196 185,208 Q215,218 248,220 Q262,219 265,224 Q248,230 215,226 Q180,222 150,214 Q130,208 128,200 Z"
                  fill="#0d2240" stroke="#1e3a5f" strokeWidth="0.5"
                />
                {/* Kalimantan */}
                <path
                  d="M208,50 Q240,38 282,36 Q325,38 355,55 Q378,72 382,105 Q384,138 372,165 Q355,188 320,196 Q285,200 255,192 Q228,183 215,160 Q200,135 204,95 Z"
                  fill="#0d2240" stroke="#1e3a5f" strokeWidth="0.5"
                />
                {/* Sulawesi */}
                <path
                  d="M352,78 Q370,75 386,86 Q398,100 392,125 Q385,148 372,162 Q388,165 404,158 Q420,150 422,170 Q420,186 405,192 Q385,196 366,182 Q348,165 342,140 Q332,110 340,90 Z"
                  fill="#0d2240" stroke="#1e3a5f" strokeWidth="0.5"
                />
                {/* Nusa Tenggara */}
                <path
                  d="M295,220 Q322,222 352,224 Q372,222 385,228 Q365,234 335,230 Q308,227 295,224 Z"
                  fill="#0d2240" stroke="#1e3a5f" strokeWidth="0.5"
                />
                {/* Maluku islands */}
                <ellipse cx="425" cy="135" rx="14" ry="22" fill="#0d2240" stroke="#1e3a5f" strokeWidth="0.5" />
                <ellipse cx="448" cy="165" rx="8" ry="14" fill="#0d2240" stroke="#1e3a5f" strokeWidth="0.5" />
                {/* Papua */}
                <path
                  d="M445,82 Q478,68 520,66 Q558,68 578,88 Q592,108 590,148 Q586,180 568,198 Q545,212 515,214 Q478,212 460,195 Q442,175 440,145 Z"
                  fill="#0d2240" stroke="#1e3a5f" strokeWidth="0.5"
                />

                {/* ── Airport Markers ── */}
                {airports.map((ap) => {
                  const pos = AIRPORT_MAP_POS[ap.airport_code];
                  if (!pos) return null;
                  const color = STATUS_COLOR[ap.airport_status] ?? "#64748b";
                  const isHovered = hoveredCode === ap.airport_code;
                  const isOverload = ap.airport_status === "OVERLOAD";
                  return (
                    <g
                      key={ap.airport_code}
                      style={{ cursor: "pointer" }}
                      onMouseEnter={() => setHoveredCode(ap.airport_code)}
                      onMouseLeave={() => setHoveredCode(null)}
                    >
                      {/* Pulse ring for OVERLOAD */}
                      {isOverload && (
                        <circle cx={pos.x} cy={pos.y} r="16" fill="none" stroke={color} strokeWidth="1" opacity="0.3">
                          <animate attributeName="r" values="10;20;10" dur="2s" repeatCount="indefinite" />
                          <animate attributeName="opacity" values="0.5;0;0.5" dur="2s" repeatCount="indefinite" />
                        </circle>
                      )}
                      {/* Glow */}
                      <circle cx={pos.x} cy={pos.y} r={isHovered ? 12 : 8} fill={color} opacity="0.15" />
                      {/* Dot */}
                      <circle cx={pos.x} cy={pos.y} r={isHovered ? 7 : 5} fill={color} />
                      {/* Airport code */}
                      <text
                        x={pos.x}
                        y={pos.y - 12}
                        fill={color}
                        fontSize="7"
                        fontFamily="monospace"
                        textAnchor="middle"
                        fontWeight="bold"
                      >
                        {ap.airport_code}
                      </text>
                      {/* Queue count */}
                      {ap.queue_waiting > 0 && (
                        <text
                          x={pos.x}
                          y={pos.y + 18}
                          fill={color}
                          fontSize="7"
                          fontFamily="monospace"
                          textAnchor="middle"
                          opacity="0.85"
                        >
                          {ap.queue_waiting}W
                        </text>
                      )}
                      {/* Hover tooltip */}
                      {isHovered && (
                        <g>
                          <rect
                            x={pos.x + 12}
                            y={pos.y - 30}
                            width="110"
                            height="62"
                            rx="4"
                            fill="#0d1f3a"
                            stroke={color}
                            strokeWidth="0.5"
                          />
                          <text x={pos.x + 18} y={pos.y - 16} fill={color} fontSize="8" fontWeight="bold">{ap.airport_code}</text>
                          <text x={pos.x + 18} y={pos.y - 6} fill="#94a3b8" fontSize="7">{pos.label}</text>
                          <text x={pos.x + 18} y={pos.y + 6} fill="#64748b" fontSize="7">Menunggu: {ap.queue_waiting}</text>
                          <text x={pos.x + 18} y={pos.y + 16} fill="#64748b" fontSize="7">Driver Online: {ap.driver_online}</text>
                          <text x={pos.x + 18} y={pos.y + 26} fill={color} fontSize="7">{ap.airport_status}</text>
                        </g>
                      )}
                    </g>
                  );
                })}

                {/* Legend */}
                <g>
                  {[
                    { status: "NORMAL",   color: "#10b981" },
                    { status: "PADAT",    color: "#f59e0b" },
                    { status: "OVERLOAD", color: "#ef4444" },
                  ].map((item, i) => (
                    <g key={item.status} transform={`translate(${i * 80 + 10}, 265)`}>
                      <circle cx="6" cy="0" r="4" fill={item.color} />
                      <text x="14" y="4" fill="#64748b" fontSize="8">{item.status}</text>
                    </g>
                  ))}
                  <text x="560" y="268" fill="#1e3a5f" fontSize="7" textAnchor="end">PT RIFIM INTERNATIONAL GEMILANG</text>
                </g>
              </svg>
            </div>
          </div>
        </div>

        {/* RIGHT: Airport Grid */}
        <div
          className="w-80 flex-shrink-0 flex flex-col overflow-hidden border-l"
          style={{ borderColor: "#1e3a5f", background: "#060c18" }}
        >
          <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: "#1e3a5f" }}>
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#475569" }}>Airport Status</p>
            <button
              onClick={fetchStats}
              className="text-[10px] px-2 py-0.5 rounded"
              style={{ background: "#1e3a5f", color: "#64748b" }}
            >
              Refresh
            </button>
          </div>
          <div className="flex-1 overflow-y-auto divide-y" style={{ borderColor: "#0f1f38" }}>
            {airports.map((ap) => {
              const color = STATUS_COLOR[ap.airport_status] ?? "#64748b";
              return (
                <div
                  key={ap.airport_code}
                  className="px-4 py-3 cursor-pointer transition-colors"
                  style={{ borderLeft: `3px solid ${color}` }}
                  onClick={() => window.open(`/command-center?airport=${ap.airport_id}&code=${ap.airport_code}`, "_blank")}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="text-sm font-black font-mono" style={{ color }}>{ap.airport_code}</p>
                      <p className="text-[10px]" style={{ color: "#475569" }}>{ap.airport_city}</p>
                    </div>
                    <div className="text-right">
                      <span
                        className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                        style={{ background: color + "22", color }}
                      >
                        {ap.airport_status}
                      </span>
                      {ap.current_called_number && (
                        <p className="text-[10px] mt-1" style={{ color: "#64748b" }}>
                          #<span className="font-mono font-bold" style={{ color: "#94a3b8" }}>
                            {padNum(ap.current_called_number)}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-1">
                    {[
                      { label: "Tunggu",  value: ap.queue_waiting,   color: "#f59e0b" },
                      { label: "Online",  value: ap.driver_online,   color: "#10b981" },
                      { label: "Pickup",  value: ap.pickup_hari_ini, color: "#60a5fa" },
                      { label: "Hadir",   value: ap.staff_hadir,     color: "#a78bfa" },
                    ].map((s) => (
                      <div key={s.label} className="text-center">
                        <p className="text-xs font-black" style={{ color: s.color }}>{s.value ?? 0}</p>
                        <p className="text-[8px]" style={{ color: "#334155" }}>{s.label}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick links */}
          <div
            className="px-4 py-3 border-t flex flex-col gap-1.5"
            style={{ borderColor: "#1e3a5f" }}
          >
            <a
              href="/command-center/tv-mode"
              target="_blank"
              className="text-center text-xs py-2 rounded-lg font-semibold"
              style={{ background: "#1e3a5f", color: "#60a5fa" }}
            >
              TV Wall Mode
            </a>
            <a
              href="/command-center/executive"
              className="text-center text-xs py-2 rounded-lg font-semibold"
              style={{ background: "#1e3a5f", color: "#a78bfa" }}
            >
              Executive Analytics
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
