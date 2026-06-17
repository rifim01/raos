"use client";

import { useState } from "react";
import { createClient, supabaseConfigured } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!supabaseConfigured) {
      setError("Supabase belum dikonfigurasi. Isi .env.local terlebih dahulu.");
      return;
    }
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message === "Invalid login credentials"
        ? "Email atau password salah"
        : error.message);
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden"
      style={{ backgroundColor: "#0A1628" }}>

      {/* === BACKGROUND LAYERS === */}

      {/* Layer 1: airport photo — full visibility */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/baground.png')", backgroundSize: "cover", backgroundPosition: "center" }}
      />
      {/* Layer 1b: fallback gradient if image fails to load */}
      <div className="absolute inset-0" style={{
        background: "linear-gradient(160deg, #0D2B55 0%, #0A1628 40%, #1A0A2E 100%)",
        zIndex: -1,
      }} />

      {/* Layer 2: subtle dark tint so card text stays readable */}
      <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.35)" }} />

      {/* Layer 3: subtle blue-red brand accent */}
      <div className="absolute inset-0" style={{
        background: "linear-gradient(160deg, rgba(13,71,161,0.15) 0%, transparent 60%, rgba(183,28,28,0.12) 100%)"
      }} />

      {/* Side accent lights */}
      <div className="absolute left-0 top-1/4 w-48 h-48 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(21,101,192,0.18) 0%, transparent 70%)" }} />
      <div className="absolute right-0 bottom-1/4 w-64 h-64 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(229,57,53,0.15) 0%, transparent 70%)" }} />

      {/* === LOGIN CARD === */}
      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Glow ring behind card */}
        <div className="absolute -inset-1 rounded-3xl opacity-40 blur-xl pointer-events-none"
          style={{ background: "linear-gradient(135deg,#1565C0,#E53935)" }} />

        <div className="relative bg-white/10 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/20 overflow-hidden">

          {/* Top accent stripe */}
          <div className="h-1 w-full" style={{ background: "linear-gradient(90deg,#1565C0,#E53935)" }} />

          <div className="px-8 pt-7 pb-8">
            {/* Logo */}
            <div className="flex justify-center mb-5">
              <div className="relative">
                <div className="absolute -inset-2 rounded-2xl blur-md opacity-60"
                  style={{ background: "linear-gradient(135deg,#1565C0,#E53935)" }} />
                <img
                  src="/icons/icon-512.png"
                  alt="RIFIM Logo"
                  className="relative w-24 h-24 object-cover rounded-2xl shadow-2xl"
                />
              </div>
            </div>

            {/* Title */}
            <div className="text-center mb-7">
              <h1 className="font-black text-xl tracking-wide text-white drop-shadow-lg">
                RIFIM AIRPORT OPERATING SYSTEM
              </h1>
              <p className="font-bold text-xs tracking-widest mt-1" style={{ color: "#EF5350" }}>
                ONE PLATFORM. ALL AIRPORTS. FULL CONTROL.
              </p>
            </div>

            {/* Tab (Masuk only, register disabled) */}
            <div className="flex rounded-xl bg-white/5 border border-white/10 p-1 mb-6">
              <button className="flex-1 py-2 rounded-lg text-sm font-semibold bg-white/20 text-white shadow-sm">
                Masuk
              </button>
              <button disabled title="Pendaftaran akun dilakukan oleh Admin"
                className="flex-1 py-2 rounded-lg text-sm font-semibold text-white/25 cursor-not-allowed">
                Daftar Akun
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleLogin} className="space-y-4" autoComplete="off">
              <div>
                <label className="block text-xs font-semibold text-white/60 mb-1.5 uppercase tracking-wider">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@rifim.co.id"
                  required
                  autoComplete="new-email"
                  className="w-full px-4 py-3 rounded-xl border text-white placeholder-white/25 text-sm focus:outline-none focus:ring-2 focus:ring-[#1565C0] transition-all"
                  style={{ background: "rgba(255,255,255,0.07)", borderColor: "rgba(255,255,255,0.12)" }}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-white/60 mb-1.5 uppercase tracking-wider">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="new-password"
                  className="w-full px-4 py-3 rounded-xl border text-white placeholder-white/25 text-sm focus:outline-none focus:ring-2 focus:ring-[#1565C0] transition-all"
                  style={{ background: "rgba(255,255,255,0.07)", borderColor: "rgba(255,255,255,0.12)" }}
                />
              </div>

              {error && (
                <div className="px-4 py-3 rounded-xl text-sm font-medium text-red-300 border border-red-500/30"
                  style={{ background: "rgba(239,68,68,0.15)" }}>
                  {error}
                </div>
              )}

              <div className="flex justify-end">
                <a href="/forgot-password" className="text-xs font-medium hover:underline" style={{ color: "#60A5FA" }}>
                  Lupa Password?
                </a>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl font-black text-white text-sm tracking-wider transition-all active:scale-[0.98] disabled:opacity-60 shadow-lg mt-1"
                style={{ background: "linear-gradient(90deg,#1565C0,#E53935)" }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Masuk...
                  </span>
                ) : "MASUK"}
              </button>
            </form>

            {/* Footer */}
            <div className="mt-6 text-center border-t border-white/10 pt-5">
              <p className="text-[11px] text-white/35 font-medium">PT RIFIM INTERNATIONAL GEMILANG</p>
              <p className="text-[10px] text-white/20 mt-0.5">© 2025 - 2026. All Rights Reserved.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
