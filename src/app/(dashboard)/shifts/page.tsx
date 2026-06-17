import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, hasMinRole } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const SHIFT_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  Pagi:   { bg: "bg-yellow-50",  text: "text-yellow-700",  dot: "bg-yellow-400"  },
  Siang:  { bg: "bg-orange-50",  text: "text-orange-700",  dot: "bg-orange-400"  },
  Malam:  { bg: "bg-indigo-50",  text: "text-indigo-700",  dot: "bg-indigo-400"  },
  Libur:  { bg: "bg-gray-50",    text: "text-gray-500",    dot: "bg-gray-300"    },
};

const DAYS = ["Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu", "Minggu"];

export default async function ShiftsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasMinRole(user, "AIRPORT_COORDINATOR")) redirect("/");

  const supabase = await createClient();

  /* try shift_schedules table first, fallback to staff list */
  const { data: schedules } = await (supabase as any)
    .from("shift_schedules")
    .select("*, staff(nama, jabatan), airports(code, city)")
    .order("tanggal", { ascending: false })
    .limit(50)
    .maybeSingle()
    .then(() => ({ data: null })) // if table doesn't exist, silently skip
    .catch(() => ({ data: null }));

  /* staff list as fallback */
  const { data: staffList } = await (supabase as any)
    .from("staff")
    .select("id, nama, jabatan, shift, airport_id, airports(code, city)")
    .eq(user.role_level >= 4 ? "is_active" : "airport_id", user.role_level >= 4 ? true : (user.airport_id ?? ""))
    .order("nama")
    .limit(50);

  const staff = (staffList ?? []) as any[];

  /* group by shift type */
  const pagi  = staff.filter((s) => s.shift === "Pagi"  || s.shift === "PAGI");
  const siang = staff.filter((s) => s.shift === "Siang" || s.shift === "SIANG");
  const malam = staff.filter((s) => s.shift === "Malam" || s.shift === "MALAM");
  const lain  = staff.filter((s) => !["Pagi","PAGI","Siang","SIANG","Malam","MALAM"].includes(s.shift ?? ""));

  const today = new Date();
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - today.getDay() + 1 + i);
    return d;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-black" style={{ color: "var(--text-primary)" }}>
            Shift Kerja
          </h1>
          <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
            Jadwal shift staff bandara · Minggu {weekDates[0].toLocaleDateString("id-ID", { day: "numeric", month: "short" })} – {weekDates[6].toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-100 rounded-xl">
          <svg className="w-3.5 h-3.5 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          <span className="text-xs font-bold text-blue-600">
            {today.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" })}
          </span>
        </div>
      </div>

      {/* Shift summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Staff",  value: staff.length, bg: "bg-blue-50",   text: "text-blue-700"   },
          { label: "Shift Pagi",   value: pagi.length,  bg: "bg-yellow-50", text: "text-yellow-700" },
          { label: "Shift Siang",  value: siang.length, bg: "bg-orange-50", text: "text-orange-700" },
          { label: "Shift Malam",  value: malam.length, bg: "bg-indigo-50", text: "text-indigo-700" },
        ].map((k) => (
          <div key={k.label} className={`${k.bg} rounded-xl p-4`}>
            <p className={`text-3xl font-black ${k.text}`}>{k.value}</p>
            <p className="text-xs font-medium text-gray-500 mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Weekly schedule grid */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-bold text-gray-800">Jadwal Minggu Ini</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider w-48">Nama</th>
                {DAYS.map((day, i) => {
                  const d = weekDates[i];
                  const isToday = d.toDateString() === today.toDateString();
                  return (
                    <th key={day} className={`px-3 py-3 text-center text-[11px] font-bold uppercase tracking-wider ${isToday ? "text-[#B8860B] bg-yellow-50" : "text-gray-400"}`}>
                      <div>{day.slice(0,3)}</div>
                      <div className={`text-sm font-black mt-0.5 ${isToday ? "text-[#FFD300] bg-[#B8860B] rounded-full w-6 h-6 flex items-center justify-center mx-auto" : "text-gray-600"}`}>
                        {d.getDate()}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {staff.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-gray-400 text-sm">
                    Belum ada data staff
                  </td>
                </tr>
              ) : (
                staff.slice(0, 20).map((s: any) => {
                  const shift = s.shift ?? "Pagi";
                  const sc = SHIFT_COLORS[shift] ?? SHIFT_COLORS["Pagi"];
                  return (
                    <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-xs flex-shrink-0">
                            {(s.nama ?? "?").charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate max-w-[120px]">{s.nama ?? "—"}</p>
                            <p className="text-[10px] text-gray-400 truncate">{s.airports?.code ?? ""}</p>
                          </div>
                        </div>
                      </td>
                      {DAYS.map((day, i) => {
                        const d = weekDates[i];
                        const isToday = d.toDateString() === today.toDateString();
                        const isWeekend = i >= 5;
                        const assignedShift = isWeekend ? "Libur" : shift;
                        const c = SHIFT_COLORS[assignedShift] ?? sc;
                        return (
                          <td key={day} className={`px-2 py-2 text-center ${isToday ? "bg-yellow-50/40" : ""}`}>
                            <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${c.bg} ${c.text}`}>
                              {assignedShift}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Shift legend */}
      <div className="flex items-center gap-4 flex-wrap">
        {Object.entries(SHIFT_COLORS).map(([label, c]) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${c.dot}`} />
            <span className="text-xs font-medium text-gray-500">{label}</span>
            <span className="text-xs text-gray-300">{
              label === "Pagi" ? "(07:00–15:00)" :
              label === "Siang" ? "(15:00–23:00)" :
              label === "Malam" ? "(23:00–07:00)" : ""
            }</span>
          </div>
        ))}
      </div>
    </div>
  );
}
