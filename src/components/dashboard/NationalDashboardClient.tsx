"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";
import { formatCurrency } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────

interface AirportStat {
  airport_id: string;
  airport_code: string;
  kota: string;
  total_waiting: number;
  total_called: number;
  total_serving: number;
  total_done: number;
  total_violation: number;
  active_drivers: number;
}

interface ActivityItem {
  id: string;
  queue_number: number;
  status: string;
  created_at: string;
  driver?: { nama: string; driver_code: string; airport?: { code: string } };
}

interface DashboardStats {
  totalDrivers: number;
  activeDrivers: number;
  totalStaff: number;
  activeStaff: number;
  todayQueue: number;
  totalAirports: number;
  monthlyRevenue: number;
  kpiNational: number;
}

interface Props {
  stats: DashboardStats;
  airportStats: AirportStat[];
  recentActivity: ActivityItem[];
}

// ─── Airport pin positions on the Indonesia map SVG ──────────────────────────

const AIRPORTS_MAP = [
  { code: "BTH001", label: "BTH", city: "Batam",      cx: 178, cy: 268, live: true,  color: "#3B82F6" },
  { code: "PKU001", label: "PKU", city: "Pekanbaru",  cx: 188, cy: 248, live: true,  color: "#06B6D4" },
  { code: "DJB001", label: "DJB", city: "Jambi",      cx: 200, cy: 278, live: true,  color: "#22C55E" },
  { code: "BPN001", label: "BPN", city: "Balikpapan", cx: 335, cy: 248, live: true,  color: "#A78BFA" },
  { code: "MDC001", label: "MDC", city: "Manado",     cx: 422, cy: 192, live: true,  color: "#F59E0B" },
  { code: "UPG001", label: "UPG", city: "Makassar",   cx: 368, cy: 295, live: false, color: "#6B7280" },
];

// ─── Status colours ───────────────────────────────────────────────────────────

const STATUS_COLOR: Record<string, string> = {
  WAITING: "#3B82F6",
  CALLED:  "#06B6D4",
  PICKUP:  "#FFD300",
  SERVING: "#F59E0B",
  DONE:    "#22C55E",
  VIOLATION: "#EF4444",
  NO_SHOW: "#6B7280",
};

const STATUS_LABEL: Record<string, string> = {
  WAITING: "Menunggu",
  CALLED:  "Dipanggil",
  PICKUP:  "Pickup",
  SERVING: "Melayani",
  DONE:    "Selesai",
  VIOLATION: "Pelanggaran",
};

// ─── Bottom widget keys ───────────────────────────────────────────────────────

const WIDGET_KEYS = ["kpi-staff", "kpi-driver", "insiden", "keuangan", "alert", "command"] as const;
type WidgetKey = typeof WIDGET_KEYS[number];

const WIDGET_META: Record<WidgetKey, { label: string; icon: string }> = {
  "kpi-staff":  { label: "KPI Staff",       icon: "👥" },
  "kpi-driver": { label: "KPI Driver",      icon: "🚗" },
  "insiden":    { label: "Insiden",         icon: "⚠️" },
  "keuangan":   { label: "Keuangan",        icon: "💰" },
  "alert":      { label: "Alert System",   icon: "🔔" },
  "command":    { label: "Command Center", icon: "🖥️" },
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KPITile({
  title, value, sub, accent, icon,
  trend,
}: {
  title: string; value: string | number; sub?: string; accent: string; icon: React.ReactNode;
  trend?: { val: number; label: string };
}) {
  return (
    <div className="rounded-xl p-4 flex flex-col gap-2 relative overflow-hidden"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{ background: `radial-gradient(circle at 120% -20%, ${accent}, transparent 60%)` }} />
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>{title}</span>
        <span className="opacity-70" style={{ color: accent }}>{icon}</span>
      </div>
      <div className="text-2xl font-black" style={{ color: "var(--text-primary)" }}>{value}</div>
      {sub && <div className="text-[11px]" style={{ color: "var(--text-secondary)" }}>{sub}</div>}
      {trend && (
        <div className="flex items-center gap-1 text-[10px] font-semibold">
          <span style={{ color: trend.val >= 0 ? "#22C55E" : "#EF4444" }}>
            {trend.val >= 0 ? "▲" : "▼"} {Math.abs(trend.val)}%
          </span>
          <span style={{ color: "var(--text-muted)" }}>{trend.label}</span>
        </div>
      )}
    </div>
  );
}

