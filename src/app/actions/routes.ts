"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/current-user";
import { MAX_GPX_BYTES, TRIP_DAYS } from "@/lib/constants";
import { reconstructRoadCoords } from "@/lib/osrm";
import type { VoteValue } from "@prisma/client";

export type ProposeRouteInput = {
  dayNumber: number;
  name: string;
  gpxContent: string;
  distanceKm: number;
  elevationM: number;
  durationSec?: number;
};

export async function proposeRouteAction(
  input: ProposeRouteInput,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    const user = await requireCurrentUser();
    if (!Number.isInteger(input.dayNumber) || input.dayNumber < 1 || input.dayNumber > TRIP_DAYS) {
      return { ok: false, error: `dayNumber doit être entre 1 et ${TRIP_DAYS}` };
    }
    const name = input.name.trim();
    if (!name) return { ok: false, error: "Nom de tracé requis" };
    if (Buffer.byteLength(input.gpxContent, "utf8") > MAX_GPX_BYTES) {
      return { ok: false, error: `GPX trop volumineux (max ${MAX_GPX_BYTES / 1024 / 1024} MB)` };
    }
    if (input.distanceKm <= 0 || !Number.isFinite(input.distanceKm)) {
      return { ok: false, error: "Distance invalide" };
    }

    // Reconstruct road-following polyline via OSRM (best-effort).
    let roadGeoJson: string | null = null;
    try {
      const recon = await reconstructRoadCoords(input.gpxContent);
      if (recon.ok) {
        roadGeoJson = JSON.stringify(recon.coords);
      }
    } catch {
      // Swallow — we'll save the route without the matched polyline.
    }

    const r = await prisma.route.create({
      data: {
        userId: user.id,
        dayNumber: input.dayNumber,
        name,
        gpxContent: input.gpxContent,
        distanceKm: input.distanceKm,
        elevationM: input.elevationM,
        durationSec: input.durationSec ?? null,
        roadGeoJson,
      },
    });
    revalidatePath("/routes");
    revalidatePath("/map");
    revalidatePath("/budget");
    revalidatePath("/roadbook");
    revalidatePath("/");
    return { ok: true, id: r.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur" };
  }
}

export async function voteRouteAction(
  routeId: string,
  value: VoteValue | null,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const user = await requireCurrentUser();
    if (value === null) {
      await prisma.routeVote.deleteMany({ where: { userId: user.id, routeId } });
    } else {
      await prisma.routeVote.upsert({
        where: { userId_routeId: { userId: user.id, routeId } },
        create: { userId: user.id, routeId, value },
        update: { value },
      });
    }
    revalidatePath("/routes");
    revalidatePath("/map");
    revalidatePath("/budget");
    revalidatePath("/roadbook");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur" };
  }
}

export async function deleteRouteAction(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const user = await requireCurrentUser();
    const r = await prisma.route.findUnique({ where: { id } });
    if (!r) return { ok: false, error: "Tracé introuvable" };
    if (r.userId !== user.id) return { ok: false, error: "Tu peux supprimer uniquement les tracés que tu as proposés" };
    await prisma.route.delete({ where: { id } });
    revalidatePath("/routes");
    revalidatePath("/map");
    revalidatePath("/budget");
    revalidatePath("/roadbook");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur" };
  }
}
