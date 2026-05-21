"use server";

import { computeRoadbook } from "@/lib/roadbook";
import { buildIcs, type IcsEvent } from "@/lib/ical";

export async function buildRoadbookIcsAction(): Promise<{ ok: true; ics: string; filename: string } | { ok: false; error: string }> {
  try {
    const rb = await computeRoadbook();
    if (!rb.startISO) return { ok: false, error: "Aucune plage de dates retenue — vote d'abord sur /dates" };

    const events: IcsEvent[] = [];
    for (const day of rb.days) {
      if (!day.dateISO) continue;
      const start = new Date(day.dateISO + "T00:00:00Z");
      const end = new Date(start.getTime() + 24 * 3600 * 1000);
      const win = day.winningRoute;
      const summary = win
        ? `J${day.n} · ${Math.round(win.distanceKm)}km — ${win.name}`
        : `J${day.n} · (aucun tracé retenu)`;
      const location = win && win.endLat != null && win.endLng != null
        ? `${win.endLat.toFixed(4)},${win.endLng.toFixed(4)}`
        : undefined;
      const description = win
        ? [
            win.name,
            `${Math.round(win.distanceKm)} km · D+${Math.round(win.elevationM)} m`,
            day.weather.tmin != null
              ? `Météo ${day.weather.emoji} ${day.weather.tmin}°/${day.weather.tmax}°C`
              : undefined,
            day.topPlaces.length > 0 ? "POI: " + day.topPlaces.map((p) => p.name).join(", ") : undefined,
          ]
            .filter(Boolean)
            .join("\n")
        : "Aucun tracé retenu pour ce jour.";
      events.push({
        uid: `the-trip-day-${day.n}-${day.dateISO}@the-trip`,
        startDate: start,
        endDate: end,
        summary,
        location,
        description,
      });
    }

    const ics = buildIcs(events);
    const filename = `the-trip-${rb.startISO}.ics`;
    return { ok: true, ics, filename };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur" };
  }
}
