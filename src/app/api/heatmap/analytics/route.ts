import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseUserAgent } from "@/lib/ua-parser";
import type { AnalyticsResponse, DailyStats, Distribution } from "@/types/heatmap";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const sp = req.nextUrl.searchParams;
    const siteId = sp.get("siteId");
    const days = parseInt(sp.get("days") || "30");

    if (!siteId) {
      return NextResponse.json({ error: "siteIdが必要です" }, { status: 400 });
    }

    // Verify ownership
    const site = await prisma.heatmapSite.findUnique({ where: { id: siteId } });
    if (!site || site.userId !== session.user.id) {
      return NextResponse.json({ error: "サイトが見つかりません" }, { status: 404 });
    }

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const pageviews = await prisma.trackingPageview.findMany({
      where: { siteId, createdAt: { gte: since } },
      include: { scrolls: true },
      orderBy: { createdAt: "asc" },
    });

    // ─── Daily stats ──────────────────────────────────────
    const dailyMap = new Map<string, { pv: number; sessions: Set<string> }>();
    for (const pv of pageviews) {
      const date = pv.createdAt.toISOString().slice(0, 10);
      const entry = dailyMap.get(date) || { pv: 0, sessions: new Set<string>() };
      entry.pv++;
      entry.sessions.add(pv.sessionId);
      dailyMap.set(date, entry);
    }

    // Fill missing days
    const daily: DailyStats[] = [];
    for (let d = new Date(since); d <= new Date(); d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().slice(0, 10);
      const entry = dailyMap.get(dateStr);
      daily.push({
        date: dateStr,
        pageviews: entry?.pv || 0,
        sessions: entry?.sessions.size || 0,
      });
    }

    // ─── Distributions ────────────────────────────────────
    const deviceCounts = new Map<string, number>();
    const browserCounts = new Map<string, number>();
    const osCounts = new Map<string, number>();
    const screenCounts = new Map<string, number>();
    const referrerCounts = new Map<string, number>();

    // Per-session aggregation
    const sessionMap = new Map<string, typeof pageviews>();
    for (const pv of pageviews) {
      const arr = sessionMap.get(pv.sessionId) || [];
      arr.push(pv);
      sessionMap.set(pv.sessionId, arr);
    }

    let totalSessionDuration = 0;
    let totalPages = 0;
    let bounceCount = 0;
    const totalSessions = sessionMap.size;

    for (const [, pvs] of sessionMap.entries()) {
      const first = pvs[0];
      const ua = parseUserAgent(first.userAgent);

      deviceCounts.set(ua.device, (deviceCounts.get(ua.device) || 0) + 1);
      browserCounts.set(ua.browser, (browserCounts.get(ua.browser) || 0) + 1);
      osCounts.set(ua.os, (osCounts.get(ua.os) || 0) + 1);

      if (first.screenW && first.screenH) {
        const screen = `${first.screenW}x${first.screenH}`;
        screenCounts.set(screen, (screenCounts.get(screen) || 0) + 1);
      }

      const ref = first.referrer || "(direct)";
      try {
        const host = first.referrer ? new URL(first.referrer).hostname : "(direct)";
        referrerCounts.set(host, (referrerCounts.get(host) || 0) + 1);
      } catch {
        referrerCounts.set(ref, (referrerCounts.get(ref) || 0) + 1);
      }

      totalPages += pvs.length;
      if (pvs.length === 1) bounceCount++;

      // Session duration from dwell times
      const dwell = pvs.reduce(
        (sum, pv) => sum + pv.scrolls.reduce((s, sc) => s + sc.dwellMs, 0),
        0
      );
      totalSessionDuration += dwell;
    }

    function toDistribution(map: Map<string, number>): Distribution[] {
      return Array.from(map.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count);
    }

    const result: AnalyticsResponse = {
      daily,
      deviceDist: toDistribution(deviceCounts),
      browserDist: toDistribution(browserCounts),
      osDist: toDistribution(osCounts),
      screenDist: toDistribution(screenCounts).slice(0, 10),
      referrerDist: toDistribution(referrerCounts).slice(0, 10),
      avgSessionDurationMs: totalSessions > 0 ? Math.round(totalSessionDuration / totalSessions) : 0,
      avgPagesPerSession: totalSessions > 0 ? Math.round((totalPages / totalSessions) * 10) / 10 : 0,
      bounceRate: totalSessions > 0 ? Math.round((bounceCount / totalSessions) * 100) : 0,
    };

    return NextResponse.json(result);
  } catch (e) {
    console.error("heatmap/analytics error:", e);
    return NextResponse.json({ error: "データ取得に失敗しました" }, { status: 500 });
  }
}
