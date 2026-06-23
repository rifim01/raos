"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/* ─── Thin inline SVG icons ─────────────────────────────────────────────── */
function Icon({ d, d2, circle, size = 15 }: { d?: string; d2?: string; circle?: { cx: number; cy: number; r: number }; size?: number }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" strokeLinejoin="round" width={size} height={size} style={{ flexShrink: 0 }}>
      {d  && <path d={d} />}
      {d2 && <path d={d2} />}
      {circle && <circle cx={circle.cx} cy={circle.cy} r={circle.r} />}
    </svg>
  );
}

const ICONS = {
  home:      <Icon d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" d2="M9 22V12h6v10" />,
  users:     <Icon d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" d2="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" circle={{ cx: 9, cy: 7, r: 4 }} />,
  car:       <Icon d="M19 17H5a2 2 0 0 1-2-2V9l3-6h12l3 6v6a2 2 0 0 1-2 2z" d2="M5 9h14" />,
  badge:     <Icon d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" d2="m9 12 2 2 4-4" />,
  userCog:   <Icon d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" d2="M19.5 12v1M19.5 18v1M16.6 13.9l.7.7M21.8 17.2l.7.7M16.6 17.2l.7-.7M21.8 13.9l.7-.7" circle={{ cx: 9, cy: 7, r: 4 }} />,
  mapPin:    <Icon d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z" circle={{ cx: 12, cy: 10, r: 3 }} />,
  list:      <Icon d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />,
  clock:     <Icon d="M12 6v6l4 2" circle={{ cx: 12, cy: 12, r: 10 }} />,
  calSync:   <Icon d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5M16 2v4M8 2v4M3 10h5M17 13-5 5 5 5" d2="M22 16a5 5 0 0 0-5-5" />,
  alert:     <Icon d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" d2="M12 9v4M12 17h.01" />,
  eta:       <Icon d="M12 6v6l4 2" circle={{ cx: 12, cy: 12, r: 10 }} />,
  wallet:    <Icon d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" d2="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />,
  landmark:  <Icon d="M3 22h18M6 18v-7M10 18v-7M14 18v-7M18 18v-7M12 2 4 7h16z" />,
  gift:      <Icon d="M20 12v10H4V12M2 7h20v5H2zM12 22V7M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />,
  barChart:  <Icon d="M12 20V10M18 20V4M6 20v-4" />,
  trophy:    <Icon d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22M18 2H6v7a6 6 0 0 0 12 0V2z" />,
  clipboard: <Icon d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" d2="m9 14 2 2 4-4" />,
  laporan:   <Icon d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" d2="M14 2v6h6M16 13H8M16 17H8M10 9H8" />,
  radar:     <Icon d="M19.07 4.93A10 10 0 0 0 6.99 3.34M4 6.1a10 10 0 1 0 14.9.97M12 12 4.93 4.93" circle={{ cx: 12, cy: 12, r: 2 }} />,
  map:       <Icon d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3V6zM9 3v15M15 6v15" />,
  monitor:   <Icon d="M8 21h8M12 17v4" d2="" />,
  terminal:  <Icon d="M17.8 19.2 16 11l3.5-3.5C21 6 21 4 19 2c-2-2-4-2-5.5-.5L10 5 1.8 6.2a.8.8 0 0 0-.3 1.4L5 11l-1 3-2 1 1 2 2-1 3-1 3.5 3.5 1.2 4 1.4-.3z" />,
  sparkles:  <Icon d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />,
  folder:    <Icon d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2z" />,
  mail:      <Icon d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" d2="m22 6-10 7L2 6" />,
  settings:  <Icon d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" circle={{ cx: 12, cy: 12, r: 3 }} />,
  chevron:   <Icon d="m6 9 6 6 6-6" size={12} />,
  chevLeft:  <Icon d="m15 18-6-6 6-6" size={13} />,
  chevRight: <Icon d="m9 18 6-6-6-6" size={13} />,
  geofence:  <Icon d="M18 8c0 4.5-6 9-6 9s-6-4.5-6-9a6 6 0 0 1 12 0z" circle={{ cx: 12, cy: 8, r: 2 }} />,
};

/* ─── Nav section header ─────────────────────────────────────────────────── */
function SectionLabel({ label, collapsed }: { label: string; collapsed: boolean }) {
  if (collapsed) return <div className="mx-3 my-2 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />;
  return (
    <p className="px-4 pt-5 pb-1.5 text-[9.5px] font-extrabold tracking-[0.16em] uppercase select-none"
      style={{ color: "var(--text-muted)" }}>
      {label}
    </p>
  );
}

