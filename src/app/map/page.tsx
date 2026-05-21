import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { MapView } from "@/screens/map-view";
import { TRIP_DAYS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function MapPage() {
  const [me, routes, users] = await Promise.all([
    getCurrentUser(),
    prisma.route.findMany({
      orderBy: { createdAt: "asc" },
      include: { votes: true },
    }),
    prisma.user.findMany(),
  ]);

  const userById = Object.fromEntries(users.map((u) => [u.id, u.name]));

  // Group all routes by day, sort each group by score desc (tie-break: createdAt asc).
  // The first element of each group is the "winner" for rendering emphasis.
  const routesByDay: Record<
    number,
    {
      id: string;
      name: string;
      gpxContent: string;
      roadGeoJson: string | null;
      distanceKm: number;
      elevationM: number;
      durationSec: number | null;
      userId: string;
      createdAtISO: string;
      score: number;
      upCount: number;
      downCount: number;
      myVote: "UP" | "DOWN" | null;
    }[]
  > = {};

  for (let d = 1; d <= TRIP_DAYS; d++) routesByDay[d] = [];

  for (const r of routes) {
    const arr = routesByDay[r.dayNumber];
    if (!arr) continue;
    arr.push({
      id: r.id,
      name: r.name,
      gpxContent: r.gpxContent,
      roadGeoJson: r.roadGeoJson,
      distanceKm: r.distanceKm,
      elevationM: r.elevationM,
      durationSec: r.durationSec,
      userId: r.userId,
      createdAtISO: r.createdAt.toISOString(),
      score: r.votes.reduce((acc, v) => acc + (v.value === "UP" ? 1 : -1), 0),
      upCount: r.votes.filter((v) => v.value === "UP").length,
      downCount: r.votes.filter((v) => v.value === "DOWN").length,
      myVote: me ? r.votes.find((v) => v.userId === me.id)?.value ?? null : null,
    });
  }

  for (const arr of Object.values(routesByDay)) {
    arr.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return new Date(a.createdAtISO).getTime() - new Date(b.createdAtISO).getTime();
    });
  }

  return (
    <MapView
      meId={me?.id ?? null}
      userById={userById}
      tripDays={TRIP_DAYS}
      routesByDay={routesByDay}
    />
  );
}
