import { prisma } from "@/lib/prisma";
import { routeWinner, dateProposalWinner } from "@/lib/winners";
import { summarizeGpx } from "@/lib/gpx-server";
import { fetchDailyWeather, weatherEmoji } from "@/lib/weather";
import { TRIP_DAYS } from "@/lib/constants";

export type RoadbookDay = {
  n: number;
  dateISO: string | null;       // ISO date YYYY-MM-DD or null if no winning proposal
  dateLabel: string;            // human label
  winningRoute: {
    id: string;
    name: string;
    distanceKm: number;
    elevationM: number;
    durationSec: number | null;
    gpxContent: string;
    roadGeoJson: string | null;
    startLat?: number;
    startLng?: number;
    endLat?: number;
    endLng?: number;
  } | null;
  weather: {
    emoji: string;
    tmin: number | null;
    tmax: number | null;
  };
  topPlaces: { id: string; name: string; lat: number; lng: number; score: number }[];
};

export type RoadbookSummary = {
  startISO: string | null;
  endISO: string | null;
  days: RoadbookDay[];
};

const FR_DAYS = ["DIM", "LUN", "MAR", "MER", "JEU", "VEN", "SAM"];
const FR_MONTHS = ["JANV", "FÉVR", "MARS", "AVR", "MAI", "JUIN", "JUIL", "AOÛT", "SEPT", "OCT", "NOV", "DÉC"];

function fmtDateLabel(d: Date): string {
  return `${FR_DAYS[d.getDay()]} ${d.getDate()} ${FR_MONTHS[d.getMonth()]}`;
}

function addDays(d: Date, n: number): Date {
  const c = new Date(d);
  c.setUTCDate(c.getUTCDate() + n);
  return c;
}

function isoDate(d: Date): string {
  return `${d.getUTCFullYear()}-${(d.getUTCMonth() + 1).toString().padStart(2, "0")}-${d.getUTCDate().toString().padStart(2, "0")}`;
}

export async function computeRoadbook(): Promise<RoadbookSummary> {
  const [proposals, routes, places] = await Promise.all([
    prisma.dateProposal.findMany({ include: { availabilities: true } }),
    prisma.route.findMany({ include: { votes: true } }),
    prisma.place.findMany({ include: { votes: true } }),
  ]);

  const winningProposal = dateProposalWinner(proposals);
  const startISO = winningProposal ? isoDate(winningProposal.startDate) : null;
  const endISO = winningProposal ? isoDate(winningProposal.endDate) : null;

  // routes by day
  const routesByDay = new Map<number, typeof routes>();
  for (const r of routes) {
    const arr = routesByDay.get(r.dayNumber) ?? [];
    arr.push(r);
    routesByDay.set(r.dayNumber, arr);
  }

  // top liked places (score > 0), keep top 6 to share among days
  const topPlacesAll = places
    .map((p) => ({
      id: p.id,
      name: p.name,
      lat: p.lat,
      lng: p.lng,
      score: p.votes.reduce((acc, v) => acc + (v.value === "UP" ? 1 : -1), 0),
    }))
    .filter((p) => p.score > 0)
    .sort((a, b) => b.score - a.score);

  const days: RoadbookDay[] = [];
  for (let n = 1; n <= TRIP_DAYS; n++) {
    const arr = routesByDay.get(n) ?? [];
    const win = routeWinner(arr);

    let date: Date | null = null;
    if (winningProposal) date = addDays(winningProposal.startDate, n - 1);

    let summary = null;
    if (win) summary = summarizeGpx(win.gpxContent);

    // Filter places within ~30 km of the route mid-point (rough buffer)
    const dayPlaces = summary
      ? topPlacesAll.filter((p) => {
          const dLat = p.lat - summary!.midLat;
          const dLng = p.lng - summary!.midLng;
          // approx 30km in degrees (~0.27° lat, larger lng at high latitudes)
          return Math.abs(dLat) < 0.45 && Math.abs(dLng) < 0.7;
        })
      : [];

    let emoji = "—";
    let tmin: number | null = null;
    let tmax: number | null = null;
    if (date && summary) {
      const w = await fetchDailyWeather(summary.midLat, summary.midLng, isoDate(date));
      if (w) {
        emoji = weatherEmoji(w.weather_code);
        tmin = w.temperature_2m_min ?? null;
        tmax = w.temperature_2m_max ?? null;
      }
    }

    days.push({
      n,
      dateISO: date ? isoDate(date) : null,
      dateLabel: date ? fmtDateLabel(date) : `JOUR ${n}`,
      winningRoute: win
        ? {
            id: win.id,
            name: win.name,
            distanceKm: win.distanceKm,
            elevationM: win.elevationM,
            durationSec: win.durationSec,
            gpxContent: win.roadGeoJson ? "" : win.gpxContent,
            roadGeoJson: win.roadGeoJson,
            startLat: summary?.startLat,
            startLng: summary?.startLng,
            endLat: summary?.endLat,
            endLng: summary?.endLng,
          }
        : null,
      weather: { emoji, tmin, tmax },
      topPlaces: dayPlaces.slice(0, 4),
    });
  }

  return { startISO, endISO, days };
}
