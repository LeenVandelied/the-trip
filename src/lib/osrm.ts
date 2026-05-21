// Server-side: turn sparse GPX waypoints into a road-following polyline
// via the public OSRM demo server. Best-effort with graceful fallback.

import { parseGpxNode } from "@/lib/parse-gpx-node";

const OSRM_BASE = "https://router.project-osrm.org/route/v1/driving";
// Public OSRM demo accepts up to ~100 coords per request; we keep margin.
const CHUNK_SIZE = 80;
// Skip reconstruction if the GPX is already a dense recorded track:
// reconstruction wouldn't improve quality and would burn rate-limit.
const DENSE_THRESHOLD = 500;
const FETCH_TIMEOUT_MS = 12000;

export type LatLng = [number, number]; // [lat, lng]

export type ReconstructionResult =
  | { ok: true; coords: LatLng[]; method: "osrm" }
  | { ok: false; reason: "dense" | "no-points" | "osrm-error"; coords?: LatLng[] };

function extractWaypoints(gpxContent: string): { points: LatLng[]; isDense: boolean } | null {
  const [parsed, err] = parseGpxNode(gpxContent);
  if (err || !parsed) return null;
  // Tracks (trkpt) first, then routes (rtept) as fallback.
  const track = parsed.tracks[0] ?? parsed.routes[0];
  if (!track || track.points.length === 0) return null;
  const points: LatLng[] = track.points
    .filter((p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude))
    .map((p) => [p.latitude, p.longitude]);
  // If the source is a Track and it has plenty of points, it's already road-following.
  // Heuristic: only consider "dense" when there are real trkpt elements in the XML.
  const trkptCount = (gpxContent.match(/<trkpt\b/g) ?? []).length;
  const isDense = trkptCount >= DENSE_THRESHOLD;
  return { points, isDense };
}

async function osrmRoute(chunk: LatLng[]): Promise<LatLng[]> {
  const coords = chunk.map(([lat, lng]) => `${lng},${lat}`).join(";");
  const url = `${OSRM_BASE}/${coords}?overview=full&geometries=geojson&continue_straight=false&steps=false`;
  const res = await fetch(url, {
    headers: { "user-agent": "the-trip/1.0 (https://github.com/LeenVandelied/the-trip)" },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`OSRM HTTP ${res.status}`);
  const j = (await res.json()) as {
    code: string;
    routes?: { geometry: { coordinates: [number, number][] } }[];
  };
  if (j.code !== "Ok" || !j.routes?.[0]) throw new Error(`OSRM code=${j.code}`);
  // GeoJSON returns [lng,lat] — flip to [lat,lng] for Leaflet ergonomics.
  return j.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng] as LatLng);
}

/**
 * Take a planned-route GPX (sparse rtept) and rebuild a road-following polyline.
 * Returns the polyline in [lat,lng] pairs ready for storage as JSON.
 */
export async function reconstructRoadCoords(gpxContent: string): Promise<ReconstructionResult> {
  const extracted = extractWaypoints(gpxContent);
  if (!extracted) return { ok: false, reason: "no-points" };
  if (extracted.isDense) return { ok: false, reason: "dense", coords: extracted.points };

  // Build chunks of CHUNK_SIZE with 1-point overlap to keep continuity.
  const pts = extracted.points;
  if (pts.length < 2) return { ok: false, reason: "no-points" };

  const chunks: LatLng[][] = [];
  let i = 0;
  while (i < pts.length - 1) {
    const end = Math.min(i + CHUNK_SIZE, pts.length);
    chunks.push(pts.slice(i, end));
    if (end === pts.length) break;
    i = end - 1; // overlap last point with next chunk's first
  }

  const segments: LatLng[][] = [];
  for (const chunk of chunks) {
    try {
      const seg = await osrmRoute(chunk);
      segments.push(seg);
    } catch {
      return { ok: false, reason: "osrm-error" };
    }
  }

  // Concatenate, dropping the first point of each non-initial segment to avoid duplicates.
  const out: LatLng[] = [];
  for (let s = 0; s < segments.length; s++) {
    const seg = segments[s];
    if (s === 0) out.push(...seg);
    else out.push(...seg.slice(1));
  }
  return { ok: true, coords: out, method: "osrm" };
}
