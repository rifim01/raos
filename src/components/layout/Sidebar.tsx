"use client";

import { useState } from "react";
import Link from "next/navigation";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/* ─── airports ───────────────────────────────────────────────────────────── */
const AIRPORTS = [
  { code: "DJB001", city: "Jambi" },
  { code: "PKU001", city: "Pekanbaru" },
  { code: "BTH001", city: "Batam" },
  { code: "BPN001", city: "Balikpapan" },
  { code: "MDC001", city: "Manado" },
  { code: "UPG001", city: "Makassar" },
];

/* ─── micro SVG wrapper ──────────────────────────────────────────────────── */
function SI({ children, size = 18 }: { children: React.ReactNode; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      width={size} height={size} style={{ flexShrink: 0 }}
    >
      {children}
    </svg>
  );
}

/* ─── icon library ───────────────────────────────────────────────────────── */
const IC = {
  home: (
    <SI>
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <path d="M9 22V12h6v10"/>
    </SI>
  ),
  users: (
    <SI>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
    </SI>
  ),
  car: (
    <SI>
      <path d="M19 17H5a2 2 0 0 1-2-2V9l3-6h12l3 6v6a2 2 0 0 1-2 2z"/>
      <circle cx="7.5" cy="17.5" r="1.5"/>
      <circle cx="16.5" cy="17.5" r="1.5"/>
      <path d="M5 9h14"/>
    </SI>
  ),
  badge: (
    <SI>
      <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/>
      <path d="m9 12 2 2 4-4"/>
    </SI>
  ),
  userCog: (
    <SI>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <circle cx="19.5" cy="15.5" r="2.5"/>
      <path d="M19.5 12v1M19.5 18v1M16.6 13.9l.7.7M21.8 17.2l.7.7M16.6 17.2l.7-.7M21.8 13.9l.7-.7"/>
    </SI>
  ),
  plane: (
    <SI>
      <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21 4 19 2c-2-2-4-2-5.5-.5L10 5 1.8 6.2a.8.8 0 0 0-.3 1.4L5 11l-1 3-2 1 1 2 2-1 3-1 3.5 3.5 1.2 4 1.4-.3z"/>
    </SI>
  ),
  mapPin: (
    <SI>
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/>
      <circle cx="12" cy="10" r="3"/>
    </SI>
  ),
  mapPinned: (
    <SI>
      <path d="M18 8c0 4.5-6 9-6 9s-6-4.5-6-9a6 6 0 0 1 12 0z"/>
      <circle cx="12" cy="8" r="2"/>
      <path d="M12 2v2M4.93 4.93l1.41 1.41M2 12h2M20 12h2M18.66 6.34l-1.41 1.41"/>
    </SI>
  ),
  clock: (
    <SI>
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 6v6l4 2"/>
    </SI>
  ),
  calSync: (
    <SI>
      <path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5"/>
      <path d="M16 2v4M8 2v4M3 10h5"/>
      <path d="m17 13-5 5 5 5"/>
      <path d="M22 16a5 5 0 0 0-5-5"/>
    </SI>
  ),
  alert: (
    <SI>
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
      <path d="M12 9v4"/><path d="M12 17h.01"/>
    </SI>
  ),
  wallet: (
    <SI>
      <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/>
      <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/>
    </SI>
  ),
  banknote: (
    <SI>
      <rect width="20" height="12" x="2" y="6" rx="2"/>
      <circle cx="12" cy="12" r="2"/>
      <path d="M6 12h.01M18 12h.01"/>
    </SI>
  ),
  landmark: (
    <SI>
      <line x1="3" x2="21" y1="22" y2="22"/>
      <line x1="6" x2="6" y1="18" y2="11"/>
      <line x1="10" x2="10" y1="18" y2="11"/>
      <line x1="14" x2="14" y1="18" y2="11"/>
      <line x1="18" x2="18" y1="18" y2="11"/>
      <polygon points="12 2 20 7 4 7"/>
    </SI>
  ),
  trophy: (
    <SI>
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
      <path d="M4 22h16"/>
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/>
    </SI>
  ),
  barChart: (
    <SI>
      <line x1="12" x2="12" y1="20" y2="10"/>
      <line x1="18" x2="18" y1="20" y2="4"/>
      <line x1="6" x2="6" y1="20" y2="16"/>
    </SI>
  ),
  monitor: (
    <SI>
      <rect width="20" height="14" x="2" y="3" rx="2"/>
      <line x1="8" x2="16" y1="21" y2="21"/>
      <line x1="12" x2="12" y1="17" y2="21"/>
    </SI>
  ),
  radar: (
    <SI>
      <path d="M19.07 4.93A10 10 0 0 0 6.99 3.34"/>
      <path d="M4 6.1a10 10 0 1 0 14.9.97"/>
      <path d="M12 12 4.93 4.93"/>
      <circle cx="12" cy="12" r="2"/>
    </SI>
  ),
  map: (
    <SI>
      <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"/>
      <line x1="9" x2="9" y1="3" y2="18"/>
      <line x1="15" x2="15" y1="6" y2="21"/>
    </SI>
  ),
  sparkles: (
    <SI>
      <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>
      <path d="M20 3v4M22 5h-4M4 17v2M5 18H3"/>
    </SI>
  ),
  folder: (
    <SI>
      <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2z"/>
    </SI>
  ),
  settings: (
    <SI>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
      <circle cx="12" cy="12" r="3"/>
    </SI>
  ),
  chevronDown: (
    <SI size={13}>
      <path d="m6 9 6 6 6-6"/>
    </SI>
  ),
  collapseLeft: (
    <SI size={15}>
      <path d="M11 19l-7-7 7-7M18 19l-7-7 7-7"/>
    </SI>
  ),
  expandRight: (
    <SI size={15}>
      <path d="M13 5l7 7-7 7M6 5l7 7-7 7"/>
    </SI>
  ),
  close: (
    <SI size={15}>
      <path d="M18 6L6 18M6 6l12 12"/>
    </SI>
  ),
};

