"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/current-user";
import type { VoteValue } from "@prisma/client";

export async function createPlaceAction(
  lat: number,
  lng: number,
  name: string,
  description?: string,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    const user = await requireCurrentUser();
    const cleanName = name.trim();
    if (!cleanName) return { ok: false, error: "Nom requis" };
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return { ok: false, error: "Coordonnées invalides" };
    }
    const p = await prisma.place.create({
      data: {
        userId: user.id,
        lat,
        lng,
        name: cleanName,
        description: description?.trim() || null,
      },
    });
    revalidatePath("/map");
    revalidatePath("/roadbook");
    return { ok: true, id: p.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur" };
  }
}

export async function votePlaceAction(
  placeId: string,
  value: VoteValue | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const user = await requireCurrentUser();
    if (value === null) {
      await prisma.placeVote.deleteMany({ where: { userId: user.id, placeId } });
    } else {
      await prisma.placeVote.upsert({
        where: { userId_placeId: { userId: user.id, placeId } },
        create: { userId: user.id, placeId, value },
        update: { value },
      });
    }
    revalidatePath("/map");
    revalidatePath("/roadbook");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur" };
  }
}

export async function deletePlaceAction(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const user = await requireCurrentUser();
    const p = await prisma.place.findUnique({ where: { id } });
    if (!p) return { ok: false, error: "Lieu introuvable" };
    if (p.userId !== user.id) return { ok: false, error: "Tu peux supprimer uniquement les lieux que tu as proposés" };
    await prisma.place.delete({ where: { id } });
    revalidatePath("/map");
    revalidatePath("/roadbook");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur" };
  }
}
