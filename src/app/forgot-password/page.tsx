"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSent(true);
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#0D47A1]/90 via-[#1565C0]/80 to-[#E53935]/70" />
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-white/5 -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-white/5 translate-y-1/2 -translate-x-1/2" />

      <div className="relative z-10 w-full max-w-md mx-4 animate-slide-up">
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/20">
          <div className="text-center mb-6">
            <div className="w-14 h-14 bg-[#1565C0]/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg viewBox="0 0 24 24" fill="none" stroke="#1565C0" strokeWidth="2" className="w-7 h-7">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
            </div>
            <h1 className="text-xl font-black text-[#1565C0]">Lupa Password</h1>
            <p className="text-sm text-gray-500 mt-1">
              Masukkan email akun RIFIM kamu
            </p>
          </div>

          {sent ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 rounded-xl border border-green-200 text-center">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2.5" className="w-5 h-5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <p className="text-green-700 font-bold text-sm">Email terkirim!</p>
                <p className="text-green-600 text-xs mt-1">
                  Cek inbox <span className="font-semibold">{email}</span> dan klik link reset password.
                </p>
              </div>
              <p className="text-xs text-gray-400 text-center">
                Tidak menerima email? Cek folder spam atau{" "}
                <button
                  onClick={() => { setSent(false); setEmail(""); }}
                  className="text-[#1565C0] font-semibold hover:underline"
                >
                  coba lagi
                </button>
              </p>
              <Link
                href="/login"
                className="block text-center text-sm text-[#1565C0] font-semibold hover:underline"
              >
                ← Kembali ke Login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@rifim.co.id"
                  required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#1565C0] focus:border-transparent text-gray-800 placeholder-gray-400 transition-all"
                />
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl font-bold text-white gradient-rifim hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60 shadow-lg"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Mengirim...
                  </span>
                ) : "KIRIM LINK RESET"}
              </button>

              <div className="text-center">
                <Link href="/login" className="text-sm text-gray-500 hover:text-[#1565C0] transition-colors">
                  ← Kembali ke Login
                </Link>
              </div>
            </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-400">PT RIFIM INTERNATIONAL GEMILANG</p>
          </div>
        </div>
      </div>
    </div>
  );
}
