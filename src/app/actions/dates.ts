"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/current-user";
import type { AvailabilityStatus } from "@prisma/client";

const ALLOWED: AvailabilityStatus[] = ["YES" as AvailabilityStatus, "MAYBE" as AvailabilityStatus, "NO" as AvailabilityStatus];

export async function proposeDateRangeAction(
  startISO: string,
  endISO: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireCurrentUser();
    const startDate = new Date(startISO);
    const endDate = new Date(endISO);
    if (Number.isNaN(+startDate) || Number.isNaN(+endDate)) {
      return { ok: false, error: "Dates invalides" };
    }
    if (endDate < startDate) {
      return { ok: false, error: "Date de fin avant la date de début" };
    }
    await prisma.dateProposal.create({ data: { startDate, endDate } });
    revalidatePath("/dates");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur" };
  }
}

export async function setAvailabilityAction(
  dateProposalId: string,
  status: AvailabilityStatus | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const user = await requireCurrentUser();
    if (status === null) {
      await prisma.availability.deleteMany({
        where: { userId: user.id, dateProposalId },
      });
    } else {
      if (!ALLOWED.includes(status)) {
        return { ok: false, error: "Statut invalide" };
      }
      await prisma.availability.upsert({
        where: { userId_dateProposalId: { userId: user.id, dateProposalId } },
        create: { userId: user.id, dateProposalId, status },
        update: { status },
      });
    }
    revalidatePath("/dates");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur" };
  }
}

export async function deleteDateProposalAction(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireCurrentUser();
    await prisma.dateProposal.delete({ where: { id } });
    revalidatePath("/dates");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur" };
  }
}
