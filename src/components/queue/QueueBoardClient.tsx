"use client";

import { useEffect, useState, useTransition, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

/* ── Status helpers ─────────────────────────────────────────────────────── */
const STATUS_LABEL: Record<string, string> = {
  WAITING:   "Menunggu",
  CALLED:    "Dipanggil",
  PICKUP:    "Pickup",
  COMPLETED: "Selesai",
  SUSPENDED: "Suspended",
  NO_SHOW:   "Tidak Hadir",
};

const STATUS_COLOR: Record<string, { bg: string; text: string; border: string }> = {
  WAITING:   { bg: "rgba(255,211,0,.12)",  text: "#FFD300",  border: "rgba(255,211,0,.4)"  },
  CALLED:    { bg: "rgba(59,139,255,.12)", text: "#3B8BFF",  border: "rgba(59,139,255,.4)" },
  PICKUP:    { bg: "rgba(0,229,160,.12)",  text: "#00E5A0",  border: "rgba(0,229,160,.4)"  },
  COMPLETED: { bg: "rgba(167,139,250,.12)",text: "#A78BFA",  border: "rgba(167,139,250,.4)"},
  SUSPENDED: { bg: "rgba(255,59,92,.15)",  text: "#FF3B5C",  border: "rgba(255,59,92,.4)"  },
  NO_SHOW:   { bg: "rgba(100,116,139,.12)",text: "#94A3B8",  border: "rgba(100,116,139,.3)"},
};

/* ── Types ──────────────────────────────────────────────────────────────── */
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

/* ── Helpers ────────────────────────────────────────────────────────────── */
function waitTime(iso: string | null) {
  if (!iso) return "—";
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "<1 mnt";
  return `${mins} mnt`;
}

function fmtTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
}

/* ── Inline styles ──────────────────────────────────────────────────────── */
const S = {
  wrap:   { background: "#080D1A", margin: "0 -24px -24px -24px", padding: "0", fontFamily: "system-ui,-apple-system,sans-serif" } as React.CSSProperties,
  card:   { background: "#0D1528", border: "1px solid rgba(255,211,0,.1)", borderRadius: 10 } as React.CSSProperties,
  cardHdr:{ padding: "8px 14px", borderBottom: "1px solid rgba(255,255,255,.05)", display:"flex", alignItems:"center", justifyContent:"space-between" } as React.CSSProperties,
  title:  { fontSize: 10, fontWeight: 700, color: "#FFD300", textTransform:"uppercase" as const, letterSpacing: ".8px", display:"flex", alignItems:"center", gap: 6 },
  sub:    { fontSize: 9, color: "#4B6280" },
  txt:    { color: "#D0D8E8" },
  muted:  { color: "#4B6280" },
  yl:     { color: "#FFD300" },
  gn:     { color: "#00E5A0" },
  rd:     { color: "#FF3B5C" },
  bl:     { color: "#3B8BFF" },
};

