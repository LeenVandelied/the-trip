import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { MapView } from "@/screens/map-view";
import { TRIP_DAYS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function MapPage() {
  const [me, places, routes, users] = await Promise.all([
    getCurrentUser(),
    prisma.place.findMany({
      orderBy: { createdAt: "asc" },
      include: { votes: true },
    }),
    prisma.route.findMany({
      orderBy: { createdAt: "asc" },
      include: { votes: true },
    }),
    prisma.user.findMany(),
  ]);

  const userById = Object.fromEntries(users.map((u) => [u.id, u.name]));

  // For each day, keep the winning route's gpxContent (lightweight on wire vs all routes' gpx).
  const winnerGpxByDay: Record<
    number,
    { id: string; name: string; gpxContent: string; roadGeoJson: string | null }
  > = {};
  const byDay = new Map<number, typeof routes>();
  for (const r of routes) {
    const arr = byDay.get(r.dayNumber) ?? [];
    arr.push(r);
    byDay.set(r.dayNumber, arr);
  }
  for (const [day, arr] of byDay) {
    const sorted = [...arr].sort((a, b) => {
      const sa = a.votes.reduce((acc, v) => acc + (v.value === "UP" ? 1 : -1), 0);
      const sb = b.votes.reduce((acc, v) => acc + (v.value === "UP" ? 1 : -1), 0);
      if (sb !== sa) return sb - sa;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });
    if (sorted[0]) {
      winnerGpxByDay[day] = {
        id: sorted[0].id,
        name: sorted[0].name,
        gpxContent: sorted[0].gpxContent,
        roadGeoJson: sorted[0].roadGeoJson,
      };
    }
  }

  return (
    <MapView
      meId={me?.id ?? null}
      userById={userById}
      tripDays={TRIP_DAYS}
      places={places.map((p) => ({
        id: p.id,
        lat: p.lat,
        lng: p.lng,
        name: p.name,
        description: p.description,
        userId: p.userId,
        score: p.votes.reduce((acc, v) => acc + (v.value === "UP" ? 1 : -1), 0),
        upCount: p.votes.filter((v) => v.value === "UP").length,
        downCount: p.votes.filter((v) => v.value === "DOWN").length,
        myVote: me ? p.votes.find((v) => v.userId === me.id)?.value ?? null : null,
      }))}
      winnerGpxByDay={winnerGpxByDay}
    />
  );
}
