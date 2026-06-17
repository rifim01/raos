"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type QueueEntry = {
  id: string;
  queue_number: number;
  position: number | null;
  status: string;
  priority: boolean;
  check_in_time: string | null;
  call_time: string | null;
  drivers: { nama: string; driver_code: string } | null;
};

interface Props {
  airportId: string;
  airportCode: string;
}

const AIRPORT_NAMES: Record<string, string> = {
  DJB001: "Sultan Thaha — Jambi",
  PKU001: "Sultan Syarif Kasim II — Pekanbaru",
  BTH001: "Hang Nadim — Batam",
  BPN001: "Sultan Aji Muhammad Sulaiman — Balikpapan",
  MDC001: "Sam Ratulangi — Manado",
  UPG001: "Sultan Hasanuddin — Makassar",
  CGK001: "Soekarno-Hatta — Tangerang",
};

export default function CommandCenterClient({ airportId, airportCode }: Props) {
  const [queue, setQueue] = useState<QueueEntry[]>([]);
  const [clock, setClock] = useState(new Date());

  // Clock
  useEffect(() => {
    const t = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Initial + Realtime + BroadcastChannel + visibilitychange
  useEffect(() => {
    if (!airportId) return;
    const supabase = createClient();
    const bc = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(`raos-queue-${airportId}`) : null;

    async function fetchQueue() {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await (supabase as any)
        .from("pickup_queues")
        .select("id, queue_number, position, status, priority, check_in_time, call_time, drivers(nama, driver_code)")
        .eq("airport_id", airportId)
        .eq("tanggal", today)
        .not("status", "in", '("COMPLETED","NO_SHOW")')
        .order("position");
      if (data) {
        setQueue(data);
        bc?.postMessage({ queue: data });
      }
    }

    /* receive updates pushed by QueueBoardClient or sibling CC tabs */
    if (bc) {
      bc.onmessage = (e) => {
        if (e.data.queue) setQueue(e.data.queue.filter((q: QueueEntry) => !["COMPLETED","NO_SHOW"].includes(q.status)));
      };
    }

    const onVisible = () => { if (!document.hidden) fetchQueue(); };
    document.addEventListener("visibilitychange", onVisible);

    fetchQueue();
    const channel = supabase
      .channel(`cc-${airportId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "pickup_queues", filter: `airport_id=eq.${airportId}` }, fetchQueue)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      bc?.close();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [airportId]);

  const waiting  = queue.filter((q) => q.status === "WAITING");
  const called   = queue.filter((q) => q.status === "CALLED");
  const pickup   = queue.filter((q) => q.status === "PICKUP");

  const currentCall = called[0] ?? null;
  const nextUp = waiting[0] ?? null;

  const loadStatus = waiting.length > 100 ? { label: "OVERLOAD", color: "text-red-400", dot: "bg-red-500" }
    : waiting.length >= 50 ? { label: "PADAT", color: "text-yellow-400", dot: "bg-yellow-500" }
    : { label: "NORMAL", color: "text-green-400", dot: "bg-green-500" };

  const timeStr = clock.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const dateStr = clock.toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="min-h-screen bg-[#0A0F1E] text-white flex flex-col select-none overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-8 py-4 border-b border-white/5 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl overflow-hidden ring-1 ring-white/10">
            <img src="/icons/icon-512.png" alt="RIFIM" className="w-full h-full object-cover" />
          </div>
          <div>
            <p className="font-black text-lg leading-tight tracking-wide">RAOS COMMAND CENTER</p>
            <p className="text-white/40 text-xs font-medium">{AIRPORT_NAMES[airportCode] ?? airportCode}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-black text-2xl tabular-nums tracking-widest">{timeStr}</p>
          <p className="text-white/40 text-xs mt-0.5">{dateStr}</p>
        </div>
      </header>

      {/* Main grid */}
      <div className="flex-1 grid grid-cols-12 gap-4 p-6 min-h-0">

        {/* LEFT: Current call — big focus card */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-4">

          {/* NOMOR DIPANGGIL */}
          <div className="flex-1 bg-gradient-to-br from-[#1565C0] to-[#0D47A1] rounded-3xl p-6 flex flex-col items-center justify-center text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-4 right-4 w-32 h-32 rounded-full border-4 border-white" />
              <div className="absolute bottom-4 left-4 w-20 h-20 rounded-full border-2 border-white" />
            </div>
            <p className="text-white/60 text-sm font-semibold tracking-widest uppercase mb-2">NOMOR DIPANGGIL</p>
            {currentCall ? (
              <>
                <p className="text-9xl font-black tabular-nums leading-none text-white drop-shadow-lg">
                  {String(currentCall.queue_number).padStart(3, "0")}
                </p>
                <div className="mt-4 px-4 py-2 bg-white/10 rounded-2xl backdrop-blur">
                  <p className="font-bold text-white text-base">{currentCall.drivers?.nama ?? "—"}</p>
                  <p className="text-white/60 text-xs">{currentCall.drivers?.driver_code}</p>
                </div>
                <div className="mt-2 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse-dot" />
                  <span className="text-yellow-300 text-xs font-semibold">DIPANGGIL</span>
                </div>
              </>
            ) : (
              <>
                <p className="text-7xl font-black text-white/20 leading-none">—</p>
                <p className="text-white/40 text-sm mt-4">Belum ada yang dipanggil</p>
              </>
            )}
          </div>

          {/* NOMOR BERIKUTNYA */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center justify-between">
            <div>
              <p className="text-white/40 text-xs font-semibold tracking-widest uppercase">BERIKUTNYA</p>
              <p className="text-4xl font-black tabular-nums text-white/80 mt-1">
                {nextUp ? String(nextUp.queue_number).padStart(3, "0") : "—"}
              </p>
              <p className="text-white/50 text-sm mt-1 truncate max-w-[140px]">{nextUp?.drivers?.nama ?? ""}</p>
            </div>
            <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" className="w-7 h-7">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </div>

        {/* CENTER: Queue list */}
        <div className="col-span-12 lg:col-span-5 bg-white/5 border border-white/10 rounded-3xl overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between flex-shrink-0">
            <div>
              <p className="font-bold text-white">Daftar Antrian</p>
              <p className="text-white/40 text-xs">{waiting.length} menunggu · {pickup.length} pickup</p>
            </div>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${loadStatus.dot}`} />
              <span className={`text-xs font-bold ${loadStatus.color}`}>{loadStatus.label}</span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {queue.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-12 text-white/20">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="w-12 h-12 mb-3">
                  <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4" />
                </svg>
                <p className="text-sm font-medium">Antrian kosong</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="text-left">
                    <th className="px-4 pt-3 pb-2 text-[10px] font-semibold text-white/30 uppercase tracking-wider">No</th>
                    <th className="px-4 pt-3 pb-2 text-[10px] font-semibold text-white/30 uppercase tracking-wider">Driver</th>
                    <th className="px-4 pt-3 pb-2 text-[10px] font-semibold text-white/30 uppercase tracking-wider">Status</th>
                    <th className="px-4 pt-3 pb-2 text-[10px] font-semibold text-white/30 uppercase tracking-wider">Tunggu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {queue.map((q) => {
                    const mins = q.check_in_time ? Math.floor((Date.now() - new Date(q.check_in_time).getTime()) / 60000) : 0;
                    const statusColor = q.status === "CALLED" ? "text-yellow-400" : q.status === "PICKUP" ? "text-purple-400" : "text-white/50";
                    const isActive = q.status === "CALLED";
                    return (
                      <tr key={q.id} className={`${isActive ? "bg-yellow-500/10" : ""} transition-colors`}>
                        <td className="px-4 py-2.5">
                          <span className={`font-black tabular-nums text-lg ${isActive ? "text-yellow-300" : "text-white/70"}`}>
                            {String(q.queue_number).padStart(3, "0")}
                          </span>
                        </td>
                        <td className="px-4 py-2.5">
                          <p className={`text-sm font-semibold truncate max-w-[140px] ${isActive ? "text-white" : "text-white/60"}`}>
                            {q.drivers?.nama ?? "—"}
                          </p>
                          <p className="text-white/30 text-[11px]">{q.drivers?.driver_code}</p>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`text-xs font-bold ${statusColor}`}>
                            {q.status === "CALLED" ? "DIPANGGIL" : q.status === "PICKUP" ? "PICKUP" : "MENUNGGU"}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-white/40 text-xs tabular-nums">
                          {mins < 1 ? "<1m" : `${mins}m`}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* RIGHT: Stats column */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-4">
          {[
            { label: "Driver Menunggu", value: waiting.length, icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z", color: "text-blue-400", bg: "from-blue-500/10 to-blue-500/5" },
            { label: "Dipanggil", value: called.length, icon: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9", color: "text-yellow-400", bg: "from-yellow-500/10 to-yellow-500/5" },
            { label: "Sedang Pickup", value: pickup.length, icon: "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z", color: "text-purple-400", bg: "from-purple-500/10 to-purple-500/5" },
          ].map((s) => (
            <div key={s.label} className={`bg-gradient-to-br ${s.bg} border border-white/10 rounded-2xl p-5 flex items-center gap-4`}>
              <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={`w-6 h-6 ${s.color}`}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={s.icon} />
                </svg>
              </div>
              <div>
                <p className={`text-3xl font-black tabular-nums ${s.color}`}>{s.value}</p>
                <p className="text-white/40 text-xs font-medium mt-0.5">{s.label}</p>
              </div>
            </div>
          ))}

          {/* Pickup list */}
          {pickup.length > 0 && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex-1">
              <p className="text-white/40 text-xs font-semibold tracking-widest uppercase mb-3">Sedang Pickup</p>
              <div className="space-y-2">
                {pickup.map((q) => (
                  <div key={q.id} className="flex items-center gap-2">
                    <span className="text-purple-400 font-black text-sm tabular-nums w-8">
                      {String(q.queue_number).padStart(3, "0")}
                    </span>
                    <span className="text-white/60 text-sm truncate flex-1">{q.drivers?.nama ?? "—"}</span>
                    <span className="w-2 h-2 rounded-full bg-purple-400" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status indicator */}
          <div className={`border rounded-2xl p-4 text-center ${
            loadStatus.label === "OVERLOAD" ? "border-red-500/30 bg-red-500/5" :
            loadStatus.label === "PADAT"    ? "border-yellow-500/30 bg-yellow-500/5" :
            "border-green-500/30 bg-green-500/5"
          }`}>
            <span className={`w-3 h-3 rounded-full inline-block mr-2 ${loadStatus.dot}`} />
            <span className={`text-sm font-black tracking-widest ${loadStatus.color}`}>{loadStatus.label}</span>
            <p className="text-white/30 text-[11px] mt-1">Status Operasional</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-8 py-2 border-t border-white/5 flex items-center justify-between flex-shrink-0">
        <p className="text-white/20 text-[10px] font-medium tracking-widest uppercase">
          PT RIFIM INTERNATIONAL GEMILANG · RAOS v6.0
        </p>
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse-dot" />
          <span className="text-white/20 text-[10px]">Realtime</span>
        </div>
      </div>
    </div>
  );
}
