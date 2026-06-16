"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";

interface Marker {
  code: string;
  city: string;
  coords: [number, number];
  planned: boolean;
}

interface Props { markers: Marker[] }

export default function LeafletMap({ markers }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    async function init() {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");

      const map = L.map(containerRef.current!, {
        center: [-2.5, 118],
        zoom: 5,
        zoomControl: true,
        scrollWheelZoom: false,
        attributionControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(map);

      markers.forEach((m) => {
        const color  = m.planned ? "#FBC02D" : "#1565C0";
        const border = m.planned ? "#E65100" : "#0D3880";

        const icon = L.divIcon({
          html: `<div style="
            width:32px;height:32px;border-radius:50% 50% 50% 0;
            background:${color};border:3px solid ${border};
            transform:rotate(-45deg);display:flex;align-items:center;
            justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.3);
          "><span style="transform:rotate(45deg);color:white;font-size:12px;line-height:1">✈</span></div>`,
          className: "",
          iconSize: [32, 32],
          iconAnchor: [16, 32],
          popupAnchor: [0, -34],
        });

        const popup = `
          <div style="font-family:sans-serif;min-width:130px">
            <div style="font-weight:800;color:${color};font-size:14px">${m.code}</div>
            <div style="color:#374151;font-size:12px;margin-top:2px">${m.city}</div>
            ${m.planned ? '<div style="color:#92400E;font-size:11px;margin-top:4px">⏳ Rencana</div>' : '<div style="color:#065F46;font-size:11px;margin-top:4px">✅ Aktif</div>'}
          </div>`;

        L.marker(m.coords, { icon })
          .addTo(map)
          .bindPopup(popup);
      });

      mapRef.current = map;
    }

    init();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [markers]);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
