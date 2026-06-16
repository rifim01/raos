"use server";

import { createClient } from "@/lib/supabase/server";

const TODAY = () => new Date().toISOString().split("T")[0];

// ─── 1. Driver Check In ──────────────────────────────────────────────────────
export async function qmsCheckIn(driverId: string, airportId: string) {
  const supabase = await createClient();

  const { data: existing } = await (supabase as any)
    .from("pickup_queues")
    .select("id, status, queue_number")
    .eq("driver_id", driverId)
    .eq("airport_id", airportId)
    .eq("tanggal", TODAY())
    .in("status", ["WAITING", "CALLED", "PICKUP"])
    .maybeSingle();

  if (existing) {
    return { error: "Driver sudah ada dalam antrian aktif", data: null };
  }

  const { data: qNum } = await (supabase as any).rpc("qms_next_queue_number", { p_airport_id: airportId });
  const { data: pos }  = await (supabase as any).rpc("qms_next_position",     { p_airport_id: airportId });

  const { data, error } = await (supabase as any)
    .from("pickup_queues")
    .insert({
      driver_id:     driverId,
      airport_id:    airportId,
      queue_number:  qNum,
      position:      pos,
      status:        "WAITING",
      tanggal:       TODAY(),
      check_in_time: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) return { error: error.message, data: null };

  await (supabase as any).from("queue_history").insert({
    queue_id: data.id,
    action:   "CHECK_IN",
    notes:    `Check in. Nomor antrian: ${qNum}`,
  });

  return { data, error: null };
}

// ─── 2. Call Next Driver ─────────────────────────────────────────────────────
export async function qmsCallNext(airportId: string, calledByAuthId: string) {
  const supabase = await createClient();

  const { data: next, error: findErr } = await (supabase as any)
    .from("pickup_queues")
    .select("*, drivers(nama, driver_code)")
    .eq("airport_id", airportId)
    .eq("status", "WAITING")
    .eq("tanggal", TODAY())
    .order("priority", { ascending: false })
    .order("position",  { ascending: true })
    .limit(1)
    .maybeSingle();

  if (findErr || !next) return { error: "Tidak ada driver dalam antrian", data: null };

  const { data, error } = await (supabase as any)
    .from("pickup_queues")
    .update({ status: "CALLED", call_time: new Date().toISOString(), called_by: calledByAuthId })
    .eq("id", next.id)
    .select()
    .single();

  if (error) return { error: error.message, data: null };

  await Promise.all([
    (supabase as any).from("queue_calls").insert({
      queue_id:  next.id,
      driver_id: next.driver_id,
      called_by: calledByAuthId,
      call_time: new Date().toISOString(),
      status:    "PENDING",
    }),
    (supabase as any).from("queue_history").insert({
      queue_id: next.id,
      action:   "CALLED",
      actor_id: calledByAuthId,
      notes:    `Nomor ${next.queue_number} dipanggil`,
    }),
  ]);

  return { data, error: null };
}

// ─── 3. Confirm Pickup (CALLED → PICKUP) ─────────────────────────────────────
export async function qmsConfirmPickup(queueId: string) {
  const supabase = await createClient();

  const { data, error } = await (supabase as any)
    .from("pickup_queues")
    .update({ status: "PICKUP", serve_time: new Date().toISOString(), pickup_time: new Date().toISOString() })
    .eq("id", queueId)
    .eq("status", "CALLED")
    .select("*, drivers(nama)")
    .single();

  if (error || !data) return { error: error?.message ?? "Queue tidak ditemukan atau status bukan CALLED", data: null };

  await Promise.all([
    (supabase as any).from("queue_history").insert({
      queue_id: queueId,
      action:   "PICKUP",
      notes:    "Driver konfirmasi pickup",
    }),
    (supabase as any)
      .from("queue_calls")
      .update({ status: "RESPONDED", response_time: new Date().toISOString() })
      .eq("queue_id", queueId)
      .eq("status", "PENDING"),
  ]);

  return { data, error: null };
}

// ─── 4. Complete Pickup (PICKUP → COMPLETED) ─────────────────────────────────
export async function qmsComplete(queueId: string) {
  const supabase = await createClient();

  const { data, error } = await (supabase as any)
    .from("pickup_queues")
    .update({ status: "COMPLETED", done_time: new Date().toISOString(), completed_time: new Date().toISOString() })
    .eq("id", queueId)
    .eq("status", "PICKUP")
    .select("*, airport_id")
    .single();

  if (error || !data) return { error: error?.message ?? "Queue tidak ditemukan atau status bukan PICKUP", data: null };

  await (supabase as any).from("queue_history").insert({
    queue_id: queueId,
    action:   "COMPLETED",
    notes:    "Pickup selesai",
  });

  await (supabase as any).rpc("qms_compact_positions", { p_airport_id: data.airport_id });

  return { data, error: null };
}

// ─── 5. Mark No Show (CALLED → NO_SHOW) ──────────────────────────────────────
export async function qmsNoShow(queueId: string, calledByAuthId: string) {
  const supabase = await createClient();

  const { data: q } = await (supabase as any)
    .from("pickup_queues")
    .select("driver_id, airport_id, no_show_count")
    .eq("id", queueId)
    .single();

  if (!q) return { error: "Queue tidak ditemukan", data: null };

  const { data, error } = await (supabase as any)
    .from("pickup_queues")
    .update({
      status:        "NO_SHOW",
      no_show_count: (q.no_show_count ?? 0) + 1,
    })
    .eq("id", queueId)
    .select()
    .single();

  if (error) return { error: error.message, data: null };

  await Promise.all([
    (supabase as any).from("queue_history").insert({
      queue_id: queueId,
      action:   "NO_SHOW",
      actor_id: calledByAuthId,
      notes:    "Driver tidak hadir saat dipanggil",
    }),
    (supabase as any).from("queue_violations").insert({
      driver_id:      q.driver_id,
      airport_id:     q.airport_id,
      queue_id:       queueId,
      violation_type: "NO_SHOW",
      description:    "Driver tidak hadir saat dipanggil",
      penalty:        1,
    }),
    (supabase as any).from("queue_calls")
      .update({ status: "NO_RESPONSE", response_time: new Date().toISOString() })
      .eq("queue_id", queueId)
      .eq("status", "PENDING"),
  ]);

  await (supabase as any).rpc("qms_compact_positions", { p_airport_id: q.airport_id });

  return { data, error: null };
}

// ─── 6. Suspend Driver ────────────────────────────────────────────────────────
export async function qmsSuspend(queueId: string, reason: string, calledByAuthId: string) {
  const supabase = await createClient();

  const { data: q } = await (supabase as any)
    .from("pickup_queues")
    .select("driver_id, airport_id, status")
    .eq("id", queueId)
    .single();

  if (!q) return { error: "Queue tidak ditemukan", data: null };

  const { data, error } = await (supabase as any)
    .from("pickup_queues")
    .update({ status: "SUSPENDED", suspended_reason: reason })
    .eq("id", queueId)
    .select()
    .single();

  if (error) return { error: error.message, data: null };

  await Promise.all([
    (supabase as any).from("queue_history").insert({
      queue_id: queueId,
      action:   "SUSPENDED",
      actor_id: calledByAuthId,
      notes:    reason,
    }),
    (supabase as any).from("queue_violations").insert({
      driver_id:      q.driver_id,
      airport_id:     q.airport_id,
      queue_id:       queueId,
      violation_type: "DISCIPLINE",
      description:    reason,
      penalty:        2,
    }),
  ]);

  await (supabase as any).rpc("qms_compact_positions", { p_airport_id: q.airport_id });

  return { data, error: null };
}

// ─── 7. Prioritize Driver (move to front) ─────────────────────────────────────
export async function qmsPrioritize(queueId: string, calledByAuthId: string) {
  const supabase = await createClient();

  const { data: q } = await (supabase as any)
    .from("pickup_queues")
    .select("driver_id, airport_id, queue_number")
    .eq("id", queueId)
    .single();

  if (!q) return { error: "Queue tidak ditemukan", data: null };

  const { data, error } = await (supabase as any)
    .from("pickup_queues")
    .update({ priority: true, position: 0 })
    .eq("id", queueId)
    .select()
    .single();

  if (error) return { error: error.message, data: null };

  await (supabase as any).rpc("qms_compact_positions", { p_airport_id: q.airport_id });

  await (supabase as any).from("queue_history").insert({
    queue_id: queueId,
    action:   "PRIORITIZED",
    actor_id: calledByAuthId,
    notes:    "Driver dipindahkan ke prioritas antrian",
  });

  return { data, error: null };
}

// ─── 8. Skip Driver (move to back) ───────────────────────────────────────────
export async function qmsSkip(queueId: string, calledByAuthId: string) {
  const supabase = await createClient();

  const { data: q } = await (supabase as any)
    .from("pickup_queues")
    .select("driver_id, airport_id, queue_number")
    .eq("id", queueId)
    .single();

  if (!q) return { error: "Queue tidak ditemukan", data: null };

  const { data: lastPos } = await (supabase as any).rpc("qms_next_position", { p_airport_id: q.airport_id });

  const { data, error } = await (supabase as any)
    .from("pickup_queues")
    .update({ status: "WAITING", position: lastPos, priority: false })
    .eq("id", queueId)
    .select()
    .single();

  if (error) return { error: error.message, data: null };

  await Promise.all([
    (supabase as any).from("queue_history").insert({
      queue_id: queueId,
      action:   "SKIPPED",
      actor_id: calledByAuthId,
      notes:    "Driver dilewati, dipindahkan ke belakang antrian",
    }),
    (supabase as any).from("queue_violations").insert({
      driver_id:      q.driver_id,
      airport_id:     q.airport_id,
      queue_id:       queueId,
      violation_type: "SKIP",
      description:    "Driver dilewati oleh koordinator",
      penalty:        0,
    }),
  ]);

  return { data, error: null };
}
