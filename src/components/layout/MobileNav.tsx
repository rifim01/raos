"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

/* ─── icon wrapper ───────────────────────────────────────────────────────── */
function SI({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"
      width="20" height="20"
    >
      {children}
    </svg>
  );
}

/* ─── 5 quick-access tabs ────────────────────────────────────────────────── */
const MOBILE_NAV = [
  {
    label: "Dashboard",
    href: "/",
    icon: (
      <SI>
        <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <path d="M9 22V12h6v10"/>
      </SI>
    ),
  },
  {
    label: "Tracking",
    href: "/tracking",
    icon: (
      <SI>
        <path d="M19.07 4.93A10 10 0 0 0 6.99 3.34"/>
        <path d="M4 6.1a10 10 0 1 0 14.9.97"/>
        <path d="M12 12 4.93 4.93"/>
        <circle cx="12" cy="12" r="2"/>
      </SI>
    ),
  },
  {
    label: "Pickup",
    href: "/pickup",
    icon: (
      <SI>
        <path d="M18 8c0 4.5-6 9-6 9s-6-4.5-6-9a6 6 0 0 1 12 0z"/>
        <circle cx="12" cy="8" r="2"/>
        <path d="M12 2v2M4.93 4.93l1.41 1.41M2 12h2M20 12h2M18.66 6.34l-1.41 1.41"/>
      </SI>
    ),
  },
  {
    label: "Pelanggaran",
    href: "/violations",
    icon: (
      <SI>
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
        <path d="M12 9v4"/>
        <path d="M12 17h.01"/>
      </SI>
    ),
  },
  {
    label: "Pengaturan",
    href: "/settings",
    icon: (
      <SI>
        <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
        <circle cx="12" cy="12" r="3"/>
      </SI>
    ),
  },
];

/* ══════════════════════════════════════════════════════════════════════════
   FLOATING BOTTOM NAV
══════════════════════════════════════════════════════════════════════════ */
export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      className="lg:hidden fixed z-50"
      style={{ bottom: 16, left: 16, right: 16 }}
    >
      {/* Pill container */}
      <div
        className="flex items-center justify-around px-3 py-2 rounded-full"
        style={{
          background: "rgba(255, 255, 255, 0.92)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          boxShadow: "0 8px 32px rgba(0,0,0,.14), 0 2px 8px rgba(0,0,0,.08), 0 0 0 1px rgba(0,0,0,.05)",
        }}
      >
        {MOBILE_NAV.map((item) => {
          const isActive =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex flex-col items-center gap-0.5 select-none"
            >
              {/* Icon container — yellow capsule when active */}
              <span
                className={cn(
                  "flex items-center justify-center rounded-full transition-all duration-200",
                  isActive
                    ? "px-3.5 py-1.5 shadow-[0_2px_10px_rgba(255,211,0,.5)]"
                    : "p-1.5"
                )}
                style={
                  isActive
                    ? { background: "#FFD300", color: "#000000" }
                    : { color: "#94A3B8" }
                }
              >
                {item.icon}
              </span>

              {/* Label */}
              <span
                className="text-[9.5px] font-semibold leading-none tracking-tight"
                style={{ color: isActive ? "#B8860B" : "#94A3B8" }}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
