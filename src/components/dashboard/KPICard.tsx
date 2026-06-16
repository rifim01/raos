"use client";

interface SparkPoint { v: number }

function Sparkline({ data, color }: { data: number[]; color: string }) {
  if (!data.length) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 80; const h = 32;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  });
  const path = `M ${pts.join(" L ")}`;
  const area = `M ${pts[0]} L ${pts.join(" L ")} L ${w},${h} L 0,${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-20 h-8" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#grad-${color})`}/>
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

const SPARK_DATA: Record<string, number[]> = {
  blue: [4, 6, 5, 7, 6, 8, 6],
  green: [3, 5, 4, 6, 5, 7, 6],
  red: [5, 4, 6, 5, 7, 5, 6],
  yellow: [2, 4, 3, 5, 4, 6, 5],
  purple: [6, 5, 7, 6, 8, 7, 9],
};

const ACCENT: Record<string, string> = {
  blue: "#2563EB",
  green: "#10B981",
  red: "#EF4444",
  yellow: "#F59E0B",
  purple: "#8B5CF6",
};

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color?: "blue" | "red" | "yellow" | "green" | "purple";
  trend?: { value: number; label: string };
}

export default function KPICard({ title, value, subtitle, icon, color = "blue", trend }: KPICardProps) {
  const accent = ACCENT[color];
  const sparkData = SPARK_DATA[color];
  const isPositive = trend && trend.value >= 0;

  return (
    <div className="relative overflow-hidden rounded-2xl border transition-all duration-200 hover:translate-y-[-2px] cursor-default"
      style={{
        background: "var(--bg-card)",
        borderColor: "var(--border)",
        boxShadow: `0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.04)`,
      }}>
      {/* Accent top bar */}
      <div className="absolute top-0 left-0 right-0 h-[1px]" style={{ background: `linear-gradient(90deg, transparent, ${accent}60, transparent)` }} />

      {/* Background glow */}
      <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-5 blur-2xl"
        style={{ background: accent, transform: "translate(30%, -30%)" }} />

      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          {/* Icon */}
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: `${accent}18`, border: `1px solid ${accent}30` }}>
            <span style={{ color: accent }}>{icon}</span>
          </div>

          {/* Trend badge */}
          {trend && (
            <span className={`text-[10px] font-bold flex items-center gap-0.5 px-2 py-1 rounded-lg`}
              style={{
                background: isPositive ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
                color: isPositive ? "#10B981" : "#EF4444",
              }}>
              {isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%
            </span>
          )}
        </div>

        {/* Value */}
        <p className="text-2xl font-black text-white/95 tracking-tight animate-count-up">
          {typeof value === "number" ? value.toLocaleString("id-ID") : value}
        </p>
        <p className="text-xs font-semibold mt-0.5" style={{ color: accent }}>{title}</p>
        {subtitle && <p className="text-[10px] text-white/30 mt-0.5">{subtitle}</p>}

        {/* Sparkline + trend label */}
        <div className="flex items-end justify-between mt-3">
          {trend && <p className="text-[9px] text-white/25 uppercase tracking-wider">{trend.label}</p>}
          <div className="ml-auto">
            <Sparkline data={sparkData} color={accent} />
          </div>
        </div>
      </div>
    </div>
  );
}
