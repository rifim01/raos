"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { createClient } from "@/lib/supabase/client";

/* ── Types ─────────────────────────────────────────────────────────────── */
export type AirportTab = {
  code: string; dbCode: string; kota: string; bandara: string; iata: string; live: boolean;
};

type QueueRecord = {
  id: string; queue_number: number; status: string;
  call_time: string | null; serve_time: string | null; done_time: string | null; created_at: string;
  driver: { id: string; nama: string; driver_code: string; airport_id: string; airport: { id: string; code: string } | null } | null;
};

type DriverLocation = {
  driver_id: string; latitude: number; longitude: number; status: string | null;
  airport_id: string | null; last_seen: string;
};

type FlightRecord = {
  id: string; flight_number: string; airline: string | null; origin_city: string | null;
  origin_code: string | null; scheduled_time: string | null; estimated_time: string | null;
  status: string; gate: string | null;
};

type LayoutConfig = { airport_id: string; zone_a_capacity: number; zone_b_capacity: number };

type CommandStat = {
  airport_id: string; airport_code: string; airport_city: string;
  queue_waiting: number; queue_called: number; queue_pickup: number; queue_completed: number;
  queue_aktif: number; driver_total: number; driver_online: number;
  staff_hadir: number; pickup_hari_ini: number;
};

interface Props {
  airports: AirportTab[];
  commandStats: CommandStat[];
  todayQueue: QueueRecord[];
  recentActivity: QueueRecord[];
  driverLocations: DriverLocation[];
  layoutConfigs: LayoutConfig[];
  flightCache: FlightRecord[];
  userRoleLevel: number;
  userAirportCode: string | null;
}

/* ── AIRPORT ID MAP ─────────────────────────────────────────────────────── */
const AIRPORT_IDS: Record<string, string> = {
  BTH001: "1325804e-8dd5-458e-a782-80a231a09303",
  DJB001: "2669bd67-290d-4aa1-805f-540951592b2a",
  PKU001: "60be8461-09f3-4f2f-b50e-ff715f91f2f4",
  BPN001: "0e1de633-5de2-458c-bd3e-b83cb35517bd",
  MDC001: "0587c176-e85f-4c7b-a2be-0e255e158612",
  UPG001: "3528d0a3-ba4d-43d7-a91e-40786efaae48",
};

/* ── STATUS CONFIG ──────────────────────────────────────────────────────── */
const STATUS_MAP: Record<string, { label: string; color: string; ring: string }> = {
  WAITING:   { label: "Menunggu",      color: "#22C55E", ring: "ring-green-400"  },
  CALLED:    { label: "Dipanggil",     color: "#3B82F6", ring: "ring-blue-400"   },
  PICKUP:    { label: "Menuju Pickup", color: "#FFD300", ring: "ring-yellow-400" },
  SERVING:   { label: "Menuju Pickup", color: "#FFD300", ring: "ring-yellow-400" },
  VIOLATION: { label: "Pelanggaran",   color: "#C62828", ring: "ring-red-600"    },
  OFFLINE:   { label: "Offline",       color: "#6B7280", ring: "ring-gray-500"   },
};

/* ── FLIGHT STATUS BADGE ────────────────────────────────────────────────── */
const flightStatusColor: Record<string, string> = {
  LANDED:    "#22C55E",
  ARRIVED:   "#3B82F6",
  DELAYED:   "#FFD300",
  SCHEDULED: "#6B7280",
  CANCELLED: "#C62828",
};

/* ── HELPERS ────────────────────────────────────────────────────────────── */
function fmtTime(ts: string | null): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

function avgWaitMin(records: QueueRecord[]): number {
  const completed = records.filter((r) => r.call_time && r.serve_time);
  if (!completed.length) return 0;
  const total = completed.reduce((acc, r) => {
    const diff = (new Date(r.serve_time!).getTime() - new Date(r.call_time!).getTime()) / 60000;
    return acc + diff;
  }, 0);
  return Math.round(total / completed.length);
}

/* ══════════════════════════════════════════════════════════════════════════
   SVG — DIGITAL TWIN TERMINAL
══════════════════════════════════════════════════════════════════════════ */
type DriverMarker = { queueNum: number; status: string; nama: string; zone: "A" | "B"; slotIdx: number };

