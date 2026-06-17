"use client";

import { useState } from "react";
import { createClient, supabaseConfigured } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Image from "next/image";

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
        <>
              <style>{`
                      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
                      
                              @keyframes float {
                                        0%, 100% { transform: translateY(0px); }
                                                  50% { transform: translateY(-10px); }
                                                          }
                                                          
                                                                  @keyframes fadeInUp {
                                                                            from { opacity: 0; transform: translateY(30px); }
                                                                                      to { opacity: 1; transform: translateY(0); }
                                                                                              }
                                                                                              
                                                                                                      .raos-wrapper {
                                                                                                                font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
                                                                                                                        }
                                                                                                                        
                                                                                                                                .raos-panel {
                                                                                                                                          animation: float 4s ease-in-out infinite;
                                                                                                                                                  }
                                                                                                                                                  
                                                                                                                                                          .raos-fadein {
                                                                                                                                                                    animation: fadeInUp 0.8s ease-out forwards;
                                                                                                                                                                            }
                                                                                                                                                                            
                                                                                                                                                                                    .raos-input:focus {
                                                                                                                                                                                              border-color: #FFD400 !important;
                                                                                                                                                                                                        box-shadow: 0 0 0 3px rgba(255, 212, 0, 0.25), 0 0 20px rgba(255, 212, 0, 0.4) !important;
                                                                                                                                                                                                                  outline: none;
                                                                                                                                                                                                                          }
                                                                                                                                                                                                                          
                                                                                                                                                                                                                                  .raos-input::placeholder {
                                                                                                                                                                                                                                            color: rgba(255, 255, 255, 0.35);
                                                                                                                                                                                                                                                    }
                                                                                                                                                                                                                                                    
                                                                                                                                                                                                                                                            .raos-input:-webkit-autofill,
                                                                                                                                                                                                                                                                    .raos-input:-webkit-autofill:hover,
                                                                                                                                                                                                                                                                            .raos-input:-webkit-autofill:focus {
                                                                                                                                                                                                                                                                                      -webkit-box-shadow: 0 0 0px 1000px rgba(10, 18, 45, 0.9) inset !important;
                                                                                                                                                                                                                                                                                                -webkit-text-fill-color: #ffffff !important;
                                                                                                                                                                                                                                                                                                          caret-color: #ffffff;
                                                                                                                                                                                                                                                                                                                    transition: background-color 5000s ease-in-out 0s;
                                                                                                                                                                                                                                                                                                                            }
                                                                                                                                                                                                                                                                                                                            
                                                                                                                                                                                                                                                                                                                                    .raos-btn-masuk:hover:not(:disabled) {
                                                                                                                                                                                                                                                                                                                                              transform: translateY(-2px);
                                                                                                                                                                                                                                                                                                                                                        box-shadow: 0 10px 30px rgba(255, 212, 0, 0.5) !important;
                                                                                                                                                                                                                                                                                                                                                                  background: #FFE033 !important;
                                                                                                                                                                                                                                                                                                                                                                          }
                                                                                                                                                                                                                                                                                                                                                                          
                                                                                                                                                                                                                                                                                                                                                                                  .raos-btn-masuk:active:not(:disabled) {
                                                                                                                                                                                                                                                                                                                                                                                            transform: translateY(0px);
                                                                                                                                                                                                                                                                                                                                                                                                    }
                                                                                                                                                                                                                                                                                                                                                                                                    
                                                                                                                                                                                                                                                                                                                                                                                                            .raos-forgot:hover {
                                                                                                                                                                                                                                                                                                                                                                                                                      color: #FFD400 !important;
                                                                                                                                                                                                                                                                                                                                                                                                                              }
                                                                                                                                                                                                                                                                                                                                                                                                                              
                                                                                                                                                                                                                                                                                                                                                                                                                                      .raos-panel-top-border::before {
                                                                                                                                                                                                                                                                                                                                                                                                                                                content: '';
                                                                                                                                                                                                                                                                                                                                                                                                                                                          position: absolute;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                    top: 0;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                              left: 20%;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        width: 60%;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  height: 2px;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            background: linear-gradient(90deg, transparent, #FFD400, transparent);
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      border-radius: 2px;
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              }
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    `}</style>style>
        
              <div
                        className="raos-wrapper"
                        style={{
                                    position: "fixed",
                                    inset: 0,
                                    width: "100vw",
                                    height: "100vh",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    overflow: "hidden",
                        }}
                      >
                {/* ===== BACKGROUND ===== */}
                      <div
                                  style={{
                                                position: "absolute",
                                                inset: 0,
                                                backgroundImage: "url('/bg-airport.jpg')",
                                                backgroundSize: "cover",
                                                backgroundPosition: "center 30%",
                                                backgroundRepeat: "no-repeat",
                                                zIndex: 0,
                                  }}
                                />
              
                {/* Yellow Maxim tint overlay */}
                      <div
                                  style={{
                                                position: "absolute",
                                                inset: 0,
                                                background:
                                                                "linear-gradient(135deg, rgba(255,212,0,0.55) 0%, rgba(180,120,0,0.50) 40%, rgba(80,40,0,0.65) 100%)",
                                                zIndex: 1,
                                  }}
                                />
              
                {/* Dark blur overlay */}
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
              
                {/* ===== HEADER BRANDING (top right) ===== */}
                      <div
                                  style={{
                                                position: "absolute",
                                                top: 30,
                                                right: 40,
                                                zIndex: 100,
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 10,
                                                background: "rgba(255,255,255,0.97)",
                                                borderRadius: 12,
                                                padding: "8px 20px 8px 12px",
                                                boxShadow: "0 4px 24px rgba(0,0,0,0.18)",
                                                height: 60,
                                  }}
                                >
                                <Image
                                              src="/icons/icon-512.png"
                                              alt="RIFIM"
                                              width={36}
                                              height={36}
                                              style={{ objectFit: "contain", borderRadius: "50%" }}
                                            />
                                <div
                                              style={{
                                                              width: 1,
                                                              height: 36,
                                                              background: "rgba(0,0,0,0.12)",
                                                              margin: "0 8px",
                                                              flexShrink: 0,
                                              }}
                                            />
                                <span
                                              style={{
                                                              fontSize: 28,
                                                              fontWeight: 900,
                                                              color: "#1a1a1a",
                                                              letterSpacing: "-1.5px",
                                                              lineHeight: 1,
                                                              fontFamily: "'Arial Black', Arial, sans-serif",
                                              }}
                                            >
                                            m<span style={{ color: "#e53935" }}>a</span>span>xim
                                </span>span>
                      </div>div>
              
                {/* ===== FLOATING GLASS LOGIN PANEL ===== */}
                      <div
                                  className="raos-panel raos-panel-top-border raos-fadein"
                                  style={{
                                                position: "relative",
                                                zIndex: 10,
                                                width: 420,
                                                background: "rgba(5, 10, 25, 0.62)",
                                                backdropFilter: "blur(18px)",
                                                WebkitBackdropFilter: "blur(18px)",
                                                border: "1px solid rgba(255,255,255,0.15)",
                                                borderRadius: 20,
                                                boxShadow:
                                                                "0 20px 60px rgba(0,0,0,0.40), 0 0 40px rgba(255,212,0,0.18)",
                                                padding: "44px 40px 40px",
                                                display: "flex",
                                                flexDirection: "column",
                                                alignItems: "center",
                                  }}
                                >
                        {/* ===== LOGO UTAMA ===== */}
                                <div style={{ marginBottom: 20 }}>
                                            <Image
                                                            src="/icons/icon-512.png"
                                                            alt="PT Menala Internasional Gemilang"
                                                            width={120}
                                                            height={120}
                                                            style={{
                                                                              objectFit: "contain",
                                                                              borderRadius: "50%",
                                                                              filter: "drop-shadow(0 0 20px rgba(255,212,0,0.55))",
                                                            }}
                                                          />
                                </div>div>
                      
                        {/* ===== JUDUL ===== */}
                                <h1
                                              style={{
                                                              fontSize: 24,
                                                              fontWeight: 800,
                                                              letterSpacing: 1,
                                                              textTransform: "uppercase",
                                                              color: "#ffffff",
                                                              textAlign: "center",
                                                              lineHeight: 1.25,
                                                              marginBottom: 8,
                                                              textShadow: "0 2px 12px rgba(0,0,0,0.6)",
                                              }}
                                            >
                                            RIFIM AIRPORT<br />OPERATING SYSTEM
                                </h1>h1>
                      
                                <p
                                              style={{
                                                              color: "#FFD400",
                                                              fontSize: 10,
                                                              fontWeight: 600,
                                                              letterSpacing: 2.5,
                                                              textTransform: "uppercase",
                                                              textAlign: "center",
                                                              marginBottom: 32,
                                                              whiteSpace: "nowrap",
                                                              textShadow: "0 1px 4px rgba(0,0,0,0.5)",
                                              }}
                                            >
                                            ONE PLATFORM. ALL AIRPORTS. FULL CONTROL.
                                </p>p>
                      
                        {/* ===== ERROR MESSAGE ===== */}
                        {error && (
                                              <div
                                                              style={{
                                                                                width: "100%",
                                                                                background: "rgba(220,38,38,0.15)",
                                                                                border: "1px solid rgba(220,38,38,0.4)",
                                                                                borderRadius: 10,
                                                                                color: "#fca5a5",
                                                                                fontSize: 13,
                                                                                padding: "10px 14px",
                                                                                marginBottom: 16,
                                                                                textAlign: "center",
                                                              }}
                                                            >
                                                {error}
                                              </div>div>
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
                                                                                                fontSize: 10,
                                                                                                fontWeight: 700,
                                                                                                letterSpacing: 2,
                                                                                                color: "rgba(255,255,255,0.65)",
                                                                                                textTransform: "uppercase",
                                                                                                marginBottom: 8,
                                                                            }}
                                                                          >
                                                                          Email
                                                          </label>label>
                                                          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                                                                          <span
                                                                                              style={{
                                                                                                                    position: "absolute",
                                                                                                                    left: 16,
                                                                                                                    color: "rgba(255,255,255,0.4)",
                                                                                                                    fontSize: 16,
                                                                                                                    pointerEvents: "none",
                                                                                                                    zIndex: 1,
                                                                                                }}
                                                                                            >
                                                                                            ✉
                                                                          </span>span>
                                                                          <input
                                                                                              id="raos-email"
                                                                                              className="raos-input"
                                                                                              type="email"
                                                                                              value={email}
                                                                                              onChange={(e) => setEmail(e.target.value)}
                                                                                              placeholder="Masukkan email Anda"
                                                                                              required
                                                                                              autoComplete="email"
                                                                                              style={{
                                                                                                                    width: "100%",
                                                                                                                    height: 55,
                                                                                                                    borderRadius: 14,
                                                                                                                    background: "rgba(10,18,45,0.75)",
                                                                                                                    border: "1px solid rgba(255,255,255,0.15)",
                                                                                                                    color: "#ffffff",
                                                                                                                    fontSize: 14,
                                                                                                                    padding: "0 16px 0 44px",
                                                                                                                    outline: "none",
                                                                                                                    transition: "all 0.3s ease",
                                                                                                                    fontFamily: "inherit",
                                                                                                }}
                                                                                            />
                                                          </div>div>
                                            </div>div>
                                
                                  {/* PASSWORD */}
                                            <div style={{ marginBottom: 8 }}>
                                                          <label
                                                                            htmlFor="raos-password"
                                                                            style={{
                                                                                                display: "block",
                                                                                                fontSize: 10,
                                                                                                fontWeight: 700,
                                                                                                letterSpacing: 2,
                                                                                                color: "rgba(255,255,255,0.65)",
                                                                                                textTransform: "uppercase",
                                                                                                marginBottom: 8,
                                                                            }}
                                                                          >
                                                                          Password
                                                          </label>label>
                                                          <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                                                                          <span
                                                                                              style={{
                                                                                                                    position: "absolute",
                                                                                                                    left: 16,
                                                                                                                    color: "rgba(255,255,255,0.4)",
                                                                                                                    fontSize: 15,
                                                                                                                    pointerEvents: "none",
                                                                                                                    zIndex: 1,
                                                                                                }}
                                                                                            >
                                                                                            🔒
                                                                          </span>span>
                                                                          <input
                                                                                              id="raos-password"
                                                                                              className="raos-input"
                                                                                              type={showPassword ? "text" : "password"}
                                                                                              value={password}
                                                                                              onChange={(e) => setPassword(e.target.value)}
                                                                                              placeholder="Masukkan password Anda"
                                                                                              required
                                                                                              autoComplete="current-password"
                                                                                              style={{
                                                                                                                    width: "100%",
                                                                                                                    height: 55,
                                                                                                                    borderRadius: 14,
                                                                                                                    background: "rgba(10,18,45,0.75)",
                                                                                                                    border: "1px solid rgba(255,255,255,0.15)",
                                                                                                                    color: "#ffffff",
                                                                                                                    fontSize: 14,
                                                                                                                    padding: "0 48px 0 44px",
                                                                                                                    outline: "none",
                                                                                                                    transition: "all 0.3s ease",
                                                                                                                    fontFamily: "inherit",
                                                                                                }}
                                                                                            />
                                                                          <button
                                                                                              type="button"
                                                                                              onClick={() => setShowPassword(!showPassword)}
                                                                                              style={{
                                                                                                                    position: "absolute",
                                                                                                                    right: 14,
                                                                                                                    background: "none",
                                                                                                                    border: "none",
                                                                                                                    color: "rgba(255,255,255,0.45)",
                                                                                                                    cursor: "pointer",
                                                                                                                    fontSize: 16,
                                                                                                                    padding: 4,
                                                                                                                    zIndex: 1,
                                                                                                                    lineHeight: 1,
                                                                                                }}
                                                                                              title={showPassword ? "Sembunyikan" : "Tampilkan"}
                                                                                            >
                                                                            {showPassword ? "🙈" : "👁"}
                                                                          </button>button>
                                                          </div>div>
                                            </div>div>
                                
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
                                                          </a>a>
                                            </div>div>
                                
                                  {/* TOMBOL MASUK */}
                                            <button
                                                            type="submit"
                                                            disabled={loading}
                                                            className="raos-btn-masuk"
                                                            style={{
                                                                              width: "100%",
                                                                              height: 55,
                                                                              borderRadius: 14,
                                                                              background: loading ? "rgba(255,212,0,0.6)" : "#FFD400",
                                                                              color: "#000000",
                                                                              fontSize: 14,
                                                                              fontWeight: 700,
                                                                              letterSpacing: 3,
                                                                              textTransform: "uppercase",
                                                                              border: "none",
                                                                              cursor: loading ? "not-allowed" : "pointer",
                                                                              transition: "all 0.3s ease",
                                                                              boxShadow: "0 6px 20px rgba(255,212,0,0.30)",
                                                                              fontFamily: "inherit",
                                                                              display: "flex",
                                                                              alignItems: "center",
                                                                              justifyContent: "center",
                                                                              gap: 8,
                                                            }}
                                                          >
                                              {loading ? (
                                                                            <>
                                                                                              <svg
                                                                                                                    width="18"
                                                                                                                    height="18"
                                                                                                                    viewBox="0 0 24 24"
                                                                                                                    fill="none"
                                                                                                                    stroke="currentColor"
                                                                                                                    strokeWidth="2.5"
                                                                                                                    style={{ animation: "spin 1s linear infinite" }}
                                                                                                                  >
                                                                                                                  <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                                                                                                                  <path d="M12 2a10 10 0 0 1 10 10" />
                                                                                                </svg>svg>
                                                                                              MEMPROSES...
                                                                            </>>
                                                                          ) : (
                                                                            "MASUK"
                                                                          )}
                                            </button>button>
                                </form>form>
                      </div>div>
              
                {/* ===== FOOTER ===== */}
                      <div
                                  style={{
                                                position: "absolute",
                                                bottom: 24,
                                                left: "50%",
                                                transform: "translateX(-50%)",
                                                zIndex: 100,
                                                textAlign: "center",
                                                color: "rgba(255,255,255,0.8)",
                                                fontSize: 13,
                                                lineHeight: 1.6,
                                                whiteSpace: "nowrap",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 10,
                                  }}
                                >
                                <Image
                                              src="/icons/icon-512.png"
                                              alt="Logo"
                                              width={32}
                                              height={32}
                                              style={{
                                                              objectFit: "contain",
                                                              borderRadius: "50%",
                                                              filter: "drop-shadow(0 0 6px rgba(255,212,0,0.6))",
                                                              opacity: 0.9,
                                              }}
                                            />
                                <div>
                                            <div style={{ fontWeight: 600, fontSize: 13 }}>
                                                          PT. MENALA INTERNASIONAL GEMILANG
                                            </div>div>
                                            <div style={{ fontSize: 12, opacity: 0.7 }}>
                                                          © 2026 All Rights Reserved
                                            </div>div>
                                </div>div>
                      </div>div>
              
                {/* Spin keyframe for loading */}
                      <style>{`
                                @keyframes spin {
                                            from { transform: rotate(0deg); }
                                                        to { transform: rotate(360deg); }
                                                                  }
                                                                          `}</style>style>
              </div>div>
        </>>
      );
}</></>
