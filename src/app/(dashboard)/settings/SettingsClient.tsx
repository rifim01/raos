"use client";

import { useState } from "react";

/* ── Types ─────────────────────────────────────────── */
type RoleGroup = "STAFF" | "DRIVER" | "AIRPORT_COORDINATOR" | "DIRECTOR" | "SUPER_ADMIN";
interface UserRow { id: string; auth_user_id: string; full_name: string | null; email: string | null; role: RoleGroup; airport_code: string | null; is_active: boolean; }
interface StaffRow { id: string; staff_code?: string; nama: string; jabatan?: string; department?: string; status?: string; shift?: string; nomor_hp?: string; airports?: { code: string } | null; }
interface DriverRow { id: string; driver_code?: string; nama: string; nomor_hp?: string; driver_type?: string; status?: string; airports?: { code: string } | null; }

interface Props {
  currentUser: { auth_user_id: string; email: string | null; role_level: number };
  users: UserRow[];
  staffList: StaffRow[];
  driverList: DriverRow[];
}

const ROLE_GROUPS: { key: RoleGroup; label: string; color: string }[] = [
  { key: "STAFF",               label: "Staff",       color: "bg-blue-50 text-blue-700 border-blue-200"    },
  { key: "DRIVER",              label: "Driver",      color: "bg-green-50 text-green-700 border-green-200" },
  { key: "AIRPORT_COORDINATOR", label: "Koordinator", color: "bg-purple-50 text-purple-700 border-purple-200" },
  { key: "DIRECTOR",            label: "Admin",       color: "bg-orange-50 text-orange-700 border-orange-200" },
  { key: "SUPER_ADMIN",         label: "Owner",       color: "bg-red-50 text-red-700 border-red-200"       },
];

const STAFF_STATUS  = ["ACTIVE", "INACTIVE", "LEAVE", "TERMINATED"];
const DRIVER_STATUS = ["ACTIVE", "INACTIVE", "SUSPENDED"];
const DRIVER_TYPES  = ["INTERNAL", "EXTERNAL"];
const SHIFTS        = ["Pagi", "Siang", "Malam"];

const AIRPORTS = [
  { code: "BTH001", label: "Batam" },
  { code: "DJB001", label: "Jambi" },
  { code: "UPG001", label: "Makassar" },
  { code: "BPN001", label: "Balikpapan" },
  { code: "MDC001", label: "Manado" },
  { code: "PKU001", label: "Pekanbaru" },
];

const PRESET_SHEETS = [
  { label: "Master Data Staff",   url: "https://docs.google.com/spreadsheets/d/1fcraq3QHqIaD-13Ebzt6stT9aA6j_loTXeAtpNX12kw/edit?gid=1974631595", type: "staff",   airport: "" },
  { label: "Driver Batam",        url: "https://docs.google.com/spreadsheets/d/1FEZxyHPx_GCQKw92hLSf6QxxkXgZn5R1sRswOYM_Tlc/edit?gid=2145251861",  type: "driver",  airport: "BTH001" },
  { label: "Driver Jambi",        url: "https://docs.google.com/spreadsheets/d/1FEZxyHPx_GCQKw92hLSf6QxxkXgZn5R1sRswOYM_Tlc/edit",                 type: "driver",  airport: "DJB001" },
  { label: "Driver Makassar",     url: "https://docs.google.com/spreadsheets/d/1FEZxyHPx_GCQKw92hLSf6QxxkXgZn5R1sRswOYM_Tlc/edit",                 type: "driver",  airport: "UPG001" },
  { label: "Driver Balikpapan",   url: "https://docs.google.com/spreadsheets/d/1FEZxyHPx_GCQKw92hLSf6QxxkXgZn5R1sRswOYM_Tlc/edit",                 type: "driver",  airport: "BPN001" },
  { label: "Driver Manado",       url: "https://docs.google.com/spreadsheets/d/1FEZxyHPx_GCQKw92hLSf6QxxkXgZn5R1sRswOYM_Tlc/edit",                 type: "driver",  airport: "MDC001" },
  { label: "Driver Pekanbaru",    url: "https://docs.google.com/spreadsheets/d/1FEZxyHPx_GCQKw92hLSf6QxxkXgZn5R1sRswOYM_Tlc/edit",                 type: "driver",  airport: "PKU001" },
  { label: "Driver Ext. Batam",   url: "https://docs.google.com/spreadsheets/d/1suoDC-RsWOgTHiLq4max6iIsWe39Ou-RMddRXl5DVJc/edit?gid=1698812948",  type: "driver_external", airport: "BTH001" },
];

