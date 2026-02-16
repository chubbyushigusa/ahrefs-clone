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
    const path = req.nextUrl.searchParams.get("path") || "/";
    const days = parseInt(req.nextUrl.searchParams.get("days") || "30");

    if (!siteId) {
      return NextResponse.json({ error: "siteIdが必要です" }, { status: 400 });
    }

    // Verify ownership
    const site = await prisma.heatmapSite.findUnique({ where: { id: siteId } });
    if (!site || site.userId !== session.user.id) {
      return NextResponse.json({ error: "サイトが見つかりません" }, { status: 404 });
    }

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Get pageviews for this path
    const pageviews = await prisma.trackingPageview.findMany({
      where: {
        siteId,
        path,
        createdAt: { gte: since },
      },
      include: {
        scrolls: true,
        clicks: true,
      },
      orderBy: { createdAt: "desc" },
      take: 5000,
    });

    const totalPV = pageviews.length;
    if (totalPV === 0) {
      return NextResponse.json({
        totalPV: 0,
        uniqueSessions: 0,
        avgDwell: 0,
        scrollDepth: [],
        clickMap: [],
        pages: [],
      });
    }

    // Unique sessions
    const uniqueSessions = new Set(pageviews.map((pv) => pv.sessionId)).size;

    // Scroll depth distribution
    const scrollData: number[] = [];
    let totalDwell = 0;
    let dwellCount = 0;
    for (const pv of pageviews) {
      for (const s of pv.scrolls) {
        scrollData.push(s.maxDepth);
        if (s.dwellMs > 0) {
          totalDwell += s.dwellMs;
          dwellCount++;
        }
      }
    }
    const avgDwell = dwellCount > 0 ? Math.round(totalDwell / dwellCount) : 0;

    // Scroll depth milestones (what % of visitors reach each depth)
    const milestones = [0, 10, 25, 50, 75, 90, 100];
    const scrollDepth = milestones.map((depth) => {
      const reached = scrollData.filter((d) => d >= depth).length;
      return {
        depth,
        reach: scrollData.length > 0 ? Math.round((reached / scrollData.length) * 100) : 0,
      };
    });

    // Click aggregation - group by grid cells (50x50 px)
    const GRID = 50;
    const clickGrid: Record<string, { x: number; y: number; count: number; selectors: Record<string, number> }> = {};
    const avgPageHeight = pageviews.reduce((sum, pv) => sum + (pv.pageHeight || 0), 0) / totalPV;

    for (const pv of pageviews) {
      for (const c of pv.clicks) {
        const gx = Math.floor(c.x / GRID) * GRID + GRID / 2;
        const gy = Math.floor(c.y / GRID) * GRID + GRID / 2;
        const key = `${gx},${gy}`;
        if (!clickGrid[key]) {
          clickGrid[key] = { x: gx, y: gy, count: 0, selectors: {} };
        }
        clickGrid[key].count++;
        if (c.selector) {
          clickGrid[key].selectors[c.selector] = (clickGrid[key].selectors[c.selector] || 0) + 1;
        }
      }
    }

    const clickMap = Object.values(clickGrid)
      .sort((a, b) => b.count - a.count)
      .slice(0, 200)
      .map((c) => ({
        x: c.x,
        y: c.y,
        count: c.count,
        topSelector: Object.entries(c.selectors).sort((a, b) => b[1] - a[1])[0]?.[0] || null,
      }));

    // Top pages for this site
    const allPaths = await prisma.trackingPageview.groupBy({
      by: ["path"],
      where: { siteId, createdAt: { gte: since } },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
      take: 20,
    });

    const pages = allPaths.map((p) => ({
      path: p.path,
      views: p._count.id,
    }));

    return NextResponse.json({
      totalPV,
      uniqueSessions,
      avgDwell,
      avgPageHeight: Math.round(avgPageHeight),
      scrollDepth,
      clickMap,
      pages,
    });
  } catch (e) {
    console.error("heatmap/data error:", e);
    return NextResponse.json({ error: "データ取得に失敗しました" }, { status: 500 });
  }
}
