"use client";

import { usePathname } from "next/navigation";
import Image from "next/image";

/**
 * Route → background image mapping.
 * Images live in /public/backgrounds/.
 * Overlay rgba(11,15,26,0.88) keeps effective image visibility ~8–12%.
 */
const BG_MAP: Array<{ match: (p: string) => boolean; src: string; alt: string }> = [
  // Dashboard + Command Center + Terminal Kedatangan → runway Rifim
  {
    match: (p) => p === "/" || p.startsWith("/terminal-kedatangan") || p.startsWith("/command-center") || p.startsWith("/peta-bandara") || p.startsWith("/tracking"),
    src: "/backgrounds/baground.png",
    alt: "RIFIM Airport runway background",
  },
  // Driver + Pickup + Antrian → Maxim yellow
  {
    match: (p) => p.startsWith("/drivers") || p.startsWith("/pickup") || p.startsWith("/antrian") || p.startsWith("/eta"),
    src: "/backgrounds/bg.png",
    alt: "Maxim Airport background",
  },
  // KPI & Analytics + Laporan → RIFIM brand poster (BG2.jpg — add file when available)
  {
    match: (p) => p.startsWith("/kpi") || p.startsWith("/reports"),
    src: "/backgrounds/BG2.jpg",
    alt: "RIFIM brand background",
  },
  // Master Data + Staff + DMS + Settings → copper plaque (bg.jpg — add file when available)
  {
    match: (p) =>
      p.startsWith("/staff") ||
      p.startsWith("/coordinators") ||
      p.startsWith("/surat-keluar") ||
      p.startsWith("/documents") ||
      p.startsWith("/settings") ||
      p.startsWith("/master-data"),
    src: "/backgrounds/bg.jpg",
    alt: "RIFIM corporate plaque background",
  },
];

// Auth routes that must NOT show background branding
const AUTH_PREFIXES = ["/login", "/register", "/forgot-password", "/reset-password", "/auth", "/sso"];

export default function AppBackground() {
  const pathname = usePathname();

  // Exclude all auth/login routes
  if (AUTH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return null;

  const matched = BG_MAP.find((entry) => entry.match(pathname));

  // Default fallback → runway image (always available)
  const src = matched?.src ?? "/backgrounds/baground.png";
  const alt = matched?.alt ?? "RAOS background";

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        isolation: "isolate",
      }}
    >
      {/* Background image */}
      <Image
        src={src}
        alt={alt}
        fill
        priority
        quality={60}
        style={{ objectFit: "cover", objectPosition: "center" }}
        // Gracefully hide broken images (missing files) — overlay still renders
        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
      />
      {/* Dark navy overlay — keeps image at ~8–12% effective opacity */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(11, 15, 26, 0.88)",
        }}
      />
    </div>
  );
}