/* ── Helpers ────────────────────────────────────────── */
function FieldInput({ label, value, onChange, type = "text" }: { label: string; value: string; onChange: (v: string) => void; type?: string }) {
  return (
    <div>
      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1565C0]" />
    </div>
  );
}

function SelectInput({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div>
      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-[#1565C0]">
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

/* ════════════════════════════════════════════════════ */
/* Tab 1 — Ganti Password                              */
/* ════════════════════════════════════════════════════ */
function ChangePasswordTab({ currentUser, users }: { currentUser: Props["currentUser"]; users: UserRow[] }) {
  const [activeRole, setActiveRole] = useState<RoleGroup>("STAFF");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pwMap, setPwMap]   = useState<Record<string, { pw: string; confirm: string }>>({});
  const [loading, setLoading] = useState<string | null>(null);
  const [msgs, setMsgs]    = useState<Record<string, { ok: boolean; text: string }>>({});

  /* Own password */
  const [ownCurrent, setOwnCurrent] = useState("");
  const [ownNew, setOwnNew]         = useState("");
  const [ownConfirm, setOwnConfirm] = useState("");
  const [ownLoading, setOwnLoading] = useState(false);
  const [ownMsg, setOwnMsg]         = useState<{ ok: boolean; text: string } | null>(null);

  const filtered = users.filter(u => u.role === activeRole);

  async function handleOwnPw(e: React.FormEvent) {
    e.preventDefault();
    if (ownNew !== ownConfirm) { setOwnMsg({ ok: false, text: "Password baru tidak cocok" }); return; }
    if (ownNew.length < 6) { setOwnMsg({ ok: false, text: "Minimal 6 karakter" }); return; }
    setOwnLoading(true);
    setOwnMsg(null);
    const res = await fetch("/api/settings/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current_password: ownCurrent, new_password: ownNew }),
    });
    const data = await res.json();
    setOwnLoading(false);
    if (data.success) { setOwnMsg({ ok: true, text: "Password berhasil diubah" }); setOwnCurrent(""); setOwnNew(""); setOwnConfirm(""); }
    else setOwnMsg({ ok: false, text: data.error ?? "Gagal mengubah password" });
  }

  async function handleUserPw(user: UserRow) {
    const val = pwMap[user.id] ?? { pw: "", confirm: "" };
    if (val.pw !== val.confirm) { setMsgs(m => ({ ...m, [user.id]: { ok: false, text: "Password tidak cocok" } })); return; }
    if (val.pw.length < 6) { setMsgs(m => ({ ...m, [user.id]: { ok: false, text: "Minimal 6 karakter" } })); return; }
    setLoading(user.id);
    const res = await fetch("/api/settings/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ target_auth_user_id: user.auth_user_id, new_password: val.pw }),
    });
    const data = await res.json();
    setLoading(null);
    if (data.success) {
      setMsgs(m => ({ ...m, [user.id]: { ok: true, text: "Password berhasil diubah!" } }));
      setPwMap(m => ({ ...m, [user.id]: { pw: "", confirm: "" } }));
      setExpandedId(null);
    } else {
      setMsgs(m => ({ ...m, [user.id]: { ok: false, text: data.error ?? "Gagal" } }));
    }
  }

  return (
    <div className="space-y-6">
      {/* Own password */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#FFD300] flex items-center justify-center">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-gray-800 text-sm">Ganti Password Saya</h3>
            <p className="text-xs text-gray-400">{currentUser.email}</p>
          </div>
        </div>
        <form onSubmit={handleOwnPw} className="px-5 py-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <FieldInput label="Password Saat Ini" value={ownCurrent} onChange={setOwnCurrent} type="password" />
            <FieldInput label="Password Baru"     value={ownNew}     onChange={setOwnNew}     type="password" />
            <FieldInput label="Konfirmasi"         value={ownConfirm} onChange={setOwnConfirm} type="password" />
          </div>
          {ownMsg && (
            <div className={`px-3 py-2 rounded-lg text-xs font-medium ${ownMsg.ok ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-600 border border-red-200"}`}>
              {ownMsg.text}
            </div>
          )}
          <button type="submit" disabled={ownLoading}
            className="px-5 py-2 rounded-xl bg-[#1565C0] text-white text-xs font-bold disabled:opacity-50 hover:bg-[#0d47a1] transition-all">
            {ownLoading ? "Menyimpan..." : "Simpan Password"}
          </button>
        </form>
      </div>

      {/* Admin: ganti password user lain */}
      {currentUser.role_level >= 3 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-bold text-gray-800">Ganti Password Pengguna</h3>
            <p className="text-xs text-gray-400 mt-0.5">Pilih role, lalu cari pengguna dan set password baru</p>
          </div>

          {/* Role filter chips */}
          <div className="px-5 py-3 flex flex-wrap gap-2 border-b border-gray-50">
            {ROLE_GROUPS.map(r => (
              <button key={r.key} onClick={() => { setActiveRole(r.key); setExpandedId(null); }}
                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                  activeRole === r.key ? r.color : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"
                }`}>
                {r.label}
                <span className="ml-1 opacity-60">({users.filter(u => u.role === r.key).length})</span>
              </button>
            ))}
          </div>

          {/* User list */}
          <div className="divide-y divide-gray-50">
            {filtered.length === 0 ? (
              <div className="px-5 py-8 text-center text-gray-400 text-sm">Tidak ada pengguna di role ini</div>
            ) : (
              filtered.map(u => {
                const isOpen = expandedId === u.id;
                const val    = pwMap[u.id] ?? { pw: "", confirm: "" };
                const msg    = msgs[u.id];
                return (
                  <div key={u.id}>
                    <div className="px-5 py-3 flex items-center gap-3 hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => setExpandedId(isOpen ? null : u.id)}>
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 font-bold text-xs flex-shrink-0">
                        {(u.full_name ?? u.email ?? "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800 truncate">{u.full_name ?? "—"}</p>
                        <p className="text-xs text-gray-400 truncate">{u.email} {u.airport_code ? `· ${u.airport_code}` : ""}</p>
                      </div>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${u.is_active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                        {u.is_active ? "Aktif" : "Non-aktif"}
                      </span>
                      <svg className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M6 9l6 6 6-6"/>
                      </svg>
                    </div>
                    {isOpen && (
                      <div className="px-5 pb-4 bg-gray-50">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                          <FieldInput label="Password Baru" value={val.pw}
                            onChange={v => setPwMap(m => ({ ...m, [u.id]: { ...val, pw: v } }))} type="password" />
                          <FieldInput label="Konfirmasi Password" value={val.confirm}
                            onChange={v => setPwMap(m => ({ ...m, [u.id]: { ...val, confirm: v } }))} type="password" />
                        </div>
                        {msg && (
                          <div className={`mb-2 px-3 py-1.5 rounded-lg text-xs font-medium ${msg.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                            {msg.text}
                          </div>
                        )}
                        <button onClick={() => handleUserPw(u)} disabled={loading === u.id || !val.pw}
                          className="px-4 py-2 rounded-xl bg-[#1565C0] text-white text-xs font-bold disabled:opacity-50 hover:bg-[#0d47a1] transition-all">
                          {loading === u.id ? "Menyimpan..." : "Simpan Password"}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════ */
/* Tab 2 — Sinkron Data                                */
/* ════════════════════════════════════════════════════ */
function SyncDataTab() {
  const [results, setResults] = useState<Record<string, { ok: boolean; text: string }>>({});
  const [loading, setLoading] = useState<string | null>(null);
  const [airport, setAirport] = useState("BTH001");

  async function syncSheet(preset: typeof PRESET_SHEETS[0], key: string) {
    setLoading(key);
    setResults(r => ({ ...r, [key]: { ok: false, text: "Sinkronisasi..." } }));
    try {
      const res = await fetch("/api/import/from-sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: preset.url,
          airport_code: preset.airport || airport,
          data_type: preset.type === "driver_external" ? "driver" : preset.type,
          driver_type: preset.type === "driver_external" ? "EXTERNAL" : "INTERNAL",
        }),
      });
      const data = await res.json();
      setResults(r => ({
        ...r,
        [key]: data.success
          ? { ok: true,  text: `✓ ${data.imported} data berhasil disinkron dari ${data.rows_fetched} baris` }
          : { ok: false, text: `✗ ${data.error ?? "Gagal"}` },
      }));
    } catch {
      setResults(r => ({ ...r, [key]: { ok: false, text: "✗ Koneksi gagal" } }));
    }
    setLoading(null);
  }

  const staffSheets  = PRESET_SHEETS.filter(p => p.type === "staff");
  const driverSheets = PRESET_SHEETS.filter(p => p.type !== "staff");

  return (
    <div className="space-y-5">
      {/* Airport default selector */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-center gap-3">
        <svg className="w-4 h-4 text-blue-500 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
        </svg>
        <p className="text-xs text-blue-700 font-medium">Bandara default untuk sheet tanpa kode airport</p>
        <select value={airport} onChange={e => setAirport(e.target.value)}
          className="ml-auto px-3 py-1.5 rounded-lg border border-blue-200 bg-white text-xs font-semibold text-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400">
          {AIRPORTS.map(a => <option key={a.code} value={a.code}>{a.code} · {a.label}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Staff */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <h3 className="font-bold text-gray-800">Sinkron Staff</h3>
          </div>
          <div className="p-4 space-y-3">
            {staffSheets.map((p, i) => {
              const key = `staff-${i}`;
              const res = results[key];
              return (
                <div key={key} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <svg className="w-4 h-4 text-green-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
                    </svg>
                    <span className="text-sm font-semibold text-gray-700">{p.label}</span>
                  </div>
                  {res && (
                    <p className={`text-xs mb-2 font-medium ${res.ok ? "text-green-600" : "text-red-500"}`}>{res.text}</p>
                  )}
                  <button onClick={() => syncSheet(p, key)} disabled={loading === key}
                    className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold disabled:opacity-50 transition-all flex items-center justify-center gap-1.5">
                    {loading === key ? (
                      <><svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Sinkronisasi...</>
                    ) : "Sinkron Sekarang"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Driver */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <h3 className="font-bold text-gray-800">Sinkron Driver</h3>
          </div>
          <div className="p-4 space-y-3 max-h-[420px] overflow-y-auto">
            {driverSheets.map((p, i) => {
              const key = `driver-${i}`;
              const res = results[key];
              return (
                <div key={key} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M19 17H5a2 2 0 01-2-2V9l3-6h12l3 6v6a2 2 0 01-2 2z"/>
                    </svg>
                    <span className="text-sm font-semibold text-gray-700">{p.label}</span>
                    {p.airport && <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-600">{p.airport}</span>}
                  </div>
                  {res && (
                    <p className={`text-xs mb-2 font-medium ${res.ok ? "text-green-600" : "text-red-500"}`}>{res.text}</p>
                  )}
                  <button onClick={() => syncSheet(p, key)} disabled={loading === key}
                    className="w-full py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-bold disabled:opacity-50 transition-all flex items-center justify-center gap-1.5">
                    {loading === key ? (
                      <><svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Sinkronisasi...</>
                    ) : "Sinkron Sekarang"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════ */
/* Tab 3 — Data (Edit Staff & Driver)                  */
/* ════════════════════════════════════════════════════ */
function DataTab({ staffList: initialStaff, driverList: initialDrivers }: { staffList: StaffRow[]; driverList: DriverRow[] }) {
  const [sub, setSub]           = useState<"staff" | "driver">("staff");
  const [staffList, setStaff]   = useState(initialStaff);
  const [driverList, setDrivers] = useState(initialDrivers);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBuf, setEditBuf]     = useState<Record<string, string>>({});
  const [loading, setLoading]     = useState(false);
  const [msg, setMsg]             = useState<{ ok: boolean; text: string } | null>(null);
  const [search, setSearch]       = useState("");

  function startEdit(row: StaffRow | DriverRow, type: "staff" | "driver") {
    setEditingId(row.id);
    setMsg(null);
    if (type === "staff") {
      const s = row as StaffRow;
      setEditBuf({ nama: s.nama ?? "", jabatan: s.jabatan ?? "", department: s.department ?? "", status: s.status ?? "ACTIVE", shift: s.shift ?? "Pagi", nomor_hp: s.nomor_hp ?? "" });
    } else {
      const d = row as DriverRow;
      setEditBuf({ nama: d.nama ?? "", driver_code: d.driver_code ?? "", nomor_hp: d.nomor_hp ?? "", driver_type: d.driver_type ?? "INTERNAL", status: d.status ?? "ACTIVE" });
    }
  }

  async function saveEdit(id: string, type: "staff" | "driver") {
    setLoading(true);
    setMsg(null);
    const endpoint = type === "staff" ? `/api/settings/update-staff/${id}` : `/api/settings/update-driver/${id}`;
    const res = await fetch(endpoint, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editBuf),
    });
    const data = await res.json();
    setLoading(false);
    if (data.success) {
      setMsg({ ok: true, text: "Data berhasil disimpan" });
      setEditingId(null);
      if (type === "staff") {
        setStaff(prev => prev.map(s => s.id === id ? { ...s, ...editBuf } : s));
      } else {
        setDrivers(prev => prev.map(d => d.id === id ? { ...d, ...editBuf } : d));
      }
    } else {
      setMsg({ ok: false, text: data.error ?? "Gagal menyimpan" });
    }
  }

  const filteredStaff   = staffList.filter(s => s.nama?.toLowerCase().includes(search.toLowerCase()) || (s.jabatan ?? "").toLowerCase().includes(search.toLowerCase()));
  const filteredDrivers = driverList.filter(d => d.nama?.toLowerCase().includes(search.toLowerCase()) || (d.driver_code ?? "").toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-4">
      {/* Sub-tab */}
      <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {[{ k: "staff" as const, label: "Staff" }, { k: "driver" as const, label: "Driver" }].map(t => (
          <button key={t.k} onClick={() => { setSub(t.k); setEditingId(null); setMsg(null); setSearch(""); }}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${sub === t.k ? "bg-white text-[#1565C0] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
        </svg>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder={`Cari ${sub === "staff" ? "staff" : "driver"}...`}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1565C0]" />
      </div>

      {msg && (
        <div className={`px-4 py-2 rounded-xl text-sm font-medium ${msg.ok ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-600 border border-red-200"}`}>
          {msg.text}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {sub === "staff" ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {["Nama", "Jabatan", "Status", "Shift", "No. HP", "Bandara", ""].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredStaff.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400 text-sm">Tidak ada data</td></tr>
                  ) : filteredStaff.map(s => {
                    const isEditing = editingId === s.id;
                    return (
                      <tr key={s.id} className={`hover:bg-gray-50 transition-colors ${isEditing ? "bg-yellow-50" : ""}`}>
                        {isEditing ? (
                          <>
                            <td className="px-3 py-2"><input value={editBuf.nama ?? ""} onChange={e => setEditBuf(b => ({ ...b, nama: e.target.value }))} className="w-full px-2 py-1 rounded-lg border text-sm focus:outline-none focus:ring-1 focus:ring-[#1565C0]" /></td>
                            <td className="px-3 py-2"><input value={editBuf.jabatan ?? ""} onChange={e => setEditBuf(b => ({ ...b, jabatan: e.target.value }))} className="w-full px-2 py-1 rounded-lg border text-sm focus:outline-none focus:ring-1 focus:ring-[#1565C0]" /></td>
                            <td className="px-3 py-2">
                              <select value={editBuf.status ?? "ACTIVE"} onChange={e => setEditBuf(b => ({ ...b, status: e.target.value }))} className="px-2 py-1 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-[#1565C0]">
                                {STAFF_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                            </td>
                            <td className="px-3 py-2">
                              <select value={editBuf.shift ?? "Pagi"} onChange={e => setEditBuf(b => ({ ...b, shift: e.target.value }))} className="px-2 py-1 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-[#1565C0]">
                                {SHIFTS.map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                            </td>
                            <td className="px-3 py-2"><input value={editBuf.nomor_hp ?? ""} onChange={e => setEditBuf(b => ({ ...b, nomor_hp: e.target.value }))} className="w-full px-2 py-1 rounded-lg border text-sm focus:outline-none focus:ring-1 focus:ring-[#1565C0]" /></td>
                            <td className="px-3 py-2 text-xs text-gray-400">{s.airports?.code ?? "—"}</td>
                            <td className="px-3 py-2">
                              <div className="flex gap-1">
                                <button onClick={() => saveEdit(s.id, "staff")} disabled={loading}
                                  className="px-2.5 py-1 rounded-lg bg-[#1565C0] text-white text-xs font-bold disabled:opacity-50 hover:bg-[#0d47a1]">
                                  {loading ? "..." : "Simpan"}
                                </button>
                                <button onClick={() => setEditingId(null)} className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 text-xs font-semibold hover:bg-gray-200">
                                  Batal
                                </button>
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-3 text-sm font-semibold text-gray-800">{s.nama}</td>
                            <td className="px-4 py-3 text-xs text-gray-500">{s.jabatan ?? "—"}</td>
                            <td className="px-4 py-3">
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.status === "ACTIVE" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                                {s.status ?? "—"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-500">{s.shift ?? "—"}</td>
                            <td className="px-4 py-3 text-xs text-gray-500">{s.nomor_hp ?? "—"}</td>
                            <td className="px-4 py-3 text-xs text-gray-400">{s.airports?.code ?? "—"}</td>
                            <td className="px-4 py-3">
                              <button onClick={() => startEdit(s, "staff")}
                                className="px-3 py-1 rounded-lg bg-gray-100 hover:bg-[#FFD300] text-gray-600 hover:text-gray-900 text-xs font-semibold transition-all">
                                Edit
                              </button>
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {["Nama", "Kode Driver", "No. HP", "Tipe", "Status", "Bandara", ""].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-gray-400 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredDrivers.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400 text-sm">Tidak ada data</td></tr>
                ) : filteredDrivers.map(d => {
                  const isEditing = editingId === d.id;
                  return (
                    <tr key={d.id} className={`hover:bg-gray-50 transition-colors ${isEditing ? "bg-yellow-50" : ""}`}>
                      {isEditing ? (
                        <>
                          <td className="px-3 py-2"><input value={editBuf.nama ?? ""} onChange={e => setEditBuf(b => ({ ...b, nama: e.target.value }))} className="w-full px-2 py-1 rounded-lg border text-sm focus:outline-none focus:ring-1 focus:ring-[#1565C0]" /></td>
                          <td className="px-3 py-2"><input value={editBuf.driver_code ?? ""} onChange={e => setEditBuf(b => ({ ...b, driver_code: e.target.value }))} className="w-full px-2 py-1 rounded-lg border text-sm focus:outline-none focus:ring-1 focus:ring-[#1565C0]" /></td>
                          <td className="px-3 py-2"><input value={editBuf.nomor_hp ?? ""} onChange={e => setEditBuf(b => ({ ...b, nomor_hp: e.target.value }))} className="w-full px-2 py-1 rounded-lg border text-sm focus:outline-none focus:ring-1 focus:ring-[#1565C0]" /></td>
                          <td className="px-3 py-2">
                            <select value={editBuf.driver_type ?? "INTERNAL"} onChange={e => setEditBuf(b => ({ ...b, driver_type: e.target.value }))} className="px-2 py-1 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-[#1565C0]">
                              {DRIVER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <select value={editBuf.status ?? "ACTIVE"} onChange={e => setEditBuf(b => ({ ...b, status: e.target.value }))} className="px-2 py-1 rounded-lg border text-xs focus:outline-none focus:ring-1 focus:ring-[#1565C0]">
                              {DRIVER_STATUS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </td>
                          <td className="px-3 py-2 text-xs text-gray-400">{d.airports?.code ?? "—"}</td>
                          <td className="px-3 py-2">
                            <div className="flex gap-1">
                              <button onClick={() => saveEdit(d.id, "driver")} disabled={loading}
                                className="px-2.5 py-1 rounded-lg bg-[#1565C0] text-white text-xs font-bold disabled:opacity-50 hover:bg-[#0d47a1]">
                                {loading ? "..." : "Simpan"}
                              </button>
                              <button onClick={() => setEditingId(null)} className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600 text-xs font-semibold hover:bg-gray-200">
                                Batal
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-800">{d.nama}</td>
                          <td className="px-4 py-3 text-xs font-mono text-gray-500">{d.driver_code ?? "—"}</td>
                          <td className="px-4 py-3 text-xs text-gray-500">{d.nomor_hp ?? "—"}</td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${d.driver_type === "EXTERNAL" ? "bg-orange-50 text-orange-700" : "bg-blue-50 text-blue-700"}`}>
                              {d.driver_type ?? "—"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${d.status === "ACTIVE" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                              {d.status ?? "—"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-400">{d.airports?.code ?? "—"}</td>
                          <td className="px-4 py-3">
                            <button onClick={() => startEdit(d, "driver")}
                              className="px-3 py-1 rounded-lg bg-gray-100 hover:bg-[#FFD300] text-gray-600 hover:text-gray-900 text-xs font-semibold transition-all">
                              Edit
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-400">
        Menampilkan {sub === "staff" ? `${filteredStaff.length} dari ${staffList.length} staff` : `${filteredDrivers.length} dari ${driverList.length} driver`}
      </p>
    </div>
  );
}

/* ════════════════════════════════════════════════════ */
/* Root export                                          */
/* ════════════════════════════════════════════════════ */
const TABS = [
  { key: "password", label: "Ganti Password", icon: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" },
  { key: "sync",     label: "Sinkron Data",   icon: "M1 4v6h6M23 20v-6h-6M20.49 9A9 9 0 005.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 013.51 15" },
  { key: "data",     label: "Data",           icon: "M3 10h18M3 14h18M10 3v18M14 3v18M3 6a3 3 0 013-3h12a3 3 0 013 3v12a3 3 0 01-3 3H6a3 3 0 01-3-3V6z" },
];

export default function SettingsClient({ currentUser, users, staffList, driverList }: Props) {
  const [tab, setTab] = useState<"password" | "sync" | "data">("password");

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black" style={{ color: "var(--text-primary)" }}>Pengaturan</h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
          Kelola password, sinkronisasi data, dan edit data SDM
        </p>
      </div>

      {/* Tab nav */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl w-fit">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              tab === t.key ? "bg-white text-[#1565C0] shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}>
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d={t.icon} />
            </svg>
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "password" && <ChangePasswordTab currentUser={currentUser} users={users} />}
      {tab === "sync"     && <SyncDataTab />}
      {tab === "data"     && <DataTab staffList={staffList} driverList={driverList} />}
    </div>
  );
}
