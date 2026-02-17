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

    const sp = req.nextUrl.searchParams;
    const siteId = sp.get("siteId");
    const path = sp.get("path") || null;
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

    // Build pageview filter
    const pageviewWhere: Record<string, unknown> = {
      siteId,
      createdAt: { gte: since },
    };
    if (path) {
      pageviewWhere.path = path;
    }

    // Get clicks that are rage or dead, joined through pageview for site/path filtering
    const clicks = await prisma.trackingClick.findMany({
      where: {
        pageview: pageviewWhere,
        OR: [{ isRage: true }, { isDead: true }],
      },
      select: {
        selector: true,
        text: true,
        isRage: true,
        isDead: true,
      },
    });

    // Group by selector
    const selectorMap = new Map<
      string,
      { selector: string; text: string | null; rageCount: number; deadCount: number }
    >();

    let totalRage = 0;
    let totalDead = 0;

    for (const click of clicks) {
      const sel = click.selector || "(unknown)";

      if (click.isRage) totalRage++;
      if (click.isDead) totalDead++;

      const existing = selectorMap.get(sel);
      if (existing) {
        if (click.isRage) existing.rageCount++;
        if (click.isDead) existing.deadCount++;
        // Keep the first non-null text encountered
        if (!existing.text && click.text) existing.text = click.text;
      } else {
        selectorMap.set(sel, {
          selector: sel,
          text: click.text,
          rageCount: click.isRage ? 1 : 0,
          deadCount: click.isDead ? 1 : 0,
        });
      }
    }

    // Build result sorted by total count descending
    const rageClicks = Array.from(selectorMap.values())
      .map((entry) => {
        const total = entry.rageCount + entry.deadCount;
        let type: "rage" | "dead" | "both" = "both";
        if (entry.rageCount > 0 && entry.deadCount === 0) type = "rage";
        else if (entry.deadCount > 0 && entry.rageCount === 0) type = "dead";

        return {
          selector: entry.selector,
          text: entry.text,
          count: total,
          type,
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 100);

    return NextResponse.json({ rageClicks, totalRage, totalDead });
  } catch (e) {
    console.error("heatmap/rage-clicks error:", e);
    return NextResponse.json({ error: "データ取得に失敗しました" }, { status: 500 });
  }
}
