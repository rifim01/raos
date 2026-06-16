"use client";

import { useEffect, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";

const STATUS_STYLE: Record<string, string> = {
  WAITING:   "bg-blue-100 text-blue-700",
  CALLED:    "bg-yellow-100 text-yellow-700 animate-pulse",
  PICKUP:    "bg-purple-100 text-purple-700",
  COMPLETED: "bg-green-100 text-green-700",
  SUSPENDED: "bg-red-100 text-red-700",
  NO_SHOW:   "bg-gray-100 text-gray-500",
};

const STATUS_LABEL: Record<string, string> = {
  WAITING:   "Menunggu",
  CALLED:    "Dipanggil",
  PICKUP:    "Pickup",
  COMPLETED: "Selesai",
  SUSPENDED: "Suspended",
  NO_SHOW:   "Tidak Hadir",
};

type QueueEntry = {
  id: string;
  queue_number: number;
  position: number | null;
  status: string;
  priority: boolean;
  check_in_time: string | null;
  call_time: string | null;
  no_show_count: number;
  drivers: { nama: string; driver_code: string } | null;
};

interface Props {
  airportId: string;
  airportCode: string;
  initialQueue: QueueEntry[];
  stats: { waiting: number; called: number; pickup: number; completed: number; suspended: number };
}

export default function QueueBoardClient({ airportId, airportCode, initialQueue, stats: initialStats }: Props) {
  const [queue, setQueue] = useState<QueueEntry[]>(initialQueue);
  const [isPending, startTransition] = useTransition();
  const [suspendId, setSuspendId] = useState<string | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`queue-${airportId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pickup_queues", filter: `airport_id=eq.${airportId}` },
        async () => {
          // Re-fetch on any change
          const today = new Date().toISOString().split("T")[0];
          const { data } = await (supabase as any)
            .from("pickup_queues")
            .select("id, queue_number, position, status, priority, check_in_time, call_time, no_show_count, drivers(nama, driver_code)")
            .eq("airport_id", airportId)
            .eq("tanggal", today)
            .not("status", "in", '("COMPLETED","NO_SHOW")')
            .order("status")
            .order("position");
          if (data) setQueue(data);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [airportId]);

  async function callAction(action: string, queueId: string, extra?: Record<string, string>) {
    startTransition(async () => {
      const res = await fetch("/api/queue/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, queueId, ...extra }),
      });
      const json = await res.json();
      if (!res.ok) showToast(json.error ?? "Error", false);
      else showToast("Berhasil", true);
    });
  }

  async function callNext() {
    startTransition(async () => {
      const res = await fetch("/api/queue/call-next", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ airportId }),
      });
      const json = await res.json();
      if (!res.ok) showToast(json.error ?? "Error", false);
      else showToast(`Dipanggil: No. ${json.queue_number}`, true);
    });
  }

  function waitTime(iso: string | null) {
    if (!iso) return "—";
    const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1) return "<1 mnt";
    return `${mins} mnt`;
  }

  const activeQueue = queue.filter((q) => !["COMPLETED", "NO_SHOW"].includes(q.status));
  const waiting  = activeQueue.filter((q) => q.status === "WAITING").length;
  const called   = activeQueue.filter((q) => q.status === "CALLED").length;
  const pickup   = activeQueue.filter((q) => q.status === "PICKUP").length;

  const loadColor = waiting > 100 ? "text-red-600" : waiting >= 50 ? "text-yellow-600" : "text-green-600";
  const loadLabel = waiting > 100 ? "OVERLOAD" : waiting >= 50 ? "PADAT" : "NORMAL";

  return (
    <div className="space-y-4">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-xl text-sm font-semibold shadow-lg ${toast.ok ? "bg-green-600 text-white" : "bg-red-600 text-white"}`}>
          {toast.msg}
        </div>
      )}

      {/* Stats strip */}
      <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
        {[
          { label: "Menunggu", value: waiting, color: "bg-blue-50 text-blue-700" },
          { label: "Dipanggil", value: called, color: "bg-yellow-50 text-yellow-700" },
          { label: "Pickup", value: pickup, color: "bg-purple-50 text-purple-700" },
          { label: "Selesai Hari Ini", value: initialStats.completed, color: "bg-green-50 text-green-700" },
          { label: "Pelanggaran", value: initialStats.suspended, color: "bg-red-50 text-red-700" },
        ].map((s) => (
          <div key={s.label} className={`${s.color} rounded-xl p-3 text-center`}>
            <p className="text-xl font-black">{s.value}</p>
            <p className="text-[11px] font-semibold mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Action bar */}
      <div className="bg-white rounded-2xl card-shadow border border-gray-100 p-4 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className={`text-xs font-bold px-2 py-1 rounded-full bg-gray-100 ${loadColor}`}>{loadLabel}</span>
          <span className="text-sm text-gray-500">{waiting} driver menunggu · Bandara {airportCode}</span>
        </div>
        <button
          onClick={callNext}
          disabled={isPending || waiting === 0}
          className="px-5 py-2.5 rounded-xl bg-[#1565C0] text-white text-sm font-bold hover:bg-[#1976D2] disabled:opacity-40 transition-colors flex items-center gap-2"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
          Panggil Berikutnya
        </button>
        <a
          href={`/command-center?airport=${airportId}&code=${airportCode}`}
          target="_blank"
          className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors flex items-center gap-2"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <rect x="2" y="3" width="20" height="14" rx="2" /><path d="M8 21h8M12 17v4" />
          </svg>
          Command Center
        </a>
      </div>

      {/* Queue table */}
      <div className="bg-white rounded-2xl card-shadow border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-800">Antrian Aktif</h3>
            <p className="text-xs text-gray-400 mt-0.5">Update realtime · {activeQueue.length} driver</p>
          </div>
        </div>

        {activeQueue.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <svg viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="1.5" className="w-7 h-7">
                <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
            </div>
            <p className="font-semibold text-gray-700">Tidak ada antrian aktif</p>
            <p className="text-sm text-gray-400 mt-1">Driver belum check in hari ini</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-gray-100">
                  {["No.", "Driver", "Status", "Waktu Masuk", "Tunggu", "Aksi"].map((h) => (
                    <th key={h} className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {activeQueue.map((q) => (
                  <tr key={q.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {q.priority && (
                          <svg viewBox="0 0 24 24" fill="#F59E0B" className="w-3.5 h-3.5 flex-shrink-0">
                            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                          </svg>
                        )}
                        <span className="font-black text-gray-800 text-base">{q.queue_number}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-800 text-sm">{q.drivers?.nama ?? "—"}</p>
                      <p className="text-xs text-gray-400">{q.drivers?.driver_code}</p>
                      {q.no_show_count > 0 && (
                        <span className="text-[10px] text-red-500 font-medium">⚠ {q.no_show_count}x no-show</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLE[q.status] ?? "bg-gray-100 text-gray-600"}`}>
                        {STATUS_LABEL[q.status] ?? q.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                      {q.check_in_time ? new Date(q.check_in_time).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "—"}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-700 whitespace-nowrap">
                      {waitTime(q.check_in_time)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {q.status === "CALLED" && (
                          <>
                            <ActionBtn color="purple" onClick={() => callAction("confirm_pickup", q.id)}>Pickup</ActionBtn>
                            <ActionBtn color="red" onClick={() => callAction("no_show", q.id)}>No Show</ActionBtn>
                          </>
                        )}
                        {q.status === "PICKUP" && (
                          <ActionBtn color="green" onClick={() => callAction("complete", q.id)}>Selesai</ActionBtn>
                        )}
                        {q.status === "WAITING" && (
                          <>
                            <ActionBtn color="yellow" onClick={() => callAction("prioritize", q.id)}>Prioritas</ActionBtn>
                            <ActionBtn color="gray" onClick={() => callAction("skip", q.id)}>Skip</ActionBtn>
                          </>
                        )}
                        {["WAITING", "CALLED"].includes(q.status) && (
                          <ActionBtn color="red-outline" onClick={() => { setSuspendId(q.id); setSuspendReason(""); }}>
                            Suspend
                          </ActionBtn>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Suspend modal */}
      {suspendId && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <h3 className="font-bold text-gray-800 mb-1">Suspend Driver</h3>
            <p className="text-sm text-gray-500 mb-4">Masukkan alasan suspend</p>
            <textarea
              className="w-full border border-gray-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-300"
              rows={3}
              placeholder="Alasan suspend..."
              value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}
            />
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setSuspendId(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50"
              >
                Batal
              </button>
              <button
                disabled={!suspendReason.trim() || isPending}
                onClick={() => {
                  callAction("suspend", suspendId, { reason: suspendReason });
                  setSuspendId(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 disabled:opacity-40"
              >
                Suspend
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ActionBtn({
  children, color, onClick,
}: { children: React.ReactNode; color: string; onClick: () => void }) {
  const styles: Record<string, string> = {
    green:       "bg-green-600 text-white hover:bg-green-700",
    purple:      "bg-purple-600 text-white hover:bg-purple-700",
    yellow:      "bg-yellow-500 text-white hover:bg-yellow-600",
    gray:        "bg-gray-200 text-gray-700 hover:bg-gray-300",
    red:         "bg-red-600 text-white hover:bg-red-700",
    "red-outline": "border border-red-300 text-red-600 hover:bg-red-50",
  };
  return (
    <button onClick={onClick} className={`text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors whitespace-nowrap ${styles[color] ?? styles.gray}`}>
      {children}
    </button>
  );
}
