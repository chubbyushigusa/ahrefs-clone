import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface PeriodData {
  totalPV: number;
  uniqueSessions: number;
  avgDwell: number;
  medianDwell: number;
  fvExitRate: number;
  bottomReachRate: number;
  attentionZones: number[];
  avgPageHeight: number;
  scrollDepth: { depth: number; reach: number }[];
  clickMap: { x: number; y: number; count: number; topSelector: string | null }[];
}

interface TrackingPageviewWithRelations {
  id: string;
  sessionId: string;
  pageHeight: number | null;
  scrolls: { maxDepth: number; dwellMs: number; zones: string | null }[];
  clicks: { x: number; y: number; selector: string | null }[];
}

function analyzePeriod(pageviews: TrackingPageviewWithRelations[]): PeriodData {
  const totalPV = pageviews.length;

  if (totalPV === 0) {
    return {
      totalPV: 0,
      uniqueSessions: 0,
      avgDwell: 0,
      medianDwell: 0,
      fvExitRate: 0,
      bottomReachRate: 0,
      attentionZones: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      avgPageHeight: 0,
      scrollDepth: [],
      clickMap: [],
    };
  }

  // Unique sessions
  const uniqueSessions = new Set(pageviews.map((pv) => pv.sessionId)).size;

  // Scroll depth + dwell
  const scrollData: number[] = [];
  const dwellValues: number[] = [];
  const allZones: number[][] = [];

  for (const pv of pageviews) {
    for (const s of pv.scrolls) {
      scrollData.push(s.maxDepth);
      if (s.dwellMs > 0) dwellValues.push(s.dwellMs);
      if (s.zones) {
        try {
          const z = JSON.parse(s.zones) as number[];
          if (Array.isArray(z) && z.length === 10) allZones.push(z);
        } catch {
          // ignore
        }
      }
    }
  }

  const totalDwell = dwellValues.reduce((a, b) => a + b, 0);
  const avgDwell = dwellValues.length > 0 ? Math.round(totalDwell / dwellValues.length) : 0;

  const sortedDwell = [...dwellValues].sort((a, b) => a - b);
  const medianDwell = sortedDwell.length > 0
    ? sortedDwell[Math.floor(sortedDwell.length / 2)]
    : 0;

  // FV exit rate
  const fvExitCount = scrollData.filter((d) => d <= 15).length;
  const fvExitRate = scrollData.length > 0
    ? Math.round((fvExitCount / scrollData.length) * 100)
    : 0;

  // Bottom reach rate
  const bottomCount = scrollData.filter((d) => d >= 90).length;
  const bottomReachRate = scrollData.length > 0
    ? Math.round((bottomCount / scrollData.length) * 100)
    : 0;

  // Attention zones
  let attentionZones = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  if (allZones.length > 0) {
    const avgZones = Array(10)
      .fill(0)
      .map((_, i) => {
        const sum = allZones.reduce((acc, z) => acc + z[i], 0);
        return sum / allZones.length;
      });
    const maxZone = Math.max(...avgZones, 1);
    attentionZones = avgZones.map((v) => Math.round((v / maxZone) * 100));
  } else if (scrollData.length > 0) {
    const milestonePoints = [5, 15, 25, 35, 45, 55, 65, 75, 85, 95];
    attentionZones = milestonePoints.map((depth) => {
      const reached = scrollData.filter((d) => d >= depth).length;
      return scrollData.length > 0 ? Math.round((reached / scrollData.length) * 100) : 0;
    });
  }

  // Average page height
  const avgPageHeight = Math.round(
    pageviews.reduce((sum, pv) => sum + (pv.pageHeight || 0), 0) / totalPV
  );

  // Scroll depth milestones
  const milestones = [0, 10, 25, 50, 75, 90, 100];
  const scrollDepth = milestones.map((depth) => {
    const reached = scrollData.filter((d) => d >= depth).length;
    return {
      depth,
      reach: scrollData.length > 0 ? Math.round((reached / scrollData.length) * 100) : 0,
    };
  });

  // Click map
  const GRID = 50;
  const clickGrid: Record<string, { x: number; y: number; count: number; selectors: Record<string, number> }> = {};

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

  return {
    totalPV,
    uniqueSessions,
    avgDwell,
    medianDwell,
    fvExitRate,
    bottomReachRate,
    attentionZones,
    avgPageHeight,
    scrollDepth,
    clickMap,
  };
}

function calcChange(a: number, b: number): number {
  if (b === 0) return a > 0 ? 100 : 0;
  return Math.round(((a - b) / b) * 1000) / 10;
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const sp = req.nextUrl.searchParams;
    const siteId = sp.get("siteId");
    const path = sp.get("path") || "/";
    const startA = sp.get("startA");
    const endA = sp.get("endA");
    const startB = sp.get("startB");
    const endB = sp.get("endB");

    if (!siteId || !startA || !endA || !startB || !endB) {
      return NextResponse.json(
        { error: "siteId, path, startA, endA, startB, endBが必要です" },
        { status: 400 }
      );
    }

    // Verify ownership
    const site = await prisma.heatmapSite.findUnique({ where: { id: siteId } });
    if (!site || site.userId !== session.user.id) {
      return NextResponse.json({ error: "サイトが見つかりません" }, { status: 404 });
    }

    // Parse dates
    const dateStartA = new Date(startA);
    const dateEndA = new Date(endA);
    const dateStartB = new Date(startB);
    const dateEndB = new Date(endB);

    // Set end dates to end of day
    dateEndA.setHours(23, 59, 59, 999);
    dateEndB.setHours(23, 59, 59, 999);

    // Fetch period A pageviews
    const pvA = await prisma.trackingPageview.findMany({
      where: {
        siteId,
        path,
        createdAt: { gte: dateStartA, lte: dateEndA },
      },
      include: {
        scrolls: true,
        clicks: true,
      },
      orderBy: { createdAt: "desc" },
      take: 5000,
    });

    // Fetch period B pageviews
    const pvB = await prisma.trackingPageview.findMany({
      where: {
        siteId,
        path,
        createdAt: { gte: dateStartB, lte: dateEndB },
      },
      include: {
        scrolls: true,
        clicks: true,
      },
      orderBy: { createdAt: "desc" },
      take: 5000,
    });

    const periodA = analyzePeriod(pvA);
    const periodB = analyzePeriod(pvB);

    const changes = {
      pvChange: calcChange(periodA.totalPV, periodB.totalPV),
      sessionChange: calcChange(periodA.uniqueSessions, periodB.uniqueSessions),
      dwellChange: calcChange(periodA.avgDwell, periodB.avgDwell),
      fvExitChange: calcChange(periodA.fvExitRate, periodB.fvExitRate),
      bottomReachChange: calcChange(periodA.bottomReachRate, periodB.bottomReachRate),
    };

    return NextResponse.json({ periodA, periodB, changes });
  } catch (e) {
    console.error("heatmap/compare error:", e);
    return NextResponse.json({ error: "データ取得に失敗しました" }, { status: 500 });
  }
}
