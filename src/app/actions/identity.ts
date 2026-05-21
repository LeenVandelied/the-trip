"use server";

import { revalidatePath } from "next/cache";
import { setCurrentUserByName, clearCurrentUser } from "@/lib/current-user";

export async function setPseudoAction(name: string): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await setCurrentUserByName(name);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur" };
  }
}

export async function signOutAction(): Promise<void> {
  await clearCurrentUser();
  revalidatePath("/", "layout");
}
