import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pvId, d, dw, zones } = body;
    if (!pvId || typeof d !== "number") {
      return NextResponse.json({ error: "missing fields" }, { status: 400, headers: CORS });
    }

    // Validate zones if provided: must be array of 10 numbers
    let zonesJson: string | undefined;
    if (Array.isArray(zones) && zones.length === 10) {
      zonesJson = JSON.stringify(zones.map((v: unknown) => (typeof v === "number" ? Math.round(v) : 0)));
    }

    // Upsert: keep only the maximum scroll depth per pageview
    const existing = await prisma.trackingScroll.findFirst({
      where: { pageviewId: pvId },
      orderBy: { maxDepth: "desc" },
    });

    if (existing) {
      if (d > existing.maxDepth || (dw && dw > existing.dwellMs) || zonesJson) {
        // Merge zones: take element-wise max
        let mergedZones = zonesJson;
        if (zonesJson && existing.zones) {
          try {
            const oldZones = JSON.parse(existing.zones) as number[];
            const newZones = JSON.parse(zonesJson) as number[];
            mergedZones = JSON.stringify(oldZones.map((v, i) => Math.max(v, newZones[i] || 0)));
          } catch { /* use new zones */ }
        }
        await prisma.trackingScroll.update({
          where: { id: existing.id },
          data: {
            maxDepth: Math.min(Math.max(d, existing.maxDepth), 100),
            dwellMs: Math.max(dw || 0, existing.dwellMs),
            ...(mergedZones ? { zones: mergedZones } : {}),
          },
        });
      }
    } else {
      await prisma.trackingScroll.create({
        data: {
          pageviewId: pvId,
          maxDepth: Math.min(d, 100),
          dwellMs: typeof dw === "number" ? dw : 0,
          ...(zonesJson ? { zones: zonesJson } : {}),
        },
      });
    }

    return NextResponse.json({ ok: true }, { headers: CORS });
  } catch (e) {
    console.error("tracking/scroll error:", e);
    return NextResponse.json({ error: "server error" }, { status: 500, headers: CORS });
  }
}
