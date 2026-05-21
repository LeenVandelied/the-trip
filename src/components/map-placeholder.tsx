import { DAY_COLORS } from "@/lib/constants";

export function MapPlaceholder({
  height = 480,
  selectedDay,
  fillParent,
}: {
  height?: number | string;
  selectedDay?: number | null;
  fillParent?: boolean;
}) {
  return (
    <div
      className="map-placeholder"
      style={{
        position: "relative",
        width: "100%",
        height: fillParent ? "100%" : height,
        background:
          "repeating-linear-gradient(45deg, rgba(240,168,48,.025) 0 12px, transparent 12px 24px), #0f0c08",
        border: "1px dashed var(--ink-faint)",
        borderRadius: "var(--radius)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <svg
        style={{ position: "absolute", inset: 0, opacity: 0.35 }}
        width="100%"
        height="100%"
        preserveAspectRatio="none"
      >
        <defs>
          <pattern id="ph-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(240,168,48,.12)" strokeWidth=".5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#ph-grid)" />
      </svg>

      <div style={{ position: "relative", textAlign: "center", maxWidth: 360, padding: 24 }}>
        <div
          style={{
            fontFamily: "var(--f-mono)",
            fontSize: 28,
            color: "var(--accent)",
            marginBottom: 14,
            letterSpacing: ".18em",
          }}
        >
          ◇
        </div>
        <div className="eyebrow" style={{ marginBottom: 8 }}>
          EMPLACEMENT CARTE
        </div>
        <div
          style={{
            color: "var(--ink-dim)",
            fontFamily: "var(--f-mono)",
            fontSize: 12,
            lineHeight: 1.6,
          }}
        >
          carte interactive — branchement
          <br />
          Leaflet / Mapbox / MapLibre
        </div>
        {selectedDay && (
          <div style={{ marginTop: 14 }}>
            <span
              className="tag"
              style={{
                color: DAY_COLORS[selectedDay - 1],
                borderColor: DAY_COLORS[selectedDay - 1],
              }}
            >
              J{selectedDay} sélectionné
            </span>
          </div>
        )}
      </div>

      {(["tl", "tr", "bl", "br"] as const).map((p) => {
        const base = { position: "absolute" as const, width: 12, height: 12 };
        const map = {
          tl: { ...base, top: 8, left: 8, borderTop: "1px solid var(--ink-mute)", borderLeft: "1px solid var(--ink-mute)" },
          tr: { ...base, top: 8, right: 8, borderTop: "1px solid var(--ink-mute)", borderRight: "1px solid var(--ink-mute)" },
          bl: { ...base, bottom: 8, left: 8, borderBottom: "1px solid var(--ink-mute)", borderLeft: "1px solid var(--ink-mute)" },
          br: { ...base, bottom: 8, right: 8, borderBottom: "1px solid var(--ink-mute)", borderRight: "1px solid var(--ink-mute)" },
        };
        return <span key={p} style={map[p]} />;
      })}
    </div>
  );
}

export function MiniRoute({ day, height = 80 }: { day: number; height?: number }) {
  const color = DAY_COLORS[(day || 1) - 1];
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
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: color,
          marginRight: 8,
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontFamily: "var(--f-mono)",
          fontSize: 10,
          letterSpacing: ".14em",
          color: "var(--ink-mute)",
          textTransform: "uppercase",
        }}
      >
        J{day} · tracé
      </span>
    </div>
  );
}
