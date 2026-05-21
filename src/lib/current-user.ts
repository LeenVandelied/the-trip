import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { User } from "@prisma/client";

const COOKIE_NAME = "tt_user";
const ONE_YEAR = 60 * 60 * 24 * 365;

export async function getCurrentUser(): Promise<User | null> {
  const store = await cookies();
  const id = store.get(COOKIE_NAME)?.value;
  if (!id) return null;
  return prisma.user.findUnique({ where: { id } });
}

export async function requireCurrentUser(): Promise<User> {
  const u = await getCurrentUser();
  if (!u) throw new Error("Not embarked yet — go to / and set a pseudo first.");
  return u;
}

/** Upsert by name then bind to cookie. Returns the user. */
export async function setCurrentUserByName(rawName: string): Promise<User> {
  const name = rawName.trim();
  if (!name) throw new Error("Pseudo vide");
  if (name.length > 32) throw new Error("Pseudo trop long (max 32)");

  const user = await prisma.user.upsert({
    where: { name },
    create: { name },
    update: {},
  });

  const store = await cookies();
  store.set(COOKIE_NAME, user.id, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: ONE_YEAR,
    path: "/",
  });

  return user;
}

export async function clearCurrentUser(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
