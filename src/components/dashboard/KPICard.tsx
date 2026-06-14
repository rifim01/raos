interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color?: "blue" | "red" | "yellow" | "green" | "purple";
  trend?: { value: number; label: string };
}

const COLOR_MAP = {
  blue: { bg: "bg-[#1565C0]", light: "bg-blue-50", text: "text-[#1565C0]", border: "border-blue-100" },
  red: { bg: "bg-[#E53935]", light: "bg-red-50", text: "text-[#E53935]", border: "border-red-100" },
  yellow: { bg: "bg-[#FBC02D]", light: "bg-yellow-50", text: "text-[#FBC02D]", border: "border-yellow-100" },
  green: { bg: "bg-emerald-500", light: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-100" },
  purple: { bg: "bg-purple-600", light: "bg-purple-50", text: "text-purple-600", border: "border-purple-100" },
};

export default function KPICard({ title, value, subtitle, icon, color = "blue", trend }: KPICardProps) {
  const c = COLOR_MAP[color];
  const isPositive = trend && trend.value >= 0;

  return (
    <div className={`bg-white rounded-2xl p-5 card-shadow border ${c.border} hover:shadow-md transition-shadow`}>
      <div className="flex items-start justify-between">
        <div className={`w-11 h-11 ${c.light} rounded-xl flex items-center justify-center ${c.text}`}>
          {icon}
        </div>
        {trend && (
          <span className={`text-xs font-semibold flex items-center gap-0.5 px-2 py-1 rounded-lg ${
            isPositive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          }`}>
            {isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-2xl font-black text-gray-800">{typeof value === "number" ? value.toLocaleString("id-ID") : value}</p>
        <p className="text-sm font-semibold text-gray-600 mt-0.5">{title}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        {trend && <p className="text-xs text-gray-400 mt-1">{trend.label}</p>}
      </div>
    </div>
  );
}
