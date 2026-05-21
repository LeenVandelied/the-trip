# The Trip

Mini-site privé pour organiser un roadtrip moto de 7 jours entre potes.

## Stack cible
- Next.js 15 (App Router) + TypeScript strict
- Tailwind v4 + shadcn/ui
- Neon Postgres (free) + Prisma OU Drizzle
- react-leaflet + leaflet-gpx OU @we-gold/gpxjs
- Server Actions (pas d'API routes)
- Déploiement Vercel Hobby (free)

## Décisions produit
- **Single trip** (1 deploy = 1 roadtrip, slug en env)
- **Pas d'auth** : pseudo libre, pas de PIN, pas d'anti-doublon
- **Vote** : 👍 / 👎 uniquement
- **GPX rattaché à un jour** (J1 → J7), pas de vote global
- **Public** : sportives / roadsters / trails — trip **route** (asphalte/cols, pas off-road)
- **Carburant via GPX** : somme Haversine des points × conso × prix essence
- **Météo** : Open-Meteo (free, no key) sur les dates favorites
- **Export iCal** sur /roadbook quand dates retenues

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

## Workflow
1. Brainstorm (fait — voir `brief.md`)
2. UI via Claude Design (prompt dans `claude-design-prompt.md`)
3. Code en local (Claude Code reprend ce repo)
4. Deploy Vercel + Neon
