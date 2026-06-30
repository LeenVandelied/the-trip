import { DAY_COLORS } from "@/lib/constants";

export function RouteSparkline({
  points,
  day,
  height = 60,
  showLabel = false,
}: {
  points: [number, number][]; // [lat, lng]
  day: number;
  height?: number;
  showLabel?: boolean;
}) {
  const color = DAY_COLORS[(day - 1) % DAY_COLORS.length];
  const hasPoints = points && points.length >= 2;

  let pathD = "";
  let startCx = 0;
  let startCy = 0;
  let endCx = 0;
  let endCy = 0;
  const W = 200;
  const H = height;
  const padX = 6;
  const padY = 6;

  if (hasPoints) {
    let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
    for (const [lat, lng] of points) {
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
    }
    const spanLat = Math.max(maxLat - minLat, 1e-6);
    const spanLng = Math.max(maxLng - minLng, 1e-6);
    // Preserve aspect (squash horizontal vs vertical) by normalizing to the smaller box.
    const innerW = W - padX * 2;
    const innerH = H - padY * 2;
    const scale = Math.min(innerW / spanLng, innerH / spanLat);
    const offX = padX + (innerW - spanLng * scale) / 2;
    const offY = padY + (innerH - spanLat * scale) / 2;

    const pts = points.map(([lat, lng]) => {
      const x = offX + (lng - minLng) * scale;
      const y = offY + (maxLat - lat) * scale; // flip Y
      return [x, y] as const;
    });
    pathD = pts
      .map((p, i) => (i === 0 ? `M${p[0].toFixed(1)},${p[1].toFixed(1)}` : `L${p[0].toFixed(1)},${p[1].toFixed(1)}`))
      .join("");
    [startCx, startCy] = pts[0];
    [endCx, endCy] = pts[pts.length - 1];
  }

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height,
        background:
          "repeating-linear-gradient(135deg, rgba(240,168,48,.02) 0 8px, transparent 8px 16px), #0f0c08",
        border: "1px dashed var(--ink-faint)",
        borderRadius: 2,
        overflow: "hidden",
      }}
    >
      {hasPoints ? (
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          width="100%"
          height="100%"
          style={{ display: "block" }}
        >
          <path
            d={pathD}
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.95}
          />
          <circle cx={startCx} cy={startCy} r={3} fill={color} />
          <circle cx={endCx} cy={endCy} r={3} fill="#1a1308" stroke={color} strokeWidth={1.5} />
        </svg>
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
      {showLabel && (
        <span
          style={{
            position: "absolute",
            top: 6,
            left: 8,
            fontFamily: "var(--f-mono)",
            fontSize: 10,
            letterSpacing: ".14em",
            color: "var(--ink-mute)",
            textTransform: "uppercase",
          }}
        >
          J{day}
        </span>
      )}
    </div>
  );
}
