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

const ACTION_COLORS: Record<string, string> = {
  LOGIN: "bg-blue-100 text-blue-700",
  ABSEN: "bg-green-100 text-green-700",
  ANTRIAN: "bg-yellow-100 text-yellow-700",
  PAYROLL: "bg-purple-100 text-purple-700",
  KASBON: "bg-orange-100 text-orange-700",
  DEFAULT: "bg-gray-100 text-gray-700",
};

const DEMO_ACTIVITIES: Activity[] = [
  { id: "1", action: "ABSEN", entity: "Check-in", user: "Ahmad Fauzi", airport: "BTH001", created_at: new Date(Date.now() - 2 * 60000).toISOString() },
  { id: "2", action: "ANTRIAN", entity: "Antrian #42", user: "Budi Santoso", airport: "UPG001", created_at: new Date(Date.now() - 5 * 60000).toISOString() },
  { id: "3", action: "PAYROLL", entity: "Slip Gaji", user: "System", airport: "PKU001", created_at: new Date(Date.now() - 12 * 60000).toISOString() },
  { id: "4", action: "KASBON", entity: "Kasbon Baru", user: "Rina Sari", airport: "BPN001", created_at: new Date(Date.now() - 18 * 60000).toISOString() },
  { id: "5", action: "ABSEN", entity: "Check-out", user: "Dedi Kurniawan", airport: "MDC001", created_at: new Date(Date.now() - 30 * 60000).toISOString() },
  { id: "6", action: "LOGIN", entity: "Login", user: "Koordinator", airport: "DJB001", created_at: new Date(Date.now() - 45 * 60000).toISOString() },
];

interface ActivityFeedProps {
  activities?: Activity[];
}

export default function ActivityFeed({ activities = DEMO_ACTIVITIES }: ActivityFeedProps) {
  return (
    <div className="bg-white rounded-2xl card-shadow border border-gray-100 flex flex-col h-full">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-gray-800">Aktivitas Real-time</h3>
          <p className="text-xs text-gray-400 mt-0.5">Update terbaru seluruh bandara</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse-dot" />
          <span className="text-xs font-semibold text-green-600">LIVE</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
        {activities.map((activity) => {
          const colorClass = ACTION_COLORS[activity.action] ?? ACTION_COLORS.DEFAULT;
          return (
            <div key={activity.id} className="px-5 py-3 hover:bg-gray-50/50 transition-colors">
              <div className="flex items-start gap-3">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg flex-shrink-0 mt-0.5 ${colorClass}`}>
                  {activity.action}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{activity.entity}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {activity.user} · {activity.airport}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{formatDateTime(activity.created_at)}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="px-5 py-3 border-t border-gray-100">
        <button className="text-xs font-semibold text-[#1565C0] hover:underline">
          Lihat semua aktivitas →
        </button>
      </div>
    </div>
  );
}
