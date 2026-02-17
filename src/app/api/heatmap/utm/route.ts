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

    // Fetch pageviews that have at least one UTM field
    const pageviews = await prisma.trackingPageview.findMany({
      where: {
        siteId,
        createdAt: { gte: since },
        OR: [
          { utmSource: { not: null } },
          { utmMedium: { not: null } },
          { utmCampaign: { not: null } },
        ],
      },
      select: {
        utmSource: true,
        utmMedium: true,
        utmCampaign: true,
      },
    });

    // Group by source+medium+campaign combination
    const groupMap = new Map<string, { source: string; medium: string; campaign: string; count: number }>();

    for (const pv of pageviews) {
      const source = pv.utmSource || "(not set)";
      const medium = pv.utmMedium || "(not set)";
      const campaign = pv.utmCampaign || "(not set)";
      const key = `${source}|${medium}|${campaign}`;

      const existing = groupMap.get(key);
      if (existing) {
        existing.count++;
      } else {
        groupMap.set(key, { source, medium, campaign, count: 1 });
      }
    }

    const totalWithUtm = pageviews.length;

    // Build sorted results with percentage
    const sources = Array.from(groupMap.values())
      .sort((a, b) => b.count - a.count)
      .map((entry) => ({
        source: entry.source,
        medium: entry.medium,
        campaign: entry.campaign,
        count: entry.count,
        percentage: totalWithUtm > 0
          ? Math.round((entry.count / totalWithUtm) * 1000) / 10
          : 0,
      }));

    return NextResponse.json({ sources });
  } catch (e) {
    console.error("heatmap/utm error:", e);
    return NextResponse.json({ error: "データ取得に失敗しました" }, { status: 500 });
  }
}
