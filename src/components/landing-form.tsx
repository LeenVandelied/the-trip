"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setPseudoAction } from "@/app/actions/identity";

export function LandingForm({
  initial,
  alreadyEmbarked,
}: {
  initial: string;
  alreadyEmbarked: boolean;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState(initial);
  const [err, setErr] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onJoin = () => {
    if (!draft.trim()) return;
    setErr(null);
    startTransition(async () => {
      const res = await setPseudoAction(draft.trim());
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      router.push("/dates");
    });
  };

  return (
    <div className="embark card plated">
      <span className="corners" />
      <div className="eyebrow" style={{ marginBottom: 8 }}>
        {alreadyEmbarked ? "TU ES À BORD" : "EMBARQUE"}
      </div>
      <div style={{ display: "flex", gap: 10, alignItems: "stretch", flexWrap: "wrap" }}>
        <input
          className="input"
          style={{ flex: "1 1 220px" }}
          placeholder="Ton pseudo…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onJoin()}
          disabled={pending}
          maxLength={32}
        />
        <button
          className="btn btn-primary"
          onClick={onJoin}
          disabled={pending || !draft.trim()}
        >
          {pending ? "…" : alreadyEmbarked ? "Aux dates →" : "C'est parti →"}
        </button>
      </div>
      {err && (
        <div className="coord" style={{ color: "var(--no)", marginTop: 8 }}>
          {err}
        </div>
      )}
      <style>{`
        .embark { margin-bottom: 8px; max-width: 540px; }
      `}</style>
    </div>
  );
}
