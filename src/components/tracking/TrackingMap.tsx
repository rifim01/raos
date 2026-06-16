"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type DriverLocation = {
  id: string;
  driver_id: string;
  latitude: number;
  longitude: number;
  speed: number | null;
  heading: number | null;
  status: string | null;
  airport_id: string | null;
  last_seen: string;
  drivers?: { nama: string; driver_code: string } | null;
};

export type Airport = {
  id: string;
  code: string;
  name: string;
  city: string;
  latitude: number;
  longitude: number;
  radius_meter: number;
};

function makeDriverIcon(status: string | null) {
  const color =
    status === "ON_DUTY" ? "#3B82F6" : status === "ONLINE" ? "#10B981" : "#9CA3AF";
  const ring =
    status === "ON_DUTY" ? "#1D4ED8" : status === "ONLINE" ? "#059669" : "#6B7280";
  return L.divIcon({
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2.5px solid white;box-shadow:0 0 0 2px ${ring},0 2px 6px rgba(0,0,0,0.4)"></div>`,
    className: "",
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    popupAnchor: [0, -12],
  });
}

function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  const prevCenter = useRef(center);
  useEffect(() => {
    if (
      prevCenter.current[0] !== center[0] ||
      prevCenter.current[1] !== center[1]
    ) {
      map.flyTo(center, zoom, { animate: true, duration: 1 });
      prevCenter.current = center;
    }
  }, [center, zoom, map]);
  return null;
}

interface TrackingMapProps {
  locations: DriverLocation[];
  airports: Airport[];
  selectedAirport: string;
  onDriverClick?: (driver: DriverLocation) => void;
}

export default function TrackingMap({
  locations,
  airports,
  selectedAirport,
  onDriverClick,
}: TrackingMapProps) {
  const center: [number, number] =
    selectedAirport !== "ALL"
      ? (() => {
          const ap = airports.find((a) => a.code === selectedAirport);
          return ap ? [ap.latitude, ap.longitude] : [0, 117];
        })()
      : [0, 117];

  const zoom = selectedAirport !== "ALL" ? 13 : 5;

  const filteredLocations =
    selectedAirport === "ALL"
      ? locations
      : locations.filter((loc) => {
          const ap = airports.find((a) => a.code === selectedAirport);
          return ap ? loc.airport_id === ap.id : true;
        });

  const visibleAirports =
    selectedAirport === "ALL"
      ? airports
      : airports.filter((a) => a.code === selectedAirport);

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      className="h-full w-full z-0"
      scrollWheelZoom
    >
      <MapController center={center} zoom={zoom} />
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />

      {/* Airport geofence circles */}
      {visibleAirports.map((ap) => (
        <Circle
          key={ap.id}
          center={[ap.latitude, ap.longitude]}
          radius={ap.radius_meter}
          pathOptions={{
            color: "#2563EB",
            fillColor: "#2563EB",
            fillOpacity: 0.07,
            weight: 2,
            dashArray: "6 4",
          }}
        >
          <Popup>
            <div className="text-sm font-semibold">{ap.name}</div>
            <div className="text-xs text-gray-500">
              {ap.city} · Geofence {ap.radius_meter}m
            </div>
          </Popup>
        </Circle>
      ))}

      {/* Driver markers */}
      {filteredLocations.map((loc) => (
        <Marker
          key={loc.driver_id}
          position={[loc.latitude, loc.longitude]}
          icon={makeDriverIcon(loc.status)}
          eventHandlers={{
            click: () => onDriverClick?.(loc),
          }}
        >
          <Popup>
            <div className="text-sm">
              <p className="font-bold text-gray-800">
                {loc.drivers?.nama ?? "Driver"}
              </p>
              <p className="text-gray-500 text-xs">{loc.drivers?.driver_code}</p>
              <p className="mt-1">
                Status:{" "}
                <span
                  className={
                    loc.status === "ON_DUTY"
                      ? "text-blue-600 font-semibold"
                      : loc.status === "ONLINE"
                      ? "text-green-600 font-semibold"
                      : "text-gray-400"
                  }
                >
                  {loc.status ?? "—"}
                </span>
              </p>
              {loc.speed != null && (
                <p className="text-xs text-gray-500">{loc.speed} km/h</p>
              )}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
