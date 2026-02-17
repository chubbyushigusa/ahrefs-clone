import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseUserAgent } from "@/lib/ua-parser";
import type { SessionTimelineEvent, SessionDetailResponse } from "@/types/heatmap";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
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

    const { sessionId } = params;

    const pageviews = await prisma.trackingPageview.findMany({
      where: { siteId, sessionId },
      include: { scrolls: true, clicks: true },
      orderBy: { createdAt: "asc" },
    });

    if (pageviews.length === 0) {
      return NextResponse.json({ error: "セッションが見つかりません" }, { status: 404 });
    }

    const first = pageviews[0];
    const ua = parseUserAgent(first.userAgent);

    // Build timeline events
    const events: SessionTimelineEvent[] = [];

    for (const pv of pageviews) {
      events.push({
        type: "pageview",
        timestamp: pv.createdAt.toISOString(),
        path: pv.path,
        title: pv.title || undefined,
      });

      for (const sc of pv.scrolls) {
        events.push({
          type: "scroll",
          timestamp: sc.createdAt.toISOString(),
          maxDepth: sc.maxDepth,
          dwellMs: sc.dwellMs,
          path: pv.path,
        });
      }

      for (const cl of pv.clicks) {
        events.push({
          type: "click",
          timestamp: cl.createdAt.toISOString(),
          x: cl.x,
          y: cl.y,
          selector: cl.selector || undefined,
          text: cl.text || undefined,
          href: cl.href || undefined,
          path: pv.path,
        });
      }
    }

    // Sort all events chronologically
    events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const result: SessionDetailResponse = {
      sessionId,
      startedAt: first.createdAt.toISOString(),
      device: ua.device,
      browser: ua.browser,
      os: ua.os,
      screenW: first.screenW,
      screenH: first.screenH,
      referrer: first.referrer,
      events,
    };

    return NextResponse.json(result);
  } catch (e) {
    console.error("heatmap/sessions/[sessionId] error:", e);
    return NextResponse.json({ error: "データ取得に失敗しました" }, { status: 500 });
  }
}
