"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/current-user";

export async function updateMyMotoAction(
  motoModel: string,
  conso: number,
  fuelPrice: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const user = await requireCurrentUser();
    if (!Number.isFinite(conso) || conso <= 0 || conso > 30) {
      return { ok: false, error: "Consommation invalide (0–30 L/100)" };
    }
    if (!Number.isFinite(fuelPrice) || fuelPrice <= 0 || fuelPrice > 10) {
      return { ok: false, error: "Prix invalide (0–10 €/L)" };
    }
    await prisma.user.update({
      where: { id: user.id },
      data: {
        motoModel: motoModel.trim() || null,
        motoConsumption_L100: conso,
        fuelPrice,
      },
    });
    revalidatePath("/budget");
    revalidatePath("/");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur" };
  }
}

export async function addExpenseAction(
  label: string,
  amountEur: number,
  perPerson: boolean,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    await requireCurrentUser();
    const clean = label.trim();
    if (!clean) return { ok: false, error: "Libellé requis" };
    if (!Number.isFinite(amountEur) || amountEur < 0) {
      return { ok: false, error: "Montant invalide" };
    }
    const e = await prisma.expense.create({
      data: { label: clean, amountEur, perPerson },
    });
    revalidatePath("/budget");
    return { ok: true, id: e.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur" };
  }
}

export async function deleteExpenseAction(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireCurrentUser();
    await prisma.expense.delete({ where: { id } });
    revalidatePath("/budget");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur" };
  }
}
