"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireCurrentUser } from "@/lib/current-user";
import { MAX_MESSAGE_LEN, type ChatMessage } from "@/lib/messages-shared";

export async function postMessageAction(
  rawContent: string,
): Promise<{ ok: true; msg: ChatMessage } | { ok: false; error: string }> {
  try {
    const user = await requireCurrentUser();
    const content = rawContent.trim();
    if (!content) return { ok: false, error: "Message vide" };
    if (content.length > MAX_MESSAGE_LEN) {
      return { ok: false, error: `Message trop long (max ${MAX_MESSAGE_LEN})` };
    }
    const m = await prisma.message.create({
      data: { userId: user.id, content },
    });
    // Revalidate so the next full /chat navigation has the new message in the initial payload.
    revalidatePath("/chat");
    return {
      ok: true,
      msg: {
        id: m.id,
        userId: m.userId,
        authorName: user.name,
        content: m.content,
        createdAtISO: m.createdAt.toISOString(),
      },
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur" };
  }
}

/**
 * Returns messages strictly after `sinceISO`, oldest-first, capped at 200.
 * If `sinceISO` is null/undefined, returns the latest 200 messages.
 */
export async function listMessagesSinceAction(
  sinceISO: string | null,
): Promise<{ ok: true; msgs: ChatMessage[] } | { ok: false; error: string }> {
  try {
    if (sinceISO) {
      const ts = new Date(sinceISO);
      if (Number.isNaN(+ts)) return { ok: false, error: "Date invalide" };
      const rows = await prisma.message.findMany({
        where: { createdAt: { gt: ts } },
        orderBy: { createdAt: "asc" },
        take: 200,
        include: { user: { select: { name: true } } },
      });
      return {
        ok: true,
        msgs: rows.map((m) => ({
          id: m.id,
          userId: m.userId,
          authorName: m.user.name,
          content: m.content,
          createdAtISO: m.createdAt.toISOString(),
        })),
      };
    }
    const rows = await prisma.message.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { user: { select: { name: true } } },
    });
    return {
      ok: true,
      msgs: rows
        .map((m) => ({
          id: m.id,
          userId: m.userId,
          authorName: m.user.name,
          content: m.content,
          createdAtISO: m.createdAt.toISOString(),
        }))
        .reverse(),
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Erreur" };
  }
}
