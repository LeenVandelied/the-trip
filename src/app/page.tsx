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
                <AvatarStack pseudos={users.map((u) => u.name)} />
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
          <div className="topo-frame" data-label="PL.01 — RELEVÉ TOPOGRAPHIQUE">
            <svg viewBox="0 0 400 520" width="100%" style={{ display: "block" }}>
              <defs>
                <pattern id="lp-grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path
                    d="M 20 0 L 0 0 0 20"
                    fill="none"
                    stroke="rgba(240,168,48,.08)"
                    strokeWidth=".5"
                  />
                </pattern>
                <pattern id="lp-grid-major" width="100" height="100" patternUnits="userSpaceOnUse">
                  <path
                    d="M 100 0 L 0 0 0 100"
                    fill="none"
                    stroke="rgba(240,168,48,.18)"
                    strokeWidth=".8"
                  />
                </pattern>
              </defs>
              <rect width="400" height="520" fill="url(#lp-grid)" />
              <rect width="400" height="520" fill="url(#lp-grid-major)" />

              {/* Contour lines — sommet principal (centre-haut) */}
              <g fill="none" stroke="rgba(240,168,48,.22)" strokeWidth="1.1">
                {[40, 70, 105, 145, 190, 240].map((r, i) => (
                  <ellipse
                    key={`peak-a-${i}`}
                    cx="170"
                    cy="160"
                    rx={r}
                    ry={r * 0.7}
                  />
                ))}
              </g>
              {/* Cote du sommet */}
              <text
                x="170"
                y="164"
                textAnchor="middle"
                fontFamily="var(--f-mono)"
                fontSize="10"
                fill="var(--accent)"
                letterSpacing="0.1em"
              >
                ▲ 2802
              </text>

              {/* Contour lines — sommet secondaire (bas-droite) */}
              <g fill="none" stroke="rgba(240,168,48,.16)" strokeWidth="1">
                {[30, 60, 95, 135].map((r, i) => (
                  <ellipse
                    key={`peak-b-${i}`}
                    cx="310"
                    cy="410"
                    rx={r * 0.9}
                    ry={r * 0.65}
                    transform="rotate(-22 310 410)"
                  />
                ))}
              </g>
              <text
                x="310"
                y="414"
                textAnchor="middle"
                fontFamily="var(--f-mono)"
                fontSize="9"
                fill="rgba(240,168,48,.45)"
                letterSpacing="0.1em"
              >
                ▲ 1968
              </text>

              {/* Itinéraire principal — large halo + trait net */}
              <path
                d="M 40 480 C 80 440 110 420 130 380 S 170 300 200 270 S 270 220 280 170 S 270 100 320 60"
                fill="none"
                stroke="var(--accent)"
                strokeOpacity=".22"
                strokeWidth="10"
                strokeLinecap="round"
              />
              <path
                d="M 40 480 C 80 440 110 420 130 380 S 170 300 200 270 S 270 220 280 170 S 270 100 320 60"
                fill="none"
                stroke="var(--accent)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeDasharray="0"
              />

              {/* Étapes — petits pins le long du tracé */}
              {[
                { x: 130, y: 380 },
                { x: 200, y: 270 },
                { x: 280, y: 170 },
              ].map((p, i) => (
                <g key={`pin-${i}`}>
                  <circle cx={p.x} cy={p.y} r="5" fill="var(--paper)" stroke="var(--accent)" strokeWidth="1.8" />
                  <circle cx={p.x} cy={p.y} r="1.6" fill="var(--accent)" />
                </g>
              ))}

              {/* Départ */}
              <g transform="translate(40,480)">
                <circle r="7" fill="var(--paper)" stroke="var(--accent)" strokeWidth="2" />
                <circle r="2.5" fill="var(--accent)" />
                <text
                  x="14"
                  y="4"
                  fontFamily="var(--f-mono)"
                  fontSize="10"
                  fill="var(--ink-dim)"
                  letterSpacing="0.14em"
                >
                  DÉPART
                </text>
              </g>

              {/* Arrivée */}
              <g transform="translate(320,60)">
                <rect x="-7" y="-7" width="14" height="14" fill="var(--accent)" stroke="var(--accent)" />
                <text
                  x="-14"
                  y="4"
                  textAnchor="end"
                  fontFamily="var(--f-mono)"
                  fontSize="10"
                  fill="var(--ink-dim)"
                  letterSpacing="0.14em"
                >
                  ARRIVÉE
                </text>
              </g>

              {/* Rose des vents (bas-gauche) */}
              <g transform="translate(60,430)">
                <circle r="22" fill="none" stroke="var(--ink-mute)" strokeWidth="0.8" />
                <circle r="3" fill="var(--ink-mute)" />
                <path d="M 0 -22 L 4 -4 L 0 0 L -4 -4 Z" fill="var(--accent)" />
                <path d="M 0 22 L 4 4 L 0 0 L -4 4 Z" fill="var(--ink-dim)" opacity=".5" />
                <path d="M 22 0 L 4 4 L 0 0 L 4 -4 Z" fill="var(--ink-dim)" opacity=".35" />
                <path d="M -22 0 L -4 4 L 0 0 L -4 -4 Z" fill="var(--ink-dim)" opacity=".35" />
                <text
                  x="0"
                  y="-28"
                  textAnchor="middle"
                  fontFamily="var(--f-mono)"
                  fontSize="9"
                  fontWeight="700"
                  fill="var(--accent)"
                >
                  N
                </text>
              </g>

              {/* Échelle bas-droite */}
              <g transform="translate(310,490)">
                <line x1="0" y1="0" x2="60" y2="0" stroke="var(--ink-mute)" strokeWidth="1" />
                <line x1="0" y1="-3" x2="0" y2="3" stroke="var(--ink-mute)" strokeWidth="1" />
                <line x1="20" y1="-2" x2="20" y2="2" stroke="var(--ink-mute)" strokeWidth="1" />
                <line x1="40" y1="-2" x2="40" y2="2" stroke="var(--ink-mute)" strokeWidth="1" />
                <line x1="60" y1="-3" x2="60" y2="3" stroke="var(--ink-mute)" strokeWidth="1" />
                <text
                  x="30"
                  y="-7"
                  textAnchor="middle"
                  fontFamily="var(--f-mono)"
                  fontSize="9"
                  fill="var(--ink-mute)"
                  letterSpacing="0.1em"
                >
                  0 — 50 km
                </text>
              </g>

              {/* Tampon ALPES (encre rouge) */}
              <g transform="translate(280,290) rotate(-8)" opacity=".82">
                <rect
                  x="-44"
                  y="-15"
                  width="88"
                  height="30"
                  fill="none"
                  stroke="var(--stamp)"
                  strokeWidth="1.6"
                />
                <text
                  x="0"
                  y="5"
                  textAnchor="middle"
                  fontFamily="var(--f-stamp)"
                  fontSize="15"
                  fontWeight="700"
                  fill="var(--stamp)"
                  letterSpacing="0.2em"
                >
                  ALPES
                </text>
              </g>

              {/* Coords corners */}
              <text x="6" y="14" fontFamily="var(--f-mono)" fontSize="9" fill="var(--ink-mute)">
                45.90°N · 06.12°E
              </text>
              <text
                x="394"
                y="514"
                textAnchor="end"
                fontFamily="var(--f-mono)"
                fontSize="9"
                fill="var(--ink-mute)"
              >
                43.70°N · 07.27°E
              </text>
              <text x="6" y="514" fontFamily="var(--f-mono)" fontSize="9" fill="var(--ink-faint)">
                ÉCH. 1:2 000 000
              </text>
              <text
                x="394"
                y="14"
                textAnchor="end"
                fontFamily="var(--f-mono)"
                fontSize="9"
                fill="var(--ink-faint)"
              >
                ÉD. 2026.07
              </text>
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
            <span className="coord">Carte synoptique · indicative</span>
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
