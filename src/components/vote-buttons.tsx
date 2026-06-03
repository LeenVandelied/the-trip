"use client";

import type { MouseEvent } from "react";
import { AvatarStack } from "@/components/avatar";

export type Vote = "yes" | "no" | null;

export function VoteButtons({
  yes,
  no,
  myVote,
  onVote,
  compact,
  upPseudos,
  downPseudos,
}: {
  yes: number;
  no: number;
  myVote: Vote;
  onVote: (v: Vote) => void;
  compact?: boolean;
  /** Pseudos of users who voted ▲ — when provided, a small avatar stack is rendered next to the count. */
  upPseudos?: string[];
  /** Same for ▼ voters. */
  downPseudos?: string[];
}) {
  const click = (v: "yes" | "no") => (e: MouseEvent) => {
    e.stopPropagation();
    onVote(myVote === v ? null : v);
  };
  const style = compact ? { padding: "2px 8px" } : {};
  const stackMax = compact ? 3 : 4;

  const upList = upPseudos ?? [];
  const downList = downPseudos ?? [];

  return (
    <span
      style={{
        display: "inline-flex",
        gap: 6,
        alignItems: "center",
        flexWrap: "wrap",
      }}
    >
      <button className={"vote yes " + (myVote === "yes" ? "on" : "")} onClick={click("yes")} style={style}>
        <span className="ic">▲</span>
        {yes}
      </button>
      {upList.length > 0 && (
        <span
          className="vote-voters"
          title={upList.join(", ")}
          aria-label={`A voté oui: ${upList.join(", ")}`}
          style={{ display: "inline-flex" }}
        >
          <AvatarStack pseudos={upList} size="sm" max={stackMax} />
        </span>
      )}
      <button className={"vote no " + (myVote === "no" ? "on" : "")} onClick={click("no")} style={style}>
        <span className="ic">▼</span>
        {no}
      </button>
      {downList.length > 0 && (
        <span
          className="vote-voters"
          title={downList.join(", ")}
          aria-label={`A voté non: ${downList.join(", ")}`}
          style={{ display: "inline-flex" }}
        >
          <AvatarStack pseudos={downList} size="sm" max={stackMax} />
        </span>
      )}
    </span>
  );
}
