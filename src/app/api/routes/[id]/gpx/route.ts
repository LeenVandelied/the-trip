import { prisma } from "@/lib/prisma";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, ctx: RouteContext<"/api/routes/[id]/gpx">) {
  const { id } = await ctx.params;
  const route = await prisma.route.findUnique({
    where: { id },
    select: { name: true, gpxContent: true, dayNumber: true },
  });
  if (!route) {
    return new Response("Not found", { status: 404 });
  }
  const safeName = route.name.replace(/[^\w\-]+/g, "_").replace(/^_+|_+$/g, "") || "trace";
  const filename = `J${route.dayNumber}-${safeName}.gpx`;
  return new Response(route.gpxContent, {
    status: 200,
    headers: {
      "Content-Type": "application/gpx+xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