/* ─── Single nav item ────────────────────────────────────────────────────── */
function NavItem({
  label, href, icon, active, collapsed, indent, onClick, badge,
}: {
  label: string; href: string; icon: React.ReactNode;
  active: boolean; collapsed: boolean; indent?: boolean; onClick?: () => void;
  badge?: string;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={cn(
        "group relative flex items-center gap-2.5 mx-2 my-0.5 rounded-lg transition-all duration-150 select-none",
        collapsed ? "px-0 py-2.5 justify-center" : cn("py-2 px-3", indent && "pl-8"),
        active
          ? "text-white font-bold"
          : "font-medium hover:text-white"
      )}
      style={{
        background: active ? "rgba(59,130,246,0.18)" : "transparent",
        color: active ? "#FFFFFF" : "var(--text-secondary)",
        borderLeft: active ? "2px solid #3B82F6" : "2px solid transparent",
      }}
    >
      <span className={cn("flex-shrink-0 transition-colors", active ? "text-[#3B82F6]" : "text-[var(--text-muted)] group-hover:text-white/70")}>
        {icon}
      </span>
      {!collapsed && (
        <span className="text-[13px] truncate leading-none flex-1">{label}</span>
      )}
      {!collapsed && badge && (
        <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full flex-shrink-0"
          style={{ background: "rgba(59,130,246,0.2)", color: "#60A5FA" }}>
          {badge}
        </span>
      )}
      {collapsed && (
        <span className="pointer-events-none absolute left-full ml-3 z-50 whitespace-nowrap rounded-lg px-3 py-2 text-[11px] font-semibold shadow-2xl opacity-0 transition-opacity group-hover:opacity-100"
          style={{ background: "#1C2A44", color: "#F0F4FF", border: "1px solid rgba(255,255,255,0.1)" }}>
          {label}
        </span>
      )}
    </Link>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   MAIN SIDEBAR
══════════════════════════════════════════════════════════════════════════ */
interface SidebarProps {
  onClose?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  userRoleLevel?: number;
  airportCode?: string | null;
}

export default function Sidebar({ onClose, collapsed = false, onToggleCollapse, userRoleLevel = 2 }: SidebarProps) {
  const pathname = usePathname();
  const [antriOpen, setAntriOpen] = useState(false);
  void antriOpen;

  const isActive = (href: string) => href === "/" ? pathname === "/" : pathname.startsWith(href);

  const showKoordinator   = userRoleLevel >= 3;
  const showCommandCenter = userRoleLevel >= 4;

  return (
    <aside
      className="h-full flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out"
      style={{
        width: collapsed ? "var(--sidebar-collapsed-width)" : "var(--sidebar-width)",
        background: "var(--bg-secondary)",
        borderRight: "1px solid var(--border)",
      }}
    >
      {/* ── Logo ─────────────────────────────────────── */}
      <div
        className={cn(
          "flex items-center border-b flex-shrink-0 transition-all duration-300",
          collapsed ? "px-3 py-4 justify-center flex-col gap-1" : "px-4 py-4 gap-3"
        )}
        style={{ height: "var(--header-height)", borderColor: "var(--border)" }}
      >
        <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 ring-1 ring-white/10">
          <img src="/icons/icon-512.png" alt="RAOS" className="w-full h-full object-cover" />
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-white font-black text-[15px] leading-none tracking-tight">RAOS</p>
            <p className="text-[8.5px] font-bold tracking-[0.12em] uppercase mt-0.5" style={{ color: "var(--text-muted)" }}>
              BY RIFIM × MAXIM
            </p>
          </div>
        )}
        {!collapsed && onClose && (
          <button onClick={onClose} className="lg:hidden p-1.5 rounded-lg transition-colors hover:bg-white/5" style={{ color: "var(--text-muted)" }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width={16} height={16}>
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
        {!collapsed && onToggleCollapse && (
          <button onClick={onToggleCollapse} className="hidden lg:flex p-1.5 rounded-lg transition-colors hover:bg-white/5" style={{ color: "var(--text-muted)" }}>
            {ICONS.chevLeft}
          </button>
        )}
        {collapsed && onToggleCollapse && (
          <button onClick={onToggleCollapse} className="hidden lg:flex p-1 rounded-lg hover:bg-white/5 transition-colors" style={{ color: "var(--text-muted)" }}>
            {ICONS.chevRight}
          </button>
        )}
      </div>

      {/* ── Navigation ─────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto py-2" style={{ scrollbarWidth: "none" }}>

        {/* DASHBOARD */}
        <div className="px-1">
          <NavItem label="Dashboard" href="/" icon={ICONS.home} active={isActive("/")} collapsed={collapsed} onClick={onClose} />
        </div>

        {/* MASTER DATA */}
        <div className="px-1">
          <SectionLabel label="Master Data" collapsed={collapsed} />
          <NavItem label="Driver"      href="/drivers"      icon={ICONS.car}     active={isActive("/drivers")}      collapsed={collapsed} onClick={onClose} />
          <NavItem label="Staff"       href="/staff"        icon={ICONS.badge}   active={isActive("/staff")}        collapsed={collapsed} onClick={onClose} />
          {showKoordinator && (
            <NavItem label="Koordinator" href="/coordinators" icon={ICONS.userCog} active={isActive("/coordinators")} collapsed={collapsed} onClick={onClose} />
          )}
        </div>

        {/* BANDARA (Operasional) */}
        <div className="px-1">
          <SectionLabel label="Bandara" collapsed={collapsed} />
          <NavItem label="Pickup Point"   href="/pickup"      icon={ICONS.mapPin}   active={isActive("/pickup")}      collapsed={collapsed} onClick={onClose} />
          <NavItem label="Antrian"        href="/antrian"     icon={ICONS.list}     active={isActive("/antrian")}     collapsed={collapsed} onClick={onClose} badge="BARU" />
          <NavItem label="Absensi"        href="/attendance"  icon={ICONS.clock}    active={isActive("/attendance")}  collapsed={collapsed} onClick={onClose} />
          <NavItem label="Shift Kerja"    href="/shifts"      icon={ICONS.calSync}  active={isActive("/shifts")}      collapsed={collapsed} onClick={onClose} />
          <NavItem label="Pelanggaran"    href="/violations"  icon={ICONS.alert}    active={isActive("/violations")}  collapsed={collapsed} onClick={onClose} />
          {showKoordinator && (
            <NavItem label="ETA Monitoring" href="/eta" icon={ICONS.eta} active={isActive("/eta")} collapsed={collapsed} onClick={onClose} />
          )}
        </div>

        {/* KEUANGAN */}
        <div className="px-1">
          <SectionLabel label="Keuangan" collapsed={collapsed} />
          <NavItem label="Payroll"         href="/payroll"  icon={ICONS.wallet}   active={isActive("/payroll")}  collapsed={collapsed} onClick={onClose} />
          <NavItem label="Kas Operasional" href="/finance"  icon={ICONS.landmark} active={isActive("/finance")}  collapsed={collapsed} onClick={onClose} />
          <NavItem label="Insentif"        href="/insentif" icon={ICONS.gift}     active={isActive("/insentif")} collapsed={collapsed} onClick={onClose} />
        </div>

        {/* KPI & ANALYTICS */}
        <div className="px-1">
          <SectionLabel label="KPI & Analytics" collapsed={collapsed} />
          <NavItem label="KPI Staff"  href="/kpi-staff"   icon={ICONS.clipboard} active={isActive("/kpi-staff")}   collapsed={collapsed} onClick={onClose} />
          {showKoordinator && (
            <NavItem label="KPI Driver" href="/kpi-driver" icon={ICONS.trophy} active={isActive("/kpi-driver")} collapsed={collapsed} onClick={onClose} />
          )}
          {showCommandCenter && (
            <NavItem label="KPI Cabang" href="/kpi-branch" icon={ICONS.barChart} active={isActive("/kpi-branch")} collapsed={collapsed} onClick={onClose} />
          )}
          <NavItem label="Laporan" href="/reports" icon={ICONS.laporan} active={isActive("/reports")} collapsed={collapsed} onClick={onClose} />
        </div>

        {/* COMMAND CENTER */}
        {showCommandCenter && (
          <div className="px-1">
            <SectionLabel label="Command Center" collapsed={collapsed} />
            <NavItem label="Terminal Kedatangan" href="/terminal-kedatangan" icon={ICONS.terminal} active={isActive("/terminal-kedatangan")} collapsed={collapsed} onClick={onClose} />
            <NavItem label="Live Tracking"       href="/tracking"            icon={ICONS.radar}    active={isActive("/tracking")}            collapsed={collapsed} onClick={onClose} />
            <NavItem label="Peta Bandara"        href="/peta-bandara"        icon={ICONS.map}      active={isActive("/peta-bandara")}        collapsed={collapsed} onClick={onClose} />
            <NavItem label="Command Center"      href="/command-center"      icon={ICONS.monitor}  active={isActive("/command-center")}      collapsed={collapsed} onClick={onClose} />
          </div>
        )}

        {/* GEOFENCE */}
        {showKoordinator && (
          <div className="px-1">
            <SectionLabel label="Geofence" collapsed={collapsed} />
            <NavItem label="Zona Bandara" href="/geofence" icon={ICONS.geofence} active={isActive("/geofence")} collapsed={collapsed} onClick={onClose} />
          </div>
        )}

        {/* TOOLS */}
        <div className="px-1">
          <SectionLabel label="Tools" collapsed={collapsed} />
          <NavItem label="Rifim AI"     href="/rifim-ai"     icon={ICONS.sparkles} active={isActive("/rifim-ai")}     collapsed={collapsed} onClick={onClose} />
          <NavItem label="Surat Keluar" href="/surat-keluar" icon={ICONS.mail}     active={isActive("/surat-keluar")} collapsed={collapsed} onClick={onClose} />
          <NavItem label="Dokumen"      href="/documents"    icon={ICONS.folder}   active={isActive("/documents")}    collapsed={collapsed} onClick={onClose} />
          <NavItem label="Pengaturan"   href="/settings"     icon={ICONS.settings} active={isActive("/settings")}    collapsed={collapsed} onClick={onClose} />
        </div>

        <div className="h-4" />
      </nav>

      {/* ── Footer ─────────────────────────────────────── */}
      {!collapsed && (
        <div className="px-4 py-3 flex-shrink-0" style={{ borderTop: "1px solid var(--border)" }}>
          <p className="text-[9px] font-bold tracking-widest uppercase" style={{ color: "var(--text-muted)" }}>
            RAOS v3.0.1 · SECURED
          </p>
        </div>
      )}
    </aside>
  );
}