/* ══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════════════ */
export default function QueueBoardClient({ airportId, airportCode, initialQueue, stats: initialStats }: Props) {
  const [queue, setQueue]         = useState<QueueEntry[]>(initialQueue);
  const [isPending, startTrans]   = useTransition();
  const [suspendId, setSuspendId] = useState<string | null>(null);
  const [suspendReason, setSuspendReason] = useState("");
  const [toast, setToast]         = useState<{ msg: string; ok: boolean } | null>(null);
  const [now, setNow]             = useState(new Date());

  /* clock */
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);

  const showToast = useCallback((msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }, []);

  /* realtime */
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`queue-${airportId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "pickup_queues", filter: `airport_id=eq.${airportId}` },
        async () => {
          const today = new Date().toISOString().split("T")[0];
          const { data } = await (supabase as any)
            .from("pickup_queues")
            .select("id, queue_number, position, status, priority, check_in_time, call_time, no_show_count, drivers(nama, driver_code)")
            .eq("airport_id", airportId).eq("tanggal", today)
            .not("status", "in", '("COMPLETED","NO_SHOW")')
            .order("status").order("position");
          if (data) setQueue(data);
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [airportId]);

  /* actions */
  async function callAction(action: string, queueId: string, extra?: Record<string, string>) {
    startTrans(async () => {
      const res  = await fetch("/api/queue/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, queueId, ...extra }) });
      const json = await res.json();
      if (!res.ok) showToast(json.error ?? "Error", false);
      else showToast("Berhasil", true);
    });
  }

  async function callNext() {
    startTrans(async () => {
      const res  = await fetch("/api/queue/call-next", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ airportId }) });
      const json = await res.json();
      if (!res.ok) showToast(json.error ?? "Error", false);
      else showToast(`Dipanggil: No. ${json.queue_number}`, true);
    });
  }

  /* derived */
  const active    = queue.filter((q) => !["COMPLETED", "NO_SHOW"].includes(q.status));
  const waiting   = active.filter((q) => q.status === "WAITING").length;
  const called    = active.filter((q) => q.status === "CALLED").length;
  const pickup    = active.filter((q) => q.status === "PICKUP").length;
  const completed = initialStats.completed;
  const suspended = initialStats.suspended;
  const loadLabel = waiting > 100 ? "OVERLOAD" : waiting >= 50 ? "PADAT" : "NORMAL";
  const loadColor = waiting > 100 ? "#FF3B5C" : waiting >= 50 ? "#FFD300" : "#00E5A0";

  const violations = active.filter((q) => q.status === "SUSPENDED" || q.no_show_count > 0);

  /* ring radii helpers (r=28, circ≈176) */
  const ringDash = (val: number, max: number) => {
    const pct = Math.min(val / Math.max(max, 1), 1);
    return `${(pct * 175.9).toFixed(1)} 175.9`;
  };

  return (
    <div style={S.wrap}>

      {/* ── TOAST ─────────────────────────────────────────────────── */}
      {toast && (
        <div style={{ position:"fixed", top:16, right:16, zIndex:9999, padding:"10px 18px", borderRadius:10, fontSize:13, fontWeight:700, color:"#fff", background: toast.ok ? "#16A34A" : "#DC2626", boxShadow:"0 4px 20px rgba(0,0,0,.4)" }}>
          {toast.msg}
        </div>
      )}

      {/* ── COMMAND BAR ───────────────────────────────────────────── */}
      <div style={{ background:"rgba(8,13,26,.98)", borderBottom:"1px solid rgba(255,211,0,.12)", padding:"8px 20px", display:"flex", alignItems:"center", gap:12, flexWrap:"wrap" }}>
        {/* Logo */}
        <div style={{ display:"flex", alignItems:"center", gap:8, marginRight:8 }}>
          <div style={{ width:30, height:30, background:"#FFD300", borderRadius:7, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:11, color:"#000" }}>RI</div>
          <div>
            <div style={{ fontSize:11, fontWeight:800, color:"#fff", letterSpacing:".5px" }}>RIFIM AIRPORT OS</div>
            <div style={S.sub}>Queue & Pickup Control</div>
          </div>
        </div>
        {/* Airport */}
        <div style={{ background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,255,255,.08)", borderRadius:6, padding:"4px 10px", fontSize:11, color:"#D0D8E8", display:"flex", alignItems:"center", gap:5 }}>
          <svg width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="3" stroke="#3B8BFF" strokeWidth="1.2" fill="none"/><circle cx="4" cy="4" r="1.2" fill="#3B8BFF"/></svg>
          {airportCode}
        </div>
        {/* Live */}
        <div style={{ display:"flex", alignItems:"center", gap:5 }}>
          <span style={{ width:7, height:7, borderRadius:"50%", background:"#00E5A0", display:"inline-block", boxShadow:"0 0 6px #00E5A0" }}/>
          <span style={{ fontSize:10, fontWeight:700, color:"#00E5A0", letterSpacing:".5px" }}>LIVE</span>
        </div>
        {/* Load */}
        <div style={{ background:`${loadColor}18`, border:`1px solid ${loadColor}55`, borderRadius:5, padding:"2px 8px", fontSize:9, fontWeight:800, color:loadColor }}>{loadLabel}</div>
        <span style={{ fontSize:10, color:"#4B6280" }}>{waiting} driver menunggu</span>
        <div style={{ flex:1 }}/>
        {/* Clock */}
        <div style={{ textAlign:"center" }}>
          <div style={{ fontSize:16, fontWeight:700, color:"#FFD300", letterSpacing:1 }}>{now.toLocaleTimeString("id-ID", { hour:"2-digit", minute:"2-digit", second:"2-digit" })}</div>
          <div style={{ fontSize:9, color:"#4B6280" }}>{now.toLocaleDateString("id-ID", { weekday:"short", day:"numeric", month:"short", year:"numeric" })}</div>
        </div>
        {/* Buttons */}
        <button onClick={callNext} disabled={isPending || waiting === 0}
          style={{ padding:"7px 16px", borderRadius:8, background:"#FFD300", border:"none", color:"#000", fontSize:11, fontWeight:800, cursor:"pointer", opacity: isPending||waiting===0 ? .4 : 1, display:"flex", alignItems:"center", gap:6 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
          Panggil Berikutnya
        </button>
        <a href={`/command-center?airport=${airportId}&code=${airportCode}`} target="_blank"
          style={{ padding:"7px 14px", borderRadius:8, background:"transparent", border:"1px solid rgba(255,255,255,.1)", color:"#94A3B8", fontSize:11, fontWeight:700, textDecoration:"none", display:"flex", alignItems:"center", gap:5 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
          Command Center
        </a>
      </div>

      {/* ── KPI ROW ───────────────────────────────────────────────── */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", borderBottom:"1px solid rgba(255,255,255,.05)" }}>
        {[
          { label:"Menunggu",      val:waiting,   color:"#FFD300", bg:"rgba(255,211,0,.05)"  },
          { label:"Dipanggil",     val:called,    color:"#3B8BFF", bg:"rgba(59,139,255,.05)" },
          { label:"Pickup",        val:pickup,    color:"#00E5A0", bg:"rgba(0,229,160,.05)"  },
          { label:"Selesai Hari Ini", val:completed, color:"#A78BFA", bg:"rgba(167,139,250,.05)" },
          { label:"Pelanggaran",   val:suspended, color:"#FF3B5C", bg:"rgba(255,59,92,.05)"  },
        ].map((k, i) => (
          <div key={i} style={{ padding:"12px 16px", borderRight: i<4 ? "1px solid rgba(255,255,255,.05)" : "none", background:k.bg, textAlign:"center" }}>
            <div style={{ fontSize:28, fontWeight:900, color:k.color, lineHeight:1, textShadow:`0 0 20px ${k.color}55` }}>{k.val}</div>
            <div style={{ fontSize:9, color:"#4B6280", textTransform:"uppercase", letterSpacing:".7px", marginTop:3 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* ── 3-COLUMN MAIN ─────────────────────────────────────────── */}
      <div style={{ display:"grid", gridTemplateColumns:"200px 1fr 190px", height:380, borderBottom:"1px solid rgba(255,255,255,.05)" }}>

        {/* LEFT — ring charts + bar */}
        <div style={{ borderRight:"1px solid rgba(255,255,255,.05)", display:"flex", flexDirection:"column", overflow:"hidden", height:380 }}>
          <div style={S.cardHdr}>
            <div style={S.title}><span style={{ width:6, height:6, borderRadius:"50%", background:"#FFD300", display:"inline-block" }}/>Queue Metrics</div>
          </div>
          {/* Ring charts */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", borderBottom:"1px solid rgba(255,255,255,.05)" }}>
            {[
              { label:"Menunggu", val:waiting,  max:30, color:"#FFD300" },
              { label:"Dipanggil",val:called,   max:10, color:"#3B8BFF" },
            ].map((r) => (
              <div key={r.label} style={{ padding:"10px 6px", display:"flex", flexDirection:"column", alignItems:"center", borderRight: r.label==="Menunggu" ? "1px solid rgba(255,255,255,.05)" : "none" }}>
                <svg width="72" height="72" viewBox="0 0 72 72" style={{ transform:"rotate(-90deg)" }}>
                  <circle cx="36" cy="36" r="28" fill="none" stroke={`${r.color}18`} strokeWidth="6"/>
                  <circle cx="36" cy="36" r="28" fill="none" stroke={r.color} strokeWidth="6"
                    strokeDasharray={ringDash(r.val, r.max)} strokeLinecap="round"/>
                </svg>
                <div style={{ marginTop:-62, textAlign:"center", position:"relative", zIndex:1, pointerEvents:"none" }}>
                  <div style={{ fontSize:18, fontWeight:900, color:r.color, lineHeight:1, paddingTop:22 }}>{r.val}</div>
                  <div style={{ fontSize:8, color:"#4B6280" }}>{Math.round(r.val/Math.max(r.max,1)*100)}%</div>
                </div>
                <div style={{ fontSize:9, color:"#4B6280", textTransform:"uppercase", letterSpacing:".6px", marginTop:6 }}>{r.label}</div>
              </div>
            ))}
          </div>
          {/* Bar chart by type */}
          <div style={{ padding:"10px 12px", flex:1 }}>
            <div style={{ fontSize:9, color:"#4B6280", textTransform:"uppercase", letterSpacing:".8px", marginBottom:8 }}>Tipe Kendaraan</div>
            {[
              { lbl:"Mobil",    val: Math.max(waiting-2,0), max:Math.max(waiting,1), color:"#FFD300" },
              { lbl:"Motor",    val: Math.min(2, waiting),  max:Math.max(waiting,1), color:"#3B8BFF" },
              { lbl:"XL/Mini", val: 0, max:1, color:"#00E5A0" },
              { lbl:"Cargo",   val: 0, max:1, color:"#A78BFA" },
            ].map((b) => (
              <div key={b.lbl} style={{ display:"flex", alignItems:"center", gap:6, marginBottom:5 }}>
                <span style={{ fontSize:9, color:"#4B6280", width:40, textAlign:"right", flexShrink:0 }}>{b.lbl}</span>
                <div style={{ flex:1, height:5, background:"rgba(255,255,255,.05)", borderRadius:3, overflow:"hidden" }}>
                  <div style={{ width:`${(b.val/b.max)*100}%`, height:"100%", background:b.color, borderRadius:3, transition:"width .3s" }}/>
                </div>
                <span style={{ fontSize:9, color:"#D0D8E8", width:16, textAlign:"left", flexShrink:0 }}>{b.val}</span>
              </div>
            ))}
            <div style={{ marginTop:10, paddingTop:8, borderTop:"1px solid rgba(255,255,255,.05)" }}>
              <div style={{ fontSize:8, color:"#4B6280", textTransform:"uppercase", letterSpacing:".7px", marginBottom:5 }}>Zona Aktif</div>
              <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                {[
                  { z:"Z-A", c:"#FFD300", n: Math.ceil(waiting*.36) },
                  { z:"Z-B", c:"#00E5A0", n: Math.ceil(waiting*.43) },
                  { z:"Z-C", c:"#3B8BFF", n: Math.floor(waiting*.21) },
                ].map(z=>(
                  <span key={z.z} style={{ fontSize:8, padding:"2px 6px", background:`${z.c}15`, border:`1px solid ${z.c}30`, borderRadius:3, color:z.c }}>{z.z}: {z.n}</span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* CENTER — 3D Airport Map */}
        <div style={{ borderRight:"1px solid rgba(255,255,255,.05)", display:"flex", flexDirection:"column", overflow:"hidden", height:380 }}>
          <div style={S.cardHdr}>
            <div style={S.title}><span style={{ width:6, height:6, borderRadius:"50%", background:"#FFD300", display:"inline-block" }}/>Live Airport Map · {airportCode}</div>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <span style={{ fontSize:9, color:"#00E5A0", fontWeight:700 }}>● {active.length} Antrian Aktif</span>
            </div>
          </div>
          <div style={{ position:"relative", overflow:"hidden", background:"#050D1E", height:332 }}>
            <AirportMap queue={active} airportCode={airportCode}/>
          </div>
        </div>

        {/* RIGHT — donuts + violations + wave */}
        <div style={{ display:"flex", flexDirection:"column", overflow:"hidden", height:380 }}>
          <div style={S.cardHdr}>
            <div style={S.title}><span style={{ width:6, height:6, borderRadius:"50%", background:"#FF3B5C", display:"inline-block" }}/>Pickup & Alerts</div>
          </div>

          {/* Donut charts */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", borderBottom:"1px solid rgba(255,255,255,.05)" }}>
            {[
              { label:"Selesai", val:completed, total:Math.max(completed+waiting+called+pickup,1), color:"#A78BFA" },
              { label:"Pickup",  val:pickup,    total:Math.max(pickup+waiting+1,1),                color:"#00E5A0" },
            ].map((d,i) => {
              const pct = Math.round(d.val/d.total*100);
              const circ = 138.2;
              const dash = `${(pct/100*circ).toFixed(1)} ${circ}`;
              return (
                <div key={d.label} style={{ padding:"8px 6px", display:"flex", flexDirection:"column", alignItems:"center", borderRight: i===0 ? "1px solid rgba(255,255,255,.05)" : "none" }}>
                  <svg width="60" height="60" viewBox="0 0 60 60" style={{ transform:"rotate(-90deg)" }}>
                    <circle cx="30" cy="30" r="22" fill="none" stroke={`${d.color}15`} strokeWidth="7"/>
                    <circle cx="30" cy="30" r="22" fill="none" stroke={d.color} strokeWidth="7" strokeDasharray={dash} strokeLinecap="round"/>
                  </svg>
                  <div style={{ marginTop:-52, textAlign:"center", position:"relative", zIndex:1, pointerEvents:"none" }}>
                    <div style={{ fontSize:13, fontWeight:900, color:d.color, lineHeight:1, paddingTop:20 }}>{pct}%</div>
                    <div style={{ fontSize:7, color:"#4B6280" }}>{d.val} unit</div>
                  </div>
                  <div style={{ fontSize:8, color:"#4B6280", textAlign:"center", marginTop:4, textTransform:"uppercase", letterSpacing:".5px" }}>{d.label}</div>
                </div>
              );
            })}
          </div>

          {/* Violation alerts */}
          <div style={{ padding:"8px 10px", borderBottom:"1px solid rgba(255,255,255,.05)" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:6 }}>
              <span style={{ fontSize:9, fontWeight:700, color:"#FF3B5C", textTransform:"uppercase", letterSpacing:".8px" }}>⚠ Pelanggaran</span>
              <span style={{ fontSize:8, padding:"1px 6px", background:"rgba(255,59,92,.15)", border:"1px solid rgba(255,59,92,.3)", color:"#FF3B5C", borderRadius:3, fontWeight:700 }}>{suspended} AKTIF</span>
            </div>
            {violations.length === 0 ? (
              <div style={{ fontSize:9, color:"#4B6280", textAlign:"center", padding:"6px 0" }}>Tidak ada pelanggaran</div>
            ) : violations.slice(0,3).map((v) => (
              <div key={v.id} style={{ padding:"5px 7px", background:"rgba(255,59,92,.06)", border:"1px solid rgba(255,59,92,.15)", borderRadius:5, marginBottom:4, display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ width:5, height:5, borderRadius:"50%", background:"#FF3B5C", display:"inline-block", flexShrink:0 }}/>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:9, fontWeight:700, color:"#D0D8E8", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{v.drivers?.driver_code} · {v.drivers?.nama}</div>
                  <div style={{ fontSize:8, color:"#4B6280" }}>{v.no_show_count>0 ? `${v.no_show_count}× No Show` : "Suspended"}</div>
                </div>
                <div style={{ fontSize:8, color:"#4B6280", flexShrink:0 }}>{fmtTime(v.call_time)}</div>
              </div>
            ))}
          </div>

          {/* Wave graph */}
          <div style={{ padding:"8px 10px", flex:1 }}>
            <div style={{ fontSize:9, color:"#4B6280", textTransform:"uppercase", letterSpacing:".7px", marginBottom:5 }}>Aktivitas Antrian</div>
            <WaveGraph waiting={waiting} completed={completed}/>
          </div>
        </div>
      </div>

      {/* ── QUEUE TABLE ───────────────────────────────────────────── */}
      <div style={{ background:"#080D1A" }}>
        <div style={{ padding:"8px 16px", borderBottom:"1px solid rgba(255,255,255,.05)", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ width:6, height:6, borderRadius:"50%", background:"#FFD300", display:"inline-block" }}/>
            <span style={{ fontSize:10, fontWeight:700, color:"#FFD300", textTransform:"uppercase", letterSpacing:".8px" }}>Active Queue List</span>
            <span style={{ fontSize:9, padding:"1px 7px", background:"rgba(255,211,0,.1)", border:"1px solid rgba(255,211,0,.2)", color:"#FFD300", borderRadius:3, fontWeight:700 }}>{active.length} driver</span>
          </div>
          <span style={{ fontSize:9, color:"#4B6280" }}>Realtime · Sort: Posisi ↑</span>
        </div>

        {/* Sticky header */}
        <div style={{ overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
            <thead>
              <tr style={{ background:"rgba(255,211,0,.03)", borderBottom:"1px solid rgba(255,255,255,.06)" }}>
                {["Posisi","Driver","Tipe","No. Antrian","Waktu Masuk","Tunggu","Status","Aksi"].map(h=>(
                  <th key={h} style={{ padding:"6px 12px", textAlign:"left", fontSize:8, textTransform:"uppercase", letterSpacing:".7px", color:"#4B6280", fontWeight:700, whiteSpace:"nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
          </table>
        </div>

        {/* Scrollable body */}
        <div style={{ overflowY:"auto", maxHeight:220, overflowX:"auto" }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:11 }}>
            <tbody>
              {active.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding:"32px 0", textAlign:"center", color:"#4B6280" }}>
                    <div style={{ fontSize:13, fontWeight:600, color:"#D0D8E8", marginBottom:4 }}>Tidak ada antrian aktif</div>
                    <div style={{ fontSize:11 }}>Driver belum check in hari ini</div>
                  </td>
                </tr>
              ) : active.map((q, idx) => {
                const sc = STATUS_COLOR[q.status] ?? STATUS_COLOR.NO_SHOW;
                const isCalled = q.status === "CALLED";
                return (
                  <tr key={q.id} style={{ borderBottom:"1px solid rgba(255,255,255,.04)", background: isCalled ? "rgba(255,211,0,.04)" : "transparent", transition:"background .15s" }}
                    onMouseEnter={e=>(e.currentTarget.style.background="rgba(255,211,0,.06)")}
                    onMouseLeave={e=>(e.currentTarget.style.background=isCalled?"rgba(255,211,0,.04)":"transparent")}>
                    {/* Posisi */}
                    <td style={{ padding:"7px 12px" }}>
                      <div style={{ width:22, height:22, borderRadius:5, background:`rgba(255,211,0,.12)`, border:"1px solid rgba(255,211,0,.2)", color:"#FFD300", fontWeight:900, fontSize:11, display:"flex", alignItems:"center", justifyContent:"center" }}>
                        {q.position ?? idx+1}
                      </div>
                    </td>
                    {/* Driver */}
                    <td style={{ padding:"7px 12px" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:7 }}>
                        <div style={{ width:26, height:26, borderRadius:7, background:"rgba(255,211,0,.1)", border:"1px solid rgba(255,211,0,.2)", display:"flex", alignItems:"center", justifyContent:"center", color:"#FFD300", fontWeight:900, fontSize:11, flexShrink:0 }}>
                          {q.drivers?.nama?.[0] ?? "D"}
                        </div>
                        <div>
                          <div style={{ fontWeight:700, color:"#D0D8E8", fontSize:11 }}>
                            {q.priority && <span style={{ color:"#F59E0B", marginRight:3 }}>★</span>}
                            {q.drivers?.nama ?? "—"}
                          </div>
                          <div style={{ fontSize:9, color:"#4B6280" }}>{q.drivers?.driver_code}</div>
                          {q.no_show_count > 0 && <div style={{ fontSize:8, color:"#FF3B5C" }}>⚠ {q.no_show_count}× no-show</div>}
                        </div>
                      </div>
                    </td>
                    {/* Tipe */}
                    <td style={{ padding:"7px 12px" }}>
                      <span style={{ fontSize:9, padding:"2px 7px", background:"rgba(255,211,0,.08)", border:"1px solid rgba(255,211,0,.15)", color:"#FFD300", borderRadius:3, fontWeight:700 }}>Mobil</span>
                    </td>
                    {/* No antrian */}
                    <td style={{ padding:"7px 12px", fontFamily:"monospace", color:"#FFD300", fontWeight:700, fontSize:13 }}>
                      #{q.queue_number}
                    </td>
                    {/* Waktu masuk */}
                    <td style={{ padding:"7px 12px", color:"#4B6280", whiteSpace:"nowrap", fontSize:10 }}>{fmtTime(q.check_in_time)}</td>
                    {/* Tunggu */}
                    <td style={{ padding:"7px 12px", fontWeight:700, color:"#FFD300", whiteSpace:"nowrap", fontFamily:"monospace", fontSize:10 }}>{waitTime(q.check_in_time)}</td>
                    {/* Status */}
                    <td style={{ padding:"7px 12px" }}>
                      <span style={{ fontSize:9, padding:"2px 8px", background:sc.bg, border:`1px solid ${sc.border}`, color:sc.text, borderRadius:4, fontWeight:700, whiteSpace:"nowrap" }}>
                        {STATUS_LABEL[q.status] ?? q.status}
                      </span>
                    </td>
                    {/* Aksi */}
                    <td style={{ padding:"7px 12px" }}>
                      <div style={{ display:"flex", gap:4, flexWrap:"wrap" }}>
                        {q.status === "CALLED" && <>
                          <QBtn color="#00E5A0" onClick={() => callAction("confirm_pickup", q.id)}>Pickup</QBtn>
                          <QBtn color="#FF3B5C" onClick={() => callAction("no_show", q.id)}>No Show</QBtn>
                        </>}
                        {q.status === "PICKUP" &&
                          <QBtn color="#A78BFA" onClick={() => callAction("complete", q.id)}>Selesai</QBtn>}
                        {q.status === "WAITING" && <>
                          <QBtn color="#FFD300" onClick={() => callAction("prioritize", q.id)}>Prioritas</QBtn>
                          <QBtn color="#4B6280" onClick={() => callAction("skip", q.id)}>Skip</QBtn>
                        </>}
                        {["WAITING","CALLED"].includes(q.status) &&
                          <QBtn color="#FF3B5C" outline onClick={() => { setSuspendId(q.id); setSuspendReason(""); }}>Suspend</QBtn>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── SUSPEND MODAL ─────────────────────────────────────────── */}
      {suspendId && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.7)", zIndex:9998, display:"flex", alignItems:"center", justifyContent:"center", padding:16 }}>
          <div style={{ background:"#0D1528", border:"1px solid rgba(255,59,92,.3)", borderRadius:14, padding:24, width:"100%", maxWidth:360, boxShadow:"0 20px 60px rgba(0,0,0,.6)" }}>
            <div style={{ fontSize:14, fontWeight:800, color:"#FF3B5C", marginBottom:4 }}>Suspend Driver</div>
            <div style={{ fontSize:12, color:"#4B6280", marginBottom:14 }}>Masukkan alasan suspend</div>
            <textarea
              style={{ width:"100%", background:"rgba(255,255,255,.05)", border:"1px solid rgba(255,59,92,.2)", borderRadius:8, padding:"10px 12px", fontSize:13, color:"#D0D8E8", resize:"none", outline:"none" }}
              rows={3} placeholder="Alasan suspend..." value={suspendReason}
              onChange={(e) => setSuspendReason(e.target.value)}/>
            <div style={{ display:"flex", gap:8, marginTop:14 }}>
              <button onClick={() => setSuspendId(null)}
                style={{ flex:1, padding:"10px", borderRadius:8, background:"transparent", border:"1px solid rgba(255,255,255,.1)", color:"#94A3B8", fontSize:12, fontWeight:700, cursor:"pointer" }}>Batal</button>
              <button disabled={!suspendReason.trim()||isPending}
                onClick={() => { callAction("suspend", suspendId, { reason: suspendReason }); setSuspendId(null); }}
                style={{ flex:1, padding:"10px", borderRadius:8, background:"#FF3B5C", border:"none", color:"#fff", fontSize:12, fontWeight:800, cursor:"pointer", opacity:!suspendReason.trim()||isPending?.4:1 }}>Suspend</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   AIRPORT MAP SVG — 3D Isometric style (mode 2.jpg inspired)
══════════════════════════════════════════════════════════════════════════ */
function AirportMap({ queue, airportCode }: { queue: QueueEntry[]; airportCode: string }) {
  const waiting = queue.filter(q => q.status === "WAITING");
  const called  = queue.filter(q => q.status === "CALLED");
  const pickup  = queue.filter(q => q.status === "PICKUP");
  const susps   = queue.filter(q => q.status === "SUSPENDED" || q.no_show_count > 0);

  return (
    <svg width="100%" height="332" viewBox="0 0 560 332" xmlns="http://www.w3.org/2000/svg" style={{ display:"block" }}>
      <defs>
        <filter id="qf-yl"><feGaussianBlur stdDeviation="3.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <filter id="qf-gn"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <filter id="qf-rd"><feGaussianBlur stdDeviation="3.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
        <filter id="qf-bld"><feGaussianBlur stdDeviation="10"/></filter>
        <linearGradient id="q-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0A1830"/><stop offset="100%" stopColor="#060F1C"/>
        </linearGradient>
        <linearGradient id="q-gnd" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0A1E3A"/><stop offset="100%" stopColor="#060E1C"/>
        </linearGradient>
        <linearGradient id="q-term" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#5BE8FF"/><stop offset="40%" stopColor="#2BC8F0"/><stop offset="100%" stopColor="#0E8AB5"/>
        </linearGradient>
        <clipPath id="q-clip"><rect width="560" height="340"/></clipPath>
      </defs>
      <g clipPath="url(#q-clip)">
        {/* Sky */}
        <rect width="560" height="340" fill="url(#q-sky)"/>
        {/* Stars */}
        <g fill="rgba(255,255,255,.3)">
          <circle cx="30" cy="15" r=".6"/><circle cx="100" cy="10" r=".5"/><circle cx="200" cy="18" r=".7"/>
          <circle cx="360" cy="8" r=".6"/><circle cx="460" cy="20" r=".5"/><circle cx="530" cy="12" r=".6"/>
          <circle cx="70" cy="28" r=".4"/><circle cx="420" cy="25" r=".5"/>
        </g>
        {/* Ground */}
        <polygon points="0,110 560,110 560,340 0,340" fill="url(#q-gnd)"/>
        {/* Perspective grid */}
        <g stroke="rgba(0,100,200,.05)" strokeWidth=".5">
          <line x1="0" y1="140" x2="560" y2="140"/>
          <line x1="0" y1="180" x2="560" y2="180"/>
          <line x1="0" y1="230" x2="560" y2="230"/>
          <line x1="0" y1="290" x2="560" y2="290"/>
          <line x1="280" y1="110" x2="0" y2="340"/>
          <line x1="280" y1="110" x2="140" y2="340"/>
          <line x1="280" y1="110" x2="280" y2="340"/>
          <line x1="280" y1="110" x2="420" y2="340"/>
          <line x1="280" y1="110" x2="560" y2="340"/>
        </g>
        {/* Building glow */}
        <ellipse cx="280" cy="155" rx="220" ry="35" fill="rgba(0,180,255,.18)" filter="url(#qf-bld)"/>
        {/* === TERMINAL LEFT WING === */}
        <polygon points="45,95 115,95 115,175 45,175" fill="#1060A0" stroke="#5BE8FF" strokeWidth=".6" strokeOpacity=".4"/>
        <polygon points="45,95 52,88 122,88 115,95" fill="#1E7DC0"/>
        <polygon points="115,95 122,88 122,175 115,175" fill="#0A4070"/>
        <polygon points="45,175 115,175 115,185 45,185" fill="#085080"/>
        <g fill="rgba(180,240,255,.55)">
          <rect x="56" y="103" width="12" height="6" rx="1"/><rect x="74" y="103" width="12" height="6" rx="1"/>
          <rect x="92" y="103" width="12" height="6" rx="1"/>
          <rect x="56" y="118" width="12" height="6" rx="1"/><rect x="92" y="118" width="12" height="6" rx="1"/>
          <rect x="56" y="133" width="12" height="6" rx="1"/><rect x="74" y="133" width="12" height="6" rx="1"/>
        </g>
        <text x="80" y="160" fontSize="7" fill="rgba(0,200,255,.4)" textAnchor="middle">GATE A</text>
        <line x1="45" y1="95" x2="115" y2="95" stroke="#8FF4FF" strokeWidth="1.2" opacity=".5"/>
        {/* === MAIN TERMINAL === */}
        <polygon points="115,90 445,90 445,175 115,175" fill="url(#q-term)" stroke="#5BE8FF" strokeWidth=".8" strokeOpacity=".5"/>
        <polygon points="115,90 122,83 452,83 445,90" fill="#1E7DC0"/>
        <polygon points="445,90 452,83 452,175 445,175" fill="#0A4070"/>
        <polygon points="115,175 445,175 445,185 115,185" fill="#085080"/>
        {/* Roof lines */}
        <g stroke="rgba(10,60,100,.5)" strokeWidth=".7" fill="none">
          <line x1="115" y1="108" x2="445" y2="108"/>
          <line x1="115" y1="126" x2="445" y2="126"/>
          <line x1="115" y1="144" x2="445" y2="144"/>
          <line x1="195" y1="90" x2="195" y2="175"/>
          <line x1="280" y1="90" x2="280" y2="175"/>
          <line x1="365" y1="90" x2="365" y2="175"/>
        </g>
        {/* Windows row 1 */}
        <g fill="rgba(200,240,255,.6)">
          {[130,148,166,200,218,236,290,308,326,370,388,406].map(x=>(
            <rect key={x} x={x} y="97" width="14" height="6" rx="1"/>
          ))}
        </g>
        {/* Windows row 2 */}
        <g fill="rgba(100,200,255,.4)">
          {[130,166,200,236,290,326,370,406].map(x=>(
            <rect key={x} x={x} y="114" width="14" height="6" rx="1"/>
          ))}
        </g>
        {/* Windows row 3 yellow */}
        <g fill="rgba(255,211,0,.25)">
          {[135,155,175,205,225,295,315,375,395,415].map(x=>(
            <rect key={x} x={x} y="132" width="12" height="5" rx="1"/>
          ))}
        </g>
        {/* Entrance gates */}
        <g fill="rgba(0,200,255,.15)" stroke="rgba(0,200,255,.35)" strokeWidth=".5">
          {[135,170,215,250,300,335,380,415].map(x=>(
            <rect key={x} x={x} y="162" width="22" height="12" rx="1.5"/>
          ))}
        </g>
        {/* Arrival Hall */}
        <rect x="245" y="159" width="70" height="16" rx="2" fill="rgba(255,211,0,.1)" stroke="#FFD300" strokeWidth=".8"/>
        <text x="280" y="170" fontSize="7.5" fill="#FFD300" fontWeight="800" textAnchor="middle">ARRIVAL</text>
        <rect x="245" y="174" width="70" height="2" rx="1" fill="#FFD300" opacity=".4" filter="url(#qf-yl)"/>
        <text x="280" y="140" fontSize="11" fill="rgba(255,255,255,.5)" fontWeight="900" textAnchor="middle" letterSpacing="3">TERMINAL</text>
        <text x="280" y="152" fontSize="7" fill="rgba(100,220,255,.45)" textAnchor="middle" letterSpacing="4">{airportCode}</text>
        <line x1="115" y1="90" x2="445" y2="90" stroke="#8FF4FF" strokeWidth="1.5" opacity=".5"/>
        {/* === TERMINAL RIGHT WING === */}
        <polygon points="445,95 515,95 515,175 445,175" fill="#1060A0" stroke="#5BE8FF" strokeWidth=".6" strokeOpacity=".4"/>
        <polygon points="445,95 452,88 522,88 515,95" fill="#1E7DC0"/>
        <polygon points="515,95 522,88 522,175 515,175" fill="#0A4070"/>
        <polygon points="445,175 515,175 515,185 445,185" fill="#085080"/>
        <g fill="rgba(180,240,255,.55)">
          <rect x="456" y="103" width="12" height="6" rx="1"/><rect x="474" y="103" width="12" height="6" rx="1"/>
          <rect x="492" y="103" width="12" height="6" rx="1"/>
          <rect x="456" y="118" width="12" height="6" rx="1"/><rect x="492" y="118" width="12" height="6" rx="1"/>
          <rect x="456" y="133" width="12" height="6" rx="1"/>
        </g>
        <text x="480" y="160" fontSize="7" fill="rgba(0,200,255,.4)" textAnchor="middle">GATE B</text>
        <line x1="445" y1="95" x2="515" y2="95" stroke="#8FF4FF" strokeWidth="1.2" opacity=".5"/>
        {/* === ROADS === */}
        <polygon points="40,188 520,188 510,180 50,180" fill="#0D2650"/>
        <g stroke="rgba(255,255,255,.15)" strokeWidth=".8" strokeDasharray="12 8">
          <line x1="55" y1="184" x2="505" y2="184"/>
        </g>
        <polygon points="40,202 520,202 510,194 50,194" fill="#0E2540" stroke="rgba(255,211,0,.08)" strokeWidth=".3"/>
        <g stroke="rgba(255,211,0,.3)" strokeWidth=".8" strokeDasharray="10 7">
          <line x1="55" y1="198" x2="505" y2="198"/>
        </g>
        {/* Pickup zone labels */}
        <rect x="68" y="193" width="82" height="9" rx="2" fill="rgba(255,211,0,.05)" stroke="rgba(255,211,0,.2)" strokeWidth=".4"/>
        <text x="109" y="200" fontSize="5.5" fill="rgba(255,211,0,.55)" fontWeight="700" textAnchor="middle">PICKUP ZONE A</text>
        <rect x="218" y="193" width="124" height="9" rx="2" fill="rgba(0,229,160,.05)" stroke="rgba(0,229,160,.2)" strokeWidth=".4"/>
        <text x="280" y="200" fontSize="5.5" fill="rgba(0,229,160,.55)" fontWeight="700" textAnchor="middle">PICKUP ZONE B</text>
        <rect x="408" y="193" width="94" height="9" rx="2" fill="rgba(59,139,255,.05)" stroke="rgba(59,139,255,.2)" strokeWidth=".4"/>
        <text x="455" y="200" fontSize="5.5" fill="rgba(59,139,255,.55)" fontWeight="700" textAnchor="middle">PICKUP ZONE C</text>
        {/* Apron */}
        <polygon points="80,210 480,210 460,270 100,270" fill="rgba(10,30,70,.5)" stroke="rgba(0,100,180,.1)" strokeWidth=".4"/>
        <text x="280" y="244" fontSize="7.5" fill="rgba(0,150,255,.15)" textAnchor="middle" letterSpacing="3">APRON</text>
        {/* Runway */}
        <polygon points="40,300 520,300 510,290 50,290" fill="#081C38"/>
        <g stroke="rgba(255,255,255,.4)" strokeWidth="2" strokeDasharray="18 12" strokeLinecap="round">
          <line x1="65" y1="295" x2="495" y2="295"/>
        </g>
        <text x="280" y="298" fontSize="6.5" fill="rgba(100,180,255,.3)" textAnchor="middle" letterSpacing="3">RUNWAY</text>
        {/* Left taxiway markings */}
        <polygon points="0,215 45,215 45,300 0,300" fill="#0A1E38"/>
        <g fill="#FFD300" opacity=".6">
          {[228,244,260,276,292].map(y=><rect key={y} x="6" y={y} width="28" height="5" rx="1"/>)}
        </g>

        {/* ======== VEHICLE TAGS from real queue data ======== */}
        {/* Waiting drivers — yellow tags scattered in staging area */}
        {waiting.slice(0,14).map((q, i) => {
          const cols = 7;
          const col = i % cols;
          const row = Math.floor(i / cols);
          const x = 68 + col * 62;
          const y = 218 + row * 22;
          return (
            <g key={q.id} transform={`translate(${x},${y})`} filter="url(#qf-yl)">
              <ellipse cx="0" cy="-5" rx="22" ry="8" fill="#FFD300"/>
              <rect x="-22" y="-5" width="44" height="8" fill="#B88A00"/>
              <text x="0" y="-1.5" fontSize="6.5" fontWeight="900" fill="#000" textAnchor="middle">
                {q.drivers?.driver_code ?? `Q-${String(q.queue_number).padStart(2,"0")}`}
              </text>
              <line x1="0" y1="3" x2="0" y2="9" stroke="#FFD300" strokeWidth=".8"/>
              <circle cx="0" cy="10" r="1.5" fill="#FFD300"/>
            </g>
          );
        })}

        {/* Called drivers — blue tags near arrival hall */}
        {called.slice(0,5).map((q, i) => {
          const x = 190 + i * 50;
          const y = 206;
          return (
            <g key={q.id} transform={`translate(${x},${y})`} filter="url(#qf-gn)">
              <ellipse cx="0" cy="-5" rx="20" ry="8" fill="#3B8BFF"/>
              <rect x="-20" y="-5" width="40" height="8" fill="#1A3A8B"/>
              <text x="0" y="-1.5" fontSize="6.5" fontWeight="900" fill="#fff" textAnchor="middle">
                {q.drivers?.driver_code ?? `C-${String(q.queue_number).padStart(2,"0")}`}
              </text>
              <line x1="0" y1="3" x2="0" y2="9" stroke="#3B8BFF" strokeWidth=".8"/>
              <circle cx="0" cy="10" r="2" fill="#3B8BFF">
                <animate attributeName="r" values="2;5;2" dur="1.8s" repeatCount="indefinite"/>
                <animate attributeName="opacity" values="1;.2;1" dur="1.8s" repeatCount="indefinite"/>
              </circle>
              <circle cx="0" cy="10" r="1.5" fill="#3B8BFF"/>
            </g>
          );
        })}

        {/* Pickup active — green tags in pickup zones */}
        {pickup.slice(0,5).map((q, i) => {
          const x = 140 + i * 65;
          const y = 215;
          return (
            <g key={q.id} transform={`translate(${x},${y})`} filter="url(#qf-gn)">
              <ellipse cx="0" cy="-5" rx="20" ry="8" fill="#00E5A0"/>
              <rect x="-20" y="-5" width="40" height="8" fill="#006644"/>
              <text x="0" y="-1.5" fontSize="6.5" fontWeight="900" fill="#000" textAnchor="middle">
                {q.drivers?.driver_code ?? `P-${String(q.queue_number).padStart(2,"0")}`}
              </text>
              <line x1="0" y1="3" x2="0" y2="9" stroke="#00E5A0" strokeWidth=".8"/>
              <circle cx="0" cy="10" r="2" fill="#00E5A0">
                <animate attributeName="r" values="2;6;2" dur="1.5s" repeatCount="indefinite"/>
                <animate attributeName="opacity" values="1;.1;1" dur="1.5s" repeatCount="indefinite"/>
              </circle>
              <circle cx="0" cy="10" r="1.5" fill="#00E5A0"/>
            </g>
          );
        })}

        {/* Violations — red alert tags */}
        {susps.slice(0,3).map((q, i) => {
          const x = 340 + i * 58;
          const y = 218;
          return (
            <g key={q.id} transform={`translate(${x},${y})`} filter="url(#qf-rd)">
              <ellipse cx="0" cy="-5" rx="20" ry="8" fill="#FF3B5C"/>
              <rect x="-20" y="-5" width="40" height="8" fill="#7B0020"/>
              <text x="0" y="-1.5" fontSize="6.5" fontWeight="900" fill="#fff" textAnchor="middle">
                {q.drivers?.driver_code ?? `D-${String(q.queue_number).padStart(2,"0")}`}
              </text>
              <line x1="0" y1="3" x2="0" y2="10" stroke="#FF3B5C" strokeWidth="1"/>
              <circle cx="0" cy="11" r="2.5" fill="#FF3B5C">
                <animate attributeName="r" values="2.5;7;2.5" dur="1.2s" repeatCount="indefinite"/>
                <animate attributeName="opacity" values="1;.1;1" dur="1.2s" repeatCount="indefinite"/>
              </circle>
              <circle cx="0" cy="11" r="2" fill="#FF3B5C"/>
            </g>
          );
        })}

        {/* Static filler tags (background vehicles) */}
        {[
          { x:100,y:235,lbl:"CL.09",c:"#00BB55",d:"#007733" },{x:155,y:240,lbl:"CL.24",c:"#009944",d:"#006622"},
          { x:400,y:250,lbl:"CL.55",c:"#00BB55",d:"#007733" },{x:450,y:245,lbl:"CL.72",c:"#009944",d:"#006622"},
          { x:490,y:252,lbl:"CL.88",c:"#00AA44",d:"#006622" },{x:105,y:260,lbl:"CL.30",c:"#009944",d:"#006622"},
          { x:430,y:265,lbl:"CL.41",c:"#00BB44",d:"#007722" },{x:470,y:260,lbl:"CL.16",c:"#009944",d:"#006622"},
        ].map(t=>(
          <g key={t.lbl} transform={`translate(${t.x},${t.y})`}>
            <ellipse cx="0" cy="-4.5" rx="18" ry="7" fill={t.c}/>
            <rect x="-18" y="-4.5" width="36" height="7" fill={t.d}/>
            <text x="0" y="-1" fontSize="6" fontWeight="800" fill="#fff" textAnchor="middle">{t.lbl}</text>
            <line x1="0" y1="2.5" x2="0" y2="7" stroke={t.c} strokeWidth=".7"/>
            <circle cx="0" cy="8" r="1.2" fill={t.c}/>
          </g>
        ))}

        {/* Legend */}
        <rect x="4" y="110" width="120" height="62" rx="4" fill="rgba(4,12,32,.88)" stroke="rgba(0,200,255,.15)" strokeWidth=".5"/>
        <text x="10" y="121" fontSize="7" fill="rgba(0,200,255,.6)" fontWeight="800" letterSpacing="1">LEGENDA</text>
        <ellipse cx="16" cy="131" rx="12" ry="5.5" fill="#FFD300"/><rect x="4" y="131" width="24" height="5.5" fill="#B88A00"/>
        <text x="16" y="135" fontSize="5.5" fontWeight="800" fill="#000" textAnchor="middle">Q-XX</text>
        <text x="32" y="135" fontSize="7" fill="rgba(255,255,255,.6)">Menunggu ({waiting})</text>
        <ellipse cx="16" cy="145" rx="12" ry="5.5" fill="#3B8BFF"/><rect x="4" y="145" width="24" height="5.5" fill="#1A3A8B"/>
        <text x="16" y="149" fontSize="5.5" fontWeight="800" fill="#fff" textAnchor="middle">C-XX</text>
        <text x="32" y="149" fontSize="7" fill="rgba(255,255,255,.6)">Dipanggil ({called})</text>
        <ellipse cx="16" cy="159" rx="12" ry="5.5" fill="#00E5A0"/><rect x="4" y="159" width="24" height="5.5" fill="#006644"/>
        <text x="16" y="163" fontSize="5.5" fontWeight="800" fill="#000" textAnchor="middle">P-XX</text>
        <text x="32" y="163" fontSize="7" fill="rgba(255,255,255,.6)">Pickup ({pickup})</text>
        <ellipse cx="16" cy="173" rx="12" ry="5.5" fill="#FF3B5C"/><rect x="4" y="173" width="24" height="5.5" fill="#7B0020"/>
        <text x="16" y="177" fontSize="5.5" fontWeight="800" fill="#fff" textAnchor="middle">D-XX</text>
        <text x="32" y="177" fontSize="7" fill="rgba(255,255,255,.6)">Pelanggaran ({susps.length})</text>

        {/* Compass */}
        <g transform="translate(535,320)">
          <circle r="16" fill="rgba(4,12,32,.8)" stroke="rgba(0,200,255,.2)" strokeWidth=".7"/>
          <polygon points="0,-12 2.5,-4 0,-7 -2.5,-4" fill="#FF3B5C"/>
          <polygon points="0,12 2.5,4 0,7 -2.5,4" fill="rgba(255,255,255,.25)"/>
          <text x="0" y="-13" fontSize="6.5" fill="#FF3B5C" fontWeight="800" textAnchor="middle">N</text>
        </g>
        {/* Coords bar */}
        <text x="8" y="336" fontSize="6" fill="rgba(0,200,255,.3)" fontFamily="monospace">
          {airportCode} · Realtime Queue Monitor · {new Date().toLocaleTimeString("id-ID")}
        </text>
      </g>
    </svg>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   WAVE GRAPH
══════════════════════════════════════════════════════════════════════════ */
function WaveGraph({ waiting, completed }: { waiting: number; completed: number }) {
  const hours = [0,2,4,6,8,10,12,14,16,18,20,22];
  const now = new Date().getHours();
  const pts = hours.map((h, i) => {
    const base = h < 6 ? 5 : h < 9 ? 25 : h < 12 ? 60 : h < 14 ? 80 : h < 17 ? 70 : h < 20 ? 45 : 20;
    const jitter = (h * 7 + i * 13) % 20 - 10;
    const val = h > now ? 0 : Math.max(5, base + jitter);
    return val;
  });
  const max = Math.max(...pts, 1);
  const w = 170, h2 = 65, pad = 5;
  const getX = (i: number) => pad + (i / (pts.length - 1)) * (w - pad * 2);
  const getY = (v: number) => h2 - pad - (v / max) * (h2 - pad * 2);
  const pathD = pts.map((v, i) => `${i === 0 ? "M" : "L"}${getX(i).toFixed(1)},${getY(v).toFixed(1)}`).join(" ");
  const areaD = pathD + ` L${getX(pts.length-1).toFixed(1)},${h2} L${getX(0).toFixed(1)},${h2} Z`;

  return (
    <svg width="100%" height={h2} viewBox={`0 0 ${w} ${h2}`} style={{ display:"block" }}>
      <defs>
        <linearGradient id="wg-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFD300" stopOpacity=".25"/>
          <stop offset="100%" stopColor="#FFD300" stopOpacity="0"/>
        </linearGradient>
      </defs>
      <line x1={pad} y1={h2*0.33} x2={w-pad} y2={h2*0.33} stroke="rgba(255,255,255,.04)" strokeWidth=".5"/>
      <line x1={pad} y1={h2*0.66} x2={w-pad} y2={h2*0.66} stroke="rgba(255,255,255,.04)" strokeWidth=".5"/>
      <path d={areaD} fill="url(#wg-fill)"/>
      <path d={pathD} stroke="#FFD300" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      {pts.map((v, i) => v > 0 && (
        <circle key={i} cx={getX(i)} cy={getY(v)} r="1.5" fill="#FFD300" opacity=".7"/>
      ))}
      {/* Current pulse */}
      <circle cx={getX(Math.min(now/2|0, pts.length-1))} cy={getY(pts[Math.min(now/2|0, pts.length-1)] ?? 0)} r="3" fill="#FFD300">
        <animate attributeName="r" values="3;7;3" dur="1.5s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="1;.3;1" dur="1.5s" repeatCount="indefinite"/>
      </circle>
      <g fontSize="5.5" fill="rgba(255,255,255,.25)">
        <text x={pad} y={h2-1}>06</text>
        <text x={w/2-6} y={h2-1}>12</text>
        <text x={w-16} y={h2-1}>NOW</text>
      </g>
    </svg>
  );
}

/* ── Small action button ─────────────────────────────────────────────── */
function QBtn({ children, color, outline, onClick }: { children: React.ReactNode; color: string; outline?: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      fontSize: 9, fontWeight: 700, padding: "3px 8px", borderRadius: 5, cursor: "pointer",
      whiteSpace: "nowrap", transition: "opacity .15s",
      background: outline ? "transparent" : color,
      border: `1px solid ${color}`,
      color: outline ? color : color === "#FFD300" ? "#000" : "#fff",
    }}>
      {children}
    </button>
  );
}
