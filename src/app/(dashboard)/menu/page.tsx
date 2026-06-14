"use client";

import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const MENU_ITEMS = [
  { href: "/pickup", label: "Pickup Point", icon: "🗺️", color: "bg-green-50 border-green-100" },
  { href: "/attendance", label: "Absensi", icon: "📅", color: "bg-blue-50 border-blue-100" },
  { href: "/payroll", label: "Payroll & HR", icon: "💰", color: "bg-purple-50 border-purple-100" },
  { href: "/finance", label: "Finance", icon: "📊", color: "bg-emerald-50 border-emerald-100" },
  { href: "/airports", label: "Airport Ops", icon: "✈️", color: "bg-sky-50 border-sky-100" },
  { href: "/reports", label: "Reports", icon: "📋", color: "bg-orange-50 border-orange-100" },
  { href: "/admin", label: "Administration", icon: "⚙️", color: "bg-gray-50 border-gray-200" },
];

export default function MenuPage() {
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-black text-gray-800">Lainnya</h1>
      <div className="grid grid-cols-2 gap-3">
        {MENU_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 p-4 bg-white rounded-2xl card-shadow border ${item.color} hover:shadow-md transition-shadow`}
          >
            <span className="text-2xl">{item.icon}</span>
            <span className="font-semibold text-sm text-gray-800">{item.label}</span>
          </Link>
        ))}
      </div>
      <button
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border-2 border-red-200 text-red-600 font-bold hover:bg-red-50 transition-colors"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
          <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
        </svg>
        Keluar
      </button>
    </div>
  );
}
