"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { AirportGeo } from "./GeofenceMap";

const GeofenceMap = dynamic(() => import("./GeofenceMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full flex items-center justify-center bg-blue-50">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm text-blue-600 font-medium">Memuat peta...</p>
      </div>
    </div>
  ),
});

const AIRPORT_COLORS = [
  "#2563EB", "#DC2626", "#16A34A", "#D97706", "#7C3AED", "#0891B2", "#DB2777",
];

interface GeofenceClientProps {
  airports: AirportGeo[];
  canEdit: boolean;
}

export default function GeofenceClient({ airports, canEdit }: GeofenceClientProps) {
  const [selected, setSelected] = useState<string | null>(null);
  const [editRadius, setEditRadius] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [airportList, setAirportList] = useState<AirportGeo[]>(airports);
  const supabase = createClient();

  const selectedAirport = airportList.find((a) => a.code === selected);

  function handleSelect(code: string) {
    setSelected((prev) => (prev === code ? null : code));
    setEditRadius(null);
  }

  async function handleSaveRadius() {
    if (!selected || editRadius == null) return;
    setSaving(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("airports")
      .update({ radius_meter: editRadius })
      .eq("code", selected);
    if (!error) {
      setAirportList((prev) =>
        prev.map((a) => (a.code === selected ? { ...a, radius_meter: editRadius } : a))
      );
      setEditRadius(null);
    }
    setSaving(false);
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-black" style={{ color: "var(--text-primary)" }}>
          Geofence Bandara
        </h1>
        <p className="text-sm mt-0.5" style={{ color: "var(--text-muted)" }}>
          Kelola zona geofence setiap bandara RIFIM
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Airport list */}
        <div className="bg-white rounded-2xl card-shadow border border-gray-100 divide-y divide-gray-50">
          {airportList.map((ap, i) => (
            <button
              key={ap.id}
              onClick={() => handleSelect(ap.code)}
              className={`w-full px-4 py-3.5 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 ${
                selected === ap.code ? "bg-blue-50" : ""
              }`}
            >
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ background: AIRPORT_COLORS[i % AIRPORT_COLORS.length] }}
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-gray-800 truncate">{ap.name}</p>
                <p className="text-xs text-gray-500">
                  {ap.city} · {ap.code} · {ap.radius_meter}m
                </p>
              </div>
              {selected === ap.code && (
                <svg viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" className="w-4 h-4 flex-shrink-0">
                  <path d="M9 18l6-6-6-6" />
                </svg>
              )}
            </button>
          ))}
        </div>

        {/* Map */}
        <div className="lg:col-span-2 bg-white rounded-2xl card-shadow border border-gray-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-gray-800">
              {selectedAirport ? selectedAirport.name : "Semua Bandara"}
            </h3>
            {selectedAirport && canEdit && (
              <div className="flex items-center gap-2">
                {editRadius !== null ? (
                  <>
                    <input
                      type="number"
                      value={editRadius}
                      onChange={(e) => setEditRadius(Number(e.target.value))}
                      className="w-24 text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      min={100}
                      max={5000}
                      step={50}
                    />
                    <span className="text-xs text-gray-500">meter</span>
                    <button
                      onClick={handleSaveRadius}
                      disabled={saving}
                      className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {saving ? "Menyimpan..." : "Simpan"}
                    </button>
                    <button
                      onClick={() => setEditRadius(null)}
                      className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1.5"
                    >
                      Batal
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setEditRadius(selectedAirport.radius_meter)}
                    className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1.5 px-2 py-1.5 rounded-lg hover:bg-blue-50"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                    Edit Radius
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="h-[480px] relative">
            <GeofenceMap
              airports={airportList}
              selectedCode={selected}
              onSelect={handleSelect}
            />
          </div>
          {selectedAirport && (
            <div className="px-4 py-3 border-t border-gray-100 grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-500 text-xs">Koordinat</p>
                <p className="font-mono text-xs">
                  {selectedAirport.latitude.toFixed(5)}, {selectedAirport.longitude.toFixed(5)}
                </p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Radius Geofence</p>
                <p className="font-semibold">
                  {editRadius !== null ? editRadius : selectedAirport.radius_meter}m
                </p>
              </div>
              <div>
                <p className="text-gray-500 text-xs">Luas Area</p>
                <p className="font-semibold">
                  {(Math.PI * Math.pow(selectedAirport.radius_meter, 2) / 10000).toFixed(1)} ha
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
