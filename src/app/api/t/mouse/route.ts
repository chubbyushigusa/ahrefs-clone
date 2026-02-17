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

interface MovePayload {
  t: number;
  x: number;
  y: number;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { pvId, moves } = body;

    if (!pvId || !Array.isArray(moves) || moves.length === 0) {
      return NextResponse.json(
        { error: "missing pvId or moves" },
        { status: 400, headers: CORS }
      );
    }

    // Validate and sanitize moves (max 500 per request)
    const sanitizedMoves: MovePayload[] = moves.slice(0, 500).map((m: MovePayload) => ({
      t: typeof m.t === "number" ? m.t : 0,
      x: typeof m.x === "number" ? m.x : 0,
      y: typeof m.y === "number" ? m.y : 0,
    }));

    await prisma.trackingMouseMove.create({
      data: {
        pageviewId: pvId,
        moves: JSON.stringify(sanitizedMoves),
      },
    });

    return NextResponse.json(
      { ok: true, count: sanitizedMoves.length },
      { headers: CORS }
    );
  } catch (e) {
    console.error("tracking/mouse error:", e);
    return NextResponse.json(
      { error: "server error" },
      { status: 500, headers: CORS }
    );
  }
}
