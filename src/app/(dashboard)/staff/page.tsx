import { createClient } from "@/lib/supabase/server";

async function getStaff() {
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("staff").select("*, airports(code, city)").order("full_name");
    return data ?? [];
  } catch { return []; }
}

const DEMO_STAFF = [
  { id: "S-001", name: "Rina Sari", position: "Koordinator", airport: "BTH001", phone: "0811-111-1111", shift: "Pagi", status: "ACTIVE" },
  { id: "S-002", name: "Siti Rahayu", position: "Staff Operasional", airport: "UPG001", phone: "0812-222-2222", shift: "Sore", status: "ACTIVE" },
  { id: "S-003", name: "Teguh Wibowo", position: "Supervisor", airport: "PKU001", phone: "0813-333-3333", shift: "Pagi", status: "ACTIVE" },
  { id: "S-004", name: "Umar Hakim", position: "Staff Operasional", airport: "BPN001", phone: "0814-444-4444", shift: "Malam", status: "LEAVE" },
  { id: "S-005", name: "Vina Pratiwi", position: "Admin", airport: "MDC001", phone: "0815-555-5555", shift: "Pagi", status: "ACTIVE" },
  { id: "S-006", name: "Wahyu Hidayat", position: "Koordinator", airport: "DJB001", phone: "0816-666-6666", shift: "Pagi", status: "INACTIVE" },
];

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  INACTIVE: "bg-gray-100 text-gray-600",
  LEAVE: "bg-blue-100 text-blue-700",
};

export default async function StaffPage() {
  const staff = await getStaff();
  const rows = staff.length > 0 ? staff : DEMO_STAFF;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-800">Staff Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">Database seluruh staff RIFIM di semua bandara</p>
        </div>
        <button className="flex items-center gap-2 bg-[#1565C0] text-white px-4 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#0D47A1] transition-colors">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Tambah Staff
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total Staff", value: 96, color: "text-[#1565C0]", bg: "bg-blue-50" },
          { label: "Aktif", value: 88, color: "text-green-700", bg: "bg-green-50" },
          { label: "Cuti", value: 5, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Nonaktif", value: 3, color: "text-gray-600", bg: "bg-gray-100" },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} rounded-xl p-4`}>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs font-medium text-gray-600 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl card-shadow border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap gap-3 items-center">
          <input type="text" placeholder="Cari nama, posisi..." className="flex-1 max-w-xs bg-gray-100 rounded-xl px-3 py-2 text-sm focus:outline-none" />
          <select className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none">
            <option>Semua Bandara</option>
            <option>BTH001</option><option>UPG001</option><option>PKU001</option>
            <option>BPN001</option><option>MDC001</option><option>DJB001</option>
          </select>
          <select className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none">
            <option>Semua Status</option>
            <option>ACTIVE</option><option>LEAVE</option><option>INACTIVE</option>
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                {["Staff ID", "Nama", "Posisi", "Bandara", "Shift", "Telepon", "Status", "Aksi"].map((h) => (
                  <th key={h} className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-left whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {rows.map((s: any) => (
                <tr key={s.id || s.staff_id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3.5 text-xs font-mono font-semibold text-gray-500">{s.id || s.staff_id}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-[#E53935]/10 flex items-center justify-center text-[#E53935] font-bold text-xs flex-shrink-0">
                        {(s.name || s.full_name)?.[0] ?? "S"}
                      </div>
                      <p className="text-sm font-semibold text-gray-800">{s.name || s.full_name}</p>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">{s.position}</td>
                  <td className="px-5 py-3.5 text-sm text-gray-600">{s.airport || s.airports?.code}</td>
                  <td className="px-5 py-3.5">
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-yellow-100 text-yellow-700">{s.shift}</span>
                  </td>
                  <td className="px-5 py-3.5 text-sm text-gray-500">{s.phone}</td>
                  <td className="px-5 py-3.5">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_COLORS[s.status] ?? "bg-gray-100 text-gray-600"}`}>{s.status}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <button className="p-1.5 text-gray-400 hover:text-[#1565C0] hover:bg-blue-50 rounded-lg transition-colors">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
