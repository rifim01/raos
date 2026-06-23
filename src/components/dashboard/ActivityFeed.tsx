"use client";

import { formatDateTime } from "@/lib/utils";

interface Activity {
  id: string;
  action: string;
  entity: string;
  user?: string;
  airport?: string;
  created_at: string;
}

const ACTION_STYLES: Record<string, { bg: string; color: string }> = {
  LOGIN:   { bg: "rgba(59,130,246,0.15)",  color: "#3B82F6" },
  ABSEN:   { bg: "rgba(34,197,94,0.15)",   color: "#22C55E" },
  ANTRIAN: { bg: "rgba(255,211,0,0.15)",   color: "#FFD300" },
  PAYROLL: { bg: "rgba(167,139,250,0.15)", color: "#A78BFA" },
  KASBON:  { bg: "rgba(245,158,11,0.15)",  color: "#F59E0B" },
  DEFAULT: { bg: "rgba(75,85,99,0.15)",    color: "#6B7280" },
};

const DEMO_ACTIVITIES: Activity[] = [
  { id: "1", action: "ABSEN",   entity: "Check-in",    user: "Ahmad Fauzi",     airport: "BTH001", created_at: new Date(Date.now() - 2 * 60000).toISOString() },
  { id: "2", action: "ANTRIAN", entity: "Antrian #42", user: "Budi Santoso",    airport: "UPG001", created_at: new Date(Date.now() - 5 * 60000).toISOString() },
  { id: "3", action: "PAYROLL", entity: "Slip Gaji",   user: "System",          airport: "PKU001", created_at: new Date(Date.now() - 12 * 60000).toISOString() },
  { id: "4", action: "KASBON",  entity: "Kasbon Baru", user: "Rina Sari",       airport: "BPN001", created_at: new Date(Date.now() - 18 * 60000).toISOString() },
  { id: "5", action: "ABSEN",   entity: "Check-out",   user: "Dedi Kurniawan",  airport: "MDC001", created_at: new Date(Date.now() - 30 * 60000).toISOString() },
  { id: "6", action: "LOGIN",   entity: "Login",       user: "Koordinator",     airport: "DJB001", created_at: new Date(Date.now() - 45 * 60000).toISOString() },
];

interface ActivityFeedProps {
  activities?: Activity[];
}

export default function ActivityFeed({ activities = DEMO_ACTIVITIES }: ActivityFeedProps) {
  return (
    <div className="rounded-xl flex flex-col h-full overflow-hidden"
      style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
      <div className="px-4 py-3 border-b flex items-center justify-between flex-shrink-0" style={{ borderColor: "var(--border)" }}>
        <div>
          <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Aktivitas Real-time</h3>
          <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>Update terbaru seluruh bandara</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <span className="text-[10px] font-black text-green-400">LIVE</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto divide-y" style={{ borderColor: "var(--border)" }}>
        {activities.map((activity) => {
          const style = ACTION_STYLES[activity.action] ?? ACTION_STYLES.DEFAULT;
          return (
            <div key={activity.id} className="px-4 py-2.5 hover:bg-white/3 transition-colors">
              <div className="flex items-start gap-2.5">
                <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md flex-shrink-0 mt-0.5"
                  style={{ background: style.bg, color: style.color }}>
                  {activity.action}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>{activity.entity}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>
                    {activity.user} · {activity.airport}
                  </p>
                  <p className="text-[9px] mt-0.5" style={{ color: "var(--text-muted)" }}>{formatDateTime(activity.created_at)}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="px-4 py-3 border-t flex-shrink-0" style={{ borderColor: "var(--border)" }}>
        <button className="text-xs font-semibold hover:underline" style={{ color: "var(--accent)" }}>
          Lihat semua aktivitas →
        </button>
      </div>
    </div>
  );
}
