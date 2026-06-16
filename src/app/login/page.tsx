"use client";

import { useState } from "react";
import { createClient, supabaseConfigured } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
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

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!supabaseConfigured) {
      setError("Supabase belum dikonfigurasi.");
      return;
    }
    setLoading(true);
    setError("");
    setSuccess("");
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role: "SUPER_ADMIN" } },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSuccess("Akun berhasil dibuat! Silakan login.");
      setMode("login");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden">
      {/* Background airport image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/bg-airport.jpg')" }}
      />
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#0D47A1]/90 via-[#1565C0]/80 to-[#E53935]/70" />

      {/* Decorative circles */}
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-white/5 translate-y-1/2 -translate-x-1/2" />

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md mx-4 animate-slide-up">
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/20">
          {/* Logo & Title */}
          <div className="text-center mb-6">
            <div className="flex justify-center mb-4">
              <img
                src="/icons/icon-512.png"
                alt="RIFIM Logo"
                className="w-32 h-32 object-cover rounded-2xl shadow-lg"
              />
            </div>
            <h1 className="text-[#1565C0] font-black text-xl tracking-wide">
              RIFIM AIRPORT OPERATING SYSTEM
            </h1>
            <div className="mt-1 space-y-0.5">
              <p className="text-[#E53935] font-bold text-xs tracking-widest">ONE PLATFORM. ALL AIRPORTS. FULL CONTROL.</p>
            </div>
          </div>

          {/* Mode Toggle */}
          <div className="flex rounded-xl bg-gray-100 p-1 mb-6">
            <button
              onClick={() => { setMode("login"); setError(""); setSuccess(""); }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                mode === "login" ? "bg-white text-[#1565C0] shadow-sm" : "text-gray-500"
              }`}
            >
              Masuk
            </button>
            <button
              onClick={() => { setMode("register"); setError(""); setSuccess(""); }}
              className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                mode === "register" ? "bg-white text-[#1565C0] shadow-sm" : "text-gray-500"
              }`}
            >
              Daftar Akun
            </button>
          </div>

          {/* Form */}
          <form onSubmit={mode === "login" ? handleLogin : handleRegister} className="space-y-4" autoComplete="off">
            {mode === "register" && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nama Lengkap</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Super Admin RIFIM"
                  required
                  autoComplete="off"
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#1565C0] focus:border-transparent text-gray-800 placeholder-gray-400 transition-all"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@rifim.co.id"
                required
                autoComplete="new-email"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#1565C0] focus:border-transparent text-gray-800 placeholder-gray-400 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="new-password"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#1565C0] focus:border-transparent text-gray-800 placeholder-gray-400 transition-all"
              />
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
                {error}
              </div>
            )}
            {success && (
              <div className="p-3 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm font-medium">
                {success}
              </div>
            )}

            {mode === "login" && (
              <div className="flex justify-end -mt-1">
                <a href="/forgot-password" className="text-xs text-[#1565C0] hover:underline font-medium">
                  Lupa Password?
                </a>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-bold text-white gradient-rifim hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 shadow-lg mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {mode === "login" ? "Masuk..." : "Mendaftar..."}
                </span>
              ) : mode === "login" ? "MASUK" : "DAFTAR SEKARANG"}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-400">PT RIFIM INTERNATIONAL GEMILANG</p>
            <p className="text-xs text-gray-300 mt-0.5">© 2025 - 2026. All Rights Reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
