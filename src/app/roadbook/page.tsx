import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { computeRoadbook } from "@/lib/roadbook";
import { RoadbookView } from "@/screens/roadbook-view";

export const dynamic = "force-dynamic";

export default async function RoadbookPage() {
  const [me, rb, users] = await Promise.all([
    getCurrentUser(),
    computeRoadbook(),
    prisma.user.findMany(),
  ]);
  return (
    <RoadbookView
      mePseudo={me?.name ?? null}
      roadbook={rb}
      crew={users.map((u) => u.name)}
    />
  );
}
