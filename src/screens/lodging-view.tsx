"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Avatar } from "@/components/avatar";
import { VoteButtons, type Vote } from "@/components/vote-buttons";
import {
  proposeLodgingAction,
  updateLodgingAction,
  voteLodgingAction,
  deleteLodgingAction,
} from "@/app/actions/lodgings";

const LeafletMap = dynamic(
  () => import("@/components/leaflet-map").then((m) => m.LeafletMap),
  { ssr: false, loading: () => null },
);

type RouteMin = { id: string; name: string; gpxContent: string; roadGeoJson: string | null };

function isAirbnbUrl(s: string): boolean {
  try {
    const h = new URL(s).hostname.toLowerCase();
    return h.includes("airbnb.");
  } catch {
    return false;
  }
}

export type LodgingLite = {
  id: string;
  url: string;
  title: string | null;
  ogImage: string | null;
  ogDescription: string | null;
  priceEur: number | null;
  nightCount: number | null;
  addressText: string | null;
  lat: number | null;
  lng: number | null;
  userId: string;
  createdAtISO: string;
  score: number;
  upCount: number;
  downCount: number;
  upVoters: string[];
  downVoters: string[];
  myVote: "UP" | "DOWN" | null;
};

function hostnameOf(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; }
}

function mapsUrl(l: LodgingLite): string {
  if (l.lat != null && l.lng != null) {
    return `https://www.google.com/maps/search/?api=1&query=${l.lat},${l.lng}`;
  }
  if (l.addressText) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(l.addressText)}`;
  }
  return "";
}

const SPLIT_RANGE = [8, 9, 10, 11, 12, 13, 14] as const;

function SplitTable({
  priceEur,
  nightCount,
  headcount,
}: {
  priceEur: number;
  nightCount: number;
  headcount: number;
}) {
  return (
    <div className="split-wrap">
      <div className="split-title coord">RÉPARTITION SELON LA TAILLE DU GROUPE</div>
      <div className="split-scroll">
        <table className="split-table">
          <thead>
            <tr>
              <th>
                <span className="coord">PERS.</span>
              </th>
              {SPLIT_RANGE.map((n) => (
                <th key={n} className={n === headcount ? "is-now" : ""}>
                  {n}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <span className="coord">€&nbsp;/&nbsp;pers</span>
              </td>
              {SPLIT_RANGE.map((n) => (
                <td key={n} className={n === headcount ? "is-now" : ""}>
                  {Math.round(priceEur / n)}
                </td>
              ))}
            </tr>
            <tr>
              <td>
                <span className="coord">€&nbsp;/&nbsp;pers&nbsp;/&nbsp;nuit</span>
              </td>
              {SPLIT_RANGE.map((n) => (
                <td key={n} className={n === headcount ? "is-now" : ""}>
                  {Math.round(priceEur / n / nightCount)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function LodgingView({
  meId,
  userById,
  headcount,
  tripDays,
  lodgings,
  winnerRoutesByDay,
}: {
  meId: string | null;
  userById: Record<string, string>;
  headcount: number;
  tripDays: number;
  lodgings: LodgingLite[];
  winnerRoutesByDay: Record<number, RouteMin[]>;
}) {
  // Lodgings with a geocoded position are renderable on the map.
  void tripDays;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // Form is shared between "add" and "edit". When editing, `editId` holds the lodging id;
  // when adding, it's null and `url` is editable.
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [price, setPrice] = useState<string>("");
  const [nights, setNights] = useState<string>("");
  const [address, setAddress] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const openAdd = () => {
    setEditId(null);
    setUrl(""); setPrice(""); setNights(""); setAddress("");
    setErr(null);
    setShowForm(true);
  };
  const openEdit = (l: LodgingLite) => {
    setEditId(l.id);
    setUrl(l.url);
    setPrice(l.priceEur != null ? String(l.priceEur) : "");
    setNights(l.nightCount != null ? String(l.nightCount) : "");
    setAddress(l.addressText ?? "");
    setErr(null);
    setShowForm(true);
  };

  const sorted = [...lodgings].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return new Date(b.createdAtISO).getTime() - new Date(a.createdAtISO).getTime();
  });

  const submit = () => {
    if (!meId) { router.push("/"); return; }
    setErr(null);
    startTransition(async () => {
      const payload = {
        priceEur: price ? +price : null,
        nightCount: nights ? +nights : null,
        addressText: address.trim() || null,
      };
      const res = editId
        ? await updateLodgingAction({ id: editId, ...payload })
        : await proposeLodgingAction({ url: url.trim(), ...payload });
      if (!res.ok) { setErr(res.error); return; }
      setShowForm(false);
      setEditId(null);
      setUrl(""); setPrice(""); setNights(""); setAddress("");
      router.refresh();
    });
  };

  const vote = (id: string, v: Vote) => {
    if (!meId) { router.push("/"); return; }
    startTransition(async () => {
      await voteLodgingAction(id, v === "yes" ? "UP" : v === "no" ? "DOWN" : null);
      router.refresh();
    });
  };

  const remove = (l: LodgingLite) => {
    const author = userById[l.userId] ?? "?";
    const isMine = l.userId === meId;
    const title = l.title ?? hostnameOf(l.url);
    const msg = isMine
      ? `Supprimer ton logement « ${title} » ?`
      : `Supprimer « ${title} » (proposé par ${author}) ?`;
    if (!confirm(msg)) return;
    startTransition(async () => {
      const res = await deleteLodgingAction(l.id);
      if (!res.ok) { alert(res.error); return; }
      router.refresh();
    });
  };

  return (
    <div className="page">
      <div className="page-header">
        <div className="ttl">
          <div className="eyebrow" style={{ marginBottom: 12 }}>07 · LOGEMENT</div>
          <h1>Où on dort ?</h1>
        </div>
        <div className="meta" style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
          <span>{sorted.length} PROPOSITION{sorted.length > 1 ? "S" : ""}</span>
          <button className="btn btn-primary btn-sm" onClick={() => meId ? openAdd() : router.push("/")}>
            ＋ Proposer
          </button>
        </div>
      </div>

      {sorted.length === 0 ? (
        <div className="card dashed empty-block">
          <div style={{ fontSize: 32, color: "var(--ink-faint)" }}>∅</div>
          <div>
            <strong>Aucun logement proposé pour l&apos;instant</strong>
            <div className="coord" style={{ marginTop: 4 }}>
              Colle un lien Airbnb, Booking, hôtel, gîte, ce que tu veux.
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => meId ? openAdd() : router.push("/")}>
            ＋ Proposer un logement
          </button>
        </div>
      ) : (
        <div className="lodge-grid">
          {sorted.map((l) => {
            const map = mapsUrl(l);
            const rider = userById[l.userId] ?? "?";
            return (
              <article key={l.id} className="lodge-card card">
                {l.ogImage ? (
                  // Raw <img> deliberate: arbitrary user URLs, no whitelist.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img className="lodge-img" src={l.ogImage} alt={l.title ?? ""} loading="lazy" />
                ) : (
                  <div className="lodge-img placeholder">
                    <span className="coord">PAS DE PREVIEW</span>
                  </div>
                )}
                <div className="lodge-body">
                  <div className="lodge-host coord">{hostnameOf(l.url)}</div>
                  <h3 className="lodge-title">
                    {l.title ?? l.url}
                  </h3>
                  {l.ogDescription && (
                    <p className="lodge-desc">{l.ogDescription.slice(0, 160)}{l.ogDescription.length > 160 ? "…" : ""}</p>
                  )}
                  <div className="lodge-meta">
                    {l.priceEur != null && (
                      <span className="lodge-price">
                        <b className="mono">{Math.round(l.priceEur)}</b>
                        <span className="coord">&nbsp;€{l.nightCount ? ` · ${l.nightCount} nuit${l.nightCount > 1 ? "s" : ""}` : ""}</span>
                      </span>
                    )}
                    {l.addressText && (
                      <span className="coord lodge-addr" title={l.addressText}>
                        📍 {l.addressText.slice(0, 60)}{l.addressText.length > 60 ? "…" : ""}
                      </span>
                    )}
                  </div>
                  {l.priceEur != null && l.nightCount != null && l.nightCount > 0 ? (
                    <SplitTable
                      priceEur={l.priceEur}
                      nightCount={l.nightCount}
                      headcount={headcount}
                    />
                  ) : (
                    (l.priceEur == null || l.nightCount == null) && l.userId === meId && (
                      <div className="coord split-hint">
                        💡 Renseigne le prix total + le nombre de nuits (bouton Éditer)
                        pour voir la répartition par personne.
                      </div>
                    )
                  )}
                  <div className="lodge-actions">
                    <a className="btn btn-secondary btn-sm" href={l.url} target="_blank" rel="noreferrer">
                      Voir l&apos;annonce ↗
                    </a>
                    {map && (
                      <a className="btn btn-ghost btn-sm" href={map} target="_blank" rel="noreferrer">
                        Carte ↗
                      </a>
                    )}
                    <span style={{ flex: 1 }} />
                    <VoteButtons
                      yes={l.upCount}
                      no={l.downCount}
                      upPseudos={l.upVoters}
                      downPseudos={l.downVoters}
                      myVote={l.myVote === "UP" ? "yes" : l.myVote === "DOWN" ? "no" : null}
                      onVote={(v) => vote(l.id, v)}
                    />
                  </div>
                  <div className="lodge-foot">
                    <Avatar pseudo={rider} size="sm" />
                    <span className="coord">par {rider}</span>
                    {meId && (
                      <>
                        <span style={{ flex: 1 }} />
                        {l.userId === meId && (
                          <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => openEdit(l)}
                            disabled={pending}
                          >
                            Éditer
                          </button>
                        )}
                        <button
                          className="btn btn-ghost btn-sm"
                          onClick={() => remove(l)}
                          disabled={pending}
                          title="Supprimer ce logement"
                        >
                          ✕
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {(() => {
        const located = sorted.filter((l) => l.lat != null && l.lng != null);
        const hasRoutes = Object.values(winnerRoutesByDay).some((arr) => arr.length > 0);
        if (located.length === 0 && !hasRoutes) return null;
        return (
          <div style={{ marginTop: 24 }}>
            <div
              className="eyebrow"
              style={{ marginBottom: 10, display: "flex", alignItems: "center", gap: 14 }}
            >
              <span>EMPLACEMENTS</span>
              <span style={{ flex: 1, height: 1, background: "var(--ink-faint)" }} />
              <span>
                {located.length}/{sorted.length} GÉOLOCALISÉS
                {hasRoutes && " · TRACÉS EN TÊTE AFFICHÉS"}
              </span>
            </div>
            <div className="lodge-map-wrap">
              <LeafletMap
                routesByDay={winnerRoutesByDay}
                highlightDay={null}
                lodgingPins={located.map((l) => ({
                  id: l.id,
                  lat: l.lat!,
                  lng: l.lng!,
                  name: l.title ?? hostnameOf(l.url),
                  priceEur: l.priceEur,
                  hostname: hostnameOf(l.url),
                  url: l.url,
                }))}
              />
            </div>
            {located.length < sorted.length && (
              <div className="coord" style={{ marginTop: 8, color: "var(--ink-mute)" }}>
                💡 Pour qu&apos;un logement apparaisse sur la carte, renseigne son adresse
                (bouton Éditer) — on géocode automatiquement.
              </div>
            )}
          </div>
        );
      })()}

      {showForm && (
        <div className="modal-bg" onClick={() => !pending && setShowForm(false)}>
          <div className="modal card plated" onClick={(e) => e.stopPropagation()}>
            <span className="corners" />
            <div className="eyebrow" style={{ marginBottom: 6 }}>
              {editId ? "ÉDITER LE LOGEMENT" : "NOUVEAU LOGEMENT"}
            </div>
            <h3 style={{ fontSize: 22, marginBottom: 18 }}>
              {editId ? "Mets à jour les infos" : "Colle un lien"}
            </h3>
            <label className="field">
              <span className="lbl">URL (Airbnb, Booking, hôtel, gîte…)</span>
              <input
                className="input"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.airbnb.com/rooms/..."
                disabled={pending || !!editId}
                autoFocus={!editId}
              />
            </label>
            {isAirbnbUrl(url) && (
              <div
                className="coord"
                style={{
                  marginTop: 8,
                  padding: "8px 10px",
                  border: "1px dashed var(--accent-line)",
                  color: "var(--ink-dim)",
                  borderRadius: 2,
                }}
              >
                💡 Airbnb cache le prix aux bots — pense à le saisir manuellement ci-dessous.
              </div>
            )}
            <div className="dual" style={{ marginTop: 12 }}>
              <label className="field">
                <span className="lbl">Prix total (€, optionnel)</span>
                <input className="input" type="number" step=".01" value={price} onChange={(e) => setPrice(e.target.value)} disabled={pending} />
              </label>
              <label className="field">
                <span className="lbl">Nuits (optionnel)</span>
                <input className="input" type="number" value={nights} onChange={(e) => setNights(e.target.value)} disabled={pending} />
              </label>
            </div>
            <label className="field" style={{ marginTop: 12 }}>
              <span className="lbl">Adresse / ville (optionnel — pour ouvrir dans Maps)</span>
              <input
                className="input"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Bourg-Saint-Maurice, France"
                disabled={pending}
              />
            </label>
            {err && (
              <div className="coord" style={{ color: "var(--no)", marginTop: 8 }}>{err}</div>
            )}
            <div className="dash-rule" />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button className="btn btn-ghost" onClick={() => setShowForm(false)} disabled={pending}>
                Annuler
              </button>
              <button
                className="btn btn-primary"
                onClick={submit}
                disabled={pending || (!editId && !url.trim())}
              >
                {pending ? "…" : editId ? "Enregistrer" : "Ajouter"}
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
        .lodge-grid {
          display: grid;
          gap: var(--gap);
          grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
        }
        .lodge-card { padding: 0; overflow: hidden; }
        .lodge-img {
          width: 100%; height: 200px;
          object-fit: cover;
          background: #0d0a06;
          display: block;
        }
        .lodge-img.placeholder {
          display: flex; align-items: center; justify-content: center;
          background: repeating-linear-gradient(45deg, rgba(240,168,48,.025) 0 12px, transparent 12px 24px), #0d0a06;
          border-bottom: 1px dashed var(--ink-faint);
        }
        .lodge-body { padding: 16px 18px 14px; display: flex; flex-direction: column; gap: 8px; }
        .lodge-host { font-size: 10px; letter-spacing: .14em; text-transform: uppercase; }
        .lodge-title {
          font-family: var(--f-title); font-size: 20px; line-height: 1.2;
          word-break: break-word;
        }
        .lodge-desc {
          font-size: 13px; color: var(--ink-dim); line-height: 1.5;
          margin: 0;
        }
        .lodge-meta {
          display: flex; gap: 14px; flex-wrap: wrap;
          align-items: center; margin-top: 4px;
        }
        .lodge-price b { font-size: 22px; color: var(--accent); }
        .lodge-addr { font-size: 12px; }
        .lodge-actions {
          display: flex; gap: 8px; align-items: center; flex-wrap: wrap;
          margin-top: 6px;
        }
        .lodge-foot {
          display: flex; align-items: center; gap: 8px;
          padding-top: 10px;
          border-top: 1px dashed var(--ink-faint);
          margin-top: 6px;
        }
        .dual { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

        .split-wrap {
          margin-top: 2px;
          border: 1px dashed var(--ink-faint);
          border-radius: 2px;
          padding: 8px 10px 10px;
          background: rgba(255,255,255,.015);
        }
        .split-title {
          font-size: 9px;
          letter-spacing: .14em;
          margin-bottom: 6px;
        }
        .split-scroll { overflow-x: auto; margin: 0 -2px; }
        .split-table {
          width: 100%;
          border-collapse: collapse;
          font-family: var(--f-mono);
          font-size: 11px;
        }
        .split-table th, .split-table td {
          padding: 4px 6px;
          text-align: center;
          color: var(--ink-dim);
          white-space: nowrap;
          border-bottom: 1px solid var(--ink-faint);
        }
        .split-table thead th { color: var(--ink-mute); font-weight: 600; font-size: 10px; letter-spacing: .08em; }
        .split-table tbody tr:last-child td { border-bottom: none; }
        .split-table td:first-child, .split-table th:first-child {
          text-align: left;
          color: var(--ink-mute);
        }
        .split-table td:not(:first-child) {
          color: var(--ink);
          font-weight: 600;
          font-variant-numeric: tabular-nums;
        }
        .split-table .is-now {
          background: rgba(240,168,48,.10);
          color: var(--accent);
          border-bottom-color: var(--accent-line);
        }
        .split-table thead th.is-now {
          color: var(--accent);
        }

        .lodge-map-wrap {
          width: 100%;
          height: 480px;
          border: 1px solid var(--kraft);
          border-radius: var(--radius);
          overflow: hidden;
          background: #0d0a06;
        }
        @media (max-width: 720px) {
          .lodge-map-wrap { height: 360px; }
        }

        .split-hint {
          font-size: 11px;
          padding: 8px 10px;
          border: 1px dashed var(--accent-line);
          border-radius: 2px;
          color: var(--ink-dim);
          margin-top: 2px;
        }
      `}</style>
    </div>
  );
}
