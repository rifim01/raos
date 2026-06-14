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

export default function Header({
  onMenuToggle,
  userEmail,
  userName,
  userRole,
  selectedAirport = "ALL",
  onAirportChange,
}: HeaderProps) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const initials = userName
    ? userName.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase()
    : userEmail?.[0]?.toUpperCase() ?? "U";

  return (
    <header
      className="glass border-b border-white/60 flex items-center px-4 lg:px-6 gap-4 flex-shrink-0 z-30"
      style={{ height: "var(--header-height)" }}
    >
      {/* Mobile hamburger */}
      <button
        onClick={onMenuToggle}
        className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
          <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Airport Selector */}
      <div className="flex items-center gap-2">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-[#1565C0] flex-shrink-0">
          <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21 4 19 2c-2-2-4-2-5.5-.5L10 5 1.8 6.2A.8.8 0 001.5 7.6L5 11l-1 3-2 1 1 2 2-1 3-1 3.5 3.5z" />
        </svg>
        <select
          value={selectedAirport}
          onChange={(e) => onAirportChange?.(e.target.value)}
          className="text-sm font-semibold text-gray-700 bg-transparent border-none focus:outline-none cursor-pointer"
        >
          <option value="ALL">Semua Bandara</option>
          {AIRPORTS.map((a) => (
            <option key={a.code} value={a.code}>
              {a.code} — {a.city}
            </option>
          ))}
        </select>
      </div>

      {/* Live indicator */}
      <div className="hidden md:flex items-center gap-1.5 ml-2">
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse-dot" />
        <span className="text-xs font-medium text-green-600">LIVE</span>
      </div>

      <div className="flex-1" />

      {/* Search */}
      <div className="hidden md:flex items-center gap-2 bg-gray-100 rounded-xl px-3 py-2 w-64">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-gray-400 flex-shrink-0">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          placeholder="Cari driver, staff..."
          className="bg-transparent text-sm text-gray-600 placeholder-gray-400 focus:outline-none flex-1"
        />
      </div>

      {/* Notifications */}
      <button className="relative p-2 rounded-xl hover:bg-gray-100 text-gray-600 transition-colors">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
        </svg>
        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#E53935] rounded-full" />
      </button>

      {/* User Menu */}
      <div className="relative">
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="flex items-center gap-2.5 hover:bg-gray-100 rounded-xl px-2 py-1.5 transition-colors"
        >
          <div className="w-8 h-8 rounded-xl gradient-rifim flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
            {initials}
          </div>
          <div className="hidden md:block text-left">
            <p className="text-sm font-semibold text-gray-800 leading-tight">{userName || "User"}</p>
            <p className="text-xs text-gray-400 leading-tight">{userRole || "Staff"}</p>
          </div>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4 text-gray-400 hidden md:block">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {showUserMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
            <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 z-50 animate-slide-up overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-800 truncate">{userName}</p>
                <p className="text-xs text-gray-400 truncate">{userEmail}</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
                </svg>
                Keluar
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
