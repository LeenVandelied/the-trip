"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { VoteButtons, type Vote } from "@/components/vote-buttons";
import { DAY_COLORS } from "@/lib/constants";
import {
  createPlaceAction,
  votePlaceAction,
  deletePlaceAction,
} from "@/app/actions/places";

const LeafletMap = dynamic(
  () => import("@/components/leaflet-map").then((m) => m.LeafletMap),
  { ssr: false, loading: () => <MapLoading /> },
);

function MapLoading() {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0d0a06",
        color: "var(--ink-mute)",
        fontFamily: "var(--f-mono)",
        fontSize: 12,
        letterSpacing: ".14em",
      }}
    >
      CHARGEMENT CARTE…
    </div>
  );
}

type PlaceLite = {
  id: string;
  lat: number;
  lng: number;
  name: string;
  description: string | null;
  userId: string;
  score: number;
  upCount: number;
  downCount: number;
  myVote: "UP" | "DOWN" | null;
};

type DayGpx = { id: string; name: string; gpxContent: string };

export function MapView({
  meId,
  userById,
  tripDays,
  places,
  winnerGpxByDay,
}: {
  meId: string | null;
  userById: Record<string, string>;
  tripDays: number;
  places: PlaceLite[];
  winnerGpxByDay: Record<number, DayGpx>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState<"places" | "gpx">("places");
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [sheetOpen, setSheetOpen] = useState(true);

  const [adding, setAdding] = useState<{ lat: number; lng: number } | null>(null);
  const [addName, setAddName] = useState("");
  const [addDesc, setAddDesc] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const onMapClick = (lat: number, lng: number) => {
    if (!meId) {
      router.push("/");
      return;
    }
    setAdding({ lat, lng });
    setAddName("");
    setAddDesc("");
    setErr(null);
  };

  const submitPlace = () => {
    if (!adding) return;
    setErr(null);
    startTransition(async () => {
      const res = await createPlaceAction(adding.lat, adding.lng, addName, addDesc);
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      setAdding(null);
      router.refresh();
    });
  };

  const vote = (id: string, v: Vote) => {
    if (!meId) {
      router.push("/");
      return;
    }
    startTransition(async () => {
      await votePlaceAction(id, v === "yes" ? "UP" : v === "no" ? "DOWN" : null);
      router.refresh();
    });
  };

  const removePlace = (id: string) => {
    if (!confirm("Supprimer ce lieu ?")) return;
    startTransition(async () => {
      const res = await deletePlaceAction(id);
      if (!res.ok) {
        alert(res.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="map-screen">
      <div className="map-canvas">
        <LeafletMap
          places={places.map((p) => ({
            id: p.id,
            lat: p.lat,
            lng: p.lng,
            name: p.name,
            score: p.score,
          }))}
          winnerGpxByDay={winnerGpxByDay}
          highlightDay={selectedDay}
          onMapClick={onMapClick}
          onPlaceClick={() => {}}
        />

        <div className="map-fab-hint">
          {meId ? "Clic sur la carte pour ajouter un lieu" : "Embarque pour ajouter des lieux"}
        </div>

        {Object.keys(winnerGpxByDay).length > 0 && (
          <div className="map-legend card">
            <div className="eyebrow" style={{ marginBottom: 8 }}>JOURS — TRACÉ</div>
            <div className="legend-grid">
              {Array.from({ length: tripDays }).map((_, i) => {
                const day = i + 1;
                const has = !!winnerGpxByDay[day];
                return (
                  <button
                    key={day}
                    className={
                      "legend-chip " + (selectedDay === day ? "on " : "") + (has ? "" : "ghost")
                    }
                    onClick={() => has && setSelectedDay(selectedDay === day ? null : day)}
                    disabled={!has}
                    style={{ ["--c" as string]: DAY_COLORS[i] } as React.CSSProperties}
                  >
                    <span className="lc-dot" />J{day}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {!sheetOpen && (
          <button className="sheet-toggle" onClick={() => setSheetOpen(true)}>
            ◀ Ouvrir le panneau
          </button>
        )}
      </div>

      <aside className={"map-aside " + (sheetOpen ? "open" : "closed")}>
        <div className="aside-head">
          <span className="eyebrow">PANNEAU</span>
          <button className="btn btn-ghost btn-sm" onClick={() => setSheetOpen(false)}>✕</button>
        </div>

        <div className="aside-tabs">
          <button
            className={"aside-tab " + (tab === "places" ? "on" : "")}
            onClick={() => setTab("places")}
          >
            Lieux <span className="count">{places.length}</span>
          </button>
          <button
            className={"aside-tab " + (tab === "gpx" ? "on" : "")}
            onClick={() => setTab("gpx")}
          >
            GPX par jour
          </button>
        </div>

        {tab === "places" && (
          <div className="aside-body">
            {places.length === 0 ? (
              <div className="coord" style={{ padding: "24px 0", textAlign: "center" }}>
                Aucun lieu pour l&apos;instant.
                <br />
                Clic sur la carte pour en ajouter.
              </div>
            ) : (
              [...places]
                .sort((a, b) => b.score - a.score)
                .map((p) => (
                  <div key={p.id} className="pin-row">
                    <div className="pin-icon" style={{ borderColor: "var(--accent)", color: "var(--accent)" }}>
                      ◆
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="pin-name">{p.name}</div>
                      <div className="pin-meta">
                        <span className="coord">
                          par {userById[p.userId] ?? "?"}
                        </span>
                        {p.description && (
                          <span className="coord" title={p.description}>
                            · {p.description.slice(0, 32)}
                            {p.description.length > 32 ? "…" : ""}
                          </span>
                        )}
                      </div>
                    </div>
                    <VoteButtons
                      yes={p.upCount}
                      no={p.downCount}
                      myVote={p.myVote === "UP" ? "yes" : p.myVote === "DOWN" ? "no" : null}
                      onVote={(v) => vote(p.id, v)}
                      compact
                    />
                    {p.userId === meId && (
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => removePlace(p.id)}
                        disabled={pending}
                        title="Supprimer"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))
            )}
          </div>
        )}

        {tab === "gpx" && (
          <div className="aside-body">
            <div className="day-pills">
              {Array.from({ length: tripDays }).map((_, i) => {
                const day = i + 1;
                const has = !!winnerGpxByDay[day];
                return (
                  <button
                    key={day}
                    className={"day-pill " + (selectedDay === day ? "on " : "") + (has ? "" : "ghost")}
                    style={{ ["--c" as string]: DAY_COLORS[i] } as React.CSSProperties}
                    onClick={() => has && setSelectedDay(day)}
                    disabled={!has}
                  >
                    J{day}
                  </button>
                );
              })}
            </div>
            <div className="day-summary">
              {selectedDay ? (
                <>
                  <h3 style={{ marginTop: 12, fontSize: 18 }}>
                    Jour {selectedDay}
                  </h3>
                  <div className="dash-rule" />
                  {winnerGpxByDay[selectedDay] ? (
                    <div className="gpx-row">
                      <div style={{ flex: 1 }}>
                        <div className="gpx-name">{winnerGpxByDay[selectedDay].name}</div>
                        <div className="coord">★ tracé en tête (vote)</div>
                      </div>
                    </div>
                  ) : (
                    <div className="coord">Aucun tracé pour ce jour.</div>
                  )}
                </>
              ) : (
                <div
                  style={{ padding: "24px 0", textAlign: "center", color: "var(--ink-mute)" }}
                  className="coord"
                >
                  Sélectionne un jour ↑
                </div>
              )}
            </div>
          </div>
        )}
      </aside>

      {adding && (
        <div className="modal-bg" onClick={() => !pending && setAdding(null)}>
          <div className="modal card plated" onClick={(e) => e.stopPropagation()}>
            <span className="corners" />
            <div className="eyebrow" style={{ marginBottom: 6 }}>AJOUTER UN LIEU</div>
            <h3 style={{ fontSize: 22, marginBottom: 18 }}>Pin sur la carte</h3>
            <div className="coord" style={{ marginBottom: 14 }}>
              {adding.lat.toFixed(4)}°N · {adding.lng.toFixed(4)}°E
            </div>
            <label className="field">
              <span className="lbl">Nom</span>
              <input
                className="input"
                value={addName}
                onChange={(e) => setAddName(e.target.value)}
                autoFocus
                disabled={pending}
                placeholder="Belvédère, station essence, …"
              />
            </label>
            <label className="field" style={{ marginTop: 12 }}>
              <span className="lbl">Description (optionnel)</span>
              <input
                className="input"
                value={addDesc}
                onChange={(e) => setAddDesc(e.target.value)}
                disabled={pending}
              />
            </label>
            {err && (
              <div className="coord" style={{ color: "var(--no)", marginTop: 8 }}>
                {err}
              </div>
            )}
            <div className="dash-rule" />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button className="btn btn-ghost" onClick={() => setAdding(null)} disabled={pending}>
                Annuler
              </button>
              <button className="btn btn-primary" onClick={submitPlace} disabled={pending || !addName.trim()}>
                {pending ? "…" : "Ajouter"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .map-screen {
          position: relative;
          display: grid;
          grid-template-columns: 1fr 380px;
          gap: 0;
          height: calc(100vh - 60px);
          overflow: hidden;
        }
        .map-canvas { position: relative; overflow: hidden; background: #0d0a06; }
        .map-fab-hint {
          position: absolute;
          top: 20px; left: 20px;
          padding: 8px 14px;
          background: rgba(20,17,12,.85);
          backdrop-filter: blur(6px);
          color: var(--ink-dim);
          font-family: var(--f-mono);
          font-size: 11px;
          letter-spacing: .08em;
          text-transform: uppercase;
          border: 1px solid var(--kraft);
          border-radius: 2px;
          z-index: 500;
          pointer-events: none;
        }
        .map-legend {
          position: absolute;
          bottom: 20px; left: 20px;
          padding: 12px 14px;
          background: rgba(20,17,12,.92);
          backdrop-filter: blur(6px);
          z-index: 500;
        }
        .legend-grid {
          display: grid;
          grid-template-columns: repeat(4, auto);
          gap: 6px;
        }
        .legend-chip {
          display: inline-flex; align-items: center; gap: 6px;
          background: transparent;
          border: 1px solid var(--kraft);
          color: var(--ink-dim);
          font-family: var(--f-mono); font-size: 11px;
          padding: 4px 10px;
          border-radius: 2px;
          cursor: pointer;
          transition: all .14s;
        }
        .legend-chip.ghost { opacity: .3; cursor: default; }
        .legend-chip .lc-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--c); }
        .legend-chip:hover:not(.ghost) { border-color: var(--ink-mute); color: var(--ink); }
        .legend-chip.on {
          border-color: var(--c);
          color: var(--c);
          background: rgba(255,255,255,.03);
        }

        .map-aside {
          background: var(--paper);
          border-left: 1px solid var(--kraft);
          display: flex; flex-direction: column;
          overflow: hidden;
          transition: transform .25s ease;
        }
        .map-aside.closed { transform: translateX(100%); }
        .aside-head {
          display: flex; justify-content: space-between; align-items: center;
          padding: 14px 18px;
          border-bottom: 1px solid var(--kraft);
        }
        .aside-tabs { display: flex; border-bottom: 1px solid var(--kraft); }
        .aside-tab {
          flex: 1;
          background: transparent;
          border: none;
          color: var(--ink-dim);
          font-family: var(--f-mono);
          font-size: 12px;
          letter-spacing: .12em;
          text-transform: uppercase;
          padding: 14px 12px;
          cursor: pointer;
          transition: color .14s;
          position: relative;
          display: inline-flex; align-items: center; justify-content: center; gap: 6px;
        }
        .aside-tab .count {
          background: var(--kraft);
          color: var(--ink);
          padding: 1px 8px;
          border-radius: 2px;
          font-size: 10px;
        }
        .aside-tab:hover { color: var(--ink); }
        .aside-tab.on { color: var(--accent); }
        .aside-tab.on::after {
          content: ""; position: absolute; left: 0; right: 0; bottom: -1px; height: 2px; background: var(--accent);
        }
        .aside-body { flex: 1; overflow-y: auto; padding: 14px 18px; }
        .pin-row, .gpx-row {
          display: flex; align-items: center; gap: 12px;
          padding: 12px 0;
          border-bottom: 1px dashed var(--ink-faint);
        }
        .pin-row:last-child, .gpx-row:last-child { border-bottom: none; }
        .pin-icon {
          width: 32px; height: 32px;
          border: 1.5px solid var(--ink-mute);
          background: var(--paper-2);
          border-radius: 50%;
          display: inline-flex; align-items: center; justify-content: center;
          font-family: var(--f-mono); font-size: 12px;
          flex-shrink: 0;
        }
        .pin-name { font-size: 14px; line-height: 1.3; }
        .pin-meta { margin-top: 4px; font-size: 11px; color: var(--ink-mute); display: flex; gap: 6px; flex-wrap: wrap; }
        .gpx-name { font-size: 14px; font-weight: 600; }

        .day-pills {
          display: flex; gap: 6px; flex-wrap: wrap;
          padding-bottom: 12px;
          border-bottom: 1px dashed var(--ink-faint);
        }
        .day-pill {
          background: transparent;
          border: 1px solid var(--kraft);
          color: var(--ink-dim);
          font-family: var(--f-mono); font-size: 11px; font-weight: 600;
          padding: 6px 12px;
          border-radius: 2px;
          cursor: pointer;
          transition: all .14s;
        }
        .day-pill.ghost { opacity: .3; cursor: default; }
        .day-pill:hover:not(.ghost) { color: var(--ink); border-color: var(--ink-mute); }
        .day-pill.on { background: var(--c); color: #14110c; border-color: var(--c); }

        .sheet-toggle {
          position: absolute;
          top: 50%; right: 0;
          transform: translateY(-50%);
          background: var(--paper-2);
          border: 1px solid var(--kraft);
          border-right: none;
          color: var(--ink);
          padding: 14px 10px;
          font-family: var(--f-mono); font-size: 11px;
          cursor: pointer;
          border-radius: 2px 0 0 2px;
          z-index: 500;
        }

        @media (max-width: 820px) {
          .map-screen { grid-template-columns: 1fr; height: calc(100vh - 56px); }
          .map-aside {
            position: absolute;
            left: 0; right: 0; bottom: 0;
            max-height: 65vh;
            border-left: none;
            border-top: 1px solid var(--kraft);
            border-radius: 12px 12px 0 0;
            z-index: 600;
            transform: translateY(0);
          }
          .map-aside.closed { transform: translateY(calc(100% - 40px)); }
          .map-legend { bottom: 80px; }
        }
      `}</style>
    </div>
  );
}
