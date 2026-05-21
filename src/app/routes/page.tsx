import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { RoutesView } from "@/screens/routes-view";
import { TRIP_DAYS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function RoutesPage() {
  const [me, routes, users] = await Promise.all([
    getCurrentUser(),
    prisma.route.findMany({
      orderBy: { createdAt: "asc" },
      include: { votes: true },
    }),
    prisma.user.findMany(),
  ]);

  const userById = Object.fromEntries(users.map((u) => [u.id, u.name]));

  // Strip gpxContent for the list view (too big over the wire).
  const lite = routes.map((r) => ({
    id: r.id,
    dayNumber: r.dayNumber,
    name: r.name,
    distanceKm: r.distanceKm,
    elevationM: r.elevationM,
    durationSec: r.durationSec,
    userId: r.userId,
    createdAtISO: r.createdAt.toISOString(),
    roadMatched: r.roadGeoJson != null,
    score: r.votes.reduce((acc, v) => acc + (v.value === "UP" ? 1 : -1), 0),
    upCount: r.votes.filter((v) => v.value === "UP").length,
    downCount: r.votes.filter((v) => v.value === "DOWN").length,
    myVote: me ? r.votes.find((v) => v.userId === me.id)?.value ?? null : null,
  }));

  return (
    <RoutesView
      meId={me?.id ?? null}
      userById={userById}
      routes={lite}
      tripDays={TRIP_DAYS}
    />
  );
}
