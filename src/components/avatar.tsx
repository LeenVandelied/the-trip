import { avatarColor } from "@/lib/constants";

type Size = "sm" | "lg";

export function Avatar({ pseudo, size }: { pseudo: string; size?: Size }) {
  const initial = (pseudo || "?").trim().charAt(0).toUpperCase();
  const color = avatarColor(pseudo || "?");
  const cls = size ? `avatar ${size}` : "avatar";
  return (
    <span className={cls} style={{ background: color }} title={pseudo}>
      {initial}
    </span>
  );
}

export function AvatarStack({
  pseudos,
  size,
  max,
}: {
  pseudos: string[];
  size?: Size;
  max?: number;
}) {
  const lim = max ?? pseudos.length;
  const shown = pseudos.slice(0, lim);
  const extra = pseudos.length - shown.length;
  return (
    <span className="avatar-stack">
      {shown.map((p, i) => (
        <Avatar key={i} pseudo={p} size={size} />
      ))}
      {extra > 0 && (
        <span
          className={"avatar " + (size ?? "")}
          style={{ background: "var(--kraft)", color: "var(--ink-dim)" }}
        >
          +{extra}
        </span>
      )}
    </span>
  );
}
