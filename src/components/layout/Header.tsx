"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const AIRPORT_TABS = [
  { code: "BTH001", short: "BTH", kota: "Batam",      bandara: "Hang Nadim",    live: true,  color: "#3B82F6" },
  { code: "PKU001", short: "PKU", kota: "Pekanbaru",  bandara: "SS Kasim II",   live: true,  color: "#06B6D4" },
  { code: "DJB001", short: "DJB", kota: "Jambi",      bandara: "Sultan Thaha",  live: true,  color: "#22C55E" },
  { code: "BPN001", short: "BPN", kota: "Balikpapan", bandara: "SAM Sulaiman",  live: true,  color: "#A78BFA" },
  { code: "MDC001", short: "MDC", kota: "Manado",     bandara: "Sam Ratulangi", live: true,  color: "#F59E0B" },
  { code: "UPG001", short: "UPG", kota: "Makassar",   bandara: "Hasanuddin",    live: false, color: "#6B7280" },
  { code: "CGK001", short: "CGK", kota: "Soekarno-Hatta", bandara: "Soeta",    live: false, color: "#6B7280" },
];

interface HeaderProps {
  onMenuToggle: () => void;
  userEmail?: string;
  userName?: string;
  userRole?: string;
  selectedAirport?: string;
  onAirportChange?: (code: string) => void;
}

