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
    const { pvId, d, dw } = body;
    if (!pvId || typeof d !== "number") {
      return NextResponse.json({ error: "missing fields" }, { status: 400, headers: CORS });
    }

    // Upsert: keep only the maximum scroll depth per pageview
    const existing = await prisma.trackingScroll.findFirst({
      where: { pageviewId: pvId },
      orderBy: { maxDepth: "desc" },
    });

    if (existing) {
      if (d > existing.maxDepth || (dw && dw > existing.dwellMs)) {
        await prisma.trackingScroll.update({
          where: { id: existing.id },
          data: {
            maxDepth: Math.max(d, existing.maxDepth),
            dwellMs: Math.max(dw || 0, existing.dwellMs),
          },
        });
      }
    } else {
      await prisma.trackingScroll.create({
        data: {
          pageviewId: pvId,
          maxDepth: Math.min(d, 100),
          dwellMs: typeof dw === "number" ? dw : 0,
        },
      });
    }

    return NextResponse.json({ ok: true }, { headers: CORS });
  } catch (e) {
    console.error("tracking/scroll error:", e);
    return NextResponse.json({ error: "server error" }, { status: 500, headers: CORS });
  }
}
