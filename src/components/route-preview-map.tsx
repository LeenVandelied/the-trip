"use client";

import dynamic from "next/dynamic";
import { DAY_COLORS } from "@/lib/constants";

const Inner = dynamic(
  () => import("./route-preview-map-inner").then((m) => m.RoutePreviewMapInner),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0f0c08",
          color: "var(--ink-mute)",
          fontFamily: "var(--f-mono)",
          fontSize: 10,
          letterSpacing: ".14em",
        }}
      >
        CARTE…
      </div>
    ),
  },
);

export function RoutePreviewMap({
  points,
  day,
  height = 80,
}: {
  points: [number, number][];
  day: number;
  height?: number;
}) {
  const color = DAY_COLORS[(day - 1) % DAY_COLORS.length];
  const hasPoints = points && points.length >= 2;
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height,
        background: "#0f0c08",
        border: `1px solid ${color}33`,
        borderRadius: 2,
        overflow: "hidden",
      }}
    >
      {hasPoints ? (
        <Inner points={points} day={day} />
      ) : (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--f-mono)",
            fontSize: 10,
            letterSpacing: ".14em",
            color: "var(--ink-mute)",
          }}
        >
          — tracé non disponible —
        </div>
      )}
    </div>
  );
}
