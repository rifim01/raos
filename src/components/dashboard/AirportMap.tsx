"use client";

import dynamic from "next/dynamic";
import { AIRPORTS } from "@/lib/utils";

// Airport coordinates (real GPS)
const AIRPORT_COORDS: Record<string, [number, number]> = {
  DJB001: [-1.6318,  103.6438],
  PKU001: [ 0.4608,  101.4449],
  BTH001: [ 1.1213,  104.1189],
  BPN001: [-1.2675,  116.8940],
  MDC001: [ 1.5484,  124.9261],
  UPG001: [-5.0614,  119.5542],
  CGK001: [-6.1256,  106.6558],
};

// Leaflet component loaded only client-side
const LeafletMap = dynamic(() => import("./LeafletMap"), { ssr: false, loading: () => (
  <div className="w-full h-64 flex items-center justify-center bg-blue-50 rounded-xl">
    <div className="text-blue-400 text-sm">Memuat peta...</div>
  </div>
)});

export default function AirportMap() {
  const markers = AIRPORTS.map((a) => ({
    code: a.code,
    city: a.city,
    coords: AIRPORT_COORDS[a.code] ?? [-2.5, 118],
    planned: a.code === "CGK001",
  }));

  return (
    <div className="bg-white rounded-2xl card-shadow border border-blue-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h3 className="font-bold text-gray-800">Peta Operasional Indonesia</h3>
          <p className="text-xs text-gray-400 mt-0.5">Lokasi bandara aktif RIFIM · OpenStreetMap</p>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#1565C0]" /> Aktif</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-yellow-400" /> Rencana</span>
        </div>
      </div>
      <div className="p-0" style={{ height: 360 }}>
        <LeafletMap markers={markers} />
      </div>
    </div>
  );
}
