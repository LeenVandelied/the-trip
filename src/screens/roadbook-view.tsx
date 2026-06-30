"use client";

import { useMemo, useTransition } from "react";
import dynamic from "next/dynamic";
import { AvatarStack } from "@/components/avatar";
import { Stamp } from "@/components/stamp";
import { DAY_COLORS } from "@/lib/constants";
import { buildRoadbookIcsAction } from "@/app/actions/ical";
import type { RoadbookSummary } from "@/lib/roadbook";

const LeafletMap = dynamic(
  () => import("@/components/leaflet-map").then((m) => m.LeafletMap),
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
          color: "var(--ink-mute)",
          fontFamily: "var(--f-mono)",
          fontSize: 11,
          letterSpacing: ".14em",
        }}
      >
        CHARGEMENT…
      </div>
    ),
  },
);

export function RoadbookView({
  mePseudo,
  roadbook,
  crew,
}: {
  mePseudo: string | null;
  roadbook: RoadbookSummary;
  crew: string[];
}) {
  const [pending, startTransition] = useTransition();

  const onPrint = () => window.print();
  const onIcs = () => {
    startTransition(async () => {
      const res = await buildRoadbookIcsAction();
      if (!res.ok) {
        alert(res.error);
        return;
      }
      const blob = new Blob([res.ics], { type: "text/calendar;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = res.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });
  };

  return (
    <div className="page roadbook">
      <div className="page-header no-print">
        <div className="ttl">
          <div className="eyebrow" style={{ marginBottom: 12 }}>06 · ROADBOOK</div>
          <h1>Le carnet à imprimer.</h1>
        </div>
        <div className="meta" style={{ display: "flex", gap: 8 }}>
          <button className="btn btn-secondary" onClick={onPrint}>⎙ Imprimer</button>
          <button className="btn btn-secondary" onClick={onIcs} disabled={pending}>
            {pending ? "…" : "↧ .ics"}
          </button>
        </div>
      </div>

      <div className="book">
        <div className="book-page cover">
          <div className="binding" />
          <div className="cover-stamp">
            <Stamp angle={-8}>CONFIDENTIEL</Stamp>
          </div>
          <div className="cover-content">
            <div className="eyebrow" style={{ marginBottom: 24 }}>CARNET DE ROUTE</div>
            <h2 className="cover-title">
              The
              <br />
              Trip.
            </h2>
            <p className="cover-sub coord">
              {roadbook.startISO && roadbook.endISO ? (
                <>
                  DU {roadbook.startISO} AU {roadbook.endISO}
                  <br />
                </>
              ) : (
                <>
                  PLAGE NON ENCORE FIXÉE
                  <br />
                </>
              )}
              {crew.length} MOTO{crew.length > 1 ? "S" : ""} · {roadbook.days.length} JOURS
            </p>
            <div className="cover-foot">
              <div className="coord">
                {(mePseudo ?? "ANONYME").toUpperCase()}
              </div>
              <div className="dash-rule" style={{ margin: "12px 0" }} />
              {crew.length > 0 && <AvatarStack pseudos={crew} size="sm" />}
            </div>
          </div>
        </div>

        {roadbook.days.map((day, di) => {
          const dayColor = DAY_COLORS[di % DAY_COLORS.length];
          const win = day.winningRoute;
          return (
            <div key={day.n} className="book-page">
              <div className="binding" />
              <header className="rb-head">
                <div>
                  <div className="coord">{day.dateLabel}</div>
                  <h2 style={{ fontSize: 40, marginTop: 4 }}>
                    Jour <span style={{ color: dayColor }}>{String(day.n).padStart(2, "0")}</span>
                  </h2>
                  {win && (
                    <div className="eyebrow" style={{ marginTop: 6 }}>
                      {win.name}
                    </div>
                  )}
                </div>
                <div className="rb-weather">
                  <div className="rb-w-emoji">{day.weather.emoji}</div>
                  <div className="coord">
                    {day.weather.tmin != null
                      ? `${Math.round(day.weather.tmin)}° / ${Math.round(day.weather.tmax ?? 0)}°C`
                      : "— / —"}
                  </div>
                </div>
              </header>

              <div className="rb-body">
                <div className="rb-map">
                  {win ? (
                    <>
                      <div className="rb-map-box no-print">
                        <LeafletMap
                          routesByDay={{
                            [day.n]: [
                              {
                                id: win.id,
                                name: win.name,
                                gpxContent: win.gpxContent,
                                roadGeoJson: win.roadGeoJson,
                              },
                            ],
                          }}
                          highlightDay={day.n}
                        />
                      </div>
                      <div className="rb-gpx-row">
                        <span className="coord rb-gpx-name">{win.name}</span>
                        <a
                          className="btn btn-secondary btn-sm no-print"
                          href={`/api/routes/${win.id}/gpx`}
                          title="Télécharger le .gpx"
                        >
                          ⬇ GPX
                        </a>
                      </div>
                    </>
                  ) : (
                    <div className="coord">— aucun tracé retenu —</div>
                  )}
                </div>
                <div className="rb-info">
                  <div className="rb-stats">
                    <div>
                      <b className="mono">{win ? Math.round(win.distanceKm) : "—"}</b>
                      <span className="coord"> km</span>
                    </div>
                    <div>
                      <b className="mono">D+{win ? Math.round(win.elevationM) : "—"}</b>
                      <span className="coord"> m</span>
                    </div>
                  </div>
                  <div className="rb-section">
                    <div className="eyebrow">POINTS D&apos;INTÉRÊT (UP-VOTÉS)</div>
                    <ul className="rb-pins">
                      {day.topPlaces.length === 0 && (
                        <li style={{ color: "var(--ink-mute)" }} className="coord">
                          — rien à proximité —
                        </li>
                      )}
                      {day.topPlaces.map((p) => (
                        <li key={p.id}>◆ {p.name}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              <footer className="rb-foot">
                <span className="coord">PAGE&nbsp;{String(day.n + 1).padStart(2, "0")}/{String(roadbook.days.length + 1).padStart(2, "0")}</span>
                <span className="coord">THE TRIP · ÉD. 2026.07</span>
              </footer>
            </div>
          );
        })}
      </div>

      <style>{`
        .roadbook { max-width: 920px; }
        .book { display: grid; gap: 36px; }
        .book-page {
          position: relative;
          background: linear-gradient(170deg, #1f1a13, #1a160e);
          border: 1px solid var(--kraft);
          padding: 40px 48px 30px 72px;
          min-height: 720px;
          border-radius: 2px;
          box-shadow:
            inset 0 0 0 1px rgba(240,168,48,.05),
            0 12px 32px rgba(0,0,0,.4);
          background-image:
            radial-gradient(circle at 10% 0%, rgba(240,168,48,.04), transparent 40%),
            linear-gradient(170deg, #1f1a13, #1a160e);
        }
        .binding {
          position: absolute; left: 32px; top: 24px; bottom: 24px;
          width: 1px;
          background: var(--ink-faint);
          border-left: 1px dashed var(--ink-faint);
        }
        .binding::before, .binding::after {
          content: ""; position: absolute; left: -3px;
          width: 7px; height: 7px;
          border-radius: 50%;
          background: var(--paper);
          border: 1px solid var(--ink-mute);
        }
        .binding::before { top: 40px; }
        .binding::after { bottom: 40px; }

        .cover {
          display: flex; flex-direction: column; justify-content: space-between;
          background: linear-gradient(170deg, #221c14, #161109);
        }
        .cover-stamp { position: absolute; top: 40px; right: 50px; }
        .cover-title {
          font-size: clamp(72px, 10vw, 140px);
          line-height: .9;
          letter-spacing: -.04em;
          margin: 36px 0;
        }
        .cover-title::first-letter { color: var(--accent); }
        .cover-sub { font-size: 13px; line-height: 1.8; }
        .cover-foot { margin-top: auto; padding-top: 28px; }

        .rb-head {
          display: flex; justify-content: space-between; align-items: flex-start;
          padding-bottom: 18px;
          border-bottom: 1px dashed var(--ink-faint);
          margin-bottom: 24px;
        }
        .rb-weather { text-align: right; }
        .rb-w-emoji { font-size: 40px; line-height: 1; }
        .rb-body { display: grid; grid-template-columns: 1fr 1.2fr; gap: 28px; }
        @media (max-width: 720px) {
          .rb-body { grid-template-columns: 1fr; }
          .book-page { padding: 28px 22px 22px 48px; }
        }
        .rb-map { position: relative; }
        .rb-map-box {
          width: 100%;
          height: 220px;
          border: 1px solid var(--ink-faint);
          border-radius: 2px;
          overflow: hidden;
          background: #0f0c08;
        }
        .rb-gpx-row {
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px; margin-top: 8px; flex-wrap: wrap;
        }
        .rb-gpx-name { font-size: 11px; color: var(--ink-dim); }
        .rb-stats { display: flex; gap: 28px; margin-bottom: 18px; }
        .rb-stats b { font-size: 24px; color: var(--ink); font-weight: 700; }
        .rb-section { margin-bottom: 18px; }
        .rb-section .eyebrow { margin-bottom: 8px; }
        .rb-pins {
          list-style: none; padding: 0; margin: 0;
          font-family: var(--f-body); font-size: 14px;
        }
        .rb-pins li { padding: 4px 0; }
        .rb-foot {
          display: flex; justify-content: space-between; align-items: center;
          margin-top: 28px;
          padding-top: 14px;
          border-top: 1px dashed var(--ink-faint);
        }

        @media print {
          body { background: white !important; color: black !important; }
          body > * { background: white !important; }
          .no-print, .topnav { display: none !important; }
          .book-page {
            background: white !important;
            border: 1px solid #ccc !important;
            box-shadow: none !important;
            color: black !important;
            page-break-after: always;
            min-height: 90vh;
          }
          .book-page * { color: black !important; }
          .stamp { color: var(--stamp) !important; border-color: var(--stamp) !important; }
        }
      `}</style>
    </div>
  );
}
