"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Avatar } from "@/components/avatar";
import { VoteButtons, type Vote } from "@/components/vote-buttons";
import {
  proposeLodgingAction,
  voteLodgingAction,
  deleteLodgingAction,
} from "@/app/actions/lodgings";

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

export function LodgingView({
  meId,
  userById,
  lodgings,
}: {
  meId: string | null;
  userById: Record<string, string>;
  lodgings: LodgingLite[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showAdd, setShowAdd] = useState(false);
  const [url, setUrl] = useState("");
  const [price, setPrice] = useState<string>("");
  const [nights, setNights] = useState<string>("");
  const [address, setAddress] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const sorted = [...lodgings].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return new Date(b.createdAtISO).getTime() - new Date(a.createdAtISO).getTime();
  });

  const submit = () => {
    if (!meId) { router.push("/"); return; }
    setErr(null);
    startTransition(async () => {
      const res = await proposeLodgingAction({
        url: url.trim(),
        priceEur: price ? +price : null,
        nightCount: nights ? +nights : null,
        addressText: address.trim() || null,
      });
      if (!res.ok) { setErr(res.error); return; }
      setShowAdd(false);
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

  const remove = (id: string) => {
    if (!confirm("Supprimer ce logement ?")) return;
    startTransition(async () => {
      const res = await deleteLodgingAction(id);
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
          <button className="btn btn-primary btn-sm" onClick={() => meId ? setShowAdd(true) : router.push("/")}>
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
          <button className="btn btn-primary" onClick={() => meId ? setShowAdd(true) : router.push("/")}>
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
                      myVote={l.myVote === "UP" ? "yes" : l.myVote === "DOWN" ? "no" : null}
                      onVote={(v) => vote(l.id, v)}
                    />
                  </div>
                  <div className="lodge-foot">
                    <Avatar pseudo={rider} size="sm" />
                    <span className="coord">par {rider}</span>
                    {l.userId === meId && (
                      <>
                        <span style={{ flex: 1 }} />
                        <button className="btn btn-ghost btn-sm" onClick={() => remove(l.id)} disabled={pending}>
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

      {showAdd && (
        <div className="modal-bg" onClick={() => !pending && setShowAdd(false)}>
          <div className="modal card plated" onClick={(e) => e.stopPropagation()}>
            <span className="corners" />
            <div className="eyebrow" style={{ marginBottom: 6 }}>NOUVEAU LOGEMENT</div>
            <h3 style={{ fontSize: 22, marginBottom: 18 }}>Colle un lien</h3>
            <label className="field">
              <span className="lbl">URL (Airbnb, Booking, hôtel, gîte…)</span>
              <input
                className="input"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.airbnb.com/rooms/..."
                disabled={pending}
                autoFocus
              />
            </label>
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
              <button className="btn btn-ghost" onClick={() => setShowAdd(false)} disabled={pending}>
                Annuler
              </button>
              <button className="btn btn-primary" onClick={submit} disabled={pending || !url.trim()}>
                {pending ? "…" : "Ajouter"}
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
      `}</style>
    </div>
  );
}
