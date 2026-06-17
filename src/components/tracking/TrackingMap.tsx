"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from "react-leaflet";
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

/* ── Global pulse animation injected once ── */
const PULSE_CSS = `
@keyframes driver-pulse {
  0%   { transform: scale(1);   opacity: 0.7; }
  70%  { transform: scale(2.4); opacity: 0; }
  100% { transform: scale(1);   opacity: 0; }
}
@keyframes driver-pulse-slow {
  0%   { transform: scale(1);   opacity: 0.5; }
  70%  { transform: scale(1.9); opacity: 0; }
  100% { transform: scale(1);   opacity: 0; }
}
.driver-pulse       { animation: driver-pulse      1.6s ease-out infinite; }
.driver-pulse-slow  { animation: driver-pulse-slow 2.4s ease-out infinite; }
.leaflet-popup-content-wrapper {
  border-radius: 14px !important;
  box-shadow: 0 8px 28px rgba(0,0,0,0.15) !important;
  border: none !important;
  padding: 0 !important;
  overflow: hidden;
}
.leaflet-popup-content { margin: 0 !important; width: auto !important; }
.leaflet-popup-tip-container { display: none; }
.leaflet-popup-close-button {
  top: 8px !important; right: 8px !important;
  font-size: 18px !important; color: #9CA3AF !important;
}
`;

function InjectCSS() {
  useEffect(() => {
    if (document.getElementById("driver-tracking-css")) return;
    const el = document.createElement("style");
    el.id = "driver-tracking-css";
    el.textContent = PULSE_CSS;
    document.head.appendChild(el);
  }, []);
  return null;
}

/* ── Driver marker icon ── */
function makeDriverIcon(loc: DriverLocation, isSelected: boolean) {
  const isOnline = loc.status === "ONLINE";
  const isOnDuty = loc.status === "ON_DUTY";
  const isActive = isOnline || isOnDuty;

  const bg   = isSelected ? "#FFD300" : isOnDuty ? "#3B82F6" : isOnline ? "#10B981" : "#9CA3AF";
  const ring = isSelected ? "#B8960A" : isOnDuty ? "#1D4ED8" : isOnline ? "#059669" : "#6B7280";
  const iconColor = isSelected ? "#000" : "#fff";

  const hdg = loc.heading ?? 0;
  const size = isSelected ? 36 : 28;
  const half = size / 2;

  // Car SVG path (top-down view)
  const carPath = `M${half},${half - 9}
    C${half - 5},${half - 9} ${half - 7},${half - 4} ${half - 7},${half}
    L${half - 7},${half + 5} L${half - 5},${half + 7}
    L${half + 5},${half + 7} L${half + 7},${half + 5}
    L${half + 7},${half}
    C${half + 7},${half - 4} ${half + 5},${half - 9} ${half},${half - 9} Z`;

  const pulseClass = isActive ? (isSelected ? "driver-pulse" : "driver-pulse-slow") : "";
  const pulseRingSize = size + (isSelected ? 18 : 14);

  const html = `
    <div style="position:relative;width:${size}px;height:${size}px">
      ${isActive ? `
        <div class="${pulseClass}" style="
          position:absolute;
          top:${(size - pulseRingSize) / 2}px;
          left:${(size - pulseRingSize) / 2}px;
          width:${pulseRingSize}px;height:${pulseRingSize}px;
          border-radius:50%;
          background:${ring};
          pointer-events:none;
        "></div>` : ""}
      <div style="
        position:absolute;inset:0;
        border-radius:50%;
        background:${bg};
        border:${isSelected ? "3px" : "2.5px"} solid white;
        box-shadow:0 2px 10px rgba(0,0,0,0.35);
        display:flex;align-items:center;justify-content:center;
        transform:rotate(${hdg}deg);
      ">
        <svg width="${size * 0.52}" height="${size * 0.52}" viewBox="0 0 24 24" fill="${iconColor}" xmlns="http://www.w3.org/2000/svg">
          <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
        </svg>
      </div>
    </div>`;

  return L.divIcon({
    html,
    className: "",
    iconSize: [size, size],
    iconAnchor: [half, half],
    popupAnchor: [0, -(half + 4)],
  });
}

/* ── Airport marker ── */
function makeAirportIcon(code: string) {
  const label = code.replace(/\d+$/, ""); // "BTH001" → "BTH"
  return L.divIcon({
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;gap:2px">
        <div style="
          background:#FFD300;
          border:2px solid #B8960A;
          border-radius:8px;
          padding:2px 6px;
          font-size:10px;
          font-weight:700;
          color:#000;
          white-space:nowrap;
          box-shadow:0 2px 8px rgba(0,0,0,0.25);
          letter-spacing:0.5px;
        ">${label}</div>
        <div style="width:2px;height:8px;background:#B8960A;border-radius:1px"></div>
        <div style="width:6px;height:6px;border-radius:50%;background:#FFD300;border:2px solid #B8960A"></div>
      </div>`,
    className: "",
    iconSize: [44, 40],
    iconAnchor: [22, 40],
    popupAnchor: [0, -42],
  });
}

