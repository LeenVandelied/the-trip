"use client";

import { useEffect, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Popup,
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

export type LodgingPin = {
  id: string;
  lat: number;
  lng: number;
  name: string;
  priceEur: number | null;
  hostname?: string;
  url?: string;
};

function lodgingIcon() {
  return L.divIcon({
    className: "tt-lodging",
    html: `<span style="
      display:block; width:26px; height:26px;
      border-radius:50% 50% 50% 0;
      background:#b8472f;
      border:2px solid #14110c;
      box-shadow:0 0 0 2px rgba(184,71,47,.35), 0 6px 12px rgba(0,0,0,.6);
      transform:rotate(-45deg);
      position:relative;
    "><span style="
      position:absolute; inset:0;
      display:flex; align-items:center; justify-content:center;
      transform:rotate(45deg);
      color:#1a1308;
      font-family: var(--f-stamp);
      font-size:13px; font-weight:700;
    ">⌂</span></span>`,
    iconSize: [26, 26],
    iconAnchor: [13, 26],
    popupAnchor: [0, -22],
  });
}
const lodgingDivIcon = lodgingIcon();

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
  lodgingPins = [],
}: {
  /** Per day, routes sorted by score desc (first = winner). */
  routesByDay: Record<number, MapRoute[]>;
  highlightDay: number | null;
  lodgingPins?: LodgingPin[];
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
    if (pts.length === 0) {
      // Fallback: any route at all.
      for (const it of items) pts.push(...it.coords);
    }
    // Always include lodging pins in the fit bounds.
    for (const lp of lodgingPins) pts.push([lp.lat, lp.lng]);
    return pts;
  }, [items, lodgingPins]);

  const defaultCenter: [number, number] = allPoints[0] ?? [46.5, 4];

  return (
    <MapContainer
      center={defaultCenter}
      zoom={6}
      scrollWheelZoom
      style={{ width: "100%", height: "100%" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
        className="tt-dark-tiles"
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

      {lodgingPins.map((lp) => (
        <Marker key={lp.id} position={[lp.lat, lp.lng]} icon={lodgingDivIcon}>
          <Popup>
            <strong>{lp.name}</strong>
            <div style={{ fontSize: 11, opacity: 0.75, marginTop: 4 }}>
              {lp.priceEur != null ? `${Math.round(lp.priceEur)} €` : "— prix non renseigné —"}
              {lp.hostname ? ` · ${lp.hostname}` : ""}
            </div>
            {lp.url && (
              <div style={{ marginTop: 6 }}>
                <a href={lp.url} target="_blank" rel="noreferrer">Voir l&apos;annonce ↗</a>
              </div>
            )}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
