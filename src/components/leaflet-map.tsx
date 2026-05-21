"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  Popup,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { parseGPX } from "@we-gold/gpxjs";
import { DAY_COLORS } from "@/lib/constants";

export type MapPlace = {
  id: string;
  lat: number;
  lng: number;
  name: string;
  score: number;
};

export type DayGpx = {
  id: string;
  name: string;
  gpxContent: string;
  roadGeoJson?: string | null;
};

function pinIcon(color: string) {
  return L.divIcon({
    className: "tt-pin",
    html: `<span style="
      display:block; width:22px; height:22px;
      border-radius:50%;
      background:${color};
      border:2px solid #14110c;
      box-shadow:0 0 0 2px ${color}55, 0 4px 10px rgba(0,0,0,.5);
    "></span>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -10],
  });
}

const placePin = pinIcon("#f0a830");

function ClickToAdd({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

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

export function LeafletMap({
  places,
  winnerGpxByDay,
  highlightDay,
  onMapClick,
  onPlaceClick,
}: {
  places: MapPlace[];
  winnerGpxByDay: Record<number, DayGpx>;
  highlightDay: number | null;
  onMapClick: (lat: number, lng: number) => void;
  onPlaceClick: (id: string) => void;
}) {
  // Pre-parse GPX once per content. Prefer reconstructed road-following polyline
  // (`roadGeoJson` from OSRM) when available; otherwise fall back to raw waypoints.
  const tracks = useMemo(() => {
    const out: { day: number; name: string; coords: [number, number][] }[] = [];
    for (const [day, g] of Object.entries(winnerGpxByDay)) {
      let coords: [number, number][] | null = null;
      if (g.roadGeoJson) {
        try {
          const parsed = JSON.parse(g.roadGeoJson) as [number, number][];
          if (Array.isArray(parsed) && parsed.length > 0) coords = parsed;
        } catch {
          // ignore, fall through to GPX parse
        }
      }
      if (!coords) {
        const [parsed, err] = parseGPX(g.gpxContent);
        if (err || !parsed) continue;
        const track = parsed.tracks[0] ?? parsed.routes[0];
        if (!track) continue;
        coords = track.points
          .filter((p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude))
          .map((p) => [p.latitude, p.longitude] as [number, number]);
      }
      if (coords.length > 0) out.push({ day: +day, name: g.name, coords });
    }
    return out;
  }, [winnerGpxByDay]);

  // Compute all points to fit map to.
  const allPoints = useMemo<[number, number][]>(() => {
    const pts: [number, number][] = [];
    for (const t of tracks) pts.push(...t.coords);
    for (const p of places) pts.push([p.lat, p.lng]);
    return pts;
  }, [tracks, places]);

  const mapRef = useRef<L.Map | null>(null);

  const defaultCenter: [number, number] =
    allPoints[0] ?? [46.5, 4]; // ~ centre France

  return (
    <MapContainer
      center={defaultCenter}
      zoom={6}
      scrollWheelZoom
      style={{ width: "100%", height: "100%" }}
      ref={(m) => {
        mapRef.current = m;
      }}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap, &copy; CartoDB'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        subdomains="abcd"
        maxZoom={20}
      />
      <ClickToAdd onClick={onMapClick} />
      <FitTo points={allPoints} />

      {tracks.map((t) => {
        const color = DAY_COLORS[(t.day - 1) % DAY_COLORS.length];
        const dimmed = highlightDay != null && highlightDay !== t.day;
        return (
          <Polyline
            key={t.day}
            positions={t.coords}
            pathOptions={{
              color,
              weight: highlightDay === t.day ? 5 : 3,
              opacity: dimmed ? 0.25 : 0.95,
            }}
          />
        );
      })}

      {places.map((p) => (
        <Marker
          key={p.id}
          position={[p.lat, p.lng]}
          icon={placePin}
          eventHandlers={{ click: () => onPlaceClick(p.id) }}
        >
          <Popup>
            <strong>{p.name}</strong>
            <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>
              Score : {p.score}
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
