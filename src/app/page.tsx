import { prisma } from "@/lib/prisma";
import { routeWinner } from "@/lib/winners";
import { getCurrentUser } from "@/lib/current-user";
import { LandingForm } from "@/components/landing-form";
import { AvatarStack } from "@/components/avatar";
import { Stamp } from "@/components/stamp";
import { TRIP_DAYS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [me, users, routes] = await Promise.all([
    getCurrentUser(),
    prisma.user.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.route.findMany({ include: { votes: true } }),
  ]);

  const byDay = new Map<number, typeof routes>();
  for (const r of routes) {
    const arr = byDay.get(r.dayNumber) ?? [];
    arr.push(r);
    byDay.set(r.dayNumber, arr);
  }

  let totalKm = 0;
  let daysValidated = 0;
  for (const arr of byDay.values()) {
    const win = routeWinner(arr);
    if (win) {
      totalKm += win.distanceKm;
      daysValidated++;
    }
  }

  return (
    <div className="page landing">
      <div className="landing-grid">
        <div className="landing-left">
          <div
            className="eyebrow"
            style={{ marginBottom: 18, display: "flex", alignItems: "center", gap: 14 }}
          >
            <span>CARNET DE ROUTE</span>
            <span style={{ flex: 1, height: 1, background: "var(--ink-faint)" }} />
            <span>ÉD. 2026·07</span>
          </div>
          <h1 className="hero-title">
            The
            <br />
            Trip.
          </h1>
          <p className="hero-sub">
            {TRIP_DAYS} jours · {users.length} {users.length > 1 ? "motos" : "moto"} ·{" "}
            <span style={{ color: "var(--accent)" }}>
              ≈ {Math.round(totalKm).toLocaleString("fr-FR")} km
            </span>
            <br />
            <span style={{ color: "var(--ink-mute)" }}>
              {daysValidated === 0
                ? "Aucun jour validé pour l'instant — propose des GPX."
                : `${daysValidated}/${TRIP_DAYS} jours validés.`}
            </span>
          </p>

          <LandingForm initial={me?.name ?? ""} alreadyEmbarked={!!me} />

          {users.length > 0 && (
            <div className="card plated" style={{ marginTop: 18, maxWidth: 540 }}>
              <span className="corners" />
              <div className="eyebrow" style={{ marginBottom: 10 }}>
                ÉQUIPAGE
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <AvatarStack pseudos={users.map((u) => u.name)} max={10} />
                <span style={{ flex: 1 }} />
                <span className="coord">
                  {users.length} EMBARQUÉ{users.length > 1 ? "S" : ""}
                </span>
              </div>
            </div>
          )}

          <div className="quick-stats">
            <div>
              <div className="stat-n">{TRIP_DAYS}</div>
              <div className="stat-l">JOURS</div>
            </div>
            <div className="qs-sep" />
            <div>
              <div className="stat-n">{users.length}</div>
              <div className="stat-l">MOTOS</div>
            </div>
            <div className="qs-sep" />
            <div>
              <div className="stat-n">
                {totalKm > 0 ? Math.round(totalKm / TRIP_DAYS) : "—"}
              </div>
              <div className="stat-l">KM/JOUR</div>
            </div>
            <div className="qs-sep" />
            <div>
              <div className="stat-n">{daysValidated}</div>
              <div className="stat-l">VALIDÉS</div>
            </div>
          </div>
        </div>

        <div className="landing-right">
          <div className="topo-frame" data-label="PL.01 — ROUTE SINUEUSE">
            <svg viewBox="0 0 400 520" width="100%" style={{ display: "block" }}>
              <defs>
                <pattern id="lp-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path
                    d="M 20 0 L 0 0 0 20"
                    fill="none"
                    stroke="rgba(240,168,48,.07)"
                    strokeWidth=".5"
                  />
                </pattern>
              </defs>
              <rect width="400" height="520" fill="url(#lp-grid)" />
              <g fill="none" stroke="rgba(240,168,48,.13)" strokeWidth="1">
                <ellipse cx="80" cy="120" rx="80" ry="50" />
                <ellipse cx="80" cy="120" rx="120" ry="75" />
                <ellipse cx="80" cy="120" rx="160" ry="100" />
                <ellipse cx="320" cy="400" rx="60" ry="40" />
                <ellipse cx="320" cy="400" rx="100" ry="65" />
              </g>
              <path
                d="M 30 480 Q 100 460 130 410 T 200 320 Q 240 270 220 220 T 250 110 Q 270 60 340 40"
                fill="none"
                stroke="var(--accent)"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <g transform="translate(200,290) rotate(-30)">
                <circle cx="0" cy="-30" r="14" fill="none" stroke="var(--ink)" strokeWidth="2" />
                <circle cx="0" cy="-30" r="5" fill="var(--ink)" />
                <circle cx="0" cy="30" r="14" fill="none" stroke="var(--ink)" strokeWidth="2" />
                <circle cx="0" cy="30" r="5" fill="var(--ink)" />
                <line x1="0" y1="-16" x2="0" y2="16" stroke="var(--ink)" strokeWidth="2" />
                <rect
                  x="-9"
                  y="-8"
                  width="18"
                  height="16"
                  fill="var(--paper-3)"
                  stroke="var(--ink)"
                  strokeWidth="1.5"
                />
                <line x1="0" y1="-30" x2="0" y2="-44" stroke="var(--ink)" strokeWidth="2" />
                <line x1="-10" y1="-44" x2="10" y2="-44" stroke="var(--ink)" strokeWidth="2" />
                <circle cx="0" cy="-50" r="3" fill="var(--accent)" />
                <ellipse cx="0" cy="8" rx="6" ry="3" fill="var(--ink)" />
              </g>
            </svg>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 10,
            }}
          >
            <span className="coord">Planche d&apos;illustration · à recadrer</span>
            <Stamp angle={-4}>Bon pour départ</Stamp>
          </div>
        </div>
      </div>

      <footer className="lf">
        <div className="lf-row">
          <span className="coord">N°&nbsp;001/008</span>
          <span className="lf-dash" />
          <span className="coord">CARNET — ACCÈS PAR LIEN</span>
          <span className="lf-dash" />
          <span className="coord">v1.0&nbsp;·&nbsp;MAI&nbsp;2026</span>
        </div>
      </footer>

      <style>{`
        .landing { padding-top: 56px; }
        @media (max-width: 900px) { .landing { padding-top: 28px; } }
        .landing-grid {
          display: grid;
          grid-template-columns: 1.1fr .9fr;
          gap: 56px;
          align-items: start;
        }
        @media (max-width: 900px) { .landing-grid { grid-template-columns: 1fr; gap: 32px; } }
        .hero-title {
          font-size: clamp(64px, 11vw, 148px);
          line-height: .88;
          letter-spacing: -.03em;
          margin-bottom: 24px;
        }
        .hero-title::first-letter { color: var(--accent); }
        .hero-sub {
          font-family: var(--f-mono);
          font-size: 14px;
          color: var(--ink-dim);
          margin: 0 0 36px;
          line-height: 1.6;
          letter-spacing: .02em;
        }
        .quick-stats { display: flex; gap: 24px; align-items: center; padding-top: 24px; }
        .quick-stats .stat-n {
          font-family: var(--f-title); font-size: 32px; font-weight: 700;
          color: var(--ink); line-height: 1;
        }
        .quick-stats .stat-l {
          font-family: var(--f-mono); font-size: 10px;
          letter-spacing: .14em; color: var(--ink-mute); margin-top: 4px;
        }
        .qs-sep { width: 1px; align-self: stretch; background: var(--ink-faint); }
        .lf { margin-top: 40px; padding-top: 24px; border-top: 1px dashed var(--ink-faint); }
        .lf-row {
          display: flex; align-items: center; gap: 16px;
          flex-wrap: wrap; color: var(--ink-mute);
        }
        .lf-dash {
          flex: 1; min-width: 40px; height: 1px;
          border-top: 1px dashed var(--ink-faint);
        }
      `}</style>
    </div>
  );
}
