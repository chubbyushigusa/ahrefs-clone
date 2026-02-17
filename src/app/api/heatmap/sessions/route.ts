import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseUserAgent } from "@/lib/ua-parser";
import type { SessionListItem, SessionListResponse } from "@/types/heatmap";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const sp = req.nextUrl.searchParams;
    const siteId = sp.get("siteId");
    const page = Math.max(1, parseInt(sp.get("page") || "1"));
    const pageSize = Math.min(100, Math.max(1, parseInt(sp.get("pageSize") || "20")));
    const days = parseInt(sp.get("days") || "30");
    const pathFilter = sp.get("path") || null;
    const deviceFilter = sp.get("device") || null;

    if (!siteId) {
      return NextResponse.json({ error: "siteIdが必要です" }, { status: 400 });
    }

    // Verify ownership
    const site = await prisma.heatmapSite.findUnique({ where: { id: siteId } });
    if (!site || site.userId !== session.user.id) {
      return NextResponse.json({ error: "サイトが見つかりません" }, { status: 404 });
    }

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Build where clause for pageviews
    const where: Record<string, unknown> = {
      siteId,
      createdAt: { gte: since },
    };
    if (pathFilter) where.path = pathFilter;

    // Get all pageviews grouped by sessionId
    const pageviews = await prisma.trackingPageview.findMany({
      where,
      include: {
        scrolls: true,
        clicks: true,
      },
      orderBy: { createdAt: "asc" },
    });

    // Group by sessionId
    const sessionMap = new Map<string, typeof pageviews>();
    for (const pv of pageviews) {
      const arr = sessionMap.get(pv.sessionId) || [];
      arr.push(pv);
      sessionMap.set(pv.sessionId, arr);
    }

    // Build session list items
    let sessions: SessionListItem[] = [];
    for (const [sessionId, pvs] of sessionMap.entries()) {
      const first = pvs[0];
      const ua = parseUserAgent(first.userAgent);

      // Apply device filter
      if (deviceFilter && ua.device !== deviceFilter) continue;

      const totalClicks = pvs.reduce((sum, pv) => sum + pv.clicks.length, 0);
      const totalDwell = pvs.reduce(
        (sum, pv) => sum + pv.scrolls.reduce((s, sc) => s + sc.dwellMs, 0),
        0
      );

      sessions.push({
        sessionId,
        startedAt: first.createdAt.toISOString(),
        pageCount: pvs.length,
        totalClicks,
        dwellMs: totalDwell,
        entryPage: first.path,
        referrer: first.referrer,
        device: ua.device,
        browser: ua.browser,
        os: ua.os,
        screenW: first.screenW,
        screenH: first.screenH,
      });
    }

    // Sort by most recent first
    sessions.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());

    const total = sessions.length;
    const start = (page - 1) * pageSize;
    sessions = sessions.slice(start, start + pageSize);

    const result: SessionListResponse = { sessions, total, page, pageSize };
    return NextResponse.json(result);
  } catch (e) {
    console.error("heatmap/sessions error:", e);
    return NextResponse.json({ error: "データ取得に失敗しました" }, { status: 500 });
  }
}
