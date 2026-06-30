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
  let viewW = 200;
  let viewH = height;
  const pad = 8;

  if (hasPoints) {
    // Equirectangular projection around the mean latitude — keeps the shape
    // accurate at trip-scale distances instead of squashing N-S vs E-W.
    let sumLat = 0;
    for (const [lat] of points) sumLat += lat;
    const meanLatRad = (sumLat / points.length) * (Math.PI / 180);
    const kx = Math.cos(meanLatRad);

    const projected = points.map(([lat, lng]) => [lng * kx, -lat] as const);

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const [x, y] of projected) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    const spanX = Math.max(maxX - minX, 1e-6);
    const spanY = Math.max(maxY - minY, 1e-6);

    // Make the viewBox match the data aspect ratio so the line never squashes,
    // regardless of the container's width/height. Container fills with `meet`.
    // Normalize the longer axis to ~200 units for nice stroke width.
    const aspect = spanX / spanY;
    if (aspect >= 1) {
      viewW = 200;
      viewH = 200 / aspect;
    } else {
      viewH = 200;
      viewW = 200 * aspect;
    }
    const innerW = viewW - pad * 2;
    const innerH = viewH - pad * 2;
    const sx = innerW / spanX;
    const sy = innerH / spanY;

    const pts = projected.map(([x, y]) => {
      return [pad + (x - minX) * sx, pad + (y - minY) * sy] as const;
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
          viewBox={`0 0 ${viewW.toFixed(1)} ${viewH.toFixed(1)}`}
          preserveAspectRatio="xMidYMid meet"
          width="100%"
          height="100%"
          style={{ display: "block" }}
        >
          <path
            d={pathD}
            fill="none"
            stroke={color}
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.95}
            vectorEffect="non-scaling-stroke"
          />
          <circle cx={startCx} cy={startCy} r={3.5} fill={color} vectorEffect="non-scaling-stroke" />
          <circle
            cx={endCx}
            cy={endCy}
            r={3.5}
            fill="#1a1308"
            stroke={color}
            strokeWidth={1.8}
            vectorEffect="non-scaling-stroke"
          />
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
