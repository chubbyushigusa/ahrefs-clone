import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseUserAgent } from "@/lib/ua-parser";
import type { ClickLogItem, ClickLogResponse } from "@/types/heatmap";

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
    const pageSize = Math.min(100, Math.max(1, parseInt(sp.get("pageSize") || "30")));
    const days = parseInt(sp.get("days") || "30");
    const pathFilter = sp.get("path") || null;
    const selectorFilter = sp.get("selector") || null;
    const hasHref = sp.get("hasHref");

    if (!siteId) {
      return NextResponse.json({ error: "siteIdが必要です" }, { status: 400 });
    }

    // Verify ownership
    const site = await prisma.heatmapSite.findUnique({ where: { id: siteId } });
    if (!site || site.userId !== session.user.id) {
      return NextResponse.json({ error: "サイトが見つかりません" }, { status: 404 });
    }

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Build pageview where clause
    const pvWhere: Record<string, unknown> = {
      siteId,
      createdAt: { gte: since },
    };
    if (pathFilter) pvWhere.path = pathFilter;

    // Build click where clause
    const clickWhere: Record<string, unknown> = {
      pageview: pvWhere,
    };
    if (selectorFilter) clickWhere.selector = { contains: selectorFilter };
    if (hasHref === "true") clickWhere.href = { not: null };

    const total = await prisma.trackingClick.count({ where: clickWhere });

    const clicks = await prisma.trackingClick.findMany({
      where: clickWhere,
      include: {
        pageview: {
          select: { path: true, sessionId: true, userAgent: true },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    const items: ClickLogItem[] = clicks.map((c) => {
      const ua = parseUserAgent(c.pageview.userAgent);
      return {
        id: c.id,
        createdAt: c.createdAt.toISOString(),
        path: c.pageview.path,
        x: c.x,
        y: c.y,
        selector: c.selector,
        text: c.text,
        href: c.href,
        sessionId: c.pageview.sessionId,
        device: ua.device,
      };
    });

    const result: ClickLogResponse = { clicks: items, total, page, pageSize };
    return NextResponse.json(result);
  } catch (e) {
    console.error("heatmap/clicks error:", e);
    return NextResponse.json({ error: "データ取得に失敗しました" }, { status: 500 });
  }
}
