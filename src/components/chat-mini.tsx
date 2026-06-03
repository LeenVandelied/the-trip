"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { postMessageAction, listMessagesSinceAction } from "@/app/actions/messages";
import { MAX_MESSAGE_LEN, type ChatMessage } from "@/lib/messages-shared";

const POLL_INTERVAL_MS = 4000;
const MAX_DISPLAYED = 6;

function fmtTime(iso: string): string {
  const d = new Date(iso);
  const hh = d.getHours().toString().padStart(2, "0");
  const mm = d.getMinutes().toString().padStart(2, "0");
  return `${hh}:${mm}`;
}

export function ChatMini({
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
  const latestISORef = useRef<string | null>(
    initial.length > 0 ? initial[initial.length - 1].createdAtISO : null,
  );
  const listRef = useRef<HTMLDivElement | null>(null);

  const mergeNew = useCallback((incoming: ChatMessage[]) => {
    if (incoming.length === 0) return;
    setMessages((prev) => {
      const seen = new Set(prev.map((m) => m.id));
      const additions = incoming.filter((m) => !seen.has(m.id));
      if (additions.length === 0) return prev;
      // Keep only the most recent MAX_DISPLAYED in the mini view.
      const merged = [...prev, ...additions];
      return merged.slice(-MAX_DISPLAYED);
    });
    const last = incoming[incoming.length - 1];
    if (last) latestISORef.current = last.createdAtISO;
  }, []);

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const tick = async () => {
      if (stopped) return;
      if (document.visibilityState !== "visible") {
        timer = setTimeout(tick, POLL_INTERVAL_MS);
        return;
      }
      try {
        const res = await listMessagesSinceAction(latestISORef.current);
        if (res.ok && res.msgs.length > 0) mergeNew(res.msgs);
      } catch {
        /* ignore */
      }
      if (!stopped) timer = setTimeout(tick, POLL_INTERVAL_MS);
    };
    const onVis = () => {
      if (document.visibilityState === "visible" && !stopped) {
        if (timer) clearTimeout(timer);
        tick();
      }
    };
    document.addEventListener("visibilitychange", onVis);
    timer = setTimeout(tick, POLL_INTERVAL_MS);
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [mergeNew]);

  // Auto-scroll mini list to bottom on each update.
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
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
    const tmpId = "tmp-" + Math.random().toString(36).slice(2);
    const optimistic: ChatMessage = {
      id: tmpId,
      userId: meId,
      authorName: mePseudo ?? "moi",
      content,
      createdAtISO: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic].slice(-MAX_DISPLAYED));
    startTransition(async () => {
      const res = await postMessageAction(content);
      setMessages((prev) => {
        const without = prev.filter((m) => m.id !== tmpId);
        if (!res.ok) {
          setErr(res.error);
          setDraft(content);
          return without;
        }
        if (without.some((m) => m.id === res.msg.id)) return without;
        const next = [...without, res.msg].slice(-MAX_DISPLAYED);
        latestISORef.current = res.msg.createdAtISO;
        return next;
      });
    });
  };

  return (
    <div className="chat-mini card plated">
      <span className="corners" />
      <div className="cm-head">
        <div className="eyebrow">QG · TEMPS RÉEL</div>
        <Link href="/chat" className="cm-all coord">
          voir tout →
        </Link>
      </div>
      <div ref={listRef} className="cm-list">
        {messages.length === 0 ? (
          <div className="coord cm-empty">
            Pas encore de message — lance la discussion.
          </div>
        ) : (
          messages.map((m) => {
            const mine = m.userId === meId;
            return (
              <div key={m.id} className={"cm-line " + (mine ? "mine" : "")}>
                <Avatar pseudo={m.authorName} size="sm" />
                <div className="cm-bubble">
                  <div className="cm-meta">
                    <span className="cm-author">{m.authorName}</span>
                    <span className="coord cm-time">{fmtTime(m.createdAtISO)}</span>
                  </div>
                  <div className="cm-content">{m.content}</div>
                </div>
              </div>
            );
          })
        )}
      </div>
      {err && (
        <div className="coord" style={{ color: "var(--no)", marginTop: 4 }}>
          {err}
        </div>
      )}
      <div className="cm-input">
        <input
          className="input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              send();
            }
          }}
          placeholder={meId ? "Un message rapide…" : "Embarque pour participer"}
          disabled={!meId}
          maxLength={MAX_MESSAGE_LEN}
        />
        <button
          className="btn btn-primary btn-sm"
          onClick={send}
          disabled={!meId || !draft.trim()}
        >
          ↑
        </button>
      </div>

      <style>{`
        .chat-mini { margin-top: 18px; padding: 16px 18px; }
        .cm-head {
          display: flex; align-items: center; justify-content: space-between;
          padding-bottom: 10px;
          border-bottom: 1px dashed var(--ink-faint);
          margin-bottom: 10px;
        }
        .cm-all {
          text-decoration: none;
          color: var(--ink-mute);
          transition: color .14s;
        }
        .cm-all:hover { color: var(--accent); }
        .cm-list {
          max-height: 240px;
          overflow-y: auto;
          display: flex; flex-direction: column; gap: 10px;
          padding-right: 4px;
        }
        .cm-empty {
          padding: 18px 0;
          text-align: center;
        }
        .cm-line { display: flex; gap: 8px; align-items: flex-start; }
        .cm-line.mine { flex-direction: row-reverse; }
        .cm-bubble {
          display: flex; flex-direction: column; gap: 2px;
          min-width: 0;
          flex: 1;
        }
        .cm-line.mine .cm-bubble { align-items: flex-end; }
        .cm-meta {
          display: flex; gap: 6px; align-items: baseline;
        }
        .cm-line.mine .cm-meta { flex-direction: row-reverse; }
        .cm-author {
          font-family: var(--f-mono);
          font-size: 10px;
          letter-spacing: .08em;
          text-transform: uppercase;
          color: var(--ink-dim);
        }
        .cm-time { font-size: 10px; }
        .cm-content {
          font-size: 13px; line-height: 1.4;
          white-space: pre-wrap;
          word-break: break-word;
          padding: 4px 8px;
          background: var(--paper);
          border: 1px solid var(--kraft);
          border-radius: 3px;
          max-width: 100%;
        }
        .cm-line.mine .cm-content {
          background: rgba(240,168,48,.08);
          border-color: var(--accent-line);
        }
        .cm-input {
          display: flex; gap: 6px;
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px dashed var(--ink-faint);
        }
        .cm-input .input { padding: 8px 12px; font-size: 13px; }
      `}</style>
    </div>
  );
}
