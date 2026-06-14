export default function AdminPage() {
  const USERS = [
    { name: "Super Admin", email: "admin@rifim.co.id", role: "SUPER_ADMIN", airport: "Semua", status: "ACTIVE" },
    { name: "Ahmad Direktur", email: "director@rifim.co.id", role: "DIRECTOR", airport: "Semua", status: "ACTIVE" },
    { name: "Budi Koordinator", email: "budi@rifim-btm.co.id", role: "AIRPORT_COORDINATOR", airport: "BTH001", status: "ACTIVE" },
    { name: "Candra Staff", email: "candra@rifim-upg.co.id", role: "STAFF", airport: "UPG001", status: "ACTIVE" },
  ];

  const ROLE_COLORS: Record<string, string> = {
    SUPER_ADMIN: "bg-purple-100 text-purple-700",
    DIRECTOR: "bg-[#1565C0]/10 text-[#1565C0]",
    AIRPORT_COORDINATOR: "bg-green-100 text-green-700",
    STAFF: "bg-gray-100 text-gray-600",
    DRIVER: "bg-yellow-100 text-yellow-700",
  };

  const AUDIT_LOGS = [
    { user: "Super Admin", action: "UPDATE", entity: "drivers", detail: "Update status driver BTH-001", time: "10:32" },
    { user: "Budi Koordinator", action: "CREATE", entity: "payroll", detail: "Proses payroll Juni BTH001", time: "09:15" },
    { user: "Candra Staff", action: "LOGIN", entity: "auth", detail: "Login dari 180.254.x.x", time: "08:01" },
    { user: "System", action: "BACKUP", entity: "database", detail: "Auto backup harian berhasil", time: "03:00" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-gray-800">Administration Center</h1>
        <p className="text-sm text-gray-500 mt-0.5">User management, roles, permissions, audit log, dan pengaturan sistem</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total User", value: USERS.length, bg: "bg-blue-50", color: "text-[#1565C0]" },
          { label: "Admin", value: USERS.filter(u => u.role.includes("ADMIN") || u.role === "DIRECTOR").length, bg: "bg-purple-50", color: "text-purple-700" },
          { label: "Koordinator", value: USERS.filter(u => u.role === "AIRPORT_COORDINATOR").length, bg: "bg-green-50", color: "text-green-700" },
          { label: "Staff Aktif", value: USERS.filter(u => u.status === "ACTIVE").length, bg: "bg-gray-100", color: "text-gray-700" },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} rounded-xl p-4`}>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            <p className="text-xs font-medium text-gray-600 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Management */}
        <div className="bg-white rounded-2xl card-shadow border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-gray-800">User Management</h3>
            <button className="flex items-center gap-1.5 bg-[#1565C0] text-white px-3 py-1.5 rounded-xl text-sm font-semibold hover:bg-[#0D47A1] transition-colors">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Tambah User
            </button>
          </div>
          <div className="divide-y divide-gray-50">
            {USERS.map((u) => (
              <div key={u.email} className="px-5 py-3.5 flex items-center gap-3 hover:bg-gray-50/50 transition-colors">
                <div className="w-9 h-9 rounded-xl gradient-rifim flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                  {u.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{u.name}</p>
                  <p className="text-xs text-gray-400">{u.email}</p>
                </div>
                <div className="text-right">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${ROLE_COLORS[u.role]}`}>{u.role.replace(/_/g, " ")}</span>
                  <p className="text-xs text-gray-400 mt-0.5">{u.airport}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Audit Log */}
        <div className="bg-white rounded-2xl card-shadow border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-800">Audit Log</h3>
            <p className="text-xs text-gray-400 mt-0.5">Semua aktivitas sistem tercatat</p>
          </div>
          <div className="divide-y divide-gray-50">
            {AUDIT_LOGS.map((log, i) => (
              <div key={i} className="px-5 py-3 hover:bg-gray-50/50 transition-colors">
                <div className="flex items-start gap-2.5">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg flex-shrink-0 mt-0.5 ${
                    log.action === "CREATE" ? "bg-green-100 text-green-700" :
                    log.action === "UPDATE" ? "bg-blue-100 text-blue-700" :
                    log.action === "DELETE" ? "bg-red-100 text-red-700" :
                    log.action === "LOGIN" ? "bg-purple-100 text-purple-700" :
                    "bg-gray-100 text-gray-600"
                  }`}>{log.action}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">{log.detail}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{log.user} · {log.entity} · {log.time}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="px-5 py-3 border-t border-gray-100">
            <button className="text-xs font-semibold text-[#1565C0] hover:underline">Lihat semua log →</button>
          </div>
        </div>

        {/* System Settings */}
        <div className="bg-white rounded-2xl card-shadow border border-gray-100 p-5 lg:col-span-2">
          <h3 className="font-bold text-gray-800 mb-4">Pengaturan Sistem</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { label: "Notifikasi Push", desc: "Aktifkan push notification untuk semua user", enabled: true },
              { label: "GPS Tracking", desc: "Lacak lokasi driver secara realtime", enabled: true },
              { label: "Auto Backup", desc: "Backup database otomatis setiap hari pukul 03:00", enabled: true },
              { label: "Maintenance Mode", desc: "Nonaktifkan akses user sementara", enabled: false },
              { label: "Absensi GPS", desc: "Validasi absensi berdasarkan koordinat GPS", enabled: true },
              { label: "Auto Payroll", desc: "Proses payroll otomatis setiap tanggal 25", enabled: false },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-800">{s.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{s.desc}</p>
                </div>
                <div className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${s.enabled ? "bg-[#1565C0]" : "bg-gray-300"}`}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${s.enabled ? "left-7" : "left-1"}`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
