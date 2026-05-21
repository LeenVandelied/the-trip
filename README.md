# The Trip

Mini-site pour organiser un roadtrip moto de 7 jours entre potes — accès par lien direct, pseudo libre, pas d'auth.

## Stack cible
- Next.js 15 (App Router) + TypeScript strict
- Tailwind v4 + shadcn/ui
- Neon Postgres (free) + **Prisma**
- **react-leaflet + leaflet-gpx** pour l'affichage carte
- **@we-gold/gpxjs** côté client pour parser (distance / D+ / durée à l'upload)
- Server Actions (pas d'API routes)
- `/roadbook` printable via CSS print uniquement (pas de lib PDF)
- Déploiement Vercel Hobby (free)

## Variables d'environnement
- `DATABASE_URL` — Neon
- `TRIP_NAME` — affiché dans le hero / nav
- `TRIP_SLUG` — identifie le deploy (single-trip)

## Décisions produit
- **Single trip** (1 deploy = 1 roadtrip, `TRIP_SLUG` en env)
- **Pas d'auth** : pseudo libre stocké en **localStorage**, pas de PIN, pas d'anti-doublon (on assume l'honnêteté du groupe). La pastille pseudo permet juste de changer son pseudo localement.
- **Vote** : 👍 / 👎 uniquement, score = `UP − DOWN`. Vote **indicatif**, pas de mécanisme de lock / freeze.
- **GPX rattaché à un jour** (J1 → J7), pas de vote global
- **GPX stocké en colonne `text` Postgres** (pas de blob storage)
- **Public** : sportives / roadsters / trails — trip **route** (asphalte/cols, pas off-road)
- **Carburant via GPX** : `Σ haversine(points) × conso/100 × prix` — conso et prix saisis par chaque user dans ses paramètres perso (pas de prix hardcodé, pas d'API tierce)
- **Météo** : Open-Meteo (free, no key) sur les dates favorites, lat/lng = **moyenne des lieux votés 👍**
- **Export iCal** sur /roadbook quand dates retenues
- **Données mobiles-first** (vote depuis le tel à l'apéro)

## Écrans
1. `/` — Landing + saisie pseudo
2. `/dates` — Sondage plages + heatmap dispos
3. `/map` — Carte plein écran + lieux + GPX par jour
4. `/routes` — 7 sections J1→J7 + GPX proposés + votes
5. `/budget` — Simulateur frais (km auto via GPX gagnants)
6. `/roadbook` — Vue printable + export .ics

## Modèle de données (draft Prisma)
```
User(id, name, motoModel?, motoConsumption_L100?, createdAt)
DateProposal(id, startDate, endDate)
Availability(userId, dateProposalId, status: YES|MAYBE|NO)
Place(id, userId, lat, lng, name, description?)
PlaceVote(userId, placeId, value: UP|DOWN)
Route(id, userId, dayNumber 1..7, name, gpxContent, distanceKm, elevationM)
RouteVote(userId, routeId, value: UP|DOWN)
Expense(id, label, amountEur, perPerson: bool)
```

## À NE PAS faire
- Pas de websockets / temps réel
- Pas d'upload photos
- Pas de notifications
- Pas de multi-trip
- Pas de pagination

## Décisions tranchées (anciennement "points ouverts")
- **Plage gagnante** : `max(YES count)`, tie-break par `YES + 0.5*MAYBE`, puis `createdAt asc`. Cf. `src/lib/winners.ts:dateProposalWinner`.
- **Tie-break GPX** : score `(UP − DOWN)` desc, puis `createdAt asc`. Cf. `src/lib/winners.ts:routeWinner`.
- **Limite upload GPX** : 2 MB (`MAX_GPX_BYTES` dans `src/lib/constants.ts`).
- **Tuiles carte** : CartoDB Dark Matter (matche la vibe kraft sombre). Cf. `src/components/leaflet-map.tsx`.
- **VEVENT iCal** : `SUMMARY="J{n} · {km}km — {route.name}"`, `LOCATION=lat,lng` (fin de tracé), `DESCRIPTION=name + km/D+ + météo + POI`. Cf. `src/app/actions/ical.ts`.
- **Défauts conso/prix** : 5.5 L/100, 1.92 €/L (`DEFAULT_CONSO_L100`, `DEFAULT_FUEL_PRICE` dans `src/lib/constants.ts`).

## Stack effective (réalité ≠ brief)
- Next.js **16** (le brief disait 15 — `create-next-app@latest` installe 16, rétro-compatible sur nos usages)
- Tailwind v4 ✓ — mais le visuel kraft/ambre est principalement dans `src/app/globals.css` (custom CSS) + styles inline par écran
- Prisma **v6** (la v7 a une nouvelle API config externe, on s'en passe)
- Carte : `react-leaflet` + parsing GPX via `@we-gold/gpxjs` → `<Polyline>` (pas de `leaflet-gpx`)
- Identité : cookie httpOnly `tt_user` stockant `user.id` (pas de localStorage)

## Workflow
1. Brainstorm (fait — voir ce README)
2. UI via Claude Design (prompt dans `claude-design-prompt.md`)
3. Code en local (Claude Code reprend ce repo) — **en cours**
4. Deploy Vercel + Neon
