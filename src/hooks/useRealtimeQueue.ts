// src/hooks/useRealtimeQueue.ts
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export interface QueueItem {
  id: string;
  driver_id: string;
  airport_id: string;
  status: "WAITING" | "CALLED" | "PICKUP" | "COMPLETED" | "SUSPENDED" | "NO_SHOW";
  position: number;
  checked_in_at: string;
  drivers?: {
    driver_code: string;
    nama: string;
    driver_type: "INTERNAL" | "EXTERNAL";
  };
}

export function useRealtimeQueue(airportId: string) {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const supabase = createClient();

  const fetchSnapshot = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("pickup_queues")
        .select(`
          id, driver_id, airport_id, status, position, checked_in_at,
          drivers (driver_code, nama, driver_type)
        `)
        .eq("airport_id", airportId)
        .in("status", ["WAITING", "CALLED", "PICKUP"])
        .order("position", { ascending: true });

      if (error) throw error;
      setQueue((data as unknown as QueueItem[]) || []);
    } catch (err) {
      console.error("Gagal mengambil snapshot antrean:", err);
    } finally {
      setIsLoading(false);
    }
  }, [airportId, supabase]);

  useEffect(() => {
    if (!airportId) return;

    fetchSnapshot();

    const channel = supabase
      .channel(`live_queue_airport_${airportId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "pickup_queues",
          filter: `airport_id=eq.${airportId}`,
        },
        async (payload) => {
          if (payload.eventType === "INSERT" || payload.eventType === "DELETE") {
            await fetchSnapshot();
            return;
          }

          if (payload.eventType === "UPDATE") {
            const updatedRecord = payload.new as QueueItem;
            if (["COMPLETED", "SUSPENDED", "NO_SHOW"].includes(updatedRecord.status)) {
              setQueue((prev) => prev.filter((item) => item.id !== updatedRecord.id));
            } else {
              await fetchSnapshot();
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [airportId, fetchSnapshot, supabase]);

  return { queue, isLoading, refreshQueue: fetchSnapshot };
}
