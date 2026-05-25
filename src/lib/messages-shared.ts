// Plain module (no "use server") so types & constants can be imported
// from client components without breaking Next.js server-action constraints.

export const MAX_MESSAGE_LEN = 2000;

export type ChatMessage = {
  id: string;
  userId: string;
  authorName: string;
  content: string;
  createdAtISO: string;
};