export default function Header({ onMenuToggle, userEmail, userName, userRole, selectedAirport = "ALL", onAirportChange }: HeaderProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [clock, setClock] = useState({ time: "", date: "" });
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    function tick() {
      const now = new Date();
      setClock({
        time: now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
        date: now.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" }),
      });
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const initials = userName
    ? userName.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase()
    : userEmail?.[0]?.toUpperCase() ?? "U";

  return (
    <header
      className="flex items-center gap-3 flex-shrink-0 z-30 overflow-x-auto"
      style={{
        height: "var(--header-height)",
        background: "var(--bg-secondary)",
        borderBottom: "1px solid var(--border)",
        paddingLeft: 16, paddingRight: 16,
      }}
    >
      {/* Mobile hamburger */}
      <button onClick={onMenuToggle}
        className="lg:hidden p-2 rounded-lg hover:bg-white/5 transition-colors flex-shrink-0"
        style={{ color: "var(--text-secondary)" }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width={18} height={18}>
          <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>

      {/* Clock + LIVE */}
      <div className="hidden md:flex items-center gap-2 flex-shrink-0">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
          style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.2)" }}>
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
          <span className="text-[10px] font-black tracking-widest text-green-400 uppercase">LIVE</span>
        </div>
        <div className="flex flex-col leading-none">
          <span className="text-base font-black tabular-nums text-white leading-none">{clock.time || "——:——:——"}</span>
          <span className="text-[9px] font-semibold mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>{clock.date}</span>
        </div>
      </div>

      {/* Airport tabs */}
      <div className="hidden xl:flex items-center gap-1 ml-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        {/* ALL tab */}
        <button
          onClick={() => { onAirportChange?.("ALL"); router.push("/"); }}
          className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all"
          style={{
            background: selectedAirport === "ALL" ? "rgba(59,130,246,0.18)" : "rgba(255,255,255,0.04)",
            color: selectedAirport === "ALL" ? "#FFFFFF" : "var(--text-secondary)",
            border: selectedAirport === "ALL" ? "1px solid rgba(59,130,246,0.4)" : "1px solid var(--border)",
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width={11} height={11}>
            <circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
          </svg>
          SEMUA
        </button>

        {AIRPORT_TABS.map((ap) => (
          <button
            key={ap.code}
            disabled={!ap.live}
            onClick={() => { if (ap.live) { onAirportChange?.(ap.code); router.push(`/airports/${ap.code}`); } }}
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all"
            style={{
              background: selectedAirport === ap.code ? `${ap.color}22` : "rgba(255,255,255,0.03)",
              color: !ap.live ? "var(--text-muted)" : selectedAirport === ap.code ? "#FFFFFF" : "var(--text-secondary)",
              border: selectedAirport === ap.code ? `1px solid ${ap.color}66` : "1px solid var(--border)",
              cursor: ap.live ? "pointer" : "not-allowed",
              opacity: ap.live ? 1 : 0.5,
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width={10} height={10}>
              <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21 4 19 2c-2-2-4-2-5.5-.5L10 5 1.8 6.2a.8.8 0 0 0-.3 1.4L5 11l-1 3-2 1 1 2 2-1 3-1 3.5 3.5 1.2 4 1.4-.3z"/>
            </svg>
            {ap.kota}
            {ap.live ? (
              <span className="text-[8px] font-black px-1 py-px rounded" style={{ background: "rgba(34,197,94,0.15)", color: "#22C55E" }}>LIVE</span>
            ) : (
              <span className="text-[8px] font-black px-1 py-px rounded" style={{ background: "rgba(107,114,128,0.15)", color: "#6B7280" }}>SOON</span>
            )}
          </button>
        ))}
      </div>

      <div className="flex-1" />

      {/* Search */}
      <div className="hidden lg:flex items-center gap-2 rounded-xl px-3 py-1.5 w-44 border transition-colors flex-shrink-0"
        style={{ background: "rgba(255,255,255,0.04)", borderColor: "var(--border)" }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width={13} height={13} style={{ color: "var(--text-muted)", flexShrink: 0 }}>
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input type="text" placeholder="Cari..." className="bg-transparent text-xs focus:outline-none flex-1 min-w-0"
          style={{ color: "var(--text-primary)" }}
          onKeyDown={e => {
            if (e.key === "Enter" && (e.target as HTMLInputElement).value.trim()) {
              router.push(`/drivers?q=${encodeURIComponent((e.target as HTMLInputElement).value.trim())}`);
            }
          }}
        />
      </div>

      {/* Refresh */}
      <button onClick={() => router.refresh()} title="Refresh" className="p-2 rounded-xl transition-colors hover:bg-white/5 flex-shrink-0"
        style={{ color: "var(--text-muted)" }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width={16} height={16}>
          <path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
        </svg>
      </button>

      {/* Notifications */}
      <button className="relative p-2 rounded-xl transition-colors hover:bg-white/5 flex-shrink-0"
        style={{ color: "var(--text-secondary)" }}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" width={16} height={16}>
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full text-[8px] font-black flex items-center justify-center"
          style={{ background: "var(--danger)", color: "white" }}>12</span>
      </button>

      {/* Maxim badge */}
      <div className="hidden xl:flex items-center gap-1.5 px-3 py-1.5 rounded-lg flex-shrink-0"
        style={{ background: "rgba(255,211,0,0.1)", border: "1px solid rgba(255,211,0,0.25)" }}>
        <span className="text-[10px] font-black" style={{ color: "#FFD300" }}>maxim</span>
        <span className="w-1 h-1 rounded-full" style={{ background: "#FFD300" }} />
        <span className="text-[10px] font-black" style={{ color: "#FFD300" }}>maxim</span>
      </div>

      {/* User */}
      <div className="relative flex-shrink-0">
        <button onClick={() => setShowUserMenu(!showUserMenu)}
          className="flex items-center gap-2 rounded-xl px-2 py-1.5 transition-colors hover:bg-white/5 border border-transparent hover:border-white/8">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #3B82F6, #06B6D4)" }}>
            {initials}
          </div>
          <div className="hidden md:block text-left">
            <p className="text-xs font-semibold leading-tight" style={{ color: "var(--text-primary)" }}>{userName || "User"}</p>
            <p className="text-[9px] leading-tight uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>{userRole || "Staff"}</p>
          </div>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width={12} height={12} className="hidden md:block" style={{ color: "var(--text-muted)" }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>

        {showUserMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
            <div className="absolute right-0 top-full mt-2 w-52 rounded-xl z-50 shadow-2xl overflow-hidden animate-slide-up"
              style={{ background: "var(--bg-elevated)", border: "1px solid var(--border-strong)" }}>
              <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
                <p className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>{userName}</p>
                <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{userEmail}</p>
              </div>
              <div className="p-1">
                <button onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm rounded-lg transition-colors hover:bg-red-500/10"
                  style={{ color: "var(--danger)" }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width={15} height={15}>
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
                  </svg>
                  Keluar
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
