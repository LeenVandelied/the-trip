import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { ChatView } from "@/screens/chat-view";
import type { ChatMessage } from "@/lib/messages-shared";

export const dynamic = "force-dynamic";

export default async function ChatPage() {
  const [me, rows] = await Promise.all([
    getCurrentUser(),
    prisma.message.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { user: { select: { name: true } } },
    }),
  ]);

  const initial: ChatMessage[] = rows
    .map((m) => ({
      id: m.id,
      userId: m.userId,
      authorName: m.user.name,
      content: m.content,
      createdAtISO: m.createdAt.toISOString(),
    }))
    .reverse();

  return <ChatView meId={me?.id ?? null} mePseudo={me?.name ?? null} initial={initial} />;
}
