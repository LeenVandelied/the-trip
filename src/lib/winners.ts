// Pure helpers — no DB access. Take already-fetched rows and compute who "wins".
// Tie-break rules are fixed (see README §"Décisions tranchées").

import type {
  AvailabilityStatus,
  DateProposal,
  Availability,
  Lodging,
  LodgingVote,
  Route,
  RouteVote,
  VoteValue,
} from "@prisma/client";

export type RouteWithVotes = Route & { votes: RouteVote[] };

export function routeScore(r: RouteWithVotes): number {
  let s = 0;
  for (const v of r.votes) s += v.value === ("UP" as VoteValue) ? 1 : -1;
  return s;
}

/** Best route for the day. Tie-break: score desc, then createdAt asc. */
export function routeWinner(routes: RouteWithVotes[]): RouteWithVotes | null {
  if (routes.length === 0) return null;
  return [...routes].sort((a, b) => {
    const ds = routeScore(b) - routeScore(a);
    if (ds !== 0) return ds;
    return a.createdAt.getTime() - b.createdAt.getTime();
  })[0]!;
}

export type DateProposalWithAvail = DateProposal & { availabilities: Availability[] };

/** Yes-count, with tie-break by YES + 0.5*MAYBE, then createdAt asc. */
export function dateProposalWinner(
  proposals: DateProposalWithAvail[],
): DateProposalWithAvail | null {
  if (proposals.length === 0) return null;
  const counted = proposals.map((p) => {
    let yes = 0, maybe = 0;
    for (const a of p.availabilities) {
      if (a.status === ("YES" as AvailabilityStatus)) yes++;
      else if (a.status === ("MAYBE" as AvailabilityStatus)) maybe++;
    }
    return { p, yes, maybe };
  });
  counted.sort((a, b) => {
    if (b.yes !== a.yes) return b.yes - a.yes;
    const wa = a.yes + 0.5 * a.maybe;
    const wb = b.yes + 0.5 * b.maybe;
    if (wb !== wa) return wb - wa;
    return a.p.createdAt.getTime() - b.p.createdAt.getTime();
  });
  return counted[0]!.p;
}

export type LodgingWithVotes = Lodging & { votes: LodgingVote[] };

export function lodgingScore(l: LodgingWithVotes): number {
  let s = 0;
  for (const v of l.votes) s += v.value === ("UP" as VoteValue) ? 1 : -1;
  return s;
}

/** Top-voted lodging with priceEur set. Tie-break: score desc, then createdAt asc. */
export function winningPricedLodging(lodgings: LodgingWithVotes[]): LodgingWithVotes | null {
  const priced = lodgings.filter((l) => l.priceEur != null && l.priceEur >= 0);
  if (priced.length === 0) return null;
  return [...priced].sort((a, b) => {
    const ds = lodgingScore(b) - lodgingScore(a);
    if (ds !== 0) return ds;
    return a.createdAt.getTime() - b.createdAt.getTime();
  })[0]!;
}

export function countByStatus(p: DateProposalWithAvail): { yes: number; maybe: number; no: number } {
  let yes = 0, maybe = 0, no = 0;
  for (const a of p.availabilities) {
    if (a.status === ("YES" as AvailabilityStatus)) yes++;
    else if (a.status === ("MAYBE" as AvailabilityStatus)) maybe++;
    else no++;
  }
  return { yes, maybe, no };
}