/* ── Popup card content ── */
function driverPopupContent(loc: DriverLocation) {
  const statusLabel = loc.status === "ON_DUTY" ? "On Duty" : loc.status === "ONLINE" ? "Online" : "Offline";
  const statusColor = loc.status === "ON_DUTY" ? "#1D4ED8" : loc.status === "ONLINE" ? "#059669" : "#6B7280";
  const statusBg   = loc.status === "ON_DUTY" ? "#EFF6FF" : loc.status === "ONLINE" ? "#ECFDF5" : "#F9FAFB";
  const initials = (loc.drivers?.nama ?? "D")[0].toUpperCase();
  const timeAgo = (() => {
    const diff = Math.floor((Date.now() - new Date(loc.last_seen).getTime()) / 1000);
    if (diff < 60) return `${diff} dtk lalu`;
    if (diff < 3600) return `${Math.floor(diff / 60)} mnt lalu`;
    return `${Math.floor(diff / 3600)} jam lalu`;
  })();

  return `
    <div style="width:220px;padding:14px;font-family:system-ui,sans-serif">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
        <div style="
          width:38px;height:38px;border-radius:12px;
          background:linear-gradient(135deg,#FFD300,#F59E0B);
          display:flex;align-items:center;justify-content:center;
          font-weight:700;font-size:16px;color:#000;flex-shrink:0;
        ">${initials}</div>
        <div style="min-width:0">
          <div style="font-size:13px;font-weight:700;color:#111;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
            ${loc.drivers?.nama ?? "Unknown Driver"}
          </div>
          <div style="font-size:10px;color:#9CA3AF">${loc.drivers?.driver_code ?? "—"}</div>
        </div>
      </div>

      <div style="
        display:inline-flex;align-items:center;gap:5px;
        background:${statusBg};
        color:${statusColor};
        padding:3px 10px;border-radius:20px;
        font-size:10px;font-weight:700;
        margin-bottom:10px;
      ">
        <span style="width:6px;height:6px;border-radius:50%;background:${statusColor};display:inline-block"></span>
        ${statusLabel}
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
        <div style="background:#FFF9C4;border-radius:8px;padding:7px;text-align:center">
          <div style="font-size:16px;font-weight:700;color:#B8960A">${loc.speed ?? 0}</div>
          <div style="font-size:9px;color:#A07800;text-transform:uppercase;letter-spacing:.5px">km/h</div>
        </div>
        <div style="background:#F3F4F6;border-radius:8px;padding:7px;text-align:center">
          <div style="font-size:16px;font-weight:700;color:#374151">${loc.heading ?? 0}°</div>
          <div style="font-size:9px;color:#6B7280;text-transform:uppercase;letter-spacing:.5px">arah</div>
        </div>
      </div>

      <div style="margin-top:8px;font-size:10px;color:#9CA3AF;text-align:center">
        📍 ${loc.latitude.toFixed(5)}, ${loc.longitude.toFixed(5)}
      </div>
      <div style="margin-top:2px;font-size:10px;color:#9CA3AF;text-align:center">
        Diperbarui ${timeAgo}
      </div>
    </div>`;
}

/* ── Mock trail polylines near airport ── */
function seededRng(seed: number) {
  let s = seed;
  return () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
}

function getMockTrails(loc: DriverLocation): [number, number][] {
  if (!loc.latitude || !loc.longitude) return [];
  const rng = seededRng(loc.driver_id.charCodeAt(0) * 137 + loc.driver_id.charCodeAt(1) * 31);
  const pts: [number, number][] = [];
  let lat = loc.latitude - (rng() - 0.5) * 0.02;
  let lng = loc.longitude - (rng() - 0.5) * 0.02;
  for (let i = 0; i < 5; i++) {
    pts.push([lat, lng]);
    lat += (rng() - 0.5) * 0.004;
    lng += (rng() - 0.5) * 0.006;
  }
  pts.push([loc.latitude, loc.longitude]);
  return pts;
}

