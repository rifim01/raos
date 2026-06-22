import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import AttendanceClient, { type DailyRecord, type MonthlyRecord } from "./AttendanceClient";

export const dynamic = "force-dynamic";

const WORK_START_HOUR = 7;
const LATE_GRACE_MINUTES = 15;

function determineStatus(waktu_masuk: string | null): DailyRecord["status"] {
  if (!waktu_masuk) return "ALPHA";
  const checkin = new Date(waktu_masuk);
  const cutoff = new Date(checkin);
  cutoff.setHours(WORK_START_HOUR, LATE_GRACE_MINUTES, 0, 0);
  return checkin > cutoff ? "TERLAMBAT" : "HADIR";
}

export default async function AttendancePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const supabase = await createClient();
  const today = new Date().toISOString().split("T")[0];

  const todayLabel = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // ── Today's attendance records ──────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let attQuery = (supabase as any)
    .from("attendance")
    .select(
      `id, check_type, tanggal, created_at, distance_status, photo_url,
       staff:staff_id(id, nama, jabatan, staff_code),
       airport:airport_id(id, code)`
    )
    .eq("tanggal", today)
    .order("created_at", { ascending: false });

  if (user.role_level <= 3 && user.airport_id) {
    attQuery = attQuery.eq("airport_id", user.airport_id);
  }

  const { data: rawRecords } = await attQuery;

  // Aggregate: one DailyRecord per staff
  type RawRow = {
    id: string;
    check_type: "CHECK_IN" | "CHECK_OUT";
    created_at: string;
    distance_status: string;
    staff: { id: string; nama: string; jabatan: string; staff_code: string } | null;
    airport: { id: string; code: string } | null;
  };

  const dailyMap = new Map<string, Omit<DailyRecord, "status" | "durasi_menit"> & { durasi_menit: number | null }>();

  (rawRecords as RawRow[] ?? []).forEach((row) => {
    const s = row.staff;
    const a = row.airport;
    if (!s) return;
    const key = s.id;

    if (!dailyMap.has(key)) {
      dailyMap.set(key, {
        staff_id: s.id,
        staff_code: s.staff_code,
        nama: s.nama,
        jabatan: s.jabatan,
        airport_code: a?.code ?? "",
        waktu_masuk: null,
        waktu_keluar: null,
        masuk_valid: false,
        keluar_valid: false,
        durasi_menit: null,
      });
    }

    const rec = dailyMap.get(key)!;
    if (row.check_type === "CHECK_IN") {
      if (!rec.waktu_masuk || row.created_at < rec.waktu_masuk) {
        rec.waktu_masuk = row.created_at;
        rec.masuk_valid = row.distance_status === "VALID";
      }
    } else if (row.check_type === "CHECK_OUT") {
      if (!rec.waktu_keluar || row.created_at > rec.waktu_keluar) {
        rec.waktu_keluar = row.created_at;
        rec.keluar_valid = row.distance_status === "VALID";
      }
    }
  });

  const records: DailyRecord[] = Array.from(dailyMap.values()).map((r) => {
    const durasi =
      r.waktu_masuk && r.waktu_keluar
        ? Math.round((new Date(r.waktu_keluar).getTime() - new Date(r.waktu_masuk).getTime()) / 60000)
        : null;
    return { ...r, status: determineStatus(r.waktu_masuk), durasi_menit: durasi };
  });

  // Sort: TERLAMBAT → HADIR → ALPHA
  const ORDER = { TERLAMBAT: 0, HADIR: 1, ALPHA: 2 };
  records.sort((a, b) => ORDER[a.status] - ORDER[b.status]);

  // ── Total active staff count ────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let staffCountQuery = (supabase as any)
    .from("staff")
    .select("*", { count: "exact", head: true })
    .eq("status", "ACTIVE");

  if (user.role_level <= 3 && user.airport_id) {
    staffCountQuery = staffCountQuery.eq("airport_id", user.airport_id);
  }

  const { count: totalStaff } = await staffCountQuery;

  // ── Monthly aggregate (current month) ──────────────────────
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let monthQuery = (supabase as any)
    .from("attendance")
    .select(
      `staff_id, check_type, created_at,
       staff:staff_id(id, nama, staff_code),
       airport:airport_id(code)`
    )
    .eq("check_type", "CHECK_IN")
    .gte("tanggal", monthStart)
    .lte("tanggal", today);

  if (user.role_level <= 3 && user.airport_id) {
    monthQuery = monthQuery.eq("airport_id", user.airport_id);
  }

  const { data: monthRaw } = await monthQuery;

  // Aggregate monthly per staff
  const monthMap = new Map<
    string,
    { staff_id: string; nama: string; airport_code: string; hadir: number; terlambat: number }
  >();

  type MonthRow = {
    staff_id: string;
    created_at: string;
    staff: { id: string; nama: string; staff_code: string } | null;
    airport: { code: string } | null;
  };

  (monthRaw as MonthRow[] ?? []).forEach((row) => {
    const s = row.staff;
    if (!s) return;
    if (!monthMap.has(s.id)) {
      monthMap.set(s.id, { staff_id: s.id, nama: s.nama, airport_code: row.airport?.code ?? "", hadir: 0, terlambat: 0 });
    }
    const m = monthMap.get(s.id)!;
    const status = determineStatus(row.created_at);
    if (status === "TERLAMBAT") m.terlambat++;
    else m.hadir++;
  });

  const workingDaysSoFar = now.getDate();
  const monthly: MonthlyRecord[] = Array.from(monthMap.values()).map((m) => ({
    ...m,
    alpha: Math.max(0, workingDaysSoFar - m.hadir - m.terlambat),
    pct_kehadiran: Math.round(((m.hadir + m.terlambat) / workingDaysSoFar) * 100),
  }));
  monthly.sort((a, b) => b.pct_kehadiran - a.pct_kehadiran);

  const syncKey = process.env.ATTENDANCE_SYNC_KEY ?? "";

  return (
    <AttendanceClient
      records={records}
      totalStaff={totalStaff ?? 0}
      todayLabel={todayLabel}
      monthly={monthly}
      syncKey={syncKey}
    />
  );
}
