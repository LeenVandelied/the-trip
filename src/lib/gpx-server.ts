// GPX parsing on the server (uses xmldom-qsa via parseGPXWithCustomParser).
// Used to derive route start/end coords + bounds for weather queries etc.

import { parseGpxNode } from "@/lib/parse-gpx-node";

export type GpxSummary = {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  midLat: number;
  midLng: number;
};

/**
 * Extract a downsampled polyline [lat, lng][] from either a roadGeoJson JSON
 * (already an array of [lat, lng]) or the raw GPX content. Returns at most
 * `maxPoints` points so the payload stays small for list previews.
 */
export function extractTracePoints(
  gpxContent: string,
  roadGeoJson: string | null,
  maxPoints = 64,
): [number, number][] {
  let coords: [number, number][] = [];
  if (roadGeoJson) {
    try {
      const parsed = JSON.parse(roadGeoJson) as [number, number][];
      if (Array.isArray(parsed)) coords = parsed;
    } catch {
      // fall through to GPX
    }
  }
  if (coords.length === 0 && gpxContent) {
    try {
      const [parsed, err] = parseGpxNode(gpxContent);
      if (!err && parsed) {
        const track = parsed.tracks[0] ?? parsed.routes[0];
        if (track) {
          coords = track.points
            .filter((p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude))
            .map((p) => [p.latitude, p.longitude] as [number, number]);
        }
      }
    } catch {
      // ignore
    }
  }
  if (coords.length <= maxPoints) return coords;
  const step = (coords.length - 1) / (maxPoints - 1);
  const out: [number, number][] = [];
  for (let i = 0; i < maxPoints; i++) {
    out.push(coords[Math.round(i * step)]);
  }
  return out;
}

export function summarizeGpx(gpxContent: string): GpxSummary | null {
  // gpxjs's `parseGPX` works on Node (uses xmldom-qsa internally per its docs);
  // if it doesn't, callers can fall back to summarizing on the client.
  try {
    const [parsed, err] = parseGpxNode(gpxContent);
    if (err || !parsed) return null;
    const track = parsed.tracks[0] ?? parsed.routes[0];
    if (!track || track.points.length === 0) return null;
    const pts = track.points;
    const first = pts[0];
    const last = pts[pts.length - 1];
    const mid = pts[Math.floor(pts.length / 2)];
    return {
      startLat: first.latitude,
      startLng: first.longitude,
      endLat: last.latitude,
      endLng: last.longitude,
      midLat: mid.latitude,
      midLng: mid.longitude,
    };
  } catch {
    return null;
  }
}
