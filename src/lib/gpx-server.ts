// GPX parsing on the server (uses xmldom-qsa via parseGPXWithCustomParser).
// Used to derive route start/end coords + bounds for weather queries etc.

import { parseGPX } from "@we-gold/gpxjs";

export type GpxSummary = {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  midLat: number;
  midLng: number;
};

export function summarizeGpx(gpxContent: string): GpxSummary | null {
  // gpxjs's `parseGPX` works on Node (uses xmldom-qsa internally per its docs);
  // if it doesn't, callers can fall back to summarizing on the client.
  try {
    const [parsed, err] = parseGPX(gpxContent);
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