function TerminalSVG({
  drivers, is3D, zoneACapacity, zoneBCapacity,
}: {
  drivers: DriverMarker[];
  is3D: boolean;
  zoneACapacity: number;
  zoneBCapacity: number;
}) {
  /* Zone A: slots in 4×5 grid (col-major), Zone B: same */
  const COLS = 5;
  const ZONE_A = { x: 58, y: 198, w: 370, h: 135 };
  const ZONE_B = { x: 472, y: 198, w: 370, h: 135 };
  const CELL = { w: ZONE_A.w / COLS, h: ZONE_A.h / Math.ceil(zoneACapacity / COLS) };

  function markerPos(zone: "A" | "B", slotIdx: number) {
    const z = zone === "A" ? ZONE_A : ZONE_B;
    const rows = Math.ceil((zone === "A" ? zoneACapacity : zoneBCapacity) / COLS);
    const cellH = z.h / rows;
    const cellW = z.w / COLS;
    const col = slotIdx % COLS;
    const row = Math.floor(slotIdx / COLS);
    return {
      cx: z.x + cellW * col + cellW / 2,
      cy: z.y + cellH * row + cellH / 2,
    };
  }

  const arrowYPositions = [145, 160, 175];

  return (
    <div
      className="relative w-full"
      style={{
        transition: "transform 0.5s ease",
        transform: is3D
          ? "perspective(900px) rotateX(20deg) scale(1.03)"
          : "none",
        transformOrigin: "center top",
      }}
    >
      <svg
        viewBox="0 0 900 520"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full"
        style={{ display: "block" }}
      >
        {/* ── Background ── */}
        <rect width="900" height="520" fill="#0A1628" />

        {/* ── Area Parkir ── */}
        <rect x="40" y="420" width="820" height="80" rx="4" fill="#071020" stroke="#1A2D50" strokeWidth="1" />
        <text x="450" y="463" textAnchor="middle" fill="#2A4070" fontSize="12" fontWeight="700" letterSpacing="2">
          AREA PARKIR
        </text>
        {/* Parking lot lines */}
        {[120, 200, 280, 360, 540, 620, 700, 780].map((x) => (
          <line key={x} x1={x} y1="424" x2={x} y2="496" stroke="#1A2D50" strokeWidth="1" strokeDasharray="4,4" />
        ))}

        {/* ── Jalur Kendaraan ── */}
        <rect x="40" y="360" width="820" height="58" rx="0" fill="#0D1629" />
        <line x1="40" y1="360" x2="860" y2="360" stroke="#1E3A6E" strokeWidth="1.5" />
        <line x1="40" y1="418" x2="860" y2="418" stroke="#1E3A6E" strokeWidth="1.5" />
        {/* Center lane dashes */}
        {Array.from({ length: 20 }).map((_, i) => (
          <rect key={i} x={60 + i * 42} y="386" width="24" height="3" rx="1" fill="#FFD30030" />
        ))}
        <text x="450" y="373" textAnchor="middle" fill="#2A4070" fontSize="10" fontWeight="700" letterSpacing="2">
          JALUR KENDARAAN →
        </text>

        {/* Animated car */}
        <motion.g
          initial={{ x: -60 }}
          animate={{ x: 960 }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
        >
          <rect x="0" y="372" width="48" height="26" rx="5" fill="#1A3A6E" stroke="#2A5AAE" strokeWidth="1.5" />
          <rect x="8" y="375" width="32" height="12" rx="2" fill="#0A1628" />
          <circle cx="10" cy="399" r="5" fill="#0A1628" stroke="#2A5AAE" strokeWidth="1.5" />
          <circle cx="38" cy="399" r="5" fill="#0A1628" stroke="#2A5AAE" strokeWidth="1.5" />
          <rect x="42" y="376" width="6" height="3" rx="1" fill="#FFD300" opacity="0.8" />
        </motion.g>

        {/* ── Pickup Zone A ── */}
        <rect x={ZONE_A.x} y={ZONE_A.y} width={ZONE_A.w} height={ZONE_A.h}
          fill="rgba(255,211,0,0.04)" stroke="#FFD300" strokeWidth="1.5" strokeDasharray="6,4" rx="6" />
        <text x={ZONE_A.x + ZONE_A.w / 2} y={ZONE_A.y + 16} textAnchor="middle"
          fill="#FFD300" fontSize="11" fontWeight="800" letterSpacing="2">PICKUP ZONE A</text>

        {/* ── Pickup Zone B ── */}
        <rect x={ZONE_B.x} y={ZONE_B.y} width={ZONE_B.w} height={ZONE_B.h}
          fill="rgba(255,211,0,0.04)" stroke="#FFD300" strokeWidth="1.5" strokeDasharray="6,4" rx="6" />
        <text x={ZONE_B.x + ZONE_B.w / 2} y={ZONE_B.y + 16} textAnchor="middle"
          fill="#FFD300" fontSize="11" fontWeight="800" letterSpacing="2">PICKUP ZONE B</text>

        {/* ── Pos Koordinator Rifim ── */}
        <rect x="386" y="242" width="128" height="60" rx="6"
          fill="rgba(99,40,198,0.25)" stroke="#7C3AED" strokeWidth="1.5" />
        <text x="450" y="268" textAnchor="middle" fill="#A78BFA" fontSize="9" fontWeight="800" letterSpacing="1">
          POS KOORDINATOR
        </text>
        <text x="450" y="282" textAnchor="middle" fill="#A78BFA" fontSize="9" fontWeight="800" letterSpacing="1">
          RIFIM
        </text>

        {/* ── Pedestrian area ── */}
        <rect x="40" y="140" width="820" height="52" fill="rgba(26,45,80,0.6)" />
        <line x1="40" y1="140" x2="860" y2="140" stroke="#1E3A6E" strokeWidth="1" />
        <line x1="40" y1="192" x2="860" y2="192" stroke="#1E3A6E" strokeWidth="1" />
        <text x="100" y="170" fill="#2A4070" fontSize="10" fontWeight="700" letterSpacing="2">AREA PEDESTRIAN</text>

        {/* Zebra crossing */}
        {Array.from({ length: 8 }).map((_, i) => (
          <rect key={i} x={390 + i * 15} y="150" width="8" height="34" rx="1"
            fill="rgba(255,255,255,0.12)" />
        ))}

        {/* ── Terminal Building ── */}
        <rect x="40" y="10" width="820" height="128" rx="6" fill="#0F1F3D" stroke="#1E3A6E" strokeWidth="1.5" />
        {/* Canopy pillars */}
        {[100, 200, 320, 440, 560, 680, 800].map((x) => (
          <rect key={x} x={x - 4} y="108" width="8" height="32" rx="2" fill="#1E3A6E" />
        ))}
        {/* Canopy line */}
        <rect x="40" y="108" width="820" height="6" rx="2" fill="#1E3A6E" />

        {/* Terminal label */}
        <text x="450" y="52" textAnchor="middle" fill="#FFFFFF" fontSize="16" fontWeight="900" letterSpacing="3">
          TERMINAL KEDATANGAN
        </text>
        {/* Windows */}
        {[80, 180, 290, 390, 490, 590, 690, 790].map((x) => (
          <rect key={x} x={x} y="65" width="70" height="30" rx="3"
            fill="rgba(59,130,246,0.15)" stroke="#1E3A6E" strokeWidth="1" />
        ))}

        {/* Keluar Penumpang doors */}
        {[140, 280, 440, 580, 720].map((x, i) => (
          <g key={i}>
            <rect x={x - 20} y="114" width="40" height="24" rx="3"
              fill="rgba(34,197,94,0.15)" stroke="#22C55E" strokeWidth="1" />
            <text x={x} y="130" textAnchor="middle" fill="#22C55E" fontSize="7" fontWeight="700">KELUAR</text>
          </g>
        ))}

        {/* ── Animated yellow flow arrows (passenger flow) ── */}
        {[140, 280, 440, 580, 720].map((x) =>
          arrowYPositions.map((y, ai) => (
            <motion.polygon
              key={`${x}-${ai}`}
              points={`${x - 7},${y} ${x + 7},${y} ${x},${y + 10}`}
              fill="#FFD300"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: [0, 1, 0], y: [0, 6, 12] }}
              transition={{
                duration: 1.4,
                repeat: Infinity,
                delay: ai * 0.35 + (x / 900) * 0.5,
                ease: "easeInOut",
              }}
            />
          ))
        )}

        {/* ── Driver markers (realtime overlay) ── */}
        <AnimatePresence>
          {drivers.map((d) => {
            const pos = markerPos(d.zone, d.slotIdx);
            const sc = STATUS_MAP[d.status] ?? STATUS_MAP.OFFLINE;
            return (
              <motion.g
                key={d.queueNum}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                style={{ transformOrigin: `${pos.cx}px ${pos.cy}px` }}
              >
                {/* Pulse ring for active statuses */}
                {(d.status === "CALLED" || d.status === "VIOLATION") && (
                  <motion.circle
                    cx={pos.cx} cy={pos.cy} r={16}
                    fill="none" stroke={sc.color} strokeWidth="2"
                    animate={{ r: [14, 20], opacity: [0.8, 0] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                  />
                )}
                <circle cx={pos.cx} cy={pos.cy} r={13}
                  fill={sc.color} stroke="rgba(0,0,0,0.4)" strokeWidth="1.5" />
                <text x={pos.cx} y={pos.cy - 1} textAnchor="middle"
                  dominantBaseline="middle" fill="white" fontSize="8" fontWeight="900">
                  {`CL.${d.queueNum}`}
                </text>
              </motion.g>
            );
          })}
        </AnimatePresence>

        {/* Empty zone message */}
        {drivers.filter((d) => d.zone === "A").length === 0 && (
          <text x={ZONE_A.x + ZONE_A.w / 2} y={ZONE_A.y + ZONE_A.h / 2}
            textAnchor="middle" fill="#2A4070" fontSize="11">Tidak ada driver aktif</text>
        )}
        {drivers.filter((d) => d.zone === "B").length === 0 && (
          <text x={ZONE_B.x + ZONE_B.w / 2} y={ZONE_B.y + ZONE_B.h / 2}
            textAnchor="middle" fill="#2A4070" fontSize="11">Tidak ada driver aktif</text>
        )}
      </svg>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   DONUT CHART
══════════════════════════════════════════════════════════════════════════ */
function DonutChart({ waiting, called, pickup, violation }: {
  waiting: number; called: number; pickup: number; violation: number;
}) {
  const total = waiting + called + pickup + violation;
  const data = [
    { name: "Menunggu",      value: waiting,   color: "#22C55E" },
    { name: "Dipanggil",     value: called,    color: "#3B82F6" },
    { name: "Menuju Pickup", value: pickup,    color: "#FFD300" },
    { name: "Pelanggaran",   value: violation, color: "#C62828" },
  ].filter((d) => d.value > 0);

  return (
    <div className="flex items-center gap-4">
      <div className="relative w-28 h-28 flex-shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={32} outerRadius={52}
              dataKey="value" strokeWidth={0}>
              {data.map((d) => <Cell key={d.name} fill={d.color} />)}
            </Pie>
            <Tooltip
              contentStyle={{ background: "#0D1A34", border: "1px solid #1E3A6E", borderRadius: 8, fontSize: 11 }}
              itemStyle={{ color: "#94A3B8" }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-white font-black text-xl leading-none">{total}</span>
          <span className="text-slate-400 text-[9px] font-bold uppercase tracking-wide mt-0.5">Driver</span>
        </div>
      </div>
      <div className="flex flex-col gap-1.5 text-xs min-w-0">
        {[
          { label: "Menunggu",      value: waiting,   color: "#22C55E" },
          { label: "Dipanggil",     value: called,    color: "#3B82F6" },
          { label: "Menuju Pickup", value: pickup,    color: "#FFD300" },
          { label: "Pelanggaran",   value: violation, color: "#C62828" },
        ].map((r) => (
          <div key={r.label} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: r.color }} />
            <span className="text-slate-300 truncate">{r.label}</span>
            <span className="ml-auto font-bold text-white pl-2">{r.value}</span>
            <span className="text-slate-500 w-10 text-right">
              {total > 0 ? `${Math.round((r.value / total) * 100)}%` : "—"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   PICKUP ZONE OCCUPANCY HEATMAP
══════════════════════════════════════════════════════════════════════════ */
function OccupancyHeatmap({
  zoneACount, zoneBCount, zoneACapacity, zoneBCapacity,
}: {
  zoneACount: number; zoneBCount: number; zoneACapacity: number; zoneBCapacity: number;
}) {
  function pct(count: number, cap: number) {
    return Math.min(100, cap > 0 ? Math.round((count / cap) * 100) : 0);
  }
  function heatColor(p: number) {
    if (p >= 90) return "#C62828";
    if (p >= 70) return "#F97316";
    if (p >= 45) return "#FFD300";
    if (p >= 20) return "#84CC16";
    return "#22C55E";
  }

  const pA = pct(zoneACount, zoneACapacity);
  const pB = pct(zoneBCount, zoneBCapacity);

  return (
    <div>
      <div className="flex gap-2 mb-2">
        {["Rendah", "", "", "", "Tinggi"].map((l, i) => (
          <div key={i} className="flex items-center gap-1">
            <div className="w-6 h-2.5 rounded-sm" style={{
              background: ["#22C55E","#84CC16","#FFD300","#F97316","#C62828"][i],
            }} />
            {l && <span className="text-[9px] text-slate-500">{l}</span>}
          </div>
        ))}
      </div>

      {/* Mini terminal schematic */}
      <svg viewBox="0 0 260 100" className="w-full rounded-lg" style={{ background: "#071020" }}>
        {/* Terminal */}
        <rect x="10" y="5" width="240" height="22" rx="3" fill="#0F1F3D" stroke="#1E3A6E" strokeWidth="1" />
        <text x="130" y="19" textAnchor="middle" fill="#2A4070" fontSize="8" fontWeight="700">TERMINAL</text>

        {/* Zone A */}
        <rect x="10" y="34" width="110" height="40" rx="3"
          fill={`${heatColor(pA)}22`} stroke={heatColor(pA)} strokeWidth="1.5" />
        <text x="65" y="50" textAnchor="middle" fill={heatColor(pA)} fontSize="8" fontWeight="700">ZONE A</text>
        <text x="65" y="66" textAnchor="middle" fill="white" fontSize="11" fontWeight="900">{pA}%</text>

        {/* Zone B */}
        <rect x="140" y="34" width="110" height="40" rx="3"
          fill={`${heatColor(pB)}22`} stroke={heatColor(pB)} strokeWidth="1.5" />
        <text x="195" y="50" textAnchor="middle" fill={heatColor(pB)} fontSize="8" fontWeight="700">ZONE B</text>
        <text x="195" y="66" textAnchor="middle" fill="white" fontSize="11" fontWeight="900">{pB}%</text>

        {/* Road */}
        <rect x="10" y="80" width="240" height="14" rx="2" fill="#0D1629" stroke="#1E3A6E" strokeWidth="0.5" />
        <text x="130" y="90" textAnchor="middle" fill="#1E3A6E" fontSize="7" fontWeight="700">JALUR KENDARAAN</text>
      </svg>

      <div className="flex gap-4 mt-2">
        <div className="flex-1 text-center">
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Zone A</div>
          <div className="font-black text-white">{zoneACount}<span className="text-slate-500 text-xs font-normal">/{zoneACapacity}</span></div>
        </div>
        <div className="w-px bg-slate-800" />
        <div className="flex-1 text-center">
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Zone B</div>
          <div className="font-black text-white">{zoneBCount}<span className="text-slate-500 text-xs font-normal">/{zoneBCapacity}</span></div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   FLIGHT ARRIVAL BOARD
══════════════════════════════════════════════════════════════════════════ */
function FlightBoard({ flights, airportIata }: { flights: FlightRecord[]; airportIata: string }) {
  if (!flights.length) {
    return (
      <div className="text-center py-4">
        <div className="text-slate-500 text-xs">Belum ada data flight</div>
        <div className="text-slate-600 text-[10px] mt-1">
          Konfigurasi Flight API (Aviation Edge / AviationStack) untuk data live
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1" style={{ scrollbarWidth: "thin" }}>
      {flights.map((f) => {
        const color = flightStatusColor[f.status] ?? "#6B7280";
        return (
          <div key={f.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
            style={{ background: "rgba(255,255,255,0.03)" }}>
            <div className="font-black text-white text-xs w-14 flex-shrink-0">{f.flight_number}</div>
            <div className="flex-1 min-w-0">
              <div className="text-slate-300 text-[11px] font-semibold truncate">
                {f.origin_city ?? "—"} <span className="text-slate-500">({f.origin_code ?? "—"})</span>
              </div>
            </div>
            <div className="text-slate-400 text-[10px] flex-shrink-0">{f.scheduled_time ?? "—"}</div>
            <div className="text-[9px] font-black flex-shrink-0 px-1.5 py-0.5 rounded"
              style={{ color, background: `${color}22` }}>
              {f.status}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   MAIN CLIENT
══════════════════════════════════════════════════════════════════════════ */
export default function TerminalKedatanganClient({
  airports, commandStats, todayQueue, recentActivity,
  driverLocations: _driverLocations, layoutConfigs, flightCache, userRoleLevel,
}: Props) {
  const [selectedCode, setSelectedCode] = useState(airports.find((a) => a.live)?.code ?? airports[0].code);
  const [is3D, setIs3D] = useState(true);
  const [liveClock, setLiveClock] = useState("");
  const [liveDate, setLiveDate] = useState("");
  const [liveQueue, setLiveQueue] = useState<QueueRecord[]>(todayQueue);
  const [liveActivity, setLiveActivity] = useState<QueueRecord[]>(recentActivity);
  const [refreshTick, setRefreshTick] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const REFRESH_SEC = 5;

  /* Live clock */
  useEffect(() => {
    function tick() {
      const now = new Date();
      setLiveClock(now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }));
      setLiveDate(now.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric" }));
    }
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  /* Auto-refresh tick */
  useEffect(() => {
    intervalRef.current = setInterval(() => setRefreshTick((n) => n + 1), REFRESH_SEC * 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  /* Supabase Realtime subscription */
  useEffect(() => {
    let supabase: ReturnType<typeof createClient>;
    try { supabase = createClient(); } catch { return; }

    const airport = airports.find((a) => a.code === selectedCode);
    const airportId = airport ? AIRPORT_IDS[airport.dbCode] : null;
    if (!airportId) return;

    const today = new Date().toISOString().split("T")[0];

    const channel = supabase
      .channel(`terminal-${selectedCode}`)
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        "postgres_changes" as any,
        { event: "*", schema: "public", table: "queue", filter: `tanggal=eq.${today}` },
        async () => {
          /* Re-fetch on any queue change */
          const { data: fresh } = await supabase
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .from("queue" as any)
            .select(`
              id, queue_number, status, tanggal, call_time, serve_time, done_time, created_at,
              driver:driver_id(id, nama, driver_code, airport_id,
                airport:airport_id(id, code)
              )
            `)
            .eq("tanggal", today)
            .in("status", ["WAITING", "CALLED", "PICKUP", "SERVING", "VIOLATION"])
            .order("queue_number", { ascending: true });

          if (fresh) setLiveQueue(fresh as unknown as QueueRecord[]);

          const { data: act } = await supabase
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .from("queue" as any)
            .select(`
              id, queue_number, status, call_time, serve_time, done_time, created_at,
              driver:driver_id(id, nama, driver_code,
                airport:airport_id(id, code)
              )
            `)
            .eq("tanggal", today)
            .order("created_at", { ascending: false })
            .limit(30);

          if (act) setLiveActivity(act as unknown as QueueRecord[]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedCode, airports, refreshTick]);

  /* ── Derive per-airport data ─────────────────────────────── */
  const airport = airports.find((a) => a.code === selectedCode)!;
  const airportId = AIRPORT_IDS[airport.dbCode];

  const stats = commandStats.find((s) => s.airport_code === airport.dbCode);
  const layoutCfg = layoutConfigs.find((l) => l.airport_id === airportId)
    ?? { zone_a_capacity: 20, zone_b_capacity: 20 };

  /* Filter queue for this airport */
  const airportQueue = liveQueue.filter(
    (q) => q.driver?.airport?.code === airport.dbCode || q.driver?.airport_id === airportId
  );

  /* Build driver markers for SVG */
  const driverMarkers: DriverMarker[] = [];
  let slotA = 0, slotB = 0;
  for (const q of airportQueue) {
    const zone: "A" | "B" = q.queue_number % 2 === 1 ? "A" : "B";
    if (zone === "A" && slotA < layoutCfg.zone_a_capacity) {
      driverMarkers.push({ queueNum: q.queue_number, status: q.status, nama: q.driver?.nama ?? "", zone, slotIdx: slotA++ });
    } else if (zone === "B" && slotB < layoutCfg.zone_b_capacity) {
      driverMarkers.push({ queueNum: q.queue_number, status: q.status, nama: q.driver?.nama ?? "", zone, slotIdx: slotB++ });
    }
  }

  const zoneADrivers = driverMarkers.filter((d) => d.zone === "A");
  const zoneBDrivers = driverMarkers.filter((d) => d.zone === "B");

  /* Status counts */
  const qWaiting   = airportQueue.filter((q) => q.status === "WAITING").length;
  const qCalled    = airportQueue.filter((q) => q.status === "CALLED").length;
  const qPickup    = airportQueue.filter((q) => q.status === "PICKUP" || q.status === "SERVING").length;
  const qViolation = airportQueue.filter((q) => q.status === "VIOLATION").length;

  /* Activity for this airport */
  const airportActivity = liveActivity.filter(
    (a) => a.driver?.airport?.code === airport.dbCode || !a.driver?.airport
  ).slice(0, 8);

  /* Avg wait times per zone */
  const zoneAWait = avgWaitMin(airportQueue.filter((_, i) => i % 2 === 0));
  const zoneBWait = avgWaitMin(airportQueue.filter((_, i) => i % 2 === 1));

  /* KPI */
  const driverAktif = stats?.driver_online ?? (qWaiting + qCalled + qPickup + qViolation);
  const pickupSelesai = stats?.pickup_hari_ini ?? 0;
  const staffHadir = stats?.staff_hadir ?? 0;

  const useKoordinator = useCallback(
    (fn: () => void) => { if (userRoleLevel >= 3) fn(); },
    [userRoleLevel]
  );
  void useKoordinator;

  /* ── Render ──────────────────────────────────────────────── */
  return (
    <div className="flex flex-col min-h-full" style={{ background: "#0A1628", color: "#E2E8F0" }}>

      {/* ── TOP BAR ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b"
        style={{ borderColor: "#1E3A6E", background: "#0D1A34" }}>

        {/* Clock */}
        <div className="flex items-center gap-3">
          <div className="flex flex-col leading-none">
            <span className="text-2xl font-black text-white tabular-nums">{liveClock}</span>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">{liveDate}</span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-widest"
            style={{ background: "rgba(34,197,94,0.15)", color: "#22C55E", border: "1px solid rgba(34,197,94,0.3)" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            LIVE
          </div>
        </div>

        {/* Page title */}
        <div className="text-center hidden md:block">
          <div className="text-xs font-black text-white uppercase tracking-[0.15em]">Terminal Kedatangan</div>
          <div className="text-[10px] text-slate-400 tracking-widest">Live Command Center</div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] text-slate-400"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid #1E3A6E" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            Auto-refresh {REFRESH_SEC}s
          </div>
          <button
            onClick={() => setIs3D((v) => !v)}
            className="px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-all"
            style={{
              background: is3D ? "#FFD300" : "rgba(255,255,255,0.06)",
              color: is3D ? "#000" : "#94A3B8",
              border: "1px solid " + (is3D ? "#FFD300" : "#1E3A6E"),
            }}
          >
            {is3D ? "3D" : "2D"}
          </button>
        </div>
      </div>

      {/* ── AIRPORT TABS ─────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 py-2.5 overflow-x-auto"
        style={{ background: "#0A1628", borderBottom: "1px solid #1E3A6E" }}>
        {airports.map((ap) => {
          const isActive = ap.code === selectedCode;
          const disabled = !ap.live;
          return (
            <button
              key={ap.code}
              onClick={() => { if (!disabled) setSelectedCode(ap.code); }}
              disabled={disabled}
              className="flex-shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all"
              style={{
                background: isActive ? "#FFD300" : disabled ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.05)",
                color: isActive ? "#000" : disabled ? "#2A4070" : "#94A3B8",
                border: isActive ? "2px solid #FFE042" : "1px solid #1E3A6E",
                cursor: disabled ? "not-allowed" : "pointer",
              }}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                width="12" height="12" className="flex-shrink-0">
                <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21 4 19 2c-2-2-4-2-5.5-.5L10 5 1.8 6.2a.8.8 0 0 0-.3 1.4L5 11l-1 3-2 1 1 2 2-1 3-1 3.5 3.5 1.2 4 1.4-.3z"/>
              </svg>
              <span>{ap.kota} ({ap.code})</span>
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded"
                style={{
                  background: disabled ? "rgba(107,114,128,0.2)" : "rgba(34,197,94,0.15)",
                  color: disabled ? "#4B5563" : "#22C55E",
                }}>
                {disabled ? "SOON" : "LIVE"}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── MAIN GRID ────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col lg:flex-row gap-0 overflow-hidden">

        {/* LEFT LEGEND */}
        <div className="w-full lg:w-44 flex-shrink-0 p-3 border-r"
          style={{ borderColor: "#1E3A6E", background: "#0A1628" }}>
          <div className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-500 mb-3 px-1">
            Status Driver
          </div>
          <div className="space-y-2">
            {Object.entries(STATUS_MAP).filter(([k]) => k !== "SERVING").map(([, sc]) => (
              <div key={sc.label} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg"
                style={{ background: "rgba(255,255,255,0.03)" }}>
                <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: sc.color }} />
                <span className="text-xs font-semibold text-slate-300 leading-none">{sc.label}</span>
              </div>
            ))}
          </div>

          {/* Quick stats */}
          <div className="mt-4 pt-4 border-t space-y-2" style={{ borderColor: "#1E3A6E" }}>
            <div className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-500 px-1">Ringkasan</div>
            {[
              { label: "Menunggu",  value: qWaiting,   color: "#22C55E" },
              { label: "Dipanggil", value: qCalled,    color: "#3B82F6" },
              { label: "Menuju",    value: qPickup,    color: "#FFD300" },
              { label: "Pelangg.", value: qViolation, color: "#C62828" },
            ].map((r) => (
              <div key={r.label} className="flex items-center justify-between px-2 py-1 rounded-lg text-xs"
                style={{ background: "rgba(255,255,255,0.03)" }}>
                <span className="text-slate-400">{r.label}</span>
                <span className="font-black" style={{ color: r.color }}>{r.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CENTER: Digital Twin + BAWAH */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Airport header bar */}
          <div className="px-4 py-2 flex items-center gap-3"
            style={{ background: "rgba(13,26,52,0.6)", borderBottom: "1px solid #1E3A6E" }}>
            <div className="text-sm font-black text-white">
              {airport.bandara} — <span style={{ color: "#FFD300" }}>{airport.kota} ({airport.code})</span>
            </div>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black"
              style={{ background: "rgba(34,197,94,0.12)", color: "#22C55E", border: "1px solid rgba(34,197,94,0.25)" }}>
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              LIVE
            </div>
          </div>

          {/* Digital Twin SVG */}
          <div className="flex-1 p-3 overflow-hidden flex items-start">
            <TerminalSVG
              drivers={driverMarkers}
              is3D={is3D}
              zoneACapacity={layoutCfg.zone_a_capacity}
              zoneBCapacity={layoutCfg.zone_b_capacity}
            />
          </div>

          {/* BOTTOM PANELS */}
          <div className="flex flex-col xl:flex-row gap-0 border-t" style={{ borderColor: "#1E3A6E" }}>

            {/* Activity Feed */}
            <div className="flex-1 p-3 border-r" style={{ borderColor: "#1E3A6E" }}>
              <div className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-500 mb-2">
                Aktivitas Driver Realtime
              </div>
              <div className="space-y-1 max-h-44 overflow-y-auto pr-1" style={{ scrollbarWidth: "thin" }}>
                {airportActivity.length === 0 && (
                  <div className="text-slate-600 text-xs text-center py-4">Belum ada aktivitas hari ini</div>
                )}
                {airportActivity.map((r) => {
                  const sc = STATUS_MAP[r.status] ?? STATUS_MAP.OFFLINE;
                  return (
                    <div key={r.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs"
                      style={{ background: "rgba(255,255,255,0.03)" }}>
                      <span className="text-slate-500 w-10 flex-shrink-0 tabular-nums">
                        {fmtTime(r.created_at)}
                      </span>
                      <span className="font-black text-white w-12 flex-shrink-0"
                        style={{ color: sc.color }}>CL.{r.queue_number}</span>
                      <span className="text-slate-300 truncate flex-1">{r.driver?.nama ?? "—"}</span>
                      <span className="font-bold flex-shrink-0" style={{ color: sc.color }}>{sc.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Queue per Zone */}
            <div className="xl:w-72 p-3 flex flex-col gap-2">
              <div className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-500 mb-1">
                Antrian Pickup Point
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "ZONE A", count: zoneADrivers.length, cap: layoutCfg.zone_a_capacity, wait: zoneAWait, color: "#22C55E" },
                  { label: "ZONE B", count: zoneBDrivers.length, cap: layoutCfg.zone_b_capacity, wait: zoneBWait, color: "#3B82F6" },
                ].map((z) => (
                  <div key={z.label} className="p-3 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid #1E3A6E" }}>
                    <div className="text-[9px] font-black uppercase tracking-widest mb-2" style={{ color: z.color }}>
                      {z.label}
                    </div>
                    <div className="text-2xl font-black text-white leading-none">
                      {z.count}
                      <span className="text-slate-500 text-xs font-normal ml-1">/{z.cap}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">Driver antri</div>
                    <div className="text-sm font-black mt-2" style={{ color: "#FFD300" }}>
                      {z.wait > 0 ? `${String(Math.floor(z.wait / 60)).padStart(2,"0")}:${String(z.wait % 60).padStart(2,"0")}` : "—:——"}
                    </div>
                    <div className="text-[10px] text-slate-500">Avg Wait</div>
                    {/* Occupancy bar */}
                    <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: "#1E3A6E" }}>
                      <div className="h-full rounded-full transition-all"
                        style={{ width: `${Math.min(100, z.cap > 0 ? (z.count / z.cap) * 100 : 0)}%`, background: z.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="w-full lg:w-80 xl:w-96 flex-shrink-0 flex flex-col border-l overflow-y-auto"
          style={{ borderColor: "#1E3A6E", background: "#0A1628", scrollbarWidth: "thin" }}>

          {/* Ringkasan hari ini */}
          <div className="p-4 border-b" style={{ borderColor: "#1E3A6E" }}>
            <div className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-500 mb-3">
              Ringkasan Hari Ini — {airport.code}
            </div>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[
                { label: "Menunggu",  value: qWaiting,   color: "#22C55E" },
                { label: "Dipanggil", value: qCalled,    color: "#3B82F6" },
                { label: "Pickup",    value: qPickup,    color: "#FFD300" },
                { label: "Pelanggan", value: qViolation, color: "#C62828" },
              ].map((s) => (
                <div key={s.label} className="text-center p-2 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid #1E3A6E" }}>
                  <div className="font-black text-xl leading-none" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-[9px] text-slate-500 mt-1 font-semibold leading-tight">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Distribusi donut */}
            <div className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-500 mb-2">
              Distribusi Status
            </div>
            <DonutChart waiting={qWaiting} called={qCalled} pickup={qPickup} violation={qViolation} />
          </div>

          {/* Flight Arrival Board */}
          <div className="p-4 border-b" style={{ borderColor: "#1E3A6E" }}>
            <div className="flex items-center justify-between mb-3">
              <div className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-500">
                Flight Arrival (Terbaru)
              </div>
              <span className="text-[9px] text-slate-600 font-bold">{airport.iata}</span>
            </div>
            <FlightBoard flights={flightCache} airportIata={airport.iata} />
          </div>

          {/* Pickup Zone Occupancy Heatmap */}
          <div className="p-4">
            <div className="text-[9px] font-black uppercase tracking-[0.15em] text-slate-500 mb-3">
              Kepadatan Pickup Zone
            </div>
            <OccupancyHeatmap
              zoneACount={zoneADrivers.length}
              zoneBCount={zoneBDrivers.length}
              zoneACapacity={layoutCfg.zone_a_capacity}
              zoneBCapacity={layoutCfg.zone_b_capacity}
            />
          </div>
        </div>
      </div>

      {/* ── KPI BAR ─────────────────────────────────────────────── */}
      <div className="border-t px-4 py-3" style={{ borderColor: "#1E3A6E", background: "#0D1A34" }}>
        <div className="flex flex-wrap items-center gap-4 xl:gap-8">
          {[
            { label: "Driver Aktif",     value: driverAktif,                      color: "#22C55E", icon: "👤" },
            { label: "Pickup Selesai",   value: pickupSelesai,                    color: "#3B82F6", icon: "✅" },
            { label: "Avg Wait Time",    value: `${zoneAWait + zoneBWait > 0 ? `${Math.floor((zoneAWait + zoneBWait) / 2)}m` : "—"}`, color: "#FFD300", icon: "⏱" },
            { label: "Staff Hadir",      value: staffHadir,                       color: "#A78BFA", icon: "👥" },
            { label: "Tingkat Kepatuhan",value: qViolation === 0 ? "—" : `${Math.round(((qWaiting + qCalled + qPickup) / (qWaiting + qCalled + qPickup + qViolation)) * 100)}%`, color: "#22C55E", icon: "📊" },
          ].map((k, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <span className="text-base leading-none">{k.icon}</span>
              <div>
                <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider leading-none mb-0.5">
                  {k.label}
                </div>
                <div className="text-lg font-black leading-none" style={{ color: k.color }}>
                  {k.value}
                </div>
              </div>
              {i < 4 && <div className="w-px h-8 ml-2" style={{ background: "#1E3A6E" }} />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
