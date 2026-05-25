"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { postMessageAction, listMessagesSinceAction } from "@/app/actions/messages";
import { MAX_MESSAGE_LEN, type ChatMessage } from "@/lib/messages-shared";

const POLL_INTERVAL_MS = 4000;
const GROUP_GAP_MS = 5 * 60 * 1000; // group consecutive msgs from same author within 5 min

function fmtTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  if (sameDay) return `${hh}:${mm}`;
  return `${d.getDate()}/${(d.getMonth() + 1).toString().padStart(2, "0")} ${hh}:${mm}`;
}

export function ChatView({
  meId,
  mePseudo,
  initial,
}: {
  meId: string | null;
  mePseudo: string | null;
  initial: ChatMessage[];
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>(initial);
  const [draft, setDraft] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const listRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  // Track the latest timestamp we've seen so subsequent polls only fetch new messages.
  const latestISO = useMemo(
    () => (messages.length > 0 ? messages[messages.length - 1].createdAtISO : null),
    [messages],
  );
  const latestISORef = useRef<string | null>(latestISO);
  useEffect(() => {
    latestISORef.current = latestISO;
  }, [latestISO]);

  // De-dup against existing IDs (in case the server returns an overlap with our optimistic insert).
  const mergeNew = useCallback((incoming: ChatMessage[]) => {
    if (incoming.length === 0) return;
    setMessages((prev) => {
      const seen = new Set(prev.map((m) => m.id));
      const additions = incoming.filter((m) => !seen.has(m.id));
      if (additions.length === 0) return prev;
      return [...prev, ...additions];
    });
  }, []);

  // Polling — paused when the tab is hidden to save round-trips.
  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      if (stopped) return;
      if (document.visibilityState !== "visible") {
        // Try again shortly after visibility change handles the next tick.
        timer = setTimeout(tick, POLL_INTERVAL_MS);
        return;
      }
      try {
        const res = await listMessagesSinceAction(latestISORef.current);
        if (res.ok && res.msgs.length > 0) mergeNew(res.msgs);
      } catch {
        // ignore transient failures
      }
      if (!stopped) timer = setTimeout(tick, POLL_INTERVAL_MS);
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible" && stopped === false) {
        // Immediate catch-up when the user comes back.
        if (timer) clearTimeout(timer);
        tick();
      }
    };

    document.addEventListener("visibilitychange", onVisibility);
    timer = setTimeout(tick, POLL_INTERVAL_MS);
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [mergeNew]);

  // Auto-scroll to bottom when new messages arrive (unless the user scrolled up).
  const stickyBottomRef = useRef(true);
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const onScroll = () => {
      const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
      stickyBottomRef.current = dist < 60;
    };
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    if (stickyBottomRef.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  const send = () => {
    const content = draft.trim();
    if (!content) return;
    if (!meId) {
      router.push("/");
      return;
    }
    setErr(null);
    setDraft("");
    // Optimistic insert.
    const tmpId = "tmp-" + Math.random().toString(36).slice(2);
    const optimistic: ChatMessage = {
      id: tmpId,
      userId: meId,
      authorName: mePseudo ?? "moi",
      content,
      createdAtISO: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    stickyBottomRef.current = true;

    startTransition(async () => {
      const res = await postMessageAction(content);
      setMessages((prev) => {
        // Replace the temp message with the real one (or drop on failure).
        const without = prev.filter((m) => m.id !== tmpId);
        if (!res.ok) {
          setErr(res.error);
          setDraft(content); // give it back to the user
          return without;
        }
        if (without.some((m) => m.id === res.msg.id)) return without;
        return [...without, res.msg];
      });
    });
  };

  // Group consecutive messages from the same author within GROUP_GAP_MS.
  type Block = { authorId: string; authorName: string; msgs: ChatMessage[] };
  const blocks: Block[] = [];
  for (const m of messages) {
    const last = blocks[blocks.length - 1];
    if (
      last &&
      last.authorId === m.userId &&
      new Date(m.createdAtISO).getTime() - new Date(last.msgs[last.msgs.length - 1].createdAtISO).getTime() < GROUP_GAP_MS
    ) {
      last.msgs.push(m);
    } else {
      blocks.push({ authorId: m.userId, authorName: m.authorName, msgs: [m] });
    }
  }

  return (
    <div className="chat-screen">
      <div className="page-header chat-header">
        <div className="ttl">
          <div className="eyebrow" style={{ marginBottom: 12 }}>08 · CHAT</div>
          <h1>Le QG.</h1>
        </div>
        <div className="meta">
          {messages.length} MESSAGE{messages.length > 1 ? "S" : ""}
          <br />
          ACTUALISATION&nbsp;:&nbsp;{POLL_INTERVAL_MS / 1000}s
        </div>
      </div>

      <div ref={listRef} className="chat-list">
        {blocks.length === 0 && (
          <div className="chat-empty">
            <div style={{ fontSize: 32, color: "var(--ink-faint)" }}>∅</div>
            <div>
              <strong>Pas encore de message</strong>
              <div className="coord" style={{ marginTop: 4 }}>
                Lance la discussion — &laquo;&nbsp;Salut les motards&nbsp;&raquo;.
              </div>
            </div>
          </div>
        )}
        {blocks.map((b, bi) => {
          const isMine = b.authorId === meId;
          return (
            <div key={bi} className={"chat-block " + (isMine ? "mine" : "")}>
              <div className="chat-avatar">
                <Avatar pseudo={b.authorName} size="sm" />
              </div>
              <div className="chat-body">
                <div className="chat-meta">
                  <span className="chat-author">{b.authorName}</span>
                  <span className="coord">{fmtTime(b.msgs[0].createdAtISO)}</span>
                </div>
                {b.msgs.map((m) => (
                  <div key={m.id} className="chat-bubble">{m.content}</div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="chat-input">
        {err && (
          <div className="coord" style={{ color: "var(--no)", padding: "4px 14px" }}>
            {err}
          </div>
        )}
        <div className="chat-input-row">
          <textarea
            ref={inputRef}
            className="input chat-textarea"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={meId ? "Ton message… (Entrée pour envoyer, Maj+Entrée = nouvelle ligne)" : "Embarque (/) pour participer"}
            rows={1}
            maxLength={MAX_MESSAGE_LEN}
            disabled={!meId}
          />
          <button className="btn btn-primary" onClick={send} disabled={!meId || !draft.trim()}>
            Envoyer
          </button>
        </div>
      </div>

      <style>{`
        .chat-screen {
          display: grid;
          grid-template-rows: auto 1fr auto;
          height: calc(100vh - 60px);
          max-width: 920px;
          margin: 0 auto;
          padding: 32px 28px 0;
        }
        @media (max-width: 820px) {
          .chat-screen {
            padding: 20px 16px 0;
            height: calc(100vh - 56px);
          }
        }
        .chat-header { padding-bottom: 18px; margin-bottom: 12px; }
        .chat-list {
          overflow-y: auto;
          padding: 8px 0 16px;
          display: flex; flex-direction: column; gap: 16px;
          min-height: 0;
        }
        .chat-empty {
          padding: 60px 28px;
          text-align: center;
          display: flex; flex-direction: column; align-items: center; gap: 14px;
          border: 1px dashed var(--ink-faint);
          border-radius: var(--radius);
        }
        .chat-block {
          display: flex; gap: 12px;
          align-items: flex-start;
        }
        .chat-block.mine .chat-body { align-items: flex-end; }
        .chat-block.mine .chat-bubble {
          background: rgba(240,168,48,.08);
          border-color: var(--accent-line);
        }
        .chat-block.mine {
          flex-direction: row-reverse;
        }
        .chat-body {
          flex: 1;
          min-width: 0;
          display: flex; flex-direction: column; gap: 4px;
          max-width: 100%;
        }
        .chat-meta {
          display: flex; align-items: baseline; gap: 8px;
          font-size: 12px;
          color: var(--ink-mute);
        }
        .chat-block.mine .chat-meta { flex-direction: row-reverse; }
        .chat-author {
          font-family: var(--f-mono);
          font-size: 11px;
          letter-spacing: .08em;
          text-transform: uppercase;
          color: var(--ink-dim);
        }
        .chat-bubble {
          background: var(--paper-2);
          border: 1px solid var(--kraft);
          padding: 8px 12px;
          border-radius: 4px;
          line-height: 1.45;
          font-size: 14px;
          word-break: break-word;
          white-space: pre-wrap;
          max-width: min(640px, 90%);
        }
        .chat-input {
          border-top: 1px dashed var(--ink-faint);
          padding: 14px 0 24px;
          background: var(--paper);
        }
        .chat-input-row {
          display: flex; gap: 10px; align-items: stretch;
        }
        .chat-textarea {
          resize: none;
          min-height: 44px;
          max-height: 200px;
          padding: 12px 14px;
          line-height: 1.45;
        }
      `}</style>
    </div>
  );
}
