// src/lib/logger.ts

type LogLevel = "INFO" | "WARNING" | "CRITICAL";

interface LogPayload {
  airportCode?: string;
  userId?: string;
  action: string;
  details: string;
  meta?: Record<string, any>;
}

export async function logSystemEvent(level: LogLevel, payload: LogPayload) {
  const timestamp = new Date().toISOString();
  
  // 1. Format standar untuk Vercel Logs / CloudWatch Tracking
  console.log(`[${timestamp}] [${level}] [${payload.action}]: ${payload.details} | Airport: ${payload.airportCode || "GLOBAL"}`);

  // 2. Pemancar log darurat otomatis jika mendeteksi anomali berstatus CRITICAL
  if (level === "CRITICAL") {
    try {
      // Mengirim notifikasi peringatan instan ke Webhook IT Support Team PT Rifim Gemilang
      await fetch(process.env.MONITORING_WEBHOOK_URL || "", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: `🚨 *CRITICAL SYSTEM ANOMALY DETECTED* 🚨\n*Event:* ${payload.action}\n*Detail:* ${payload.details}\n*Time:* ${timestamp}`
        })
      });
    } catch (err) {
      console.error("Gagal mengirimkan log telemetri kritis ke sistem eksternal:", err);
    }
  }
}
