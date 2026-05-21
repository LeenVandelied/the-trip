import type { ReactNode } from "react";

export function Stamp({
  children,
  angle = -6,
  color,
}: {
  children: ReactNode;
  angle?: number;
  color?: string;
}) {
  return (
    <span
      className="stamp"
      style={{
        transform: `rotate(${angle}deg)`,
        color: color ?? "var(--stamp)",
        borderColor: color ?? "var(--stamp)",
      }}
    >
      {children}
    </span>
  );
}
