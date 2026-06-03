"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Avatar } from "@/components/avatar";
import { VoteButtons, type Vote } from "@/components/vote-buttons";
import { DAY_COLORS } from "@/lib/constants";
import { voteRouteAction } from "@/app/actions/routes";

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

type RouteLite = {
  id: string;
  name: string;
  gpxContent: string;
  roadGeoJson: string | null;
  distanceKm: number;
  elevationM: number;
  durationSec: number | null;
  userId: string;
  createdAtISO: string;
  score: number;
  upCount: number;
  downCount: number;
  upVoters: string[];
  downVoters: string[];
  myVote: "UP" | "DOWN" | null;
};

export function MapView({
  meId,
  userById,
  tripDays,
  routesByDay,
}: {
  meId: string | null;
  userById: Record<string, string>;
  tripDays: number;
  routesByDay: Record<number, RouteLite[]>;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [sheetOpen, setSheetOpen] = useState(true);

  const vote = (routeId: string, v: Vote) => {
    if (!meId) {
      router.push("/");
      return;
    }
    startTransition(async () => {
      await voteRouteAction(routeId, v === "yes" ? "UP" : v === "no" ? "DOWN" : null);
      router.refresh();
    });
  };

  const dayHasRoutes = (n: number) => (routesByDay[n]?.length ?? 0) > 0;
  const selectedRoutes = selectedDay ? routesByDay[selectedDay] ?? [] : [];

  // For the LeafletMap, strip the heavy gpxContent for routes that already have roadGeoJson
  // so the JSON we ship is smaller — Leaflet doesn't need both.
  const lightRoutesByDay = Object.fromEntries(
    Object.entries(routesByDay).map(([day, arr]) => [
      day,
      arr.map((r) => ({
        id: r.id,
        name: r.name,
        gpxContent: r.roadGeoJson ? "" : r.gpxContent,
        roadGeoJson: r.roadGeoJson,
      })),
    ]),
  );

  return (
    <div className="map-screen">
      <div className="map-canvas">
        <LeafletMap routesByDay={lightRoutesByDay} highlightDay={selectedDay} />

        <div className="map-legend card">
          <div className="eyebrow" style={{ marginBottom: 8 }}>JOURS</div>
          <div className="legend-grid">
            {Array.from({ length: tripDays }).map((_, i) => {
              const day = i + 1;
              const has = dayHasRoutes(day);
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
                  {has && (
                    <span className="lc-count">
                      {routesByDay[day]!.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {!sheetOpen && (
          <button className="sheet-toggle" onClick={() => setSheetOpen(true)}>
            ◀ Ouvrir le panneau
          </button>
        )}
      </div>

      <aside className={"map-aside " + (sheetOpen ? "open" : "closed")}>
        <div className="aside-head">
          <span className="eyebrow">ITINÉRAIRES</span>
          <button className="btn btn-ghost btn-sm" onClick={() => setSheetOpen(false)}>✕</button>
        </div>

        <div className="aside-body">
          <div className="day-pills">
            {Array.from({ length: tripDays }).map((_, i) => {
              const day = i + 1;
              const has = dayHasRoutes(day);
              return (
                <button
                  key={day}
                  className={"day-pill " + (selectedDay === day ? "on " : "") + (has ? "" : "ghost")}
                  style={{ ["--c" as string]: DAY_COLORS[i] } as React.CSSProperties}
                  onClick={() => has && setSelectedDay(day)}
                  disabled={!has}
                  title={has ? `${routesByDay[day]!.length} tracé(s)` : "Aucun tracé proposé"}
                >
                  J{day}
                </button>
              );
            })}
          </div>

          {!selectedDay && (
            <div
              style={{ padding: "24px 0", textAlign: "center", color: "var(--ink-mute)" }}
              className="coord"
            >
              Sélectionne un jour ↑
            </div>
          )}

          {selectedDay && selectedRoutes.length === 0 && (
            <div className="coord" style={{ padding: "24px 0", textAlign: "center" }}>
              Aucun tracé proposé pour J{selectedDay}.<br />
              Va sur <strong>/routes</strong> pour en proposer un.
            </div>
          )}

          {selectedDay && selectedRoutes.length > 0 && (
            <div className="route-list">
              <div className="coord" style={{ marginTop: 8, marginBottom: 4 }}>
                {selectedRoutes.length} tracé{selectedRoutes.length > 1 ? "s" : ""} pour J{selectedDay}
              </div>
              {selectedRoutes.map((r, idx) => {
                const isWinner = idx === 0;
                const rider = userById[r.userId] ?? "?";
                return (
                  <div key={r.id} className={"route-row " + (isWinner ? "winner" : "")}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="route-name">
                        {r.name}
                        {isWinner && <span className="tag win" style={{ marginLeft: 8 }}>★ EN TÊTE</span>}
                      </div>
                      <div className="route-meta">
                        <span className="mono">
                          <b>{Math.round(r.distanceKm)}</b>km · D+{Math.round(r.elevationM)}m
                        </span>
                        <Avatar pseudo={rider} size="sm" />
                        <span className="coord">{rider}</span>
                      </div>
                    </div>
                    <VoteButtons
                      yes={r.upCount}
                      no={r.downCount}
                      upPseudos={r.upVoters}
                      downPseudos={r.downVoters}
                      myVote={r.myVote === "UP" ? "yes" : r.myVote === "DOWN" ? "no" : null}
                      onVote={(v) => vote(r.id, v)}
                      compact
                    />
                  </div>
                );
              })}
              <div className="dash-rule" />
              <div className="coord" style={{ textAlign: "center" }}>
                Vote depuis la carte ou depuis <strong>/routes</strong>.
              </div>
            </div>
          )}
        </div>
      </aside>

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
        .legend-chip .lc-count {
          background: var(--kraft);
          color: var(--ink);
          padding: 0 5px;
          border-radius: 2px;
          font-size: 9px;
          margin-left: 2px;
        }
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
        .aside-body { flex: 1; overflow-y: auto; padding: 14px 18px; }

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

        .route-list { display: flex; flex-direction: column; gap: 4px; }
        .route-row {
          display: flex; align-items: center; gap: 10px;
          padding: 12px 0;
          border-bottom: 1px dashed var(--ink-faint);
        }
        .route-row.winner {
          background: linear-gradient(180deg, transparent, rgba(240,168,48,.04));
          margin: 0 -8px;
          padding-left: 8px;
          padding-right: 8px;
          border-radius: 2px;
        }
        .route-name { font-size: 14px; font-weight: 600; display: flex; align-items: center; flex-wrap: wrap; }
        .route-meta {
          display: flex; gap: 8px; align-items: center;
          margin-top: 6px;
          font-size: 11px;
          color: var(--ink-mute);
        }
        .route-meta b { color: var(--ink); font-weight: 700; }

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
