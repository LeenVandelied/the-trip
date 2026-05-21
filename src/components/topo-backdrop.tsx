export function TopoBackdrop({
  density = 80,
  opacity = 0.07,
}: {
  density?: number;
  opacity?: number;
}) {
  const d = density;
  return (
    <svg
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
        opacity,
      }}
      viewBox="0 0 1600 1000"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <pattern id="topo-grid" width={d} height={d} patternUnits="userSpaceOnUse">
          <path d={`M ${d} 0 L 0 0 0 ${d}`} fill="none" stroke="#f0a830" strokeWidth=".5" opacity=".4" />
        </pattern>
        <pattern id="topo-grid-major" width={d * 5} height={d * 5} patternUnits="userSpaceOnUse">
          <path d={`M ${d * 5} 0 L 0 0 0 ${d * 5}`} fill="none" stroke="#f0a830" strokeWidth="1" opacity=".7" />
        </pattern>
      </defs>
      <rect width="1600" height="1000" fill="url(#topo-grid)" />
      <rect width="1600" height="1000" fill="url(#topo-grid-major)" />
      <g fill="none" stroke="#f0a830" strokeWidth="1" opacity=".5">
        {[80, 160, 240, 320, 400, 480, 560].map((r) => (
          <ellipse key={r} cx="280" cy="220" rx={r} ry={r * 0.7} />
        ))}
        {[60, 120, 180, 240, 300, 360, 420].map((r) => (
          <ellipse
            key={r}
            cx="1280"
            cy="780"
            rx={r * 0.9}
            ry={r * 0.6}
            transform="rotate(-15 1280 780)"
          />
        ))}
      </g>
    </svg>
  );
}