/* ─── section label ──────────────────────────────────────────────────────── */
function SectionLabel({ label, collapsed }: { label: string; collapsed: boolean }) {
  if (collapsed) return <div className="mx-3 my-3 h-px bg-slate-100" />;
  return (
    <p className="px-4 pt-5 pb-1.5 text-[10px] font-bold tracking-[0.08em] uppercase text-slate-400 select-none">
      {label}
    </p>
  );
}

/* ─── single nav item ────────────────────────────────────────────────────── */
function NavItem({
  label, href, icon, active, collapsed, indent, onClick,
}: {
  label: string; href: string; icon: React.ReactNode;
  active: boolean; collapsed: boolean; indent?: boolean; onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={cn(
        "group relative flex items-center transition-all duration-200 rounded-xl mx-2 my-0.5",
        collapsed ? "px-0 py-2.5 justify-center" : cn("py-2.5 gap-3", indent ? "pl-8 pr-3" : "px-3.5"),
        active
          ? "bg-[#FFD300] text-black shadow-[0_4px_12px_rgba(255,211,0,0.3)] font-bold scale-[1.01]"
          : "text-slate-600 hover:bg-[#FFFBE6] hover:text-black"
      )}
    >
      {/* Icon */}
      <span className={cn("flex-shrink-0 transition-transform duration-200 group-hover:scale-105", active ? "text-black" : "text-slate-400 group-hover:text-slate-800")}>
        {icon}
      </span>

      {/* Label */}
      {!collapsed && (
        <span className={cn("text-[13.5px] tracking-wide truncate", active ? "font-bold text-black" : "font-semibold")}>
          {label}
        </span>
      )}

      {/* Active pip (indent mode) */}
      {!collapsed && active && indent && (
        <span className="absolute left-4 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-black" />
      )}

      {/* Collapsed tooltip */}
      {collapsed && (
        <span className="pointer-events-none absolute left-full ml-4 z-50 whitespace-nowrap rounded-lg bg-slate-900 px-3 py-2 text-[11px] font-bold text-white shadow-2xl opacity-0 transition-opacity group-hover:opacity-100">
          {label}
        </span>
      )}
    </Link>
  );
}

