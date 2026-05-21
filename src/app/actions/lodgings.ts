"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/current-user";
import { scrapeOg } from "@/lib/og-scrape";
import { geocode } from "@/lib/geocode";
import type { VoteValue } from "@prisma/client";

export type ProposeLodgingInput = {
  url: string;
  priceEur?: number | null;
  nightCount?: number | null;
  addressText?: string | null;
};

export async function proposeLodgingAction(
  input: ProposeLodgingInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    const user = await requireCurrentUser();
    const rawUrl = input.url.trim();
    if (!rawUrl) return { ok: false, error: "URL requise" };

    let parsed: URL;
    try {
      parsed = new URL(rawUrl);
    } catch {
      return { ok: false, error: "URL invalide" };
    }
    if (!/^https?:$/.test(parsed.protocol)) {
      return { ok: false, error: "URL doit être en http(s)" };
    }

    const priceEur = input.priceEur != null && Number.isFinite(input.priceEur) ? input.priceEur : null;
    const nightCount =
      input.nightCount != null && Number.isInteger(input.nightCount) && input.nightCount > 0
        ? input.nightCount
        : null;
    const addressText = input.addressText?.trim() || null;

    // Fire fetches in parallel; both are best-effort.
    const [og, geo] = await Promise.all([
      scrapeOg(parsed.toString()),
      addressText ? geocode(addressText) : Promise.resolve(null),
    ]);

    const lodging = await prisma.lodging.create({
      data: {
        userId: user.id,
        url: parsed.toString(),
        title: og.title,
        ogImage: og.image,
        ogDescription: og.description,
        priceEur,
        nightCount,
        addressText: geo?.displayName ?? addressText,
        lat: geo?.lat ?? null,
        lng: geo?.lng ?? null,
      },
    });

    revalidatePath("/lodging");
    return { ok: true, id: lodging.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur" };
  }
}

export async function voteLodgingAction(
  lodgingId: string,
  value: VoteValue | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const user = await requireCurrentUser();
    if (value === null) {
      await prisma.lodgingVote.deleteMany({ where: { userId: user.id, lodgingId } });
    } else {
      await prisma.lodgingVote.upsert({
        where: { userId_lodgingId: { userId: user.id, lodgingId } },
        create: { userId: user.id, lodgingId, value },
        update: { value },
      });
    }
    revalidatePath("/lodging");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur" };
  }
}

export async function deleteLodgingAction(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const user = await requireCurrentUser();
    const l = await prisma.lodging.findUnique({ where: { id } });
    if (!l) return { ok: false, error: "Logement introuvable" };
    if (l.userId !== user.id) return { ok: false, error: "Tu peux supprimer uniquement les logements que tu as proposés" };
    await prisma.lodging.delete({ where: { id } });
    revalidatePath("/lodging");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur" };
  }
}
