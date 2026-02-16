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
    const { sk, sid, url, path, title, ref, sw, sh } = body;
    if (!sk || !sid || !url) {
      return NextResponse.json({ error: "missing fields" }, { status: 400, headers: CORS });
    }

    // Validate site key
    const site = await prisma.heatmapSite.findUnique({ where: { siteKey: sk } });
    if (!site || !site.isActive) {
      return NextResponse.json({ error: "invalid site key" }, { status: 403, headers: CORS });
    }

    const pv = await prisma.trackingPageview.create({
      data: {
        siteId: site.id,
        sessionId: sid,
        url: String(url).slice(0, 2000),
        path: String(path || "/").slice(0, 500),
        title: title ? String(title).slice(0, 500) : null,
        referrer: ref ? String(ref).slice(0, 2000) : null,
        userAgent: req.headers.get("user-agent")?.slice(0, 500) || null,
        screenW: typeof sw === "number" ? sw : null,
        screenH: typeof sh === "number" ? sh : null,
      },
    });

    return NextResponse.json({ id: pv.id }, { headers: CORS });
  } catch (e) {
    console.error("tracking/pv error:", e);
    return NextResponse.json({ error: "server error" }, { status: 500, headers: CORS });
  }
}
