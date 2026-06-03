import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { LodgingView } from "@/screens/lodging-view";
import { routeWinner } from "@/lib/winners";
import { TRIP_DAYS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function LodgingPage() {
  const [me, lodgings, users, routes] = await Promise.all([
    getCurrentUser(),
    prisma.lodging.findMany({
      orderBy: { createdAt: "desc" },
      include: { votes: true },
    }),
    prisma.user.findMany(),
    prisma.route.findMany({ include: { votes: true } }),
  ]);

  const userById = Object.fromEntries(users.map((u) => [u.id, u.name]));
  const headcount = users.length;

  // Build winners-only routesByDay (lighter payload than /map).
  const winnerByDay: Record<number, { id: string; name: string; gpxContent: string; roadGeoJson: string | null }[]> = {};
  for (let d = 1; d <= TRIP_DAYS; d++) winnerByDay[d] = [];
  const grouped = new Map<number, typeof routes>();
  for (const r of routes) {
    const arr = grouped.get(r.dayNumber) ?? [];
    arr.push(r);
    grouped.set(r.dayNumber, arr);
  }
  for (const [day, arr] of grouped) {
    const w = routeWinner(arr);
    if (w) {
      winnerByDay[day] = [
        {
          id: w.id,
          name: w.name,
          // Save bandwidth: drop gpxContent if we already have the OSRM track.
          gpxContent: w.roadGeoJson ? "" : w.gpxContent,
          roadGeoJson: w.roadGeoJson,
        },
      ];
    }
  }

  return (
    <LodgingView
      meId={me?.id ?? null}
      userById={userById}
      headcount={headcount}
      tripDays={TRIP_DAYS}
      lodgings={lodgings.map((l) => ({
        id: l.id,
        url: l.url,
        title: l.title,
        ogImage: l.ogImage,
        ogDescription: l.ogDescription,
        priceEur: l.priceEur,
        nightCount: l.nightCount,
        addressText: l.addressText,
        lat: l.lat,
        lng: l.lng,
        userId: l.userId,
        createdAtISO: l.createdAt.toISOString(),
        score: l.votes.reduce((acc, v) => acc + (v.value === "UP" ? 1 : -1), 0),
        upCount: l.votes.filter((v) => v.value === "UP").length,
        downCount: l.votes.filter((v) => v.value === "DOWN").length,
        upVoters: l.votes.filter((v) => v.value === "UP").map((v) => userById[v.userId] ?? "?"),
        downVoters: l.votes.filter((v) => v.value === "DOWN").map((v) => userById[v.userId] ?? "?"),
        myVote: me ? l.votes.find((v) => v.userId === me.id)?.value ?? null : null,
      }))}
      winnerRoutesByDay={winnerByDay}
    />
  );
}
