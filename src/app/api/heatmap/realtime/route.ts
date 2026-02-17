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

    const siteId = req.nextUrl.searchParams.get("siteId");
    if (!siteId) {
      return NextResponse.json({ error: "siteIdが必要です" }, { status: 400 });
    }

    // Verify ownership
    const site = await prisma.heatmapSite.findUnique({ where: { id: siteId } });
    if (!site || site.userId !== session.user.id) {
      return NextResponse.json({ error: "サイトが見つかりません" }, { status: 404 });
    }

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    // Get recent pageviews within the last 5 minutes
    const recentPageviews = await prisma.trackingPageview.findMany({
      where: {
        siteId,
        createdAt: { gte: fiveMinutesAgo },
      },
      select: {
        sessionId: true,
        path: true,
      },
    });

    // Count distinct sessions
    const sessionSet = new Set<string>();
    const pathCounts = new Map<string, number>();

    for (const pv of recentPageviews) {
      sessionSet.add(pv.sessionId);
      pathCounts.set(pv.path, (pathCounts.get(pv.path) || 0) + 1);
    }

    const activeVisitors = sessionSet.size;

    // Top pages sorted by count descending
    const topPages = Array.from(pathCounts.entries())
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    return NextResponse.json({ activeVisitors, topPages });
  } catch (e) {
    console.error("heatmap/realtime error:", e);
    return NextResponse.json({ error: "データ取得に失敗しました" }, { status: 500 });
  }
}
