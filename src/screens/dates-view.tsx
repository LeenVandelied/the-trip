"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AvatarStack } from "@/components/avatar";
import { Stamp } from "@/components/stamp";
import {
  proposeDateRangeAction,
  setAvailabilityAction,
  deleteDateProposalAction,
} from "@/app/actions/dates";

type VoteKind = "YES" | "MAYBE" | "NO";

export type Proposal = {
  id: string;
  startISO: string;
  endISO: string;
  availabilities: { userId: string; status: VoteKind }[];
};

const RANGE_COLORS = ["#f0a830", "#5aa9e6", "#7fb069", "#c879c7", "#e8c547", "#d96b3a"];
const MONTH_NAMES = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

function fmtFRRange(start: Date, end: Date): string {
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  const s = `${start.getDate()}${sameMonth ? "" : " " + MONTH_NAMES[start.getMonth()].toLowerCase()}`;
  const e = `${end.getDate()} ${MONTH_NAMES[end.getMonth()].toLowerCase()}`;
  return `${s} → ${e}`;
}

function spanDaysNights(start: Date, end: Date): { days: number; nights: number } {
  // Round to absorb any DST hour shift; both dates are stored at UTC midnight upstream.
  const nights = Math.max(0, Math.round((end.getTime() - start.getTime()) / 86_400_000));
  return { days: nights + 1, nights };
}

