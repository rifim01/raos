"use client";

import { useState } from "react";
import { createClient, supabaseConfigured } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
      setError(
        error.message === "Invalid login credentials"
          ? "Email atau password salah"
          : error.message
      );
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        width: "100vw",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
      }}
    >
      {/* ===== KEYFRAMES ===== */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0px); }
        }
        .raos-panel {
          animation: float 4s ease-in-out infinite;
        }
        .raos-fadein {
          animation: fadeUp 0.8s ease-out forwards;
        }
        .raos-input {
          width: 100%;
          height: 55px;
          border-radius: 14px;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.15);
          color: #ffffff;
          font-size: 15px;
          padding: 0 16px 0 48px;
          outline: none;
          transition: border-color 0.3s, box-shadow 0.3s;
          font-family: inherit;
          box-sizing: border-box;
        }
        .raos-input:focus {
          border-color: #FFD400;
          box-shadow: 0 0 20px rgba(255,212,0,0.5);
        }
        .raos-input::placeholder {
          color: rgba(255,255,255,0.35);
        }
        .raos-input:-webkit-autofill,
        .raos-input:-webkit-autofill:focus {
          -webkit-box-shadow: 0 0 0px 1000px rgba(10,18,50,0.92) inset !important;
          -webkit-text-fill-color: #fff !important;
        }
        .raos-btn-masuk {
          width: 100%;
          height: 55px;
          border-radius: 14px;
          background: #FFD400;
          color: #000000;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 3px;
          text-transform: uppercase;
          border: none;
          cursor: pointer;
          transition: transform 0.25s ease, box-shadow 0.25s ease, background 0.2s;
          box-shadow: 0 6px 24px rgba(255,212,0,0.30);
          font-family: inherit;
        }
        .raos-btn-masuk:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(255,212,0,0.4);
          background: #ffe033;
        }
        .raos-btn-masuk:active:not(:disabled) { transform: translateY(0); }
        .raos-btn-masuk:disabled { opacity: 0.65; cursor: not-allowed; }
        .raos-forgot:hover { color: #FFD400 !important; }
        .raos-logo-img {
          width: 120px;
          height: 120px;
          object-fit: contain;
          border-radius: 50%;
          filter: drop-shadow(0 0 20px rgba(255,212,0,0.5));
          display: block;
        }
        .raos-header-logo {
          width: 38px;
          height: 38px;
          object-fit: contain;
          border-radius: 50%;
          display: block;
        }
        .raos-footer-logo {
          width: 34px;
          height: 34px;
          object-fit: contain;
          border-radius: 50%;
          filter: drop-shadow(0 0 8px rgba(255,212,0,0.7));
          opacity: 0.92;
          display: block;
          flex-shrink: 0;
        }
      `}</style>

      {/* ===== BACKGROUND FULLSCREEN ===== */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "url('/bg-airport-maxim.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center center",
          backgroundRepeat: "no-repeat",
          zIndex: 0,
        }}
      />

      {/* Golden Yellow Tint Overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(135deg, rgba(255,212,0,0.40) 0%, rgba(180,110,0,0.35) 45%, rgba(60,30,0,0.55) 100%)",
          zIndex: 1,
        }}
      />

      {/* Dark + Blur Overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.35)",
          backdropFilter: "blur(2px)",
          WebkitBackdropFilter: "blur(2px)",
          zIndex: 2,
        }}
      />

      {/* ===== HEADER BRANDING (top-right) ===== */}
      <div
        style={{
          position: "absolute",
          top: 30,
          right: 40,
          zIndex: 200,
          display: "flex",
          alignItems: "center",
          gap: 12,
          background: "rgba(255,255,255,0.97)",
          borderRadius: 14,
          padding: "0 22px 0 14px",
          boxShadow: "0 4px 28px rgba(0,0,0,0.20)",
          height: 60,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-menala.png"
          alt="PT Menala"
          className="raos-header-logo"
        />
        <div
          style={{
            width: 1,
            height: 38,
            background: "rgba(0,0,0,0.12)",
            margin: "0 6px",
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontSize: 30,
            fontWeight: 900,
            color: "#1a1a1a",
            letterSpacing: "-1.5px",
            lineHeight: 1,
            fontFamily: "'Arial Black', 'Helvetica Neue', Arial, sans-serif",
          }}
        >
          m<span style={{ color: "#e53935" }}>a</span>xim
        </span>
      </div>

      {/* ===== FLOATING GLASS PANEL ===== */}
      <div
        className="raos-panel raos-fadein"
        style={{
          position: "relative",
          zIndex: 10,
          width: 420,
          background: "rgba(255,255,255,0.10)",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          border: "1px solid rgba(255,255,255,0.15)",
          borderRadius: 20,
          boxShadow: "0 20px 60px rgba(0,0,0,0.35), 0 0 40px rgba(255,212,0,0.20)",
          padding: "44px 40px 40px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* Golden top accent line */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: "20%",
            width: "60%",
            height: 2,
            background: "linear-gradient(90deg, transparent, #FFD400, transparent)",
            borderRadius: 2,
          }}
        />

        {/* ===== LOGO UTAMA ===== */}
        <div style={{ marginBottom: 20 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-menala.png"
            alt="PT Menala Internasional Gemilang"
            className="raos-logo-img"
          />
        </div>

        {/* ===== JUDUL ===== */}
        <h1
          style={{
            fontSize: 28,
            fontWeight: 800,
            letterSpacing: 1,
            textTransform: "uppercase",
            color: "#ffffff",
            textAlign: "center",
            lineHeight: 1.2,
            marginBottom: 10,
            textShadow: "0 2px 16px rgba(0,0,0,0.7)",
          }}
        >
          RIFIM AIRPORT<br />OPERATING SYSTEM
        </h1>

        <p
          style={{
            color: "#FFD400",
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: 2.5,
            textTransform: "uppercase",
            textAlign: "center",
            marginBottom: 32,
            textShadow: "0 1px 6px rgba(0,0,0,0.5)",
            whiteSpace: "nowrap",
          }}
        >
          ONE PLATFORM. ALL AIRPORTS. FULL CONTROL.
        </p>

        {/* ===== ERROR MESSAGE ===== */}
        {error && (
          <div
            style={{
              width: "100%",
              background: "rgba(220,38,38,0.15)",
              border: "1px solid rgba(220,38,38,0.4)",
              borderRadius: 12,
              color: "#fca5a5",
              fontSize: 13,
              padding: "11px 16px",
              marginBottom: 16,
              textAlign: "center",
            }}
          >
            {error}
          </div>
        )}

        {/* ===== FORM LOGIN ===== */}
        <form
          onSubmit={handleLogin}
          style={{ width: "100%", display: "flex", flexDirection: "column" }}
          autoComplete="off"
        >
          {/* EMAIL */}
          <div style={{ marginBottom: 16 }}>
            <label
              htmlFor="raos-email"
              style={{
                display: "block",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 2,
                color: "rgba(255,255,255,0.65)",
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              Email
            </label>
            <div style={{ position: "relative" }}>
              <span
                style={{
                  position: "absolute",
                  left: 16,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "rgba(255,255,255,0.45)",
                  fontSize: 17,
                  pointerEvents: "none",
                  zIndex: 1,
                }}
              >
                ✉
              </span>
              <input
                id="raos-email"
                className="raos-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Masukkan email Anda"
                required
                autoComplete="email"
              />
            </div>
          </div>

          {/* PASSWORD */}
          <div style={{ marginBottom: 10 }}>
            <label
              htmlFor="raos-password"
              style={{
                display: "block",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 2,
                color: "rgba(255,255,255,0.65)",
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              Password
            </label>
            <div style={{ position: "relative" }}>
              <span
                style={{
                  position: "absolute",
                  left: 16,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "rgba(255,255,255,0.45)",
                  fontSize: 15,
                  pointerEvents: "none",
                  zIndex: 1,
                }}
              >
                🔒
              </span>
              <input
                id="raos-password"
                className="raos-input"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan password Anda"
                required
                autoComplete="current-password"
                style={{ paddingRight: 48 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: 14,
                  top: "50%",
                  transform: "translateY(-50%)",
                  background: "none",
                  border: "none",
                  color: "rgba(255,255,255,0.45)",
                  cursor: "pointer",
                  fontSize: 17,
                  padding: 4,
                  zIndex: 1,
                  lineHeight: 1,
                }}
                title={showPassword ? "Sembunyikan password" : "Tampilkan password"}
              >
                {showPassword ? "🙈" : "👁"}
              </button>
            </div>
          </div>

          {/* LUPA PASSWORD */}
          <div style={{ textAlign: "right", marginBottom: 24 }}>
            <a
              href="/forgot-password"
              className="raos-forgot"
              style={{
                color: "rgba(255,255,255,0.5)",
                fontSize: 12,
                textDecoration: "none",
                transition: "color 0.2s",
              }}
            >
              Lupa Password?
            </a>
          </div>

          {/* TOMBOL MASUK */}
          <button
            type="submit"
            disabled={loading}
            className="raos-btn-masuk"
          >
            {loading ? "MEMPROSES..." : "MASUK"}
          </button>
        </form>
      </div>

      {/* ===== FOOTER ===== */}
      <div
        style={{
          position: "absolute",
          bottom: 20,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 200,
          display: "flex",
          alignItems: "center",
          gap: 12,
          whiteSpace: "nowrap",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-menala.png"
          alt="Logo"
          className="raos-footer-logo"
        />
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              color: "rgba(255,255,255,0.85)",
              fontSize: 14,
              fontWeight: 600,
              letterSpacing: 0.5,
            }}
          >
            PT. MENALA INTERNASIONAL GEMILANG
          </div>
          <div
            style={{
              color: "rgba(255,255,255,0.60)",
              fontSize: 12,
            }}
          >
            © 2026 All Rights Reserved
          </div>
        </div>
      </div>
    </div>
  );
}
