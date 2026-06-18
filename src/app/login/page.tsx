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
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <>
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .float-animation {
          animation: float 4s ease-in-out infinite;
        }
        .login-input {
          width: 100%;
          height: 55px;
          background: rgba(255,255,255,0.08);
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 14px;
          color: white;
          padding: 0 16px 0 48px;
          font-size: 15px;
          outline: none;
          transition: all 0.3s ease;
          box-sizing: border-box;
        }
        .login-input::placeholder { color: rgba(255,255,255,0.45); }
        .login-input:focus {
          border-color: #FFD400;
          box-shadow: 0 0 20px rgba(255,212,0,0.3);
          background: rgba(255,255,255,0.12);
        }
        .login-btn {
          width: 100%;
          height: 55px;
          background: #FFD400;
          color: #000;
          font-weight: 700;
          font-size: 16px;
          letter-spacing: 2px;
          border: none;
          border-radius: 14px;
          cursor: pointer;
          transition: all 0.3s ease;
          margin-top: 8px;
        }
        .login-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(255,212,0,0.4);
          background: #ffe033;
        }
        .login-btn:disabled { opacity: 0.7; cursor: not-allowed; }
        .input-wrapper { position: relative; margin-bottom: 20px; }
        .input-icon {
          position: absolute;
          left: 16px;
          top: 50%;
          transform: translateY(-50%);
          color: rgba(255,255,255,0.5);
          pointer-events: none;
          font-size: 18px;
        }
        .eye-btn {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: rgba(255,255,255,0.5);
          cursor: pointer;
          font-size: 18px;
          padding: 0;
        }
        .field-label {
          display: block;
          color: rgba(255,255,255,0.85);
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          margin-bottom: 8px;
        }
        .error-msg {
          background: rgba(255,80,80,0.15);
          border: 1px solid rgba(255,80,80,0.3);
          border-radius: 10px;
          color: #ff8080;
          font-size: 13px;
          padding: 10px 14px;
          margin-bottom: 16px;
          text-align: center;
        }
      `}</style>

      {/* Full Screen Container */}
      <div style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
      }}>

        {/* Background Image */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/bg-airport-maxim.jpg"
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            zIndex: 0,
          }}
        />

        {/* Dark Overlay */}
        <div style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.35)",
          backdropFilter: "blur(2px)",
          zIndex: 1,
        }} />

        {/* Header Branding - Top Right */}
        <div style={{
          position: "absolute",
          top: "30px",
          right: "40px",
          height: "60px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
          zIndex: 10,
          background: "rgba(255,255,255,0.92)",
          borderRadius: "12px",
          padding: "8px 16px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-menala.png" alt="Menala" style={{ height: "42px", width: "42px", objectFit: "contain" }} />
          <div style={{ width: "1px", height: "36px", background: "#ccc" }} />
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
            <span style={{ fontSize: "22px", fontWeight: 900, color: "#111", letterSpacing: "-0.5px", fontFamily: "Georgia, serif" }}>m<span style={{ color: "#e00" }}>a</span>xim</span>
            <span style={{ fontSize: "9px", color: "#555", letterSpacing: "1px", textTransform: "uppercase" }}>Transportasi Online</span>
          </div>
        </div>

        {/* Main Content */}
        <div style={{
          position: "relative",
          zIndex: 5,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: "100%",
          maxWidth: "500px",
          padding: "0 20px",
        }}>

          {/* Logo - Floating */}
          <div className="float-animation" style={{ marginBottom: "20px" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo-menala.png"
              alt="PT Menala Internasional Gemilang"
              style={{
                width: "120px",
                height: "120px",
                objectFit: "contain",
                filter: "drop-shadow(0 0 20px rgba(255,212,0,0.5))",
              }}
            />
          </div>

          {/* Title */}
          <h1 style={{
            fontSize: "36px",
            fontWeight: 800,
            letterSpacing: "1px",
            textTransform: "uppercase",
            color: "white",
            textAlign: "center",
            margin: "0 0 8px 0",
            textShadow: "0 2px 10px rgba(0,0,0,0.5)",
            lineHeight: 1.15,
          }}>
            RIFIM AIRPORT<br />OPERATING SYSTEM
          </h1>

          {/* Subtitle */}
          <p style={{
            color: "#FFD400",
            fontSize: "16px",
            fontWeight: 600,
            letterSpacing: "2px",
            textTransform: "uppercase",
            margin: "0 0 32px 0",
            textAlign: "center",
            whiteSpace: "nowrap",
          }}>
            ONE PLATFORM. ALL AIRPORTS. FULL CONTROL.
          </p>

          {/* Glass Login Panel */}
          <div style={{
            width: "420px",
            maxWidth: "100%",
            background: "rgba(255,255,255,0.10)",
            backdropFilter: "blur(18px)",
            WebkitBackdropFilter: "blur(18px)",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: "20px",
            boxShadow: "0 20px 60px rgba(0,0,0,0.35), 0 0 40px rgba(255,212,0,0.20)",
            padding: "36px",
          }}>

            <form onSubmit={handleLogin}>
              {/* Error Message */}
              {error && <div className="error-msg">{error}</div>}

              {/* Email Field */}
              <div>
                <label className="field-label">Email</label>
                <div className="input-wrapper">
                  <span className="input-icon">✉</span>
                  <input
                    className="login-input"
                    type="email"
                    placeholder="Masukkan email Anda"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label className="field-label">Password</label>
                <div className="input-wrapper">
                  <span className="input-icon">🔒</span>
                  <input
                    className="login-input"
                    type={showPassword ? "text" : "password"}
                    placeholder="Masukkan password Anda"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="eye-btn"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? "🙈" : "👁"}
                  </button>
                </div>
              </div>

              {/* Login Button */}
              <button type="submit" className="login-btn" disabled={loading}>
                {loading ? "MEMPROSES..." : "MASUK"}
              </button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          position: "absolute",
          bottom: "20px",
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          gap: "10px",
          color: "rgba(255,255,255,0.8)",
          fontSize: "13px",
          textAlign: "center",
          whiteSpace: "nowrap",
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-menala.png" alt="" style={{ height: "28px", width: "28px", objectFit: "contain", filter: "brightness(0.9)" }} />
          <div>
            <div style={{ fontWeight: 600, fontSize: "13px", letterSpacing: "1px" }}>PT. MENALA INTERNASIONAL GEMILANG</div>
            <div style={{ fontSize: "12px", opacity: 0.75 }}>© 2026 All Rights Reserved</div>
          </div>
        </div>

      </div>
    </>
  );
}