export function DatesView({
  meId,
  mePseudo,
  userById,
  totalUsers,
  proposals,
}: {
  meId: string | null;
  mePseudo: string | null;
  userById: Record<string, string>;
  totalUsers: number;
  proposals: Proposal[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showModal, setShowModal] = useState(false);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const parsed = useMemo(
    () =>
      proposals.map((p, i) => ({
        ...p,
        start: new Date(p.startISO),
        end: new Date(p.endISO),
        color: RANGE_COLORS[i % RANGE_COLORS.length],
        myVote: meId ? p.availabilities.find((a) => a.userId === meId)?.status ?? null : null,
        yes: p.availabilities.filter((a) => a.status === "YES").length,
        maybe: p.availabilities.filter((a) => a.status === "MAYBE").length,
        no: p.availabilities.filter((a) => a.status === "NO").length,
      })),
    [proposals, meId],
  );

  const winner = useMemo(() => {
    if (parsed.length === 0) return null;
    return [...parsed].sort((a, b) => {
      if (b.yes !== a.yes) return b.yes - a.yes;
      const wa = a.yes + 0.5 * a.maybe;
      const wb = b.yes + 0.5 * b.maybe;
      if (wb !== wa) return wb - wa;
      return a.start.getTime() - b.start.getTime();
    })[0];
  }, [parsed]);

  const vote = (id: string, status: VoteKind | null) => {
    if (!meId) {
      router.push("/");
      return;
    }
    setErr(null);
    startTransition(async () => {
      const res = await setAvailabilityAction(id, status as VoteKind);
      if (!res.ok) setErr(res.error);
      router.refresh();
    });
  };

  const propose = () => {
    setErr(null);
    if (!start || !end) {
      setErr("Renseigne les deux dates");
      return;
    }
    startTransition(async () => {
      const res = await proposeDateRangeAction(start, end);
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      setShowModal(false);
      setStart("");
      setEnd("");
      router.refresh();
    });
  };

  const removeProposal = (id: string) => {
    if (!confirm("Supprimer cette plage ?")) return;
    startTransition(async () => {
      await deleteDateProposalAction(id);
      router.refresh();
    });
  };

  const scrollToRange = (rid: string) => {
    const el = document.getElementById("range-" + rid);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("flash");
      setTimeout(() => el.classList.remove("flash"), 1200);
    }
  };

  // Build month grid from min start to max end
  const months: { y: number; m: number }[] = [];
  if (parsed.length > 0) {
    let cur = new Date(Math.min(...parsed.map((r) => r.start.getTime())));
    cur.setDate(1);
    const last = new Date(Math.max(...parsed.map((r) => r.end.getTime())));
    while (cur <= last) {
      months.push({ y: cur.getFullYear(), m: cur.getMonth() });
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1);
    }
  }

  const buildCells = (y: number, m: number): (Date | null)[] => {
    const firstDay = new Date(y, m, 1);
    const lastDay = new Date(y, m + 1, 0);
    const offset = (firstDay.getDay() + 6) % 7;
    const cells: (Date | null)[] = [];
    for (let i = 0; i < offset; i++) cells.push(null);
    for (let d = 1; d <= lastDay.getDate(); d++) cells.push(new Date(y, m, d));
    while (cells.length % 7) cells.push(null);
    return cells;
  };

  return (
    <div className="page">
      <div className="page-header">
        <div className="ttl">
          <div className="eyebrow" style={{ marginBottom: 12 }}>02 · QUAND ON PART ?</div>
          <h1>Choisis ta plage.</h1>
        </div>
        <div className="meta">
          PROPOSITIONS&nbsp;:&nbsp;{parsed.length}
          <br />
          VOTANTS&nbsp;:&nbsp;{totalUsers}
        </div>
      </div>

      {err && (
        <div className="coord" style={{ color: "var(--no)", marginBottom: 16 }}>
          {err}
        </div>
      )}

      {parsed.length === 0 ? (
        <div className="card dashed empty-block">
          <div style={{ fontSize: 32, color: "var(--ink-faint)" }}>∅</div>
          <div>
            <strong>Aucune plage proposée pour l&apos;instant</strong>
            <div className="coord" style={{ marginTop: 4 }}>
              Sois le premier à en poser une.
            </div>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => (meId ? setShowModal(true) : router.push("/"))}
          >
            ＋ Proposer une plage
          </button>
        </div>
      ) : (
        <>
          <div className="cal-wrap card plated">
            <span className="corners" />
            <div className="cal-head-row">
              <div>
                <div className="eyebrow" style={{ marginBottom: 4 }}>VUE CALENDRIER</div>
                <h3 style={{ fontSize: 18 }}>
                  {parsed.length} plage{parsed.length > 1 ? "s" : ""} reportée
                  {parsed.length > 1 ? "s" : ""}
                </h3>
              </div>
              <div className="cal-legend">
                {parsed.map((r) => (
                  <span key={r.id} className="cal-legend-item">
                    <span className="cal-leg-dot" style={{ background: r.color }} />
                    <span className="cal-leg-label">{fmtFRRange(r.start, r.end)}</span>
                    {r.myVote === "YES" && <span className="cal-leg-vote">✓</span>}
                  </span>
                ))}
              </div>
            </div>

            <div className="cal-months">
              {months.map(({ y, m }) => {
                const cells = buildCells(y, m);
                return (
                  <div className="cal-month" key={`${y}-${m}`}>
                    <div className="cal-month-title">
                      {MONTH_NAMES[m]} <span className="coord">{y}</span>
                    </div>
                    <div className="cal-weeknames">
                      {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
                        <span key={i}>{d}</span>
                      ))}
                    </div>
                    <div className="cal-grid">
                      {cells.map((day, idx) => {
                        if (!day) return <div className="cal-cell empty" key={idx} />;
                        const inRanges = parsed.filter((r) => day >= r.start && day <= r.end);
                        const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                        return (
                          <button
                            key={idx}
                            className={
                              "cal-cell " +
                              (inRanges.length ? "has " : "") +
                              (isWeekend ? "wk" : "")
                            }
                            onClick={() => inRanges.length && scrollToRange(inRanges[0].id)}
                          >
                            <span className="cal-d">{day.getDate()}</span>
                            {inRanges.length > 0 && (
                              <span className="cal-stripes">
                                {inRanges.map((r) => (
                                  <span
                                    key={r.id}
                                    className="cal-stripe"
                                    style={{
                                      background: r.color,
                                      opacity:
                                        r.myVote === "YES"
                                          ? 1
                                          : r.myVote === "MAYBE"
                                          ? 0.55
                                          : 0.35,
                                    }}
                                    title={fmtFRRange(r.start, r.end)}
                                  />
                                ))}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="dates-list">
            {parsed.map((r) => {
              const total = r.yes + r.maybe + r.no || 1;
              const yp = (r.yes / total) * 100;
              const mp = (r.maybe / total) * 100;
              const np = (r.no / total) * 100;
              const isWin = winner && r.id === winner.id;
              return (
                <div
                  className={"card plated dates-row " + (isWin ? "win" : "")}
                  id={"range-" + r.id}
                  key={r.id}
                >
                  <span className="corners" />
                  <span className="dr-tab" style={{ background: r.color }} aria-hidden="true" />
                  <div className="dr-head">
                    <div style={{ minWidth: 0 }}>
                      <div
                        className="coord"
                        style={{ display: "inline-flex", alignItems: "center", gap: 8 }}
                      >
                        <span
                          aria-hidden="true"
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: 2,
                            background: r.color,
                            display: "inline-block",
                          }}
                        />
                        PLAGE&nbsp;{r.id.slice(0, 4).toUpperCase()}
                      </div>
                      <h3 className="dr-title">{fmtFRRange(r.start, r.end)}</h3>
                      {(() => {
                        const { days, nights } = spanDaysNights(r.start, r.end);
                        return (
                          <div className="dr-span">
                            <span className="mono"><b>{days}</b> jour{days > 1 ? "s" : ""}</span>
                            <span className="dr-span-sep">·</span>
                            <span className="mono"><b>{nights}</b> nuit{nights > 1 ? "s" : ""}</span>
                          </div>
                        );
                      })()}
                    </div>
                    {isWin && (
                      <Stamp angle={6} color="var(--accent)">
                        ★ EN TÊTE
                      </Stamp>
                    )}
                  </div>
                  <div className="dr-bar">
                    <div className="bar-track">
                      <div className="bar-seg yes" style={{ width: yp + "%" }} />
                      <div className="bar-seg maybe" style={{ width: mp + "%" }} />
                      <div className="bar-seg no" style={{ width: np + "%" }} />
                    </div>
                    <div className="bar-leg">
                      <span><i className="dot yes" />{r.yes} dispo</span>
                      <span><i className="dot maybe" />{r.maybe} peut-être</span>
                      <span><i className="dot no" />{r.no} non</span>
                    </div>
                  </div>
                  <div className="dr-foot">
                    <div className="vote-group">
                      {(["YES", "MAYBE", "NO"] as VoteKind[]).map((k) => (
                        <button
                          key={k}
                          className={
                            "vote-radio " + k.toLowerCase() + (r.myVote === k ? " on" : "")
                          }
                          onClick={() => vote(r.id, r.myVote === k ? null : k)}
                          disabled={pending}
                        >
                          <span className="vr-dot" />
                          {k === "YES" ? "Dispo" : k === "MAYBE" ? "Peut-être" : "Non"}
                        </button>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <span className="coord">VOTANTS&nbsp;:</span>
                      <AvatarStack
                        pseudos={r.availabilities
                          .filter((a) => a.status !== "NO")
                          .map((a) => userById[a.userId] ?? "?")
                          .concat(
                            mePseudo && r.availabilities.every((a) => a.userId !== meId)
                              ? []
                              : [],
                          )}
                        size="sm"
                        max={6}
                      />
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => removeProposal(r.id)}
                        title="Supprimer cette plage"
                        disabled={pending}
                        style={{ marginLeft: 4 }}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            <button
              className="card dashed dates-add"
              onClick={() => (meId ? setShowModal(true) : router.push("/"))}
            >
              <span style={{ fontSize: 22 }}>＋</span>
              <span>Proposer une plage</span>
            </button>
          </div>
        </>
      )}

      {showModal && (
        <div className="modal-bg" onClick={() => !pending && setShowModal(false)}>
          <div className="modal card plated" onClick={(e) => e.stopPropagation()}>
            <span className="corners" />
            <div className="eyebrow" style={{ marginBottom: 6 }}>NOUVELLE PLAGE</div>
            <h3 style={{ fontSize: 22, marginBottom: 18 }}>Propose une date</h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <label className="field">
                <span className="lbl">Du</span>
                <input
                  className="input"
                  type="date"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                />
              </label>
              <label className="field">
                <span className="lbl">Au</span>
                <input
                  className="input"
                  type="date"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                />
              </label>
            </div>
            {err && (
              <div className="coord" style={{ color: "var(--no)", marginTop: 8 }}>
                {err}
              </div>
            )}
            <div className="dash-rule" />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)} disabled={pending}>
                Annuler
              </button>
              <button className="btn btn-primary" onClick={propose} disabled={pending}>
                {pending ? "…" : "Proposer"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .empty-block {
          padding: 60px 28px;
          text-align: center;
          display: flex; flex-direction: column; align-items: center; gap: 14px;
        }
        .cal-wrap { margin-bottom: var(--gap); }
        .cal-head-row {
          display: flex; justify-content: space-between; align-items: flex-start;
          gap: 24px; flex-wrap: wrap;
          margin-bottom: 18px;
          padding-bottom: 14px;
          border-bottom: 1px dashed var(--ink-faint);
        }
        .cal-legend { display: flex; flex-wrap: wrap; gap: 8px 14px; align-items: center; }
        .cal-legend-item {
          display: inline-flex; align-items: center; gap: 6px;
          font-family: var(--f-mono); font-size: 11px;
          color: var(--ink-dim);
          padding: 4px 10px;
          border: 1px solid var(--ink-faint);
          border-radius: 2px;
        }
        .cal-leg-dot { width: 10px; height: 10px; border-radius: 2px; display: inline-block; }
        .cal-leg-vote { color: var(--yes); margin-left: 2px; }
        .cal-months {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 28px;
        }
        .cal-month-title {
          font-family: var(--f-title);
          font-size: 18px; font-weight: 600;
          margin-bottom: 10px;
          display: flex; align-items: baseline; gap: 8px;
        }
        .cal-weeknames {
          display: grid; grid-template-columns: repeat(7, 1fr);
          gap: 4px;
          margin-bottom: 6px;
          font-family: var(--f-mono); font-size: 10px;
          letter-spacing: .14em;
          color: var(--ink-mute);
          text-align: center;
        }
        .cal-grid {
          display: grid; grid-template-columns: repeat(7, 1fr);
          gap: 4px;
        }
        .cal-cell {
          position: relative;
          aspect-ratio: 1 / 1;
          background: var(--paper);
          border: 1px solid var(--kraft);
          border-radius: 2px;
          padding: 4px 5px;
          display: flex; flex-direction: column; justify-content: space-between;
          font-family: var(--f-mono); font-size: 11px;
          color: var(--ink-dim);
          cursor: default;
          overflow: hidden;
          transition: border-color .14s, background .14s;
        }
        .cal-cell.empty { background: transparent; border: 1px dashed var(--ink-faint); opacity: .25; }
        .cal-cell.wk { background: rgba(255,255,255,.015); }
        .cal-cell .cal-d { font-weight: 600; color: var(--ink-dim); }
        .cal-cell.has { cursor: pointer; color: var(--ink); }
        .cal-cell.has:hover { border-color: var(--accent); background: rgba(240,168,48,.06); }
        .cal-cell.has .cal-d { color: var(--ink); }
        .cal-stripes { display: flex; flex-direction: column; gap: 2px; margin-top: auto; }
        .cal-stripe { height: 4px; border-radius: 1px; display: block; }

        @keyframes flashRow {
          0%,100% { box-shadow: none; }
          30%     { box-shadow: 0 0 0 2px var(--accent), 0 0 32px rgba(240,168,48,.35); }
        }
        .dates-row.flash { animation: flashRow 1.1s ease; }

        .dates-list { display: grid; gap: var(--gap); }
        .dates-row { overflow: hidden; }
        .dates-row .dr-tab {
          position: absolute;
          top: 0; left: 0; bottom: 0;
          width: 4px;
        }
        .dates-row .dr-head {
          display: flex; justify-content: space-between; align-items: flex-start;
          gap: 16px; margin-bottom: 22px;
        }
        .dr-title { font-size: 28px; margin-top: 4px; line-height: 1.15; }
        @media (max-width: 540px) { .dr-title { font-size: 22px; } }
        .dr-span {
          margin-top: 8px;
          display: inline-flex; align-items: center; gap: 6px;
          font-family: var(--f-mono);
          font-size: 12px;
          color: var(--ink-dim);
          letter-spacing: .04em;
          padding: 4px 10px;
          border: 1px solid var(--ink-faint);
          border-radius: 2px;
        }
        .dr-span b { color: var(--ink); font-weight: 700; }
        .dr-span-sep { color: var(--ink-faint); }
        .dates-row.win {
          border-color: var(--accent-line);
          background: linear-gradient(180deg, var(--paper-2), rgba(240,168,48,.04));
        }
        .bar-track {
          height: 10px; border-radius: 2px; overflow: hidden; display: flex;
          border: 1px solid var(--kraft); background: var(--paper);
        }
        .bar-seg { height: 100%; transition: width .3s ease; }
        .bar-seg.yes   { background: var(--yes); }
        .bar-seg.maybe { background: var(--maybe); }
        .bar-seg.no    { background: var(--no); }
        .bar-leg {
          display: flex; gap: 18px; margin-top: 8px;
          font-family: var(--f-mono); font-size: 11px; color: var(--ink-dim);
          letter-spacing: .04em;
        }
        .bar-leg .dot { width: 8px; height: 8px; border-radius: 50%; display: inline-block; margin-right: 6px; vertical-align: middle; }
        .dot.yes { background: var(--yes); } .dot.maybe { background: var(--maybe); } .dot.no { background: var(--no); }
        .dr-foot {
          display: flex; justify-content: space-between; align-items: center;
          flex-wrap: wrap; gap: 12px; margin-top: 16px;
          padding-top: 14px; border-top: 1px dashed var(--ink-faint);
        }
        .vote-group { display: inline-flex; gap: 6px; }
        .vote-radio {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 8px 14px;
          font-family: var(--f-mono); font-size: 11px; letter-spacing: .1em;
          text-transform: uppercase;
          border: 1px solid var(--kraft);
          background: var(--paper);
          color: var(--ink-dim);
          border-radius: 2px;
          cursor: pointer;
          transition: all .14s;
        }
        .vote-radio .vr-dot {
          width: 10px; height: 10px; border-radius: 50%;
          border: 1.5px solid currentColor;
          background: transparent;
          transition: background .14s;
        }
        .vote-radio:hover { color: var(--ink); border-color: var(--ink-mute); }
        .vote-radio.on.yes   { color: var(--yes);   border-color: var(--yes); }
        .vote-radio.on.maybe { color: var(--maybe); border-color: var(--maybe); }
        .vote-radio.on.no    { color: var(--no);    border-color: var(--no); }
        .vote-radio.on .vr-dot { background: currentColor; }
        .dates-add {
          color: var(--ink-mute);
          font-family: var(--f-mono);
          font-size: 13px;
          letter-spacing: .14em;
          text-transform: uppercase;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 12px;
          background: transparent;
          padding: 28px;
          width: 100%;
          transition: all .14s;
        }
        .dates-add:hover { color: var(--accent); border-color: var(--accent-line); }
      `}</style>
    </div>
  );
}
