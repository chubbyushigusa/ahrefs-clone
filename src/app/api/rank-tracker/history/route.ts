import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const keywordId = req.nextUrl.searchParams.get("keywordId");
    if (!keywordId) {
      return NextResponse.json({ error: "キーワードIDが必要です" }, { status: 400 });
    }

    const history = await prisma.rankingHistory.findMany({
      where: { trackedKeywordId: keywordId },
      orderBy: { checkedAt: "asc" },
      take: 30,
    });

    return NextResponse.json(history);
  } catch {
    return NextResponse.json({ error: "履歴取得に失敗しました" }, { status: 500 });
  }
}
