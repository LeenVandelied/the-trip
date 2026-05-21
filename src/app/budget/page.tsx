import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/current-user";
import { routeWinner, winningPricedLodging } from "@/lib/winners";
import { BudgetView } from "@/screens/budget-view";
import { DEFAULT_CONSO_L100, DEFAULT_FUEL_PRICE, TRIP_DAYS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function BudgetPage() {
  const [me, routes, expenses, users, lodgings] = await Promise.all([
    getCurrentUser(),
    prisma.route.findMany({ include: { votes: true } }),
    prisma.expense.findMany({ orderBy: { createdAt: "asc" } }),
    prisma.user.findMany(),
    prisma.lodging.findMany({ include: { votes: true } }),
  ]);

  // Sum the winning distance per day.
  const byDay = new Map<number, typeof routes>();
  for (const r of routes) {
    const arr = byDay.get(r.dayNumber) ?? [];
    arr.push(r);
    byDay.set(r.dayNumber, arr);
  }
  let totalKm = 0;
  for (const arr of byDay.values()) {
    const w = routeWinner(arr);
    if (w) totalKm += w.distanceKm;
  }

  const lodgingWinner = winningPricedLodging(lodgings);

  return (
    <BudgetView
      me={
        me
          ? {
              id: me.id,
              motoModel: me.motoModel ?? "",
              conso: me.motoConsumption_L100 ?? DEFAULT_CONSO_L100,
              fuelPrice: me.fuelPrice ?? DEFAULT_FUEL_PRICE,
            }
          : null
      }
      defaults={{ conso: DEFAULT_CONSO_L100, fuelPrice: DEFAULT_FUEL_PRICE }}
      totalKm={totalKm}
      tripDays={TRIP_DAYS}
      headcount={Math.max(users.length, 1)}
      expenses={expenses.map((e) => ({
        id: e.id,
        label: e.label,
        amountEur: e.amountEur,
        perPerson: e.perPerson,
      }))}
      lodgingWinner={
        lodgingWinner
          ? {
              id: lodgingWinner.id,
              title: lodgingWinner.title,
              priceEur: lodgingWinner.priceEur!,
              nightCount: lodgingWinner.nightCount,
            }
          : null
      }
    />
  );
}
