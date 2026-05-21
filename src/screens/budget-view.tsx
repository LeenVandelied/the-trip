"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Stamp } from "@/components/stamp";
import {
  updateMyMotoAction,
  addExpenseAction,
  deleteExpenseAction,
} from "@/app/actions/budget";

type Expense = { id: string; label: string; amountEur: number; perPerson: boolean };

export function BudgetView({
  me,
  defaults,
  totalKm,
  tripDays,
  headcount,
  expenses,
}: {
  me: { id: string; motoModel: string; conso: number; fuelPrice: number } | null;
  defaults: { conso: number; fuelPrice: number };
  totalKm: number;
  tripDays: number;
  headcount: number;
  expenses: Expense[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [moto, setMoto] = useState(me?.motoModel ?? "");
  const [conso, setConso] = useState(me?.conso ?? defaults.conso);
  const [fuelPrice, setFuelPrice] = useState(me?.fuelPrice ?? defaults.fuelPrice);
  const [savedFlash, setSavedFlash] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [newLabel, setNewLabel] = useState("");
  const [newAmount, setNewAmount] = useState<number>(0);
  const [newPerPerson, setNewPerPerson] = useState(true);

  const saveMoto = () => {
    if (!me) {
      router.push("/");
      return;
    }
    setErr(null);
    startTransition(async () => {
      const res = await updateMyMotoAction(moto, conso, fuelPrice);
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1500);
      router.refresh();
    });
  };

  const addExpense = () => {
    if (!me) {
      router.push("/");
      return;
    }
    setErr(null);
    startTransition(async () => {
      const res = await addExpenseAction(newLabel, newAmount, newPerPerson);
      if (!res.ok) {
        setErr(res.error);
        return;
      }
      setNewLabel("");
      setNewAmount(0);
      router.refresh();
    });
  };

  const removeExpense = (id: string) => {
    startTransition(async () => {
      await deleteExpenseAction(id);
      router.refresh();
    });
  };

  // Compute per-person cost from current form values (live preview).
  const fuel = Math.round(totalKm * (conso / 100) * fuelPrice);
  const sharedTotal = expenses
    .filter((e) => !e.perPerson)
    .reduce((acc, e) => acc + e.amountEur, 0);
  const perPersonAlready = expenses
    .filter((e) => e.perPerson)
    .reduce((acc, e) => acc + e.amountEur, 0);
  const sharedPerHead = sharedTotal / headcount;
  const total = Math.round(fuel + sharedPerHead + perPersonAlready);

  const segs = [
    { k: "Carburant", v: fuel, c: "#f0a830" },
    { k: "Partagé", v: Math.round(sharedPerHead), c: "#d96b3a" },
    { k: "Perso", v: Math.round(perPersonAlready), c: "#7fb069" },
  ].filter((s) => s.v > 0);

  return (
    <div className="page">
      <div className="page-header">
        <div className="ttl">
          <div className="eyebrow" style={{ marginBottom: 12 }}>05 · BUDGET</div>
          <h1>Combien on pose ?</h1>
        </div>
        <div className="meta">
          KM TOTAUX (GPX EN TÊTE)
          <br />
          <span className="mono" style={{ color: "var(--ink)", fontSize: 16 }}>
            {Math.round(totalKm).toLocaleString("fr-FR")}&nbsp;km
          </span>
          <br />
          {tripDays} JOURS · {headcount} MOTO{headcount > 1 ? "S" : ""}
        </div>
      </div>

      {err && (
        <div className="coord" style={{ color: "var(--no)", marginBottom: 16 }}>
          {err}
        </div>
      )}

      <div className="budget-grid">
        <div className="card plated budget-col">
          <span className="corners" />
          <div className="eyebrow">A · MES PARAMÈTRES</div>
          <h3 style={{ fontSize: 20, marginTop: 8 }}>Ma moto, mon style</h3>
          <div className="dash-rule" />
          <label className="field">
            <span className="lbl">Modèle</span>
            <input
              className="input"
              value={moto}
              onChange={(e) => setMoto(e.target.value)}
              placeholder={me ? "Yamaha MT-09…" : "Embarque d'abord (/) — pseudo requis"}
              disabled={!me || pending}
            />
          </label>
          <div className="dual">
            <label className="field">
              <span className="lbl">Consommation</span>
              <div style={{ position: "relative" }}>
                <input
                  className="input"
                  type="number"
                  step=".1"
                  value={conso}
                  onChange={(e) => setConso(+e.target.value || 0)}
                  disabled={!me || pending}
                />
                <span className="suffix">L/100</span>
              </div>
            </label>
            <label className="field">
              <span className="lbl">Prix essence</span>
              <div style={{ position: "relative" }}>
                <input
                  className="input"
                  type="number"
                  step=".01"
                  value={fuelPrice}
                  onChange={(e) => setFuelPrice(+e.target.value || 0)}
                  disabled={!me || pending}
                />
                <span className="suffix">€/L</span>
              </div>
            </label>
          </div>
          <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 10 }}>
            {savedFlash && <span className="coord" style={{ color: "var(--yes)" }}>✓ enregistré</span>}
            <button className="btn btn-secondary btn-sm" onClick={saveMoto} disabled={!me || pending}>
              {pending ? "…" : "Enregistrer"}
            </button>
          </div>
        </div>

        <div className="card plated budget-col">
          <span className="corners" />
          <div className="eyebrow">B · DÉPENSES PARTAGÉES</div>
          <h3 style={{ fontSize: 20, marginTop: 8 }}>Les frais communs</h3>
          <div className="dash-rule" />

          {expenses.length === 0 ? (
            <div className="coord" style={{ padding: "12px 0", color: "var(--ink-mute)" }}>
              Aucune dépense renseignée.
            </div>
          ) : (
            <ul className="exp-list">
              {expenses.map((e) => (
                <li key={e.id} className="exp-item">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600 }}>{e.label}</div>
                    <div className="coord">
                      {e.amountEur.toFixed(2)} € · {e.perPerson ? "par personne" : "à diviser"}
                    </div>
                  </div>
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => removeExpense(e.id)}
                    disabled={pending}
                    title="Supprimer"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="dash-rule" />
          <div className="exp-add">
            <input
              className="input"
              placeholder="Libellé (péage, gîte J3, …)"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              disabled={!me || pending}
            />
            <input
              className="input"
              type="number"
              step=".01"
              placeholder="€"
              value={newAmount || ""}
              onChange={(e) => setNewAmount(+e.target.value || 0)}
              disabled={!me || pending}
              style={{ maxWidth: 120 }}
            />
            <label className="exp-toggle">
              <input
                type="checkbox"
                checked={newPerPerson}
                onChange={(e) => setNewPerPerson(e.target.checked)}
                disabled={!me || pending}
              />
              <span>par personne</span>
            </label>
            <button
              className="btn btn-primary btn-sm"
              onClick={addExpense}
              disabled={!me || pending || !newLabel.trim() || newAmount <= 0}
            >
              ＋
            </button>
          </div>
        </div>
      </div>

      <div className="card kraft budget-result">
        <div className="result-head">
          <div>
            <div className="eyebrow">RÉSULTAT PAR TÊTE</div>
            <div className="big-amount">
              <span className="amount-prefix">≈</span>
              <span className="amount-n">{total}</span>
              <span className="amount-cur">€</span>
            </div>
            <div className="coord" style={{ marginTop: 4 }}>
              par personne · {tripDays} jours · {Math.round(totalKm)} km
            </div>
          </div>
          {total > 0 && (
            <Stamp angle={-4} color="var(--accent)">
              Approuvé
            </Stamp>
          )}
        </div>

        <div className="dash-rule" />
        <div className="eyebrow" style={{ marginBottom: 12 }}>BREAKDOWN</div>

        {segs.length === 0 ? (
          <div className="coord">Aucune donnée — propose un GPX ou ajoute des dépenses.</div>
        ) : (
          <>
            <div className="stack-bar">
              {segs.map((s) => (
                <div key={s.k} className="seg" style={{ flex: s.v, background: s.c }}>
                  <span className="seg-label">{s.k}</span>
                </div>
              ))}
            </div>
            <div className="legend-rows">
              {segs.map((s) => (
                <div key={s.k} className="lr">
                  <span className="lr-swatch" style={{ background: s.c }} />
                  <span style={{ flex: 1 }}>{s.k}</span>
                  <span className="mono" style={{ color: "var(--ink-dim)" }}>
                    {total ? Math.round((s.v / total) * 100) : 0}%
                  </span>
                  <span className="mono" style={{ minWidth: 60, textAlign: "right", fontWeight: 600 }}>
                    {s.v}€
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="dash-rule" />
        <p className="note coord">
          NOTE · Carburant = km (GPX en tête) × conso/100 × prix essence (tes paramètres).
          Partagé = somme des dépenses non-perso / nb motards.
        </p>
      </div>

      <style>{`
        .budget-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--gap);
          margin-bottom: 28px;
        }
        @media (max-width: 760px) { .budget-grid { grid-template-columns: 1fr; } }
        .budget-col .field { margin-top: 14px; }
        .dual { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .suffix {
          position: absolute; right: 12px; top: 50%;
          transform: translateY(-50%);
          font-family: var(--f-mono); font-size: 11px;
          color: var(--ink-mute);
          pointer-events: none;
        }
        .exp-list { list-style: none; padding: 0; margin: 0; display: grid; gap: 8px; }
        .exp-item {
          display: flex; gap: 10px; align-items: center;
          padding: 8px 0;
          border-bottom: 1px dashed var(--ink-faint);
        }
        .exp-item:last-child { border-bottom: none; }
        .exp-add {
          display: flex; gap: 8px; align-items: center; flex-wrap: wrap;
          margin-top: 12px;
        }
        .exp-toggle {
          display: inline-flex; align-items: center; gap: 6px;
          font-family: var(--f-mono); font-size: 11px;
          color: var(--ink-dim);
        }

        .budget-result { padding: 28px; }
        .result-head {
          display: flex; align-items: flex-start; justify-content: space-between;
          gap: 16px;
        }
        .big-amount {
          font-family: var(--f-title);
          font-weight: 700;
          line-height: 1;
          display: flex; align-items: flex-start;
          margin-top: 8px;
        }
        .amount-prefix { font-size: 32px; color: var(--ink-mute); margin-right: 4px; }
        .amount-n { font-size: clamp(64px, 9vw, 128px); color: var(--accent); letter-spacing: -.03em; }
        .amount-cur { font-size: 36px; color: var(--accent); margin-left: 6px; align-self: flex-end; margin-bottom: 14px; }

        .stack-bar {
          display: flex;
          height: 28px;
          border-radius: 2px;
          overflow: hidden;
          border: 1px solid var(--kraft);
          margin-bottom: 14px;
        }
        .stack-bar .seg {
          position: relative;
          display: flex; align-items: center;
          padding: 0 10px;
          font-family: var(--f-mono);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: .12em;
          text-transform: uppercase;
          color: rgba(20,17,12,.85);
          overflow: hidden;
        }
        .stack-bar .seg-label { white-space: nowrap; }
        .legend-rows { display: grid; gap: 10px; }
        .lr {
          display: flex; align-items: center; gap: 12px;
          font-family: var(--f-mono); font-size: 13px;
          padding: 6px 0;
          border-bottom: 1px dashed var(--ink-faint);
        }
        .lr:last-child { border-bottom: none; }
        .lr-swatch { width: 10px; height: 10px; border-radius: 1px; }
        .note { color: var(--ink-mute); margin: 0; }
      `}</style>
    </div>
  );
}
