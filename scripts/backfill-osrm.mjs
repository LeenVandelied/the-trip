// One-shot backfill: rebuild roadGeoJson for routes that don't have it yet.
// Run: `node --env-file=.env scripts/backfill-osrm.mjs`
//
// Uses the same OSRM strategy as src/lib/osrm.ts but inlined here (mjs script,
// no TS imports). Keep in sync if the algorithm changes.

import { PrismaClient } from "@prisma/client";
import { parseGPXWithCustomParser } from "@we-gold/gpxjs";
import { DOMParser } from "xmldom-qsa";

const domParser = new DOMParser();
const parseGPX = (xml) =>
  parseGPXWithCustomParser(xml, (s) => domParser.parseFromString(s, "text/xml"));

const OSRM_BASE = "https://router.project-osrm.org/route/v1/driving";
const CHUNK_SIZE = 80;
const DENSE_THRESHOLD = 500;

const prisma = new PrismaClient();

function extractWaypoints(gpx) {
  const [parsed, err] = parseGPX(gpx);
  if (err || !parsed) return null;
  const track = parsed.tracks[0] ?? parsed.routes[0];
  if (!track || track.points.length === 0) return null;
  const points = track.points
    .filter((p) => Number.isFinite(p.latitude) && Number.isFinite(p.longitude))
    .map((p) => [p.latitude, p.longitude]);
  const trkptCount = (gpx.match(/<trkpt\b/g) ?? []).length;
  return { points, isDense: trkptCount >= DENSE_THRESHOLD };
}

async function osrmRoute(chunk) {
  const coords = chunk.map(([lat, lng]) => `${lng},${lat}`).join(";");
  const url = `${OSRM_BASE}/${coords}?overview=full&geometries=geojson&continue_straight=false&steps=false`;
  const res = await fetch(url, {
    headers: { "user-agent": "the-trip/1.0" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`OSRM HTTP ${res.status}`);
  const j = await res.json();
  if (j.code !== "Ok" || !j.routes?.[0]) throw new Error(`OSRM code=${j.code}`);
  return j.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
}

async function reconstruct(gpx) {
  const ex = extractWaypoints(gpx);
  if (!ex) return { ok: false, reason: "no-points" };
  if (ex.isDense) return { ok: false, reason: "dense" };
  const pts = ex.points;
  if (pts.length < 2) return { ok: false, reason: "no-points" };

  const chunks = [];
  let i = 0;
  while (i < pts.length - 1) {
    const end = Math.min(i + CHUNK_SIZE, pts.length);
    chunks.push(pts.slice(i, end));
    if (end === pts.length) break;
    i = end - 1;
  }

  const segments = [];
  for (const chunk of chunks) {
    const seg = await osrmRoute(chunk);
    segments.push(seg);
    // Be nice to the public demo: ~1 req/s.
    await new Promise((r) => setTimeout(r, 1100));
  }
  const out = [];
  for (let s = 0; s < segments.length; s++) {
    if (s === 0) out.push(...segments[s]);
    else out.push(...segments[s].slice(1));
  }
  return { ok: true, coords: out };
}

const targets = await prisma.route.findMany({ where: { roadGeoJson: null } });
console.log(`Found ${targets.length} routes without roadGeoJson.`);
for (const r of targets) {
  process.stdout.write(`J${r.dayNumber} ${r.name} (${r.id.slice(0, 6)})… `);
  try {
    const recon = await reconstruct(r.gpxContent);
    if (!recon.ok) {
      console.log(`skipped (${recon.reason})`);
      continue;
    }
    await prisma.route.update({
      where: { id: r.id },
      data: { roadGeoJson: JSON.stringify(recon.coords) },
    });
    console.log(`OK · ${recon.coords.length} pts`);
  } catch (e) {
    console.log(`FAILED — ${e?.message ?? e}`);
  }
}
await prisma.$disconnect();
console.log("done.");
