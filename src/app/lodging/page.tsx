import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { LodgingView } from "@/screens/lodging-view";

export const dynamic = "force-dynamic";

export default async function LodgingPage() {
  const [me, lodgings, users] = await Promise.all([
    getCurrentUser(),
    prisma.lodging.findMany({
      orderBy: { createdAt: "desc" },
      include: { votes: true },
    }),
    prisma.user.findMany(),
  ]);

  const userById = Object.fromEntries(users.map((u) => [u.id, u.name]));

  return (
    <LodgingView
      meId={me?.id ?? null}
      userById={userById}
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
        myVote: me ? l.votes.find((v) => v.userId === me.id)?.value ?? null : null,
      }))}
    />
  );
}
