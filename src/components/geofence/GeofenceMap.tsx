"use client";

import { useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Circle, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type AirportGeo = {
  id: string;
  code: string;
  name: string;
  city: string;
  latitude: number;
  longitude: number;
  radius_meter: number;
  radius_confirmed?: boolean;
};

const AIRPORT_COLORS = [
  "#2563EB", "#DC2626", "#16A34A", "#D97706", "#7C3AED", "#0891B2", "#DB2777",
];

function AirportCircle({ airport, color, selected, onSelect }: {
  airport: AirportGeo;
  color: string;
  selected: boolean;
  onSelect: () => void;
}) {
  const icon = L.divIcon({
    html: `<div style="width:10px;height:10px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>`,
    className: "",
    iconSize: [10, 10],
    iconAnchor: [5, 5],
    popupAnchor: [0, -10],
  });

  return (
    <>
      <Circle
        center={[airport.latitude, airport.longitude]}
        radius={airport.radius_meter}
        pathOptions={{
          color,
          fillColor: color,
          fillOpacity: selected ? 0.15 : 0.07,
          weight: selected ? 3 : 2,
          dashArray: selected ? undefined : "6 4",
        }}
        eventHandlers={{ click: onSelect }}
      >
        <Popup>
          <div className="text-sm">
            <p className="font-bold">{airport.name}</p>
            <p className="text-gray-500">{airport.city} · {airport.code}</p>
            <p className="text-xs mt-1">
              Radius geofence: <strong>{airport.radius_meter}m</strong>
              {airport.radius_confirmed === false && (
                <span style={{ color: "#D97706", marginLeft: 4 }}>⚠ PROVISIONAL</span>
              )}
            </p>
            <p className="text-xs text-gray-400">
              {airport.latitude.toFixed(6)}, {airport.longitude.toFixed(6)}
            </p>
          </div>
        </Popup>
      </Circle>
      <Marker
        position={[airport.latitude, airport.longitude]}
        icon={icon}
        eventHandlers={{ click: onSelect }}
      />
    </>
  );
}

function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  const prev = useRef(center);
  useEffect(() => {
    if (prev.current[0] !== center[0] || prev.current[1] !== center[1]) {
      map.flyTo(center, zoom, { animate: true, duration: 1 });
      prev.current = center;
    }
  }, [center, zoom, map]);
  return null;
}

interface GeofenceMapProps {
  airports: AirportGeo[];
  selectedCode: string | null;
  onSelect: (code: string) => void;
}

export default function GeofenceMap({ airports, selectedCode, onSelect }: GeofenceMapProps) {
  const center: [number, number] = selectedCode
    ? (() => {
        const ap = airports.find((a) => a.code === selectedCode);
        return ap ? [ap.latitude, ap.longitude] : [0, 117];
      })()
    : [0, 117];

  const zoom = selectedCode ? 13 : 5;

  return (
    <MapContainer center={center} zoom={zoom} className="h-full w-full z-0" scrollWheelZoom>
      <MapController center={center} zoom={zoom} />
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      {airports.map((ap, i) => (
        <AirportCircle
          key={ap.id}
          airport={ap}
          color={AIRPORT_COLORS[i % AIRPORT_COLORS.length]}
          selected={selectedCode === ap.code}
          onSelect={() => onSelect(ap.code)}
        />
      ))}
    </MapContainer>
  );
}
