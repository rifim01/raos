"use client";

import { AIRPORTS } from "@/lib/utils";

interface AirportStat {
  code: string;
  activeDrivers: number;
  totalDrivers: number;
  activeStaff: number;
}

interface AirportMapProps {
  stats?: AirportStat[];
}

// Indonesia SVG map — simplified coordinate mapping
// These are approximate pixel positions for a 600x340 viewBox covering Indonesia
const AIRPORT_POSITIONS: Record<string, { x: number; y: number }> = {
  DJB001: { x: 170, y: 185 },   // Jambi
  PKU001: { x: 155, y: 170 },   // Pekanbaru
  BTH001: { x: 180, y: 175 },   // Batam
  BPN001: { x: 310, y: 195 },   // Balikpapan
  MDC001: { x: 380, y: 165 },   // Manado
  UPG001: { x: 340, y: 220 },   // Makassar
  CGK001: { x: 215, y: 215 },   // Soekarno-Hatta
};

export default function AirportMap({ stats = [] }: AirportMapProps) {
  const statsMap = Object.fromEntries(stats.map((s) => [s.code, s]));

  return (
    <div className="bg-white rounded-2xl card-shadow border border-blue-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-gray-800">Peta Operasional Indonesia</h3>
          <p className="text-xs text-gray-400 mt-0.5">Lokasi bandara aktif RIFIM</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500" /> Aktif</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-yellow-400" /> Rencana</span>
        </div>
      </div>
      <div className="p-4 relative bg-gradient-to-br from-blue-50/50 to-blue-100/20">
        <svg viewBox="0 0 580 320" className="w-full h-auto">
          {/* Simplified Indonesia outline */}
          <g fill="#DBEAFE" stroke="#93C5FD" strokeWidth="0.8" opacity="0.8">
            {/* Sumatra */}
            <path d="M95,145 L105,135 L130,130 L160,138 L185,150 L195,170 L190,200 L175,215 L155,220 L130,210 L110,195 L100,175 Z" />
            {/* Java */}
            <path d="M195,205 L215,200 L250,205 L280,200 L300,210 L290,225 L265,228 L235,225 L205,218 Z" />
            {/* Kalimantan */}
            <path d="M220,140 L260,130 L310,135 L350,145 L365,175 L355,210 L325,225 L285,230 L250,220 L230,195 L220,165 Z" />
            {/* Sulawesi */}
            <path d="M350,150 L370,140 L390,145 L400,165 L395,185 L380,195 L365,190 L355,175 L350,160 Z" />
            <path d="M390,175 L410,170 L425,180 L420,195 L405,200 L392,192 Z" />
            {/* Papua */}
            <path d="M455,155 L500,145 L540,155 L555,175 L545,200 L515,215 L480,210 L460,195 L450,175 Z" />
            {/* Maluku */}
            <ellipse cx="430" cy="190" rx="12" ry="18" />
            <ellipse cx="445" cy="175" rx="10" ry="14" />
          </g>

          {/* Ocean dots background */}
          {Array.from({ length: 20 }, (_, i) => (
            <circle key={i} cx={(i * 61) % 580} cy={(i * 43 + 50) % 320} r="1" fill="#BFDBFE" opacity="0.3" />
          ))}

          {/* Airport Markers */}
          {AIRPORTS.map((airport) => {
            const pos = AIRPORT_POSITIONS[airport.code];
            if (!pos) return null;
            const stat = statsMap[airport.code];
            const isPlanned = airport.code === "CGK001";
            const isActive = !isPlanned;

            return (
              <g key={airport.code}>
                {/* Pulse ring for active airports */}
                {isActive && (
                  <circle cx={pos.x} cy={pos.y} r="12" fill="none" stroke="#22C55E" strokeWidth="1.5" opacity="0.4">
                    <animate attributeName="r" values="8;14;8" dur="3s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.6;0;0.6" dur="3s" repeatCount="indefinite" />
                  </circle>
                )}
                {/* Marker */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r="7"
                  fill={isPlanned ? "#FBC02D" : "#1565C0"}
                  stroke="white"
                  strokeWidth="2"
                />
                <text
                  x={pos.x}
                  y={pos.y + 4}
                  textAnchor="middle"
                  fill="white"
                  fontSize="5"
                  fontWeight="bold"
                >✈</text>

                {/* Label */}
                <rect
                  x={pos.x - 20}
                  y={pos.y + 10}
                  width="40"
                  height="13"
                  rx="3"
                  fill="white"
                  opacity="0.95"
                />
                <text
                  x={pos.x}
                  y={pos.y + 19}
                  textAnchor="middle"
                  fill={isPlanned ? "#92400E" : "#1E3A8A"}
                  fontSize="5.5"
                  fontWeight="bold"
                >
                  {airport.city}
                </text>

                {/* Stats bubble */}
                {stat && isActive && (
                  <>
                    <rect x={pos.x + 8} y={pos.y - 18} width="32" height="14" rx="3" fill="#1565C0" opacity="0.9" />
                    <text x={pos.x + 24} y={pos.y - 8} textAnchor="middle" fill="white" fontSize="5.5" fontWeight="bold">
                      {stat.activeDrivers}/{stat.totalDrivers}
                    </text>
                  </>
                )}
              </g>
            );
          })}

          {/* Legend */}
          <text x="10" y="310" fill="#64748B" fontSize="7">© RIFIM Airport Operating System 2025</text>
        </svg>

        {/* Airport cards below map */}
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mt-3">
          {AIRPORTS.filter((a) => a.code !== "CGK001").map((airport) => (
            <div key={airport.code} className="bg-white rounded-xl p-2 text-center border border-blue-100">
              <div className="w-6 h-6 rounded-lg bg-[#1565C0] flex items-center justify-center mx-auto mb-1">
                <span className="text-white text-[8px] font-bold">✈</span>
              </div>
              <p className="text-[10px] font-bold text-gray-700">{airport.code}</p>
              <p className="text-[9px] text-gray-400">{airport.city}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
