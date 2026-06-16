"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const AIRPORTS = [
  { code: "DJB001", city: "Jambi" },
  { code: "PKU001", city: "Pekanbaru" },
  { code: "BTH001", city: "Batam" },
  { code: "BPN001", city: "Balikpapan" },
  { code: "MDC001", city: "Manado" },
  { code: "UPG001", city: "Makassar" },
];

function buildNavGroups(userRoleLevel: number, airportCode: string | null | undefined) {
  const isDirectorPlus = userRoleLevel >= 4;
  const isCoordinator = userRoleLevel === 3;

  // Bandara items: director+ sees all, coordinator sees own airport
  const bandaraItems = isDirectorPlus
    ? AIRPORTS.map((a) => ({
        label: a.city,
        href: `/airports/${a.code}`,
        icon: "M17.8 19.2L16 11l3.5-3.5C21 6 21 4 19 2c-2-2-4-2-5.5-.5L10 5 1.8 6.2a.8.8 0 00-.3 1.4L5 11l-1 3-2 1 1 2 2-1 3-1 3.5 3.5z",
      }))
    : isCoordinator && airportCode
    ? [
        {
          label: AIRPORTS.find((a) => a.code === airportCode)?.city ?? airportCode,
          href: `/airports/${airportCode}`,
          icon: "M17.8 19.2L16 11l3.5-3.5C21 6 21 4 19 2c-2-2-4-2-5.5-.5L10 5 1.8 6.2a.8.8 0 00-.3 1.4L5 11l-1 3-2 1 1 2 2-1 3-1 3.5 3.5z",
        },
      ]
    : [];

  return [
    {
      label: "Dashboard",
      items: [
        { label: "Dashboard", href: "/", icon: "M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z" },
      ],
    },
    {
      label: "SDM",
      items: [
        { label: "Staff", href: "/staff", icon: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 7a4 4 0 100 8 4 4 0 000-8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" },
        { label: "Driver", href: "/drivers", icon: "M19 17H5a2 2 0 01-2-2V9l3-6h12l3 6v6a2 2 0 01-2 2zM7.5 17.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3zM16.5 17.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3zM5 9h14" },
      ],
    },
    ...(bandaraItems.length > 0
      ? [{ label: "Bandara", items: bandaraItems }]
      : []),
    {
      label: "Operasional",
      items: [
        { label: "Absensi", href: "/attendance", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" },
        { label: "Queue & Pickup", href: "/pickup", icon: "M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" },
        { label: "Driver Tracking", href: "/tracking", icon: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" },
        { label: "Geofence Bandara", href: "/geofence", icon: "M12 22s-8-4.5-8-11.8A8 8 0 0112 2a8 8 0 018 8.2c0 7.3-8 11.8-8 11.8zM12 13a3 3 0 100-6 3 3 0 000 6z" },
        { label: "Pelanggaran", href: "/violations", icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" },
      ],
    },
    {
      label: "Keuangan",
      items: [
        { label: "Payroll", href: "/payroll", icon: "M2 5h20v14H2zM2 10h20M6 15h4M14 15h4" },
        { label: "Transaksi", href: "/finance", icon: "M12 1v22M17 5H9.5a3.5 3.5 0 100 7h5a3.5 3.5 0 110 7H6" },
      ],
    },
    {
      label: "Laporan",
      items: [
        { label: "Reports", href: "/reports", icon: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8" },
        { label: "Administration", href: "/admin", icon: "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" },
      ],
    },
    {
      label: "RIFIM AI",
      items: [
        { label: "Rifim AI", href: "/rifim-ai", icon: "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" },
      ],
    },
    ...(isDirectorPlus
      ? [
          {
            label: "Command Center",
            items: [
              { label: "Director CC", href: "/command-center/director", icon: "M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h16a2 2 0 012 2v10a2 2 0 01-2 2h-2" },
              { label: "TV Wall Mode", href: "/command-center/tv-mode", icon: "M20 7H4a2 2 0 00-2 2v6a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM8 21h8M12 17v4" },
              { label: "Executive", href: "/command-center/executive", icon: "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" },
            ],
          },
        ]
      : []),
  ];
}

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
  const NAV_GROUPS = buildNavGroups(userRoleLevel, airportCode);

  return (
    <aside
      className="gradient-sidebar h-full flex flex-col transition-all duration-300 ease-in-out flex-shrink-0"
      style={{ width: collapsed ? "var(--sidebar-collapsed-width)" : "var(--sidebar-width)" }}
    >
      {/* Logo area */}
      <div
        className={cn(
          "flex items-center border-b border-white/5 flex-shrink-0 transition-all duration-300",
          collapsed ? "px-3 py-4 justify-center" : "px-4 py-4 gap-3"
        )}
        style={{ height: "var(--header-height)" }}
      >
        <div className="w-8 h-8 rounded-lg overflow-hidden flex-shrink-0 ring-1 ring-white/10">
          <img src="/icons/icon-512.png" alt="RIFIM" className="w-full h-full object-cover" />
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <p className="text-white font-black text-sm leading-tight tracking-wide">RIFIM</p>
            <p className="text-white/40 text-[9px] font-medium tracking-widest uppercase truncate">Airport OS</p>
          </div>
        )}
        {!collapsed && onClose && (
          <button onClick={onClose} className="lg:hidden p-1 rounded text-white/40 hover:text-white">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        )}
        {!collapsed && onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex p-1 rounded text-white/30 hover:text-white/70 hover:bg-white/5 transition-all"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
              <path d="M11 19l-7-7 7-7M18 19l-7-7 7-7" />
            </svg>
          </button>
        )}
      </div>

      {/* Collapsed expand button */}
      {collapsed && onToggleCollapse && (
        <button
          onClick={onToggleCollapse}
          className="hidden lg:flex mx-3 mt-2 mb-1 p-2 rounded-lg text-white/30 hover:text-white/70 hover:bg-white/5 transition-all justify-center"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <path d="M13 5l7 7-7 7M6 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-0.5">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <p className="px-4 py-1.5 text-[9px] font-bold tracking-widest uppercase text-white/25 select-none">
                {group.label}
              </p>
            )}
            {collapsed && <div className="mx-3 my-1 border-t border-white/5" />}
            {group.items.map((item) => {
              const isActive =
                item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "group relative flex items-center transition-all duration-150",
                    collapsed
                      ? "mx-2 px-2 py-2.5 rounded-xl justify-center"
                      : "mx-2 px-3 py-2.5 rounded-xl gap-3",
                    isActive
                      ? "bg-[#2563EB]/20 text-white"
                      : "text-white/40 hover:bg-white/5 hover:text-white/80"
                  )}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[#2563EB] rounded-r-full" />
                  )}
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className={cn(
                      "flex-shrink-0 w-5 h-5 transition-colors",
                      isActive ? "text-[#2563EB]" : "text-white/40 group-hover:text-white/70"
                    )}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d={item.icon} />
                  </svg>
                  {!collapsed && (
                    <span className="text-sm font-medium truncate">{item.label}</span>
                  )}
                  {collapsed && (
                    <span className="absolute left-full ml-2 px-2 py-1 bg-[#1E293B] border border-white/10 text-xs text-white rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50 shadow-xl">
                      {item.label}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Bottom */}
      {!collapsed && (
        <div className="px-4 py-3 border-t border-white/5 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse-dot flex-shrink-0" />
            <p className="text-white/25 text-[9px] font-medium tracking-wider uppercase truncate">
              PT RIFIM INTERNATIONAL GEMILANG
            </p>
          </div>
        </div>
      )}
    </aside>
  );
}
