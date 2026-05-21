"use client";

import type { MouseEvent } from "react";

export type Vote = "yes" | "no" | null;

export function VoteButtons({
  yes,
  no,
  myVote,
  onVote,
  compact,
}: {
  yes: number;
  no: number;
  myVote: Vote;
  onVote: (v: Vote) => void;
  compact?: boolean;
}) {
  const click = (v: "yes" | "no") => (e: MouseEvent) => {
    e.stopPropagation();
    onVote(myVote === v ? null : v);
  };
  const style = compact ? { padding: "2px 8px" } : {};
  return (
    <span style={{ display: "inline-flex", gap: 6 }}>
      <button className={"vote yes " + (myVote === "yes" ? "on" : "")} onClick={click("yes")} style={style}>
        <span className="ic">▲</span>
        {yes}
      </button>
      <button className={"vote no " + (myVote === "no" ? "on" : "")} onClick={click("no")} style={style}>
        <span className="ic">▼</span>
        {no}
      </button>
    </span>
  );
}
