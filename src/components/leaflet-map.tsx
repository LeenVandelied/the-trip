"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { parseGPX } from "@we-gold/gpxjs";
import { DAY_COLORS } from "@/lib/constants";

export type MapRoute = {
  id: string;
  name: string;
  gpxContent: string;
  roadGeoJson: string | null;
};

function FitTo({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    const bounds = L.latLngBounds(points.map(([lat, lng]) => L.latLng(lat, lng)));
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [points, map]);
  return null;
}

function coordsFor(r: MapRoute): [number, number][] | null {
  if (r.roadGeoJson) {
    try {
      const parsed = JSON.parse(r.roadGeoJson) as [number, number][];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch {
      // fall through
    }
  }
  const [parsed, err] = parseGPX(r.gpxContent);
  if (err || !parsed) return null;
  const track = parsed.tracks[0] ?? parsed.routes[0];
  if (!track) return null;
  const coords = track.points
    .filter((p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude))
    .map((p) => [p.latitude, p.longitude] as [number, number]);
  return coords.length > 0 ? coords : null;
}

export function LeafletMap({
  routesByDay,
  highlightDay,
}: {
  /** Per day, routes sorted by score desc (first = winner). */
  routesByDay: Record<number, MapRoute[]>;
  highlightDay: number | null;
}) {
  // Pre-parse all routes once, flatten with per-route metadata for rendering.
  const items = useMemo(() => {
    const out: {
      day: number;
      routeId: string;
      coords: [number, number][];
      isWinner: boolean;
    }[] = [];
    for (const [dayStr, routes] of Object.entries(routesByDay)) {
      const day = +dayStr;
      routes.forEach((r, idx) => {
        const coords = coordsFor(r);
        if (!coords) return;
        out.push({ day, routeId: r.id, coords, isWinner: idx === 0 });
      });
    }
    return out;
  }, [routesByDay]);

  const allPoints = useMemo<[number, number][]>(() => {
    // Fit to the winners only — keeps the view tight even when many alternates extend outside.
    const pts: [number, number][] = [];
    for (const it of items) if (it.isWinner) pts.push(...it.coords);
    if (pts.length > 0) return pts;
    // Fallback: any route at all.
    for (const it of items) pts.push(...it.coords);
    return pts;
  }, [items]);

  const defaultCenter: [number, number] = allPoints[0] ?? [46.5, 4];

  return (
    <MapContainer
      center={defaultCenter}
      zoom={6}
      scrollWheelZoom
      style={{ width: "100%", height: "100%" }}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap, &copy; CartoDB'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
        maxZoom={20}
      />
      <FitTo points={allPoints} />

      {items.map((it) => {
        const color = DAY_COLORS[(it.day - 1) % DAY_COLORS.length];
        const dimmed = highlightDay != null && highlightDay !== it.day;
        // Layer ordering: winners first weight, alternates thinner with dashed pattern.
        // When the user selects a day, that day stays bright while others fade.
        const baseWeight = it.isWinner ? 5 : 3;
        const weight = highlightDay === it.day ? baseWeight + 1 : baseWeight;
        const baseOpacity = it.isWinner ? 0.95 : 0.55;
        const opacity = dimmed ? 0.15 : baseOpacity;
        return (
          <Polyline
            key={`${it.day}-${it.routeId}`}
            positions={it.coords}
            pathOptions={{
              color,
              weight,
              opacity,
              dashArray: it.isWinner ? undefined : "6 6",
              lineCap: "round",
              lineJoin: "round",
            }}
          />
        );
      })}
    </MapContainer>
  );
}
