"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Fragment, useState, useTransition } from "react";
import { Avatar } from "@/components/avatar";
import { setPseudoAction } from "@/app/actions/identity";

const ROUTES = [
  { id: "dates", label: "Dates", path: "/dates" },
  { id: "map", label: "Carte", path: "/map" },
  { id: "routes", label: "Itinéraires", path: "/routes" },
  { id: "lodging", label: "Logement", path: "/lodging" },
  { id: "budget", label: "Budget", path: "/budget" },
  { id: "roadbook", label: "Roadbook", path: "/roadbook" },
] as const;

export function TopNav({ pseudo }: { pseudo: string | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const [navOpen, setNavOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(pseudo ?? "");
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const openEdit = () => {
    setDraft(pseudo ?? "");
    setErr(null);
    setEditing(true);
  };
  const commit = () => {
    const value = draft.trim();
    if (!value) return;
    setErr(null);
    startTransition(async () => {
      const res = await setPseudoAction(value);
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      setEditing(false);
      router.refresh();
    });
  };

  return (
    <>
      <header className="topnav">
        <div className="topnav-inner">
          <Link className="brand" href="/" onClick={() => setNavOpen(false)}>
            <span className="mark">▲</span>
            <span>THE&nbsp;TRIP</span>
            <span
              className="coord"
              style={{ marginLeft: 12, fontSize: 10, color: "var(--ink-mute)", letterSpacing: ".16em" }}
            >
              ÉD.&nbsp;2026.07
            </span>
          </Link>
          <nav className={"nav-links " + (navOpen ? "open" : "")}>
            {ROUTES.map((r, i) => (
              <Fragment key={r.id}>
                {i > 0 && <span className="nav-sep" aria-hidden="true">·</span>}
                <Link
                  href={r.path}
                  className={pathname === r.path ? "active" : ""}
                  onClick={() => setNavOpen(false)}
                >
                  {r.label}
                </Link>
              </Fragment>
            ))}
          </nav>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {pseudo ? (
              <button className="pseudo-pill" onClick={openEdit} title="Changer mon pseudo">
                <span className="pp-name">{pseudo}</span>
                <Avatar pseudo={pseudo} size="sm" />
              </button>
            ) : (
              <Link className="pseudo-pill" href="/" title="Embarquer">
                <span className="pp-name">Embarquer</span>
                <span className="avatar sm" style={{ background: "var(--kraft)", color: "var(--ink-dim)" }}>?</span>
              </Link>
            )}
            <button
              className="hamburger"
              onClick={() => setNavOpen((o) => !o)}
              aria-label="Menu"
            >
              ☰
            </button>
          </div>
        </div>
      </header>

      {editing && (
        <div className="modal-bg" onClick={() => !pending && setEditing(false)}>
          <div className="modal card plated" onClick={(e) => e.stopPropagation()}>
            <span className="corners" />
            <div className="eyebrow" style={{ marginBottom: 6 }}>IDENTITÉ</div>
            <h3 style={{ fontSize: 22, marginBottom: 18 }}>Change ton pseudo</h3>
            <input
              className="input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") commit();
              }}
              autoFocus
              disabled={pending}
            />
            {err && (
              <div className="coord" style={{ color: "var(--no)", marginTop: 8 }}>
                {err}
              </div>
            )}
            <div className="dash-rule" />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button className="btn btn-ghost" onClick={() => setEditing(false)} disabled={pending}>
                Annuler
              </button>
              <button className="btn btn-primary" onClick={commit} disabled={pending || !draft.trim()}>
                {pending ? "…" : "OK"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
