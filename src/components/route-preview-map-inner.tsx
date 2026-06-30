"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Polyline, CircleMarker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { DAY_COLORS } from "@/lib/constants";

function FitTo({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    const bounds = L.latLngBounds(points.map(([lat, lng]) => L.latLng(lat, lng)));
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [12, 12] });
    }
  }, [points, map]);
  return null;
}

export function RoutePreviewMapInner({
  points,
  day,
}: {
  points: [number, number][];
  day: number;
}) {
  const color = DAY_COLORS[(day - 1) % DAY_COLORS.length];
  const center: [number, number] = points[0] ?? [46.5, 4];
  const start = points[0];
  const end = points[points.length - 1];
  return (
    <MapContainer
      center={center}
      zoom={6}
      zoomControl={false}
      attributionControl={false}
      scrollWheelZoom={false}
      doubleClickZoom={false}
      dragging={false}
      touchZoom={false}
      boxZoom={false}
      keyboard={false}
      style={{ width: "100%", height: "100%", background: "#0f0c08" }}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
        maxZoom={18}
      />
      <FitTo points={points} />
      {points.length >= 2 && (
        <Polyline
          positions={points}
          pathOptions={{
            color,
            weight: 3.5,
            opacity: 0.95,
            lineCap: "round",
            lineJoin: "round",
          }}
        />
      )}
      {start && (
        <CircleMarker
          center={start}
          radius={5}
          pathOptions={{ color, fillColor: color, fillOpacity: 1, weight: 1.5 }}
        />
      )}
      {end && (
        <CircleMarker
          center={end}
          radius={5}
          pathOptions={{ color, fillColor: "#1a1308", fillOpacity: 1, weight: 2 }}
        />
      )}
    </MapContainer>
  );
}
