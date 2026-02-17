import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface FunnelStep {
  path: string;
  label: string;
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const sp = req.nextUrl.searchParams;
    const siteId = sp.get("siteId");
    const funnelId = sp.get("funnelId");
    const days = parseInt(sp.get("days") || "30");

    if (!siteId || !funnelId) {
      return NextResponse.json(
        { error: "siteIdとfunnelIdが必要です" },
        { status: 400 }
      );
    }

    // Verify ownership
    const site = await prisma.heatmapSite.findUnique({ where: { id: siteId } });
    if (!site || site.userId !== session.user.id) {
      return NextResponse.json({ error: "サイトが見つかりません" }, { status: 404 });
    }

    // Load the funnel
    const funnel = await prisma.heatmapFunnel.findUnique({
      where: { id: funnelId },
    });
    if (!funnel || funnel.siteId !== siteId) {
      return NextResponse.json({ error: "ファネルが見つかりません" }, { status: 404 });
    }

    let steps: FunnelStep[];
    try {
      steps = JSON.parse(funnel.steps) as FunnelStep[];
    } catch {
      return NextResponse.json({ error: "ファネル定義が不正です" }, { status: 500 });
    }

    if (!Array.isArray(steps) || steps.length === 0) {
      return NextResponse.json({ error: "ファネルにステップがありません" }, { status: 400 });
    }

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Get all pageviews for this site within the date range, ordered by time
    const pageviews = await prisma.trackingPageview.findMany({
      where: {
        siteId,
        createdAt: { gte: since },
      },
      select: {
        sessionId: true,
        path: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    // Group pageviews by session, preserving chronological order
    const sessionPageviews = new Map<string, { path: string; createdAt: Date }[]>();
    for (const pv of pageviews) {
      const arr = sessionPageviews.get(pv.sessionId) || [];
      arr.push({ path: pv.path, createdAt: pv.createdAt });
      sessionPageviews.set(pv.sessionId, arr);
    }

    // For each session, check if they completed each funnel step in order
    const stepSessionCounts: number[] = new Array(steps.length).fill(0);

    for (const [, pvs] of sessionPageviews.entries()) {
      let stepIndex = 0;

      for (const pv of pvs) {
        if (stepIndex >= steps.length) break;

        if (pv.path === steps[stepIndex].path) {
          stepSessionCounts[stepIndex]++;
          stepIndex++;
        }
      }
    }

    // Build result with rates and dropoff
    const firstStepSessions = stepSessionCounts[0] || 0;
    const resultSteps = steps.map((step, i) => {
      const sessions = stepSessionCounts[i];
      const previousSessions = i === 0 ? sessions : stepSessionCounts[i - 1];
      const rate = firstStepSessions > 0
        ? Math.round((sessions / firstStepSessions) * 1000) / 10
        : 0;
      const dropoff = previousSessions > 0
        ? Math.round(((previousSessions - sessions) / previousSessions) * 1000) / 10
        : 0;

      return {
        path: step.path,
        label: step.label,
        sessions,
        rate,
        dropoff,
      };
    });

    return NextResponse.json({
      funnel: {
        name: funnel.name,
        steps: resultSteps,
      },
    });
  } catch (e) {
    console.error("heatmap/funnel GET error:", e);
    return NextResponse.json({ error: "データ取得に失敗しました" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const body = await req.json();
    const { siteId, name, steps } = body;

    if (!siteId || !name || !Array.isArray(steps) || steps.length === 0) {
      return NextResponse.json(
        { error: "siteId, name, stepsが必要です" },
        { status: 400 }
      );
    }

    // Verify ownership
    const site = await prisma.heatmapSite.findUnique({ where: { id: siteId } });
    if (!site || site.userId !== session.user.id) {
      return NextResponse.json({ error: "サイトが見つかりません" }, { status: 404 });
    }

    // Validate and sanitize steps
    const sanitizedSteps: FunnelStep[] = steps.slice(0, 20).map((s: FunnelStep) => ({
      path: String(s.path || "/").slice(0, 500),
      label: String(s.label || s.path || "").slice(0, 200),
    }));

    const funnel = await prisma.heatmapFunnel.create({
      data: {
        siteId,
        name: String(name).slice(0, 200),
        steps: JSON.stringify(sanitizedSteps),
      },
    });

    return NextResponse.json({ id: funnel.id, name: funnel.name, steps: sanitizedSteps });
  } catch (e) {
    console.error("heatmap/funnel POST error:", e);
    return NextResponse.json({ error: "ファネル作成に失敗しました" }, { status: 500 });
  }
}
