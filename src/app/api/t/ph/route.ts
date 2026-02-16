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
    const { pvId, h } = body;
    if (!pvId || typeof h !== "number") {
      return NextResponse.json({ error: "missing fields" }, { status: 400, headers: CORS });
    }

    await prisma.trackingPageview.update({
      where: { id: pvId },
      data: { pageHeight: h },
    });

    return NextResponse.json({ ok: true }, { headers: CORS });
  } catch (e) {
    console.error("tracking/ph error:", e);
    return NextResponse.json({ error: "server error" }, { status: 500, headers: CORS });
  }
}
