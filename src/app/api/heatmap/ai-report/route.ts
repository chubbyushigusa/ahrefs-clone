import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface Insight {
  type: "pv_trend" | "dwell_trend" | "scroll_trend" | "fv_exit" | "rage_click" | "attention";
  severity: "info" | "warning" | "critical";
  title: string;
  description: string;
  metric: number;
  change: number;
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const sp = req.nextUrl.searchParams;
    const siteId = sp.get("siteId");
    const days = parseInt(sp.get("days") || "14");

    if (!siteId) {
      return NextResponse.json({ error: "siteIdが必要です" }, { status: 400 });
    }

    // Verify ownership
    const site = await prisma.heatmapSite.findUnique({ where: { id: siteId } });
    if (!site || site.userId !== session.user.id) {
      return NextResponse.json({ error: "サイトが見つかりません" }, { status: 404 });
    }

    const now = Date.now();
    const halfDays = Math.floor(days / 2);
    const thisWeekStart = new Date(now - halfDays * 24 * 60 * 60 * 1000);
    const lastWeekStart = new Date(now - days * 24 * 60 * 60 * 1000);

    // Fetch this period's pageviews
    const thisWeekPvs = await prisma.trackingPageview.findMany({
      where: {
        siteId,
        createdAt: { gte: thisWeekStart },
      },
      include: { scrolls: true, clicks: true },
    });

    // Fetch last period's pageviews
    const lastWeekPvs = await prisma.trackingPageview.findMany({
      where: {
        siteId,
        createdAt: { gte: lastWeekStart, lt: thisWeekStart },
      },
      include: { scrolls: true, clicks: true },
    });

    const insights: Insight[] = [];

    // --- 1. Compare PV counts ---
    const thisPvCount = thisWeekPvs.length;
    const lastPvCount = lastWeekPvs.length;
    const pvChange = lastPvCount > 0
      ? Math.round(((thisPvCount - lastPvCount) / lastPvCount) * 100)
      : 0;

    if (Math.abs(pvChange) >= 10) {
      insights.push({
        type: "pv_trend",
        severity: pvChange < -20 ? "critical" : pvChange < 0 ? "warning" : "info",
        title: pvChange >= 0
          ? `ページビューが${pvChange}%増加`
          : `ページビューが${Math.abs(pvChange)}%減少`,
        description: pvChange >= 0
          ? `前期間と比較してトラフィックが改善しています（${lastPvCount} -> ${thisPvCount}）`
          : `前期間と比較してトラフィックが減少しています（${lastPvCount} -> ${thisPvCount}）`,
        metric: thisPvCount,
        change: pvChange,
      });
    }

    // --- 2. Compare dwell times ---
    function getAvgDwell(pvs: typeof thisWeekPvs): number {
      const dwells: number[] = [];
      for (const pv of pvs) {
        for (const s of pv.scrolls) {
          if (s.dwellMs > 0) dwells.push(s.dwellMs);
        }
      }
      return dwells.length > 0 ? Math.round(dwells.reduce((a, b) => a + b, 0) / dwells.length) : 0;
    }

    const thisDwell = getAvgDwell(thisWeekPvs);
    const lastDwell = getAvgDwell(lastWeekPvs);
    const dwellChange = lastDwell > 0
      ? Math.round(((thisDwell - lastDwell) / lastDwell) * 100)
      : 0;

    if (Math.abs(dwellChange) >= 15) {
      insights.push({
        type: "dwell_trend",
        severity: dwellChange < -25 ? "critical" : dwellChange < 0 ? "warning" : "info",
        title: dwellChange >= 0
          ? `平均滞在時間が${dwellChange}%増加`
          : `平均滞在時間が${Math.abs(dwellChange)}%減少`,
        description: dwellChange >= 0
          ? `ユーザーがより長くページに滞在しています（${Math.round(lastDwell / 1000)}s -> ${Math.round(thisDwell / 1000)}s）`
          : `ユーザーの滞在時間が短くなっています（${Math.round(lastDwell / 1000)}s -> ${Math.round(thisDwell / 1000)}s）。コンテンツの見直しを検討してください`,
        metric: thisDwell,
        change: dwellChange,
      });
    }

    // --- 3. Compare scroll depth ---
    function getAvgScrollDepth(pvs: typeof thisWeekPvs): number {
      const depths: number[] = [];
      for (const pv of pvs) {
        for (const s of pv.scrolls) {
          depths.push(s.maxDepth);
        }
      }
      return depths.length > 0 ? Math.round(depths.reduce((a, b) => a + b, 0) / depths.length) : 0;
    }

    const thisScroll = getAvgScrollDepth(thisWeekPvs);
    const lastScroll = getAvgScrollDepth(lastWeekPvs);
    const scrollChange = lastScroll > 0
      ? Math.round(((thisScroll - lastScroll) / lastScroll) * 100)
      : 0;

    if (Math.abs(scrollChange) >= 10) {
      insights.push({
        type: "scroll_trend",
        severity: scrollChange < -20 ? "warning" : "info",
        title: scrollChange >= 0
          ? `平均スクロール深度が${scrollChange}%改善`
          : `平均スクロール深度が${Math.abs(scrollChange)}%低下`,
        description: scrollChange >= 0
          ? `ユーザーがページをより深くまで閲覧しています（${lastScroll}% -> ${thisScroll}%）`
          : `ユーザーのスクロール深度が浅くなっています（${lastScroll}% -> ${thisScroll}%）。コンテンツの並び順を見直してください`,
        metric: thisScroll,
        change: scrollChange,
      });
    }

    // --- 4. Identify pages with high FV exit rate ---
    const pathScrollMap = new Map<string, { fvExits: number; total: number }>();
    for (const pv of thisWeekPvs) {
      for (const s of pv.scrolls) {
        const entry = pathScrollMap.get(pv.path) || { fvExits: 0, total: 0 };
        entry.total++;
        if (s.maxDepth <= 15) entry.fvExits++;
        pathScrollMap.set(pv.path, entry);
      }
    }

    for (const [pagePath, data] of pathScrollMap.entries()) {
      if (data.total < 5) continue; // Skip low-traffic pages
      const fvRate = Math.round((data.fvExits / data.total) * 100);
      if (fvRate >= 60) {
        insights.push({
          type: "fv_exit",
          severity: fvRate >= 80 ? "critical" : "warning",
          title: `${pagePath} のFV離脱率が${fvRate}%`,
          description: `このページでは${data.total}回の閲覧のうち${data.fvExits}回がファーストビューで離脱しています。ヘッダーやメインビジュアルの改善を検討してください`,
          metric: fvRate,
          change: 0,
        });
      }
    }

    // --- 5. Find rage click hotspots ---
    const rageBySelector = new Map<string, number>();
    let totalRageClicks = 0;

    for (const pv of thisWeekPvs) {
      for (const click of pv.clicks) {
        if (click.isRage) {
          totalRageClicks++;
          const sel = click.selector || "(unknown)";
          rageBySelector.set(sel, (rageBySelector.get(sel) || 0) + 1);
        }
      }
    }

    if (totalRageClicks >= 5) {
      const topRageSelectors = Array.from(rageBySelector.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);

      const topElements = topRageSelectors
        .map(([sel, count]) => `${sel}(${count}回)`)
        .join("、");

      insights.push({
        type: "rage_click",
        severity: totalRageClicks >= 20 ? "critical" : "warning",
        title: `レイジクリックが${totalRageClicks}件検出`,
        description: `ユーザーが繰り返しクリックしている要素があります。主な箇所: ${topElements}。クリック可能に見えるが反応しない要素がないか確認してください`,
        metric: totalRageClicks,
        change: 0,
      });
    }

    // --- 6. Check attention zone distribution ---
    const allZones: number[][] = [];
    for (const pv of thisWeekPvs) {
      for (const s of pv.scrolls) {
        if (s.zones) {
          try {
            const z = JSON.parse(s.zones) as number[];
            if (Array.isArray(z) && z.length === 10) {
              allZones.push(z);
            }
          } catch {
            // ignore
          }
        }
      }
    }

    if (allZones.length >= 10) {
      const avgZones = Array(10)
        .fill(0)
        .map((_, i) => {
          const sum = allZones.reduce((acc, z) => acc + z[i], 0);
          return Math.round(sum / allZones.length);
        });

      // Check if attention drops sharply in the middle (zones 3-6)
      const topZoneAvg = (avgZones[0] + avgZones[1] + avgZones[2]) / 3;
      const midZoneAvg = (avgZones[3] + avgZones[4] + avgZones[5] + avgZones[6]) / 4;

      if (topZoneAvg > 0 && midZoneAvg / topZoneAvg < 0.3) {
        insights.push({
          type: "attention",
          severity: "warning",
          title: "ページ中盤でアテンションが急激に低下",
          description: `上部ゾーンの平均アテンション(${Math.round(topZoneAvg)}ms)に対して、中盤(${Math.round(midZoneAvg)}ms)が著しく低下しています。重要なコンテンツをより上部に配置することを検討してください`,
          metric: Math.round(midZoneAvg),
          change: Math.round(((midZoneAvg - topZoneAvg) / topZoneAvg) * 100),
        });
      }
    }

    // --- Build summary ---
    const summaryParts: string[] = [];
    if (thisPvCount > 0) {
      summaryParts.push(`期間中のPV数: ${thisPvCount}`);
    }
    if (thisDwell > 0) {
      summaryParts.push(`平均滞在時間: ${Math.round(thisDwell / 1000)}秒`);
    }
    if (thisScroll > 0) {
      summaryParts.push(`平均スクロール深度: ${thisScroll}%`);
    }

    const criticalCount = insights.filter((i) => i.severity === "critical").length;
    const warningCount = insights.filter((i) => i.severity === "warning").length;

    if (criticalCount > 0) {
      summaryParts.push(`重大な問題: ${criticalCount}件`);
    }
    if (warningCount > 0) {
      summaryParts.push(`注意が必要: ${warningCount}件`);
    }
    if (insights.length === 0) {
      summaryParts.push("特筆すべき変化は見られません");
    }

    const summary = summaryParts.join("。") + "。";

    return NextResponse.json({
      insights,
      summary,
      generatedAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error("heatmap/ai-report error:", e);
    return NextResponse.json({ error: "レポート生成に失敗しました" }, { status: 500 });
  }
}
