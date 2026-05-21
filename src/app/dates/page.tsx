import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { DatesView } from "@/screens/dates-view";

export const dynamic = "force-dynamic";

export default async function DatesPage() {
  const [me, proposals, users] = await Promise.all([
    getCurrentUser(),
    prisma.dateProposal.findMany({
      orderBy: { startDate: "asc" },
      include: { availabilities: true },
    }),
    prisma.user.findMany(),
  ]);

  const userById = Object.fromEntries(users.map((u) => [u.id, u.name]));

  return (
    <DatesView
      meId={me?.id ?? null}
      mePseudo={me?.name ?? null}
      userById={userById}
      totalUsers={users.length}
      proposals={proposals.map((p) => ({
        id: p.id,
        startISO: p.startDate.toISOString(),
        endISO: p.endDate.toISOString(),
        availabilities: p.availabilities.map((a) => ({
          userId: a.userId,
          status: a.status,
        })),
      }))}
    />
  );
}
