import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, hasMinRole } from "@/lib/auth";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CoordinatorsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!hasMinRole(user, "AIRPORT_COORDINATOR")) redirect("/");

  const supabase = await createClient();

  const { data: rawUsers } = await (supabase as any)
    .from("users")
    .select("id, full_name, email, is_active, roles(name, level), airports(code, city)")
    .order("full_name");

  const coordinators = ((rawUsers ?? []) as any[]).filter(
    (u) => u.roles?.name === "AIRPORT_COORDINATOR"
  );

  const total  = coordinators.length;
  const aktif  = coordinators.filter((u) => u.is_active).length;
  const nonaktif = total - aktif;

  const AIRPORT_NAMES: Record<string, string> = {
    DJB001: "Jambi",
    PKU001: "Pekanbaru",
    BTH001: "Batam",
    BPN001: "Balikpapan",
    MDC001: "Manado",
    UPG001: "Makassar",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black" style={{ color: "var(--text-primary)" }}>
          Manajemen Koordinator
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
          Daftar koordinator bandara RIFIM · {new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Koordinator", value: total,    color: "bg-blue-50 text-blue-700"   },
          { label: "Aktif",             value: aktif,    color: "bg-green-50 text-green-700" },
          { label: "Non-aktif",         value: nonaktif, color: "bg-gray-50 text-gray-600"   },
        ].map((k) => (
          <div key={k.label} className={`rounded-xl p-4 ${k.color.split(" ")[0]}`}>
            <p className={`text-3xl font-black ${k.color.split(" ")[1]}`}>{k.value}</p>
            <p className="text-xs font-medium text-gray-500 mt-0.5">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-800">Daftar Koordinator</h2>
          <span className="text-xs text-gray-400">{total} orang</span>
        </div>

        {coordinators.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"/>
            </svg>
            <p className="font-medium">Belum ada koordinator</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-5 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">#</th>
                  <th className="px-5 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Nama</th>
                  <th className="px-5 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Email</th>
                  <th className="px-5 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Bandara</th>
                  <th className="px-5 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {coordinators.map((c: any, i: number) => {
                  const airportCode = c.airports?.code ?? null;
                  const airportCity = airportCode ? (AIRPORT_NAMES[airportCode] ?? c.airports?.city ?? airportCode) : null;
                  return (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 text-sm text-gray-400 tabular-nums">{i + 1}</td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-[#FFD300] flex items-center justify-center text-black font-bold text-xs flex-shrink-0">
                            {(c.full_name ?? "?").charAt(0).toUpperCase()}
                          </div>
                          <span className="text-sm font-semibold text-gray-800">{c.full_name ?? "—"}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-500">{c.email ?? "—"}</td>
                      <td className="px-5 py-3">
                        {airportCity ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                            {airportCity}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs">Semua Bandara</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${
                          c.is_active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${c.is_active ? "bg-green-500" : "bg-gray-400"}`} />
                          {c.is_active ? "Aktif" : "Non-aktif"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
