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

interface ClickPayload {
  pvId: string;
  x: number;
  y: number;
  sel?: string;
  text?: string;
  href?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const clicks: ClickPayload[] = body.clicks;
    if (!Array.isArray(clicks) || clicks.length === 0) {
      return NextResponse.json({ error: "no clicks" }, { status: 400, headers: CORS });
    }

    // Batch insert (max 50 per request)
    const data = clicks.slice(0, 50).map((c) => ({
      pageviewId: c.pvId,
      x: typeof c.x === "number" ? c.x : 0,
      y: typeof c.y === "number" ? c.y : 0,
      selector: c.sel ? String(c.sel).slice(0, 200) : null,
      text: c.text ? String(c.text).slice(0, 100) : null,
      href: c.href ? String(c.href).slice(0, 500) : null,
    }));

    await prisma.trackingClick.createMany({ data });

    return NextResponse.json({ ok: true, count: data.length }, { headers: CORS });
  } catch (e) {
    console.error("tracking/click error:", e);
    return NextResponse.json({ error: "server error" }, { status: 500, headers: CORS });
  }
}