/* ─── bandara expandable ─────────────────────────────────────────────────── */
function BandaraSection({
  airports, collapsed, open, onToggle, isActive, onClose,
}: {
  airports: typeof AIRPORTS;
  collapsed: boolean; open: boolean;
  onToggle: () => void;
  isActive: (href: string) => boolean;
  onClose?: () => void;
}) {
  if (collapsed) {
    return (
      <>
        {airports.map((a) => (
          <Link
            key={a.code}
            href={`/airports/${a.code}`}
            onClick={onClose}
            title={a.city}
            className={cn(
              "group relative flex items-center justify-center mx-2 py-2.5 rounded-xl transition-all duration-200",
              isActive(`/airports/${a.code}`)
                ? "bg-[#FFD300] text-black shadow-[0_4px_12px_rgba(255,211,0,0.3)]"
                : "text-slate-400 hover:bg-[#FFFBE6] hover:text-slate-800"
            )}
          >
            {IC.mapPin}
            <span className="pointer-events-none absolute left-full ml-4 z-50 whitespace-nowrap rounded-lg bg-slate-900 px-3 py-2 text-[11px] font-bold text-white shadow-2xl opacity-0 transition-opacity group-hover:opacity-100">
              {a.city}
            </span>
          </Link>
        ))}
      </>
    );
  }

  const isAnyAirportActive = airports.some((a) => isActive(`/airports/${a.code}`));

  return (
    <>
      {/* Parent toggle button */}
      <button
        onClick={onToggle}
        className={cn(
          "group w-[calc(100%-16px)] mx-2 flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition-all duration-200 text-left outline-none",
          isAnyAirportActive
            ? "text-amber-800 bg-amber-50/70 font-bold"
            : "text-slate-600 hover:bg-[#FFFBE6] hover:text-black"
        )}
      >
        <span className={cn("transition-colors flex-shrink-0", isAnyAirportActive ? "text-amber-700" : "text-slate-400 group-hover:text-slate-700")}>
          {IC.plane}
        </span>
        <span className="flex-1 text-[13.5px] font-semibold tracking-wide">Bandara</span>
        <span
          className={cn(
            "flex-shrink-0 text-slate-400 transition-transform duration-200",
            open ? "rotate-180 text-slate-700" : ""
          )}
        >
          {IC.chevronDown}
        </span>
      </button>

      {/* Sub-items */}
      {open && (
        <div className="mt-1 mb-1 flex flex-col pl-3 ml-4 border-l-2 border-slate-100 space-y-0.5">
          {airports.map((a) => {
            const href = `/airports/${a.code}`;
            const active = isActive(href);
            return (
              <Link
                key={a.code}
                href={href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 mx-1.5 pl-4 pr-3 py-2 rounded-xl transition-all duration-150 text-[12.5px]",
                  active
                    ? "bg-[#FFD300] text-black font-bold shadow-[0_2px_8px_rgba(255,211,0,0.25)]"
                    : "text-slate-500 hover:bg-[#FFFBE6] hover:text-slate-900 font-semibold"
                )}
              >
                <span
                  className={cn(
                    "w-1.5 h-1.5 rounded-full flex-shrink-0 transition-transform duration-150",
                    active ? "bg-black scale-110" : "bg-slate-300"
                  )}
                />
                {a.city}
              </Link>
            );
          })}
        </div>
      )}
    </>
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

export default function Sidebar({
  onClose,
  collapsed = false,
  onToggleCollapse,
  userRoleLevel = 2,
  airportCode,
}: SidebarProps) {
  const pathname = usePathname();
  const [bandaraOpen, setBandaraOpen] = useState(pathname.startsWith("/airports"));

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  const airportItems =
    userRoleLevel >= 4
      ? AIRPORTS
      : userRoleLevel === 3 && airportCode
      ? AIRPORTS.filter((a) => a.code === airportCode)
      : [];

  const showCommandCenter = userRoleLevel >= 4;
  const showKoordinator   = userRoleLevel >= 3;

  return (
    <aside
      className="h-full flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out shadow-[4px_0_24px_rgba(0,0,0,0.015)]"
      style={{
        width: collapsed ? "var(--sidebar-collapsed-width)" : "var(--sidebar-width)",
        background: "#FFFFFF",
        borderRight: "1px solid #F1F5F9",
      }}
    >
      {/* ── Logo ─────────────────────────────────────────────────── */}
      <div
        className={cn(
          "flex items-center border-b border-slate-50 flex-shrink-0 transition-all duration-300",
          collapsed ? "px-3 py-4 justify-center" : "px-5 py-4 gap-3"
        )}
        style={{ height: "var(--header-height)" }}
      >
        <div className="w-8 h-8 rounded-xl overflow-hidden flex-shrink-0 shadow-sm ring-1 ring-slate-100 transition-transform duration-300 hover:scale-105">
          <img src="/icons/icon-512.png" alt="RIFIM" className="w-full h-full object-cover" />
        </div>

        {!collapsed && (
          <div className="flex-1 min-w-0 flex flex-col justify-center pl-0.5">
            <p className="text-slate-900 font-black text-[14px] leading-none tracking-tight">RIFIM</p>
            <p className="text-slate-400 text-[9px] font-bold tracking-[0.15em] uppercase mt-1">Airport OS</p>
          </div>
        )}

        {/* Mobile close */}
        {!collapsed && onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all outline-none"
          >
            {IC.close}
          </button>
        )}

        {/* Desktop collapse */}
        {!collapsed && onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all outline-none"
          >
            {IC.collapseLeft}
          </button>
        )}
      </div>

      {/* Collapsed expand button */}
      {collapsed && onToggleCollapse && (
        <button
          onClick={onToggleCollapse}
          className="hidden lg:flex mx-auto mt-4 mb-2 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-all justify-center outline-none"
        >
          {IC.expandRight}
        </button>
      )}

      {/* ── Navigation (Scrollable dengan Scrollbar Halus) ─────────── */}
      <nav
        className="flex-1 overflow-y-auto py-3 space-y-1 pr-1"
        style={{ scrollbarWidth: "thin", scrollbarColor: "#E2E8F0 transparent" }}
      >
        {/* DASHBOARD */}
        <div className="px-1">
          <NavItem
            label="Dashboard" href="/" icon={IC.home}
            active={isActive("/")} collapsed={collapsed} onClick={onClose}
          />
        </div>

        {/* SDM */}
        <div className="px-1">
          <SectionLabel label="SDM" collapsed={collapsed} />
          <NavItem label="Driver"      href="/drivers"      icon={IC.car}     active={isActive("/drivers")}      collapsed={collapsed} onClick={onClose} />
          <NavItem label="Staff"       href="/staff"        icon={IC.badge}   active={isActive("/staff")}        collapsed={collapsed} onClick={onClose} />
          {showKoordinator && (
            <NavItem label="Koordinator" href="/coordinators" icon={IC.userCog} active={isActive("/coordinators")} collapsed={collapsed} onClick={onClose} />
          )}
        </div>

        {/* BANDARA */}
        {airportItems.length > 0 && (
          <div className="px-1">
            <SectionLabel label="Bandara" collapsed={collapsed} />
            <BandaraSection
              airports={airportItems}
              collapsed={collapsed}
              open={bandaraOpen}
              onToggle={() => setBandaraOpen((o) => !o)}
              isActive={isActive}
              onClose={onClose}
            />
          </div>
        )}

        {/* OPERASIONAL */}
        <div className="px-1">
          <SectionLabel label="Operasional" collapsed={collapsed} />
          <NavItem label="Pickup Point" href="/pickup"      icon={IC.mapPinned}  active={isActive("/pickup")}      collapsed={collapsed} onClick={onClose} />
          <NavItem label="Absensi"      href="/attendance"  icon={IC.clock}      active={isActive("/attendance")}  collapsed={collapsed} onClick={onClose} />
          <NavItem label="Shift Kerja"  href="/shifts"      icon={IC.calSync}    active={isActive("/shifts")}      collapsed={collapsed} onClick={onClose} />
          <NavItem label="Pelanggaran"  href="/violations"  icon={IC.alert}      active={isActive("/violations")}  collapsed={collapsed} onClick={onClose} />
        </div>

        {/* KEUANGAN */}
        <div className="px-1">
          <SectionLabel label="Keuangan" collapsed={collapsed} />
          <NavItem label="Payroll"         href="/payroll"    icon={IC.banknote} active={isActive("/payroll")}    collapsed={collapsed} onClick={onClose} />
          <NavItem label="Kas Operasional" href="/finance"    icon={IC.landmark} active={isActive("/finance")}    collapsed={collapsed} onClick={onClose} />
          <NavItem label="Insentif"        href="/finance"    icon={IC.trophy}   active={isActive("/finance")}    collapsed={collapsed} onClick={onClose} />
        </div>

        {/* LAPORAN */}
        <div className="px-1">
          <SectionLabel label="Laporan" collapsed={collapsed} />
          <NavItem label="Laporan" href="/reports" icon={IC.barChart} active={isActive("/reports")} collapsed={collapsed} onClick={onClose} />
        </div>

        {/* COMMAND CENTER */}
        {showCommandCenter && (
          <div className="px-1">
            <SectionLabel label="Command Center" collapsed={collapsed} />
            <NavItem label="Command Center" href="/command-center" icon={IC.monitor} active={isActive("/command-center")} collapsed={collapsed} onClick={onClose} />
            <NavItem label="Live Tracking"   href="/tracking"       icon={IC.radar}   active={isActive("/tracking")}       collapsed={collapsed} onClick={onClose} />
            <NavItem label="Peta Bandara"    href="/command-center" icon={IC.map}     active={isActive("/command-center")} collapsed={collapsed} onClick={onClose} />
          </div>
        )}

        {/* AI & TOOLS */}
        <div className="px-1">
          <SectionLabel label="AI & Tools" collapsed={collapsed} />
          <NavItem label="Rifim AI"   href="/rifim-ai"   icon={IC.sparkles} active={isActive("/rifim-ai")}   collapsed={collapsed} onClick={onClose} />
          <NavItem label="Dokumen"    href="/reports"    icon={IC.folder}   active={isActive("/reports")}    collapsed={collapsed} onClick={onClose} />
          <NavItem label="Pengaturan" href="/settings"   icon={IC.settings} active={isActive("/settings")}   collapsed={collapsed} onClick={onClose} />
        </div>

        {/* bottom padding */}
        <div className="h-6" />
      </nav>

      {/* ── Footer ───────────────────────────────────────────────── */}
      {!collapsed && (
        <div
          className="px-5 py-4 flex-shrink-0 bg-slate-50/50"
          style={{ borderTop: "1px solid #F1F5F9" }}
        >
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
            <p className="text-slate-400 text-[9px] font-bold tracking-[0.1em] uppercase truncate select-none">
              PT RIFIM INTERNATIONAL GEMILANG
            </p>
          </div>
        </div>
      )}
    </aside>
  );
}
