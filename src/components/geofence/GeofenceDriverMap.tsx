"use client";

/**
 * GeofenceDriverMap
 * Peta Leaflet untuk driver: lingkaran radius bandara + marker posisi driver.
 * Di-load via dynamic import (ssr: false).
 */

import { MapContainer, TileLayer, Circle, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

interface Airport {
  latitude: number; longitude: number; radius_meter: number;
  city: string; code: string;
}

interface Props {
  airport: Airport;
  driverLat: number; driverLng: number; accuracy: number;
  within: boolean;
}

function FlyTo({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  const prev = useRef<[number, number] | null>(null);
  useEffect(() => {
    if (!prev.current || prev.current[0] !== lat || prev.current[1] !== lng) {
      map.setView([lat, lng], 14, { animate: true });
      prev.current = [lat, lng];
    }
  }, [lat, lng, map]);
  return null;
}

export default function GeofenceDriverMap({ airport, driverLat, driverLng, accuracy, within }: Props) {
  const driverIcon = L.divIcon({
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${within ? "#10b981" : "#ef4444"};border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4)"></div>`,
    className: "",
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -10],
  });

  const airportIcon = L.divIcon({
    html: `<div style="font-size:20px;line-height:1">✈</div>`,
    className: "",
    iconSize: [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -14],
  });

  return (
    <div className="h-48 rounded-2xl overflow-hidden border border-gray-200 shadow-sm">
      <MapContainer center={[driverLat, driverLng]} zoom={14} className="h-full w-full z-0" scrollWheelZoom={false}>
        <FlyTo lat={driverLat} lng={driverLng} />
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />

        {/* Geofence circle bandara */}
        <Circle
          center={[airport.latitude, airport.longitude]}
          radius={airport.radius_meter}
          pathOptions={{
            color: within ? "#10b981" : "#ef4444",
            fillColor: within ? "#10b981" : "#ef4444",
            fillOpacity: 0.10,
            weight: 2,
          }}
        />

        {/* Marker bandara */}
        <Marker position={[airport.latitude, airport.longitude]} icon={airportIcon}>
          <Popup>
            <p className="font-bold text-xs">{airport.city} ({airport.code})</p>
            <p className="text-xs text-gray-500">Radius: {airport.radius_meter}m</p>
          </Popup>
        </Marker>

        {/* Marker posisi driver */}
        <Marker position={[driverLat, driverLng]} icon={driverIcon}>
          <Popup>
            <p className="font-bold text-xs">Posisi Anda</p>
            <p className="text-xs text-gray-500">Akurasi: ±{Math.round(accuracy)}m</p>
            <p className="text-xs text-gray-400 font-mono">{driverLat.toFixed(6)}, {driverLng.toFixed(6)}</p>
          </Popup>
        </Marker>

        {/* Lingkaran akurasi GPS */}
        {accuracy > 0 && (
          <Circle
            center={[driverLat, driverLng]}
            radius={accuracy}
            pathOptions={{ color: "#6366f1", fillColor: "#6366f1", fillOpacity: 0.08, weight: 1, dashArray: "4 3" }}
          />
        )}
      </MapContainer>
    </div>
  );
}
