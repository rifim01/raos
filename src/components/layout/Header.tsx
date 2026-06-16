"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { AIRPORTS } from "@/lib/utils";

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
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const initials = userName
    ? userName.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase()
    : userEmail?.[0]?.toUpperCase() ?? "U";

  const now = new Date();
  const timeStr = now.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  const dateStr = now.toLocaleDateString("id-ID", { weekday: "short", day: "numeric", month: "short" });

  return (
    <header className="glass-dark flex items-center px-4 lg:px-6 gap-3 flex-shrink-0 z-30"
      style={{ height: "var(--header-height)" }}>
      {/* Mobile hamburger */}
      <button onClick={onMenuToggle}
        className="lg:hidden p-2 rounded-lg hover:bg-white/5 text-white/60 hover:text-white transition-colors">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
          <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>

      {/* Airport Selector */}
      <div className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-1.5 border border-white/10">
        <svg viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" className="w-3.5 h-3.5 flex-shrink-0">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.8 19.2L16 11l3.5-3.5C21 6 21 4 19 2c-2-2-4-2-5.5-.5L10 5 1.8 6.2A.8.8 0 001.5 7.6L5 11l-1 3-2 1 1 2 2-1 3-1 3.5 3.5z"/>
        </svg>
        <select
          value={selectedAirport}
          onChange={e => onAirportChange?.(e.target.value)}
          className="text-xs font-semibold bg-transparent border-none focus:outline-none cursor-pointer text-white/80 max-w-[160px]"
        >
          <option value="ALL" className="bg-[#1E293B]">Semua Bandara</option>
          {AIRPORTS.map(a => (
            <option key={a.code} value={a.code} className="bg-[#1E293B]">
              ✈ {a.code} — {a.city}
            </option>
          ))}
        </select>
      </div>

      {/* Live Status */}
      <div className="hidden md:flex items-center gap-1.5 bg-[#10B981]/10 rounded-lg px-2.5 py-1.5 border border-[#10B981]/20">
        <span className="relative w-2 h-2">
          <span className="absolute inset-0 rounded-full bg-[#10B981] animate-pulse-dot" />
          <span className="absolute inset-0 rounded-full bg-[#10B981] opacity-30 animate-pulse-ring scale-150" />
        </span>
        <span className="text-[10px] font-bold text-[#10B981] tracking-widest uppercase">LIVE</span>
      </div>

      {/* Datetime */}
      <div className="hidden lg:flex flex-col ml-1">
        <span className="text-[10px] font-bold text-white/70 leading-tight">{timeStr}</span>
        <span className="text-[9px] text-white/30 leading-tight uppercase tracking-wide">{dateStr}</span>
      </div>

      <div className="flex-1" />

      {/* Search */}
      <div className="hidden md:flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2 w-52 border border-white/8 focus-within:border-[#2563EB]/40 transition-colors">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 text-white/30 flex-shrink-0">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input type="text" placeholder="Cari driver, staff..."
          className="bg-transparent text-xs text-white/70 placeholder-white/25 focus:outline-none flex-1" />
        <kbd className="text-[9px] text-white/20 bg-white/5 px-1.5 py-0.5 rounded font-mono">/</kbd>
      </div>

      {/* Notifications */}
      <button className="relative p-2 rounded-xl hover:bg-white/5 text-white/40 hover:text-white/80 transition-colors">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4.5 h-4.5" style={{ width: 18, height: 18 }}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/>
        </svg>
        <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#EF4444] rounded-full" />
      </button>

      {/* User */}
      <div className="relative">
        <button onClick={() => setShowUserMenu(!showUserMenu)}
          className="flex items-center gap-2.5 hover:bg-white/5 rounded-xl px-2 py-1.5 transition-colors border border-transparent hover:border-white/10">
          <div className="w-7 h-7 rounded-lg gradient-rifim flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0">
            {initials}
          </div>
          <div className="hidden md:block text-left">
            <p className="text-xs font-semibold text-white/90 leading-tight">{userName || "User"}</p>
            <p className="text-[9px] text-white/35 leading-tight uppercase tracking-wide">{userRole || "Staff"}</p>
          </div>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3 text-white/30 hidden md:block">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>

        {showUserMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
            <div className="absolute right-0 top-full mt-2 w-52 rounded-xl border border-white/10 z-50 animate-slide-up overflow-hidden shadow-2xl"
              style={{ background: "var(--bg-secondary)" }}>
              <div className="px-4 py-3 border-b border-white/5">
                <p className="text-sm font-semibold text-white/90 truncate">{userName}</p>
                <p className="text-xs text-white/35 truncate">{userEmail}</p>
              </div>
              <div className="p-1">
                <button onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-[#EF4444] hover:bg-[#EF4444]/10 rounded-lg transition-colors">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
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
