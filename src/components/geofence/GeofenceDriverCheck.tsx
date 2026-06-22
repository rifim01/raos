"use client";

/**
 * GeofenceDriverCheck
 * Komponen untuk driver PWA — validasi posisi GPS vs radius bandara.
 * Block total check-in kalau di luar radius.
 * Gunakan dynamic import (ssr:false) di parent karena pakai navigator.geolocation.
 */

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";

const MapDisplay = dynamic(() => import("./GeofenceDriverMap"), { ssr: false,
  loading: () => (
    <div className="h-48 bg-blue-50 rounded-2xl flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

/** Haversine client-side (sama persis dengan fungsi PostgreSQL) */
export function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

interface Airport {
  id: string; code: string; city: string; name: string;
  latitude: number; longitude: number; radius_meter: number; radius_confirmed?: boolean;
}

interface GeofenceResult {
  within: boolean;
  distance_m: number;
  radius_m: number;
  margin_m: number;
}

interface Props {
  airport: Airport;
  onStatusChange?: (within: boolean, distanceM: number) => void;
}

export default function GeofenceDriverCheck({ airport, onStatusChange }: Props) {
  const [pos, setPos] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [result, setResult] = useState<GeofenceResult | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const checkGeofence = useCallback((lat: number, lng: number) => {
    const dist = haversineMeters(lat, lng, airport.latitude, airport.longitude);
    const within = dist <= airport.radius_meter;
    const r: GeofenceResult = {
      within,
      distance_m: Math.round(dist),
      radius_m: airport.radius_meter,
      margin_m: Math.round(airport.radius_meter - dist),
    };
    setResult(r);
    onStatusChange?.(within, Math.round(dist));
  }, [airport, onStatusChange]);

  const refreshGPS = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError("Browser tidak mendukung GPS.");
      return;
    }
    setLoading(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const { latitude: lat, longitude: lng, accuracy } = p.coords;
        setPos({ lat, lng, accuracy });
        checkGeofence(lat, lng);
        setLoading(false);
      },
      (e) => {
        setGpsError(e.code === 1 ? "Izin GPS ditolak — aktifkan di pengaturan browser." : `GPS error: ${e.message}`);
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, [checkGeofence]);

  useEffect(() => { refreshGPS(); }, [refreshGPS]);

  const within   = result?.within ?? false;
  const distText = result ? `${result.distance_m.toLocaleString("id-ID")}m` : "—";
  const marginTxt = result
    ? result.within
      ? `${Math.abs(result.margin_m).toLocaleString("id-ID")}m dari batas`
      : `${Math.abs(result.margin_m).toLocaleString("id-ID")}m di luar radius`
    : "";

  return (
    <div className="space-y-4">
      {/* Status banner */}
      <div className={`rounded-2xl p-5 text-center ${within ? "bg-emerald-50 border border-emerald-200" : "bg-red-50 border border-red-300"}`}>
        <div className="text-4xl mb-2">{loading ? "📡" : within ? "✅" : "🚫"}</div>
        <p className={`text-lg font-black ${within ? "text-emerald-700" : "text-red-700"}`}>
          {loading ? "Mengecek posisi GPS..." :
           gpsError ? "GPS tidak tersedia" :
           within ? "Anda berada di dalam area bandara" : "BLOKIR — Di luar radius bandara"}
        </p>
        {result && !loading && !gpsError && (
          <p className={`text-sm mt-1 font-semibold ${within ? "text-emerald-600" : "text-red-600"}`}>
            Jarak ke {airport.city}: <strong>{distText}</strong> · Radius: {airport.radius_meter}m · {marginTxt}
          </p>
        )}
        {gpsError && <p className="text-sm mt-1 text-red-600">{gpsError}</p>}
      </div>

      {/* Map */}
      {pos && (
        <MapDisplay
          airport={airport}
          driverLat={pos.lat}
          driverLng={pos.lng}
          accuracy={pos.accuracy}
          within={within}
        />
      )}

      {/* Detail */}
      {result && !loading && (
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-white border border-gray-200 rounded-xl p-3">
            <p className={`text-xl font-black ${within ? "text-emerald-600" : "text-red-600"}`}>{distText}</p>
            <p className="text-xs text-gray-400 mt-1">Jarak GPS → Bandara</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-3">
            <p className="text-xl font-black text-gray-700">{airport.radius_meter}m</p>
            <p className="text-xs text-gray-400 mt-1">Radius Diizinkan</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-3">
            <p className={`text-xl font-black ${within ? "text-emerald-600" : "text-red-600"}`}>
              {within ? `+${Math.abs(result.margin_m)}m` : `-${Math.abs(result.margin_m)}m`}
            </p>
            <p className="text-xs text-gray-400 mt-1">Margin</p>
          </div>
        </div>
      )}

      {/* Pesan blokir eksplisit */}
      {result && !result.within && !loading && (
        <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-4">
          <p className="font-black text-red-800 text-sm">Check-in tidak dapat dilakukan</p>
          <p className="text-red-700 text-xs mt-1">
            Anda berada <strong>{result.distance_m.toLocaleString("id-ID")}m</strong> dari bandara {airport.city}.
            Radius yang diizinkan adalah <strong>{airport.radius_meter}m</strong>.
            Silakan mendekat ke bandara sebelum melakukan check-in.
          </p>
          {airport.radius_confirmed === false && (
            <p className="text-amber-600 text-xs mt-2 italic">
              * Radius bandara ini masih PROVISIONAL — bisa berubah setelah dikonfirmasi.
            </p>
          )}
        </div>
      )}

      <button onClick={refreshGPS} disabled={loading}
        className={`w-full py-2.5 rounded-xl text-sm font-bold border transition-colors ${
          loading ? "opacity-50 bg-gray-100 text-gray-400" :
          "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
        }`}>
        {loading ? "Memperbarui GPS..." : "🔄 Refresh Posisi GPS"}
      </button>
    </div>
  );
}