/* ── Map controller ── */
function MapController({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  const prev = useRef(center);
  useEffect(() => {
    if (prev.current[0] !== center[0] || prev.current[1] !== center[1]) {
      map.flyTo(center, zoom, { animate: true, duration: 1.2 });
      prev.current = center;
    }
  }, [center, zoom, map]);
  return null;
}

interface TrackingMapProps {
  locations: DriverLocation[];
  airports: Airport[];
  selectedAirport: string;
  selectedDriverId?: string;
  onDriverClick?: (driver: DriverLocation) => void;
}

export default function TrackingMap({
  locations,
  airports,
  selectedAirport,
  selectedDriverId,
  onDriverClick,
}: TrackingMapProps) {
  const center: [number, number] =
    selectedAirport !== "ALL"
      ? (() => { const ap = airports.find((a) => a.code === selectedAirport); return ap ? [ap.latitude, ap.longitude] : [0.5, 117]; })()
      : [0.5, 117];

  const zoom = selectedAirport !== "ALL" ? 14 : 5;

  const filteredLocations =
    selectedAirport === "ALL"
      ? locations
      : locations.filter((loc) => { const ap = airports.find((a) => a.code === selectedAirport); return ap ? loc.airport_id === ap.id : true; });

  const visibleAirports =
    selectedAirport === "ALL" ? airports : airports.filter((a) => a.code === selectedAirport);

  return (
    <MapContainer
      center={center}
      zoom={zoom}
      className="h-full w-full z-0"
      scrollWheelZoom
      zoomControl={false}
    >
      <InjectCSS />
      <MapController center={center} zoom={zoom} />

      {/* Premium CartoDB Voyager tiles */}
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        subdomains="abcd"
        maxZoom={20}
      />

      {/* Geofence circles */}
      {visibleAirports.map((ap) => (
        <Circle
          key={ap.id}
          center={[ap.latitude, ap.longitude]}
          radius={ap.radius_meter ?? 500}
          pathOptions={{
            color: "#FFD300",
            fillColor: "#FFD300",
            fillOpacity: 0.06,
            weight: 2,
            dashArray: "8 5",
          }}
        >
          <Popup>
            <div style={{ padding: "12px 14px", fontFamily: "system-ui,sans-serif", minWidth: 160 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <div style={{ background: "#FFD300", borderRadius: 6, padding: "2px 7px", fontSize: 11, fontWeight: 700, color: "#000" }}>
                  {ap.code.replace(/\d+$/, "")}
                </div>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#111" }}>{ap.name}</span>
              </div>
              <div style={{ fontSize: 11, color: "#6B7280" }}>{ap.city} · Geofence radius {ap.radius_meter ?? "—"}m</div>
              <div style={{ fontSize: 10, color: "#9CA3AF", marginTop: 4 }}>
                {ap.latitude.toFixed(5)}, {ap.longitude.toFixed(5)}
              </div>
            </div>
          </Popup>
        </Circle>
      ))}

      {/* Mock trail polylines */}
      {filteredLocations.filter((l) => l.status !== "OFFLINE").map((loc) => {
        const pts = getMockTrails(loc);
        if (pts.length < 2) return null;
        const isSelected = loc.driver_id === selectedDriverId;
        return (
          <Polyline
            key={`trail-${loc.driver_id}`}
            positions={pts}
            pathOptions={{
              color: isSelected ? "#FFD300" : loc.status === "ON_DUTY" ? "#3B82F6" : "#10B981",
              weight: isSelected ? 3 : 2,
              opacity: isSelected ? 0.85 : 0.45,
              dashArray: isSelected ? undefined : "4 6",
              lineCap: "round",
              lineJoin: "round",
            }}
          />
        );
      })}

      {/* Airport markers */}
      {visibleAirports.map((ap) => (
        <Marker
          key={`airport-${ap.id}`}
          position={[ap.latitude, ap.longitude]}
          icon={makeAirportIcon(ap.code)}
        >
          <Popup>
            <div style={{ padding: "12px 14px", fontFamily: "system-ui,sans-serif" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#111" }}>{ap.name}</div>
              <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>{ap.city}</div>
            </div>
          </Popup>
        </Marker>
      ))}

      {/* Driver markers */}
      {filteredLocations.map((loc) => {
        const isSelected = loc.driver_id === selectedDriverId;
        return (
          <Marker
            key={loc.driver_id}
            position={[loc.latitude, loc.longitude]}
            icon={makeDriverIcon(loc, isSelected)}
            zIndexOffset={isSelected ? 1000 : 0}
            eventHandlers={{ click: () => onDriverClick?.(loc) }}
          >
            <Popup>
              <div dangerouslySetInnerHTML={{ __html: driverPopupContent(loc) }} />
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
