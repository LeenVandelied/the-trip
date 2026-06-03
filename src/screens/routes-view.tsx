"use client";

import { useMemo, useRef, useState, useTransition, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { VoteButtons, type Vote } from "@/components/vote-buttons";
import { Stamp } from "@/components/stamp";
import { MiniRoute } from "@/components/map-placeholder";
import {
  proposeRouteAction,
  voteRouteAction,
  deleteRouteAction,
  type ProposeRouteInput,
} from "@/app/actions/routes";
import { DAY_COLORS, MAX_GPX_BYTES } from "@/lib/constants";
import { parseGPX } from "@we-gold/gpxjs";

type RouteLite = {
  id: string;
  dayNumber: number;
  name: string;
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
  roadMatched: boolean;
};

async function parseGpxFile(file: File): Promise<ProposeRouteInput | { error: string }> {
  if (file.size > MAX_GPX_BYTES) {
    return { error: `Fichier trop gros (max ${MAX_GPX_BYTES / 1024 / 1024} MB)` };
  }
  const text = await file.text();
  const [parsed, err] = parseGPX(text);
  if (err || !parsed) {
    return { error: "GPX invalide : " + (err?.message ?? "non parseable") };
  }
  const track = parsed.tracks[0] ?? parsed.routes[0];
  if (!track || !track.points || track.points.length === 0) {
    return { error: "GPX sans tracé exploitable" };
  }
  const distanceKm = (track.distance?.total ?? 0) / 1000;
  const elevationM = track.elevation?.positive ?? 0;
  const durationSec = track.duration?.totalDuration
    ? Math.round(track.duration.totalDuration / 1000)
    : undefined;
  const name =
    track.name?.trim() ||
    parsed.metadata?.name?.trim() ||
    file.name.replace(/\.gpx$/i, "");
  return {
    dayNumber: 1, // overwritten by caller
    name,
    gpxContent: text,
    distanceKm,
    elevationM,
    durationSec,
  };
}

export function RoutesView({
  meId,
  userById,
  routes,
  tripDays,
}: {
  meId: string | null;
  userById: Record<string, string>;
  routes: RouteLite[];
  tripDays: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [dragDay, setDragDay] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputs = useRef<Record<number, HTMLInputElement | null>>({});

  // Group + compute winners + sort within day.
  const byDay = useMemo(() => {
    const m = new Map<number, RouteLite[]>();
    for (let d = 1; d <= tripDays; d++) m.set(d, []);
    for (const r of routes) {
      const arr = m.get(r.dayNumber);
      if (arr) arr.push(r);
    }
    for (const arr of m.values()) {
      arr.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return new Date(a.createdAtISO).getTime() - new Date(b.createdAtISO).getTime();
      });
    }
    return m;
  }, [routes, tripDays]);

  const totalRoutes = routes.length;
  const daysValidated = Array.from(byDay.values()).filter((arr) => arr.length > 0).length;

  const onPickFile = (dayN: number) => {
    if (!meId) {
      router.push("/");
      return;
    }
    fileInputs.current[dayN]?.click();
  };

  const onFileChosen = async (dayN: number, file: File) => {
    setError(null);
    const parsed = await parseGpxFile(file);
    if ("error" in parsed) {
      setError(parsed.error);
      setTimeout(() => setError(null), 4000);
      return;
    }
    startTransition(async () => {
      const res = await proposeRouteAction({ ...parsed, dayNumber: dayN });
      if (!res.ok) {
        setError(res.error);
        setTimeout(() => setError(null), 4000);
        return;
      }
      router.refresh();
    });
  };

  const onDrop = async (e: DragEvent<HTMLElement>, dayN: number) => {
    e.preventDefault();
    setDragDay(null);
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    if (!meId) {
      router.push("/");
      return;
    }
    if (!f.name.toLowerCase().endsWith(".gpx")) {
      setError("Fichier invalide — il faut un .gpx");
      setTimeout(() => setError(null), 4000);
      return;
    }
    await onFileChosen(dayN, f);
  };

  const vote = (id: string, v: Vote) => {
    if (!meId) {
      router.push("/");
      return;
    }
    startTransition(async () => {
      await voteRouteAction(id, v === "yes" ? "UP" : v === "no" ? "DOWN" : null);
      router.refresh();
    });
  };

  const remove = (id: string) => {
    if (!confirm("Supprimer ce tracé ?")) return;
    startTransition(async () => {
      const res = await deleteRouteAction(id);
      if (!res.ok) {
        setError(res.error);
        setTimeout(() => setError(null), 4000);
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="page">
      <div className="page-header">
        <div className="ttl">
          <div className="eyebrow" style={{ marginBottom: 12 }}>
            04 · ITINÉRAIRES J1 → J{tripDays}
          </div>
          <h1>Le carnet de route.</h1>
        </div>
        <div className="meta">
          {totalRoutes}&nbsp;TRACÉS PROPOSÉS
          <br />
          {daysValidated}/{tripDays}&nbsp;JOURS AVEC TRACÉ
          <br />
          DRAG·&·DROP&nbsp;.GPX
        </div>
      </div>

      {error && (
        <div className="upload-err">
          <Stamp angle={-3}>Erreur</Stamp>
          <span style={{ marginLeft: 14 }}>{error}</span>
        </div>
      )}

      <div className="days-stack">
        {Array.from(byDay.entries()).map(([dayN, list]) => {
          const dayColor = DAY_COLORS[(dayN - 1) % DAY_COLORS.length];
          const winning = list[0]; // post-sort, first = winner (if any)
          return (
            <article
              key={dayN}
              className={"day-card " + (dragDay === dayN ? "dragging" : "")}
              onDragOver={(e) => {
                e.preventDefault();
                setDragDay(dayN);
              }}
              onDragLeave={() => setDragDay(null)}
              onDrop={(e) => onDrop(e, dayN)}
            >
              <div className="day-tab" style={{ background: dayColor }} />
              <div className="day-grid">
                <div className="day-num">
                  <div className="dn-label coord">JOUR</div>
                  <div className="dn-big" style={{ color: dayColor }}>
                    {String(dayN).padStart(2, "0")}
                  </div>
                </div>
                <div className="day-info">
                  <div className="day-stats">
                    {winning ? (
                      <>
                        <span><b>{Math.round(winning.distanceKm)}</b><span className="coord"> km</span></span>
                        <span className="qs-sep" />
                        <span><b>D+{Math.round(winning.elevationM)}</b><span className="coord"> m</span></span>
                        {winning.durationSec ? (
                          <>
                            <span className="qs-sep" />
                            <span><b>{Math.round(winning.durationSec / 60)}</b><span className="coord"> min (gpx)</span></span>
                          </>
                        ) : null}
                      </>
                    ) : (
                      <span className="coord" style={{ color: "var(--ink-mute)" }}>
                        — aucun tracé proposé —
                      </span>
                    )}
                  </div>
                  {winning && (
                    <div style={{ marginTop: 12 }}>
                      <MiniRoute day={dayN} height={70} />
                      <div className="coord" style={{ marginTop: 6 }}>
                        Tracé en tête : <strong style={{ color: "var(--ink)" }}>{winning.name}</strong>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="dash-rule" />

              {list.length === 0 ? (
                <div className="empty-state" style={{ margin: "8px 0" }}>
                  <div className="empty-icon">∅</div>
                  <div className="empty-text">
                    <strong>Aucun GPX pour J{dayN}</strong>
                    <div className="coord" style={{ marginTop: 4 }}>
                      Propose le premier tracé, ou drag&amp;drop un .gpx ici.
                    </div>
                  </div>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => onPickFile(dayN)}
                    disabled={pending}
                  >
                    ＋ Proposer un tracé
                  </button>
                </div>
              ) : (
                <ul className="gpx-list">
                  {list.map((g, i) => {
                    const isWinner = i === 0;
                    const rider = userById[g.userId] ?? "?";
                    return (
                      <li key={g.id} className={"gpx-item " + (isWinner ? "winner" : "")}>
                        <div className="gx-mini">
                          <MiniRoute day={dayN} height={60} />
                        </div>
                        <div className="gx-info">
                          <div className="gx-head">
                            <div className="gx-name">
                              {g.name}
                              {isWinner && (
                                <span className="tag win" style={{ marginLeft: 10 }}>
                                  ★ EN TÊTE
                                </span>
                              )}
                              <span
                                className="tag"
                                style={{
                                  marginLeft: 8,
                                  color: g.roadMatched ? "var(--yes)" : "var(--ink-mute)",
                                  borderColor: g.roadMatched ? "var(--yes)" : "var(--ink-faint)",
                                }}
                                title={
                                  g.roadMatched
                                    ? "Tracé reconstruit sur les routes via OSRM"
                                    : "Affichage en lignes droites entre waypoints — upload un track dense pour mieux faire"
                                }
                              >
                                {g.roadMatched ? "✓ ROUTES" : "△ WAYPOINTS"}
                              </span>
                            </div>
                          </div>
                          <div className="gx-meta">
                            <span>
                              <b className="mono">{Math.round(g.distanceKm)}</b>
                              <span className="coord">&nbsp;km</span>
                            </span>
                            <span>
                              <b className="mono">D+{Math.round(g.elevationM)}</b>
                              <span className="coord">&nbsp;m</span>
                            </span>
                            <span className="coord">par&nbsp;</span>
                            <Avatar pseudo={rider} size="sm" />
                            <span className="coord" style={{ marginLeft: -2 }}>{rider}</span>
                            {g.userId === meId && (
                              <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => remove(g.id)}
                                style={{ marginLeft: 6 }}
                                disabled={pending}
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="gx-vote">
                          <VoteButtons
                            yes={g.upCount}
                            no={g.downCount}
                            upPseudos={g.upVoters}
                            downPseudos={g.downVoters}
                            myVote={
                              g.myVote === "UP" ? "yes" : g.myVote === "DOWN" ? "no" : null
                            }
                            onVote={(v) => vote(g.id, v)}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              <div className="day-foot">
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => onPickFile(dayN)}
                  disabled={pending}
                >
                  {pending ? "…" : "＋ Proposer un GPX"}
                </button>
                <span className="coord drop-hint">
                  ↳ ou drag·&·drop un fichier .gpx ici
                </span>
              </div>

              <input
                ref={(el) => {
                  fileInputs.current[dayN] = el;
                }}
                type="file"
                accept=".gpx,application/gpx+xml,text/xml"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onFileChosen(dayN, f);
                  e.target.value = "";
                }}
              />

              {dragDay === dayN && (
                <div className="drop-overlay">
                  <div>
                    <div style={{ fontSize: 28, color: "var(--accent)" }}>⤓</div>
                    <div className="eyebrow" style={{ marginTop: 8 }}>
                      DÉPOSE LE .GPX
                    </div>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>

      <style>{`
        .upload-err {
          margin: 0 0 24px;
          padding: 14px 18px;
          border: 1px dashed var(--stamp);
          background: rgba(184,71,47,.08);
          color: var(--ink);
          font-family: var(--f-mono);
          font-size: 12px;
          display: flex; align-items: center;
        }
        .days-stack { display: grid; gap: 28px; }
        .day-card {
          position: relative;
          background: var(--paper-2);
          border: 1px solid var(--kraft);
          border-radius: var(--radius);
          padding: var(--pad-card);
          overflow: hidden;
          transition: border-color .14s, transform .14s;
        }
        .day-card.dragging { border-color: var(--accent); border-style: dashed; }
        .day-tab { position: absolute; top: 0; left: 0; bottom: 0; width: 4px; }
        .day-grid {
          display: grid;
          grid-template-columns: 200px 1fr;
          gap: 28px;
          align-items: start;
        }
        @media (max-width: 720px) {
          .day-grid { grid-template-columns: 1fr; gap: 14px; }
        }
        .day-num .dn-label { letter-spacing: .14em; font-size: 10px; }
        .day-num .dn-big {
          font-family: var(--f-title);
          font-size: 96px;
          line-height: 1;
          font-weight: 700;
          letter-spacing: -.04em;
          margin: 4px 0 2px;
        }
        .day-stats {
          display: flex; gap: 14px; align-items: center;
          font-family: var(--f-mono);
          font-size: 13px;
          flex-wrap: wrap;
        }
        .day-stats b { font-size: 16px; font-weight: 700; color: var(--ink); }
        .day-stats .qs-sep { width: 1px; height: 14px; background: var(--ink-faint); display: inline-block; }

        .gpx-list { list-style: none; padding: 0; margin: 0; display: grid; gap: 12px; }
        .gpx-item {
          display: grid;
          grid-template-columns: 160px 1fr auto;
          gap: 16px; align-items: center;
          padding: 12px;
          background: var(--paper);
          border: 1px solid var(--ink-faint);
          border-radius: 2px;
          transition: border-color .14s;
        }
        .gpx-item.winner {
          border-color: var(--accent-line);
          background: linear-gradient(180deg, var(--paper), rgba(240,168,48,.04));
        }
        @media (max-width: 720px) {
          .gpx-item { grid-template-columns: 1fr; }
          .gx-mini { display: none; }
        }
        .gx-name { font-size: 15px; font-weight: 600; display: flex; align-items: center; flex-wrap: wrap; }
        .gx-meta {
          display: flex; gap: 10px; align-items: center;
          margin-top: 6px;
          font-size: 12px;
          color: var(--ink-mute);
          flex-wrap: wrap;
        }
        .gx-meta b { color: var(--ink); }

        .day-foot {
          display: flex; align-items: center; justify-content: space-between;
          gap: 12px; margin-top: 16px;
          flex-wrap: wrap;
        }
        .drop-hint { color: var(--ink-mute); }

        .drop-overlay {
          position: absolute; inset: 0;
          background: rgba(240,168,48,.08);
          border: 2px dashed var(--accent);
          display: flex; align-items: center; justify-content: center;
          color: var(--accent);
          text-align: center;
          pointer-events: none;
        }

        .empty-state {
          padding: 28px 12px;
          text-align: center;
          display: flex; flex-direction: column; align-items: center; gap: 14px;
          border: 1px dashed var(--ink-faint);
          border-radius: 2px;
        }
        .empty-icon { font-family: var(--f-mono); font-size: 32px; color: var(--ink-faint); }
      `}</style>
    </div>
  );
}