// ─── Indonesia Map Panel ──────────────────────────────────────────────────────

function IndonesiaMapPanel({ airportStats }: { airportStats: AirportStat[] }) {
  const [hovered, setHovered] = useState<string | null>(null);
  const statMap = Object.fromEntries(airportStats.map(a => [a.airport_code, a]));

  return (
    <div className="rounded-xl overflow-hidden flex flex-col" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
        <div>
          <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Peta Operasional Indonesia</h3>
          <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>5 Bandara LIVE · 1 Coming Soon</p>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg" style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)" }}>
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[9px] font-black text-green-400">LIVE</span>
        </div>
      </div>
      <div className="relative flex-1 p-2">
        <svg viewBox="80 120 440 240" className="w-full h-full" style={{ minHeight: 220 }}>
          {/* Simplified Indonesia outline — Sumatra + Kalimantan + Sulawesi + etc. */}
          {/* Sumatra */}
          <path d="M110 230 L120 210 L135 205 L155 200 L175 205 L185 215 L200 220 L210 235 L215 250 L210 265 L200 275 L185 280 L170 275 L155 270 L140 265 L125 255 Z"
            fill="rgba(59,130,246,0.06)" stroke="rgba(59,130,246,0.2)" strokeWidth="0.8" />
          {/* Kalimantan */}
          <path d="M255 185 L275 175 L305 170 L335 172 L360 178 L375 190 L380 210 L375 235 L360 255 L340 265 L315 268 L290 260 L270 248 L258 230 L252 210 Z"
            fill="rgba(59,130,246,0.06)" stroke="rgba(59,130,246,0.2)" strokeWidth="0.8" />
          {/* Sulawesi */}
          <path d="M375 185 L385 178 L400 175 L415 178 L425 188 L430 200 L428 212 L420 222 L430 232 L435 245 L428 258 L418 265 L408 260 L400 248 L410 238 L408 225 L398 218 L390 208 L382 198 Z"
            fill="rgba(59,130,246,0.06)" stroke="rgba(59,130,246,0.2)" strokeWidth="0.8" />
          {/* Jawa */}
          <path d="M222 288 L240 283 L265 280 L295 278 L320 280 L340 285 L345 292 L330 298 L305 300 L280 298 L255 296 L232 293 Z"
            fill="rgba(59,130,246,0.06)" stroke="rgba(59,130,246,0.2)" strokeWidth="0.8" />
          {/* Papua */}
          <path d="M450 195 L470 188 L492 185 L508 190 L515 202 L510 218 L498 228 L480 232 L462 228 L450 218 L448 205 Z"
            fill="rgba(59,130,246,0.04)" stroke="rgba(59,130,246,0.15)" strokeWidth="0.8" />
          {/* Bali + Nusa Tenggara small dots */}
          <circle cx="348" cy="295" r="4" fill="rgba(59,130,246,0.08)" stroke="rgba(59,130,246,0.2)" strokeWidth="0.8"/>
          <circle cx="360" cy="296" r="3" fill="rgba(59,130,246,0.08)" stroke="rgba(59,130,246,0.2)" strokeWidth="0.8"/>

          {/* Flight path arcs between airports */}
          {[
            { x1: 178, y1: 268, x2: 188, y2: 248 },
            { x1: 188, y1: 248, x2: 200, y2: 278 },
            { x1: 200, y1: 278, x2: 335, y2: 248 },
            { x1: 335, y1: 248, x2: 422, y2: 192 },
            { x1: 335, y1: 248, x2: 368, y2: 295 },
          ].map((arc, i) => {
            const mx = (arc.x1 + arc.x2) / 2;
            const my = Math.min(arc.y1, arc.y2) - 22;
            return (
              <path key={i}
                d={`M ${arc.x1} ${arc.y1} Q ${mx} ${my} ${arc.x2} ${arc.y2}`}
                fill="none" stroke="rgba(59,130,246,0.18)" strokeWidth="0.8" strokeDasharray="3 3" />
            );
          })}

          {/* Airport pins */}
          {AIRPORTS_MAP.map((ap) => {
            const stat = statMap[ap.code] ?? null;
            const isHov = hovered === ap.code;
            return (
              <g key={ap.code} onMouseEnter={() => setHovered(ap.code)} onMouseLeave={() => setHovered(null)}
                style={{ cursor: "pointer" }}>
                {/* Pulse ring */}
                {ap.live && (
                  <circle cx={ap.cx} cy={ap.cy} r={isHov ? 14 : 10}
                    fill="none" stroke={ap.color} strokeWidth="0.8" opacity="0.35">
                    <animate attributeName="r" values="6;14" dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.5;0" dur="2s" repeatCount="indefinite" />
                  </circle>
                )}
                {/* Pin */}
                <circle cx={ap.cx} cy={ap.cy} r={isHov ? 7 : 5}
                  fill={ap.live ? ap.color : "#374151"} opacity={ap.live ? 1 : 0.5} />
                {/* Label */}
                <text x={ap.cx} y={ap.cy - 9} textAnchor="middle"
                  fontSize="7" fontWeight="700" fill={ap.live ? ap.color : "#6B7280"}>{ap.label}</text>
                {/* Tooltip on hover */}
                {isHov && (
                  <g>
                    <rect x={ap.cx - 32} y={ap.cy + 8} width={64} height={30} rx={4}
                      fill="#1C2A44" stroke={ap.color} strokeWidth="0.8" />
                    <text x={ap.cx} y={ap.cy + 20} textAnchor="middle" fontSize="7" fontWeight="700" fill="white">{ap.city}</text>
                    <text x={ap.cx} y={ap.cy + 30} textAnchor="middle" fontSize="6.5" fill="#8899BB">
                      {ap.live && stat ? `${(stat.total_waiting ?? 0) + (stat.total_called ?? 0)} antrean` : "Coming Soon"}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// ─── Activity Feed Panel ───────────────────────────────────────────────────────

function ActivityFeedPanel({ items }: { items: ActivityItem[] }) {
  return (
    <div className="rounded-xl flex flex-col overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0" style={{ borderColor: "var(--border)" }}>
        <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Aktivitas Real-Time</h3>
        <span className="text-[10px] px-2 py-px rounded-full font-semibold"
          style={{ background: "rgba(59,130,246,0.15)", color: "#3B82F6" }}>LIVE</span>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5" style={{ maxHeight: 340 }}>
        {items.length === 0 ? (
          <p className="text-center py-8 text-xs" style={{ color: "var(--text-muted)" }}>Belum ada aktivitas hari ini</p>
        ) : items.map((item) => {
          const color = STATUS_COLOR[item.status] ?? "#8899BB";
          const rel = (() => {
            const diff = Date.now() - new Date(item.created_at).getTime();
            const m = Math.floor(diff / 60000);
            if (m < 1) return "baru saja";
            if (m < 60) return `${m}m lalu`;
            return `${Math.floor(m / 60)}j lalu`;
          })();
          return (
            <div key={item.id} className="flex items-start gap-2.5 px-2 py-1.5 rounded-lg hover:bg-white/3 transition-colors">
              <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ background: color }} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>
                  <span style={{ color }}>CL.{item.queue_number}</span>
                  {" "}— {item.driver?.nama ?? "Driver"}
                </p>
                <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                  {STATUS_LABEL[item.status] ?? item.status} · {item.driver?.airport?.code ?? "—"} · {rel}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Monitoring Bandara Panel ─────────────────────────────────────────────────

function MonitoringBandaraPanel({ airportStats }: { airportStats: AirportStat[] }) {
  const AIRPORTS = [
    { code: "BTH001", label: "Batam",      color: "#3B82F6" },
    { code: "PKU001", label: "Pekanbaru",  color: "#06B6D4" },
    { code: "DJB001", label: "Jambi",      color: "#22C55E" },
    { code: "BPN001", label: "Balikpapan", color: "#A78BFA" },
    { code: "MDC001", label: "Manado",     color: "#F59E0B" },
  ];
  const statMap = Object.fromEntries(airportStats.map(a => [a.airport_code, a]));

  return (
    <div className="rounded-xl flex flex-col overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <div className="px-4 py-3 border-b flex-shrink-0" style={{ borderColor: "var(--border)" }}>
        <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Monitoring Bandara</h3>
        <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>Status antrean per cabang</p>
      </div>
      <div className="p-3 space-y-2.5">
        {AIRPORTS.map((ap) => {
          const s = statMap[ap.code];
          const waiting = s?.total_waiting ?? 0;
          const serving = s?.total_serving ?? 0;
          const done = s?.total_done ?? 0;
          const total = waiting + serving + done + (s?.total_called ?? 0) + (s?.total_violation ?? 0);
          const pct = total > 0 ? Math.round((done / total) * 100) : 0;
          return (
            <div key={ap.code}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: ap.color }} />
                  <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{ap.label}</span>
                </div>
                <div className="flex items-center gap-3 text-[10px]" style={{ color: "var(--text-muted)" }}>
                  <span>W <span style={{ color: "#3B82F6" }}>{waiting}</span></span>
                  <span>A <span style={{ color: "#F59E0B" }}>{serving}</span></span>
                  <span>D <span style={{ color: "#22C55E" }}>{done}</span></span>
                  <span className="font-bold" style={{ color: ap.color }}>{pct}%</span>
                </div>
              </div>
              <div className="h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: ap.color }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Analytics Overview ────────────────────────────────────────────────────────

const DONUT_COLORS = ["#3B82F6", "#06B6D4", "#22C55E", "#F59E0B", "#EF4444"];
const DONUT_LABELS = ["Menunggu", "Dipanggil", "Melayani", "Selesai", "Pelanggaran"];

function AnalyticsPanel({ airportStats }: { airportStats: AirportStat[] }) {
  const [period, setPeriod] = useState<"hari" | "minggu" | "bulan" | "tahun">("hari");

  const totals = airportStats.reduce(
    (acc, s) => ({
      waiting:   acc.waiting   + (s.total_waiting   ?? 0),
      called:    acc.called    + (s.total_called    ?? 0),
      serving:   acc.serving   + (s.total_serving   ?? 0),
      done:      acc.done      + (s.total_done      ?? 0),
      violation: acc.violation + (s.total_violation ?? 0),
    }),
    { waiting: 0, called: 0, serving: 0, done: 0, violation: 0 }
  );

  const donutData = [
    { name: "Menunggu",    value: totals.waiting },
    { name: "Dipanggil",  value: totals.called },
    { name: "Melayani",   value: totals.serving },
    { name: "Selesai",    value: totals.done },
    { name: "Pelanggaran",value: totals.violation },
  ].filter(d => d.value > 0);

  const total = Object.values(totals).reduce((a, b) => a + b, 0);

  const barData = airportStats.map(s => ({
    name: s.airport_code?.replace("001","") ?? "?",
    done: s.total_done ?? 0,
    waiting: s.total_waiting ?? 0,
  }));

  return (
    <div className="rounded-xl flex flex-col overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0" style={{ borderColor: "var(--border)" }}>
        <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Analytics Overview</h3>
        <div className="flex gap-0.5 p-0.5 rounded-lg" style={{ background: "rgba(255,255,255,0.05)" }}>
          {(["hari","minggu","bulan","tahun"] as const).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className="text-[10px] font-bold px-2.5 py-1 rounded-md capitalize transition-all"
              style={{
                background: period === p ? "var(--accent)" : "transparent",
                color: period === p ? "white" : "var(--text-muted)",
              }}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 flex items-center gap-4 p-4">
        <div className="relative flex-shrink-0">
          <PieChart width={100} height={100}>
            <Pie data={donutData.length ? donutData : [{ name: "–", value: 1 }]}
              cx={50} cy={50} innerRadius={32} outerRadius={46}
              dataKey="value" strokeWidth={0}>
              {donutData.length
                ? donutData.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)
                : <Cell fill="rgba(255,255,255,0.06)" />
              }
            </Pie>
          </PieChart>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-black" style={{ color: "var(--text-primary)" }}>{total}</span>
            <span className="text-[8px]" style={{ color: "var(--text-muted)" }}>total</span>
          </div>
        </div>
        <div className="flex-1 space-y-1.5">
          {DONUT_LABELS.map((label, i) => {
            const val = donutData.find(d => d.name === label)?.value ?? 0;
            const pct = total > 0 ? Math.round((val / total) * 100) : 0;
            return (
              <div key={label} className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: DONUT_COLORS[i] }} />
                <span className="text-[10px] flex-1" style={{ color: "var(--text-secondary)" }}>{label}</span>
                <span className="text-[10px] font-bold" style={{ color: "var(--text-primary)" }}>{val}</span>
                <span className="text-[9px] w-7 text-right" style={{ color: "var(--text-muted)" }}>{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>
      <div className="px-4 pb-4" style={{ height: 80 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={barData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }} barGap={2}>
            <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#4A5A78" }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip contentStyle={{ background: "#1C2A44", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }}
              labelStyle={{ color: "#F0F4FF" }} itemStyle={{ color: "#8899BB" }} />
            <Bar dataKey="done" name="Selesai" fill="#22C55E" radius={[2, 2, 0, 0]} />
            <Bar dataKey="waiting" name="Menunggu" fill="#3B82F6" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

// ─── ETA & Antrian mini panel ─────────────────────────────────────────────────

function ETAPanel({ airportStats }: { airportStats: AirportStat[] }) {
  const statMap = Object.fromEntries(airportStats.map(a => [a.airport_code, a]));
  const AIRPORTS = [
    { code: "BTH001", label: "BTH", color: "#3B82F6" },
    { code: "PKU001", label: "PKU", color: "#06B6D4" },
    { code: "DJB001", label: "DJB", color: "#22C55E" },
    { code: "BPN001", label: "BPN", color: "#A78BFA" },
    { code: "MDC001", label: "MDC", color: "#F59E0B" },
  ];

  return (
    <div className="rounded-xl flex flex-col overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <div className="px-4 py-3 border-b flex-shrink-0" style={{ borderColor: "var(--border)" }}>
        <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>ETA & Antrian</h3>
        <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>Driver aktif & antrean saat ini</p>
      </div>
      <div className="p-3 space-y-2">
        {AIRPORTS.map((ap) => {
          const s = statMap[ap.code];
          const drivers = s?.active_drivers ?? 0;
          const waiting = s?.total_waiting ?? 0;
          return (
            <div key={ap.code} className="flex items-center justify-between px-2 py-1.5 rounded-lg"
              style={{ background: "rgba(255,255,255,0.03)" }}>
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-black"
                  style={{ background: `${ap.color}22`, color: ap.color }}>
                  {ap.label}
                </div>
              </div>
              <div className="flex items-center gap-4 text-[10px]">
                <div className="text-center">
                  <div className="font-black" style={{ color: ap.color }}>{drivers}</div>
                  <div style={{ color: "var(--text-muted)" }}>driver</div>
                </div>
                <div className="text-center">
                  <div className="font-black" style={{ color: "#FFD300" }}>{waiting}</div>
                  <div style={{ color: "var(--text-muted)" }}>antrian</div>
                </div>
                <div className="w-12 h-1 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                  <div className="h-full rounded-full" style={{
                    width: `${Math.min(100, (waiting / Math.max(1, waiting + 5)) * 100)}%`,
                    background: ap.color,
                  }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Bottom Widgets ──────────────────────────────────────────────────────────

function BottomWidget({ wkey, onClose }: { wkey: WidgetKey; onClose: () => void }) {
  const { label, icon } = WIDGET_META[wkey];
  return (
    <div className="rounded-xl flex flex-col overflow-hidden" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center gap-2">
          <span>{icon}</span>
          <span className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{label}</span>
        </div>
        <button onClick={onClose} className="w-5 h-5 rounded-md flex items-center justify-center hover:bg-white/10 transition-colors"
          style={{ color: "var(--text-muted)" }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width={10} height={10}>
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
      <div className="flex-1 flex items-center justify-center p-4">
        <p className="text-xs text-center" style={{ color: "var(--text-muted)" }}>Data {label} — akan segera tersedia</p>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function NationalDashboardClient({ stats, airportStats, recentActivity }: Props) {
  const [liveActivity, setLiveActivity] = useState<ActivityItem[]>(recentActivity);
  const [liveStats, setLiveStats] = useState<AirportStat[]>(airportStats);
  const [hiddenWidgets, setHiddenWidgets] = useState<Set<WidgetKey>>(new Set());
  const supabase = createClient();

  // Load dismissed widgets from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("raos-hidden-widgets");
      if (stored) setHiddenWidgets(new Set(JSON.parse(stored)));
    } catch {}
  }, []);

  function dismissWidget(key: WidgetKey) {
    setHiddenWidgets(prev => {
      const next = new Set(prev);
      next.add(key);
      try { localStorage.setItem("raos-hidden-widgets", JSON.stringify([...next])); } catch {}
      return next;
    });
  }

  function restoreAllWidgets() {
    setHiddenWidgets(new Set());
    try { localStorage.removeItem("raos-hidden-widgets"); } catch {}
  }

  const refreshStats = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any).from("vw_command_center_per_airport").select("*");
    if (data) setLiveStats(data);
    const today = new Date().toISOString().split("T")[0];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: act } = await (supabase as any)
      .from("queue")
      .select(`id, queue_number, status, created_at, driver:driver_id(id, nama, driver_code, airport:airport_id(id, code))`)
      .eq("tanggal", today)
      .order("created_at", { ascending: false })
      .limit(30);
    if (act) setLiveActivity(act as unknown as ActivityItem[]);
  }, [supabase]);

  // Supabase Realtime
  useEffect(() => {
    const ch = supabase
      .channel("dashboard-queue")
      .on("postgres_changes", { event: "*", schema: "public", table: "queue" }, () => {
        refreshStats();
      })
      .subscribe();
    const interval = setInterval(refreshStats, 30000);
    return () => {
      supabase.removeChannel(ch);
      clearInterval(interval);
    };
  }, [supabase, refreshStats]);

  const visibleWidgets = WIDGET_KEYS.filter(k => !hiddenWidgets.has(k));

  const KPI_TILES = [
    { title: "Total Bandara",  value: stats.totalAirports, sub: "5 LIVE · 1 Coming Soon", accent: "#3B82F6",
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width={16} height={16}><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg> },
    { title: "Total Driver",   value: stats.totalDrivers,  sub: `${stats.activeDrivers} aktif`, accent: "#A78BFA",
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width={16} height={16}><path d="M19 17H5a2 2 0 01-2-2V9l3-6h12l3 6v6a2 2 0 01-2 2z"/><circle cx="7.5" cy="17.5" r="1.5"/><circle cx="16.5" cy="17.5" r="1.5"/><path d="M5 9h14"/></svg>,
      trend: { val: 5.2, label: "vs bulan lalu" } },
    { title: "Driver Aktif",   value: stats.activeDrivers, sub: "On duty hari ini",   accent: "#22C55E",
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width={16} height={16}><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8" strokeDasharray="4 2"/></svg> },
    { title: "Staff Aktif",    value: stats.activeStaff,   sub: `dari ${stats.totalStaff} total`, accent: "#06B6D4",
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width={16} height={16}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/></svg> },
    { title: "Antrian Hari Ini", value: stats.todayQueue,  sub: "Total pickup aktif",  accent: "#FFD300",
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width={16} height={16}><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>,
      trend: { val: 12.5, label: "vs kemarin" } },
    { title: "Pendapatan",     value: formatCurrency(stats.monthlyRevenue), sub: "Bulan ini · nasional", accent: "#22C55E",
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width={16} height={16}><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/></svg>,
      trend: { val: 8.3, label: "vs bulan lalu" } },
    { title: "KPI Nasional",   value: `${stats.kpiNational}%`, sub: "Rata-rata 5 bandara",  accent: "#3B82F6",
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width={16} height={16}><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
      trend: { val: 2.1, label: "vs bulan lalu" } },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Row 1 — 7 KPI tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-3">
        {KPI_TILES.map((t) => (
          <KPITile key={t.title} title={t.title} value={t.value} sub={t.sub} accent={t.accent} icon={t.icon} trend={t.trend} />
        ))}
      </div>

      {/* Row 2 — Map + Activity Feed */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4" style={{ minHeight: 320 }}>
        <div className="xl:col-span-2">
          <IndonesiaMapPanel airportStats={liveStats} />
        </div>
        <div>
          <ActivityFeedPanel items={liveActivity} />
        </div>
      </div>

      {/* Row 3 — 3 panels */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MonitoringBandaraPanel airportStats={liveStats} />
        <AnalyticsPanel airportStats={liveStats} />
        <ETAPanel airportStats={liveStats} />
      </div>

      {/* Row 4 — Bottom widgets */}
      {visibleWidgets.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Widget Panel</h3>
            {hiddenWidgets.size > 0 && (
              <button onClick={restoreAllWidgets} className="text-[10px] font-semibold hover:underline" style={{ color: "var(--accent)" }}>
                Tampilkan semua ({hiddenWidgets.size})
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3" style={{ minHeight: 120 }}>
            {visibleWidgets.map(k => (
              <BottomWidget key={k} wkey={k} onClose={() => dismissWidget(k)} />
            ))}
          </div>
        </div>
      )}

      {/* Restore bar when all hidden */}
      {visibleWidgets.length === 0 && hiddenWidgets.size > 0 && (
        <div className="flex items-center justify-between px-4 py-3 rounded-xl" style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>Semua widget disembunyikan</span>
          <button onClick={restoreAllWidgets} className="text-xs font-semibold hover:underline" style={{ color: "var(--accent)" }}>
            Tampilkan semua
          </button>
        </div>
      )}
    </div>
  );
}
