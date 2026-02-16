import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkSerp } from "@/lib/seo/serp-checker";

export const dynamic = "force-dynamic";

function cleanDomain(d: string): string {
  return d.replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/.*$/, "").toLowerCase();
}

function domainMatches(serpDomain: string, projectDomain: string): boolean {
  const a = cleanDomain(serpDomain);
  const b = cleanDomain(projectDomain);
  return a === b || a.endsWith("." + b) || b.endsWith("." + a);
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { projectId, keyword } = await req.json();
    if (!projectId || !keyword?.trim()) {
      return NextResponse.json({ error: "プロジェクトとキーワードを指定してください" }, { status: 400 });
    }

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: session.user.id },
    });
    if (!project) {
      return NextResponse.json({ error: "プロジェクトが見つかりません" }, { status: 404 });
    }

    const tracked = await prisma.trackedKeyword.create({
      data: {
        keyword: keyword.trim(),
        projectId,
      },
    });

    const serpCheck = await checkSerp(keyword.trim());

    if (serpCheck.source === "unavailable") {
      return NextResponse.json({
        ...tracked,
        currentPosition: null,
        serpCount: 0,
        warning: "Serper.dev APIが未設定のため順位を取得できません。.envにSERPER_API_KEYを設定してください。",
      });
    }

    // Find position with robust domain matching
    const position = serpCheck.serpResults.findIndex((r) => {
      const serpClean = cleanDomain(r.domain);
      const urlClean = cleanDomain(r.url);
      return domainMatches(serpClean, project.domain) || urlClean.includes(cleanDomain(project.domain));
    });

    const matchedResult = position >= 0 ? serpCheck.serpResults[position] : null;

    await prisma.rankingHistory.create({
      data: {
        trackedKeywordId: tracked.id,
        position: position >= 0 ? position + 1 : null,
        url: matchedResult?.url || null,
        title: matchedResult?.title || null,
      },
    });

    return NextResponse.json({
      ...tracked,
      currentPosition: position >= 0 ? position + 1 : null,
      serpCount: serpCheck.serpResults.length,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "キーワード追加に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { projectId } = await req.json();
    if (!projectId) {
      return NextResponse.json({ error: "プロジェクトを指定してください" }, { status: 400 });
    }

    const project = await prisma.project.findFirst({
      where: { id: projectId, userId: session.user.id },
      include: { trackedKeywords: true },
    });
    if (!project) {
      return NextResponse.json({ error: "プロジェクトが見つかりません" }, { status: 404 });
    }

    const results = [];
    for (const kw of project.trackedKeywords) {
      const serpCheck = await checkSerp(kw.keyword);

      if (serpCheck.source === "unavailable") {
        results.push({
          keyword: kw.keyword,
          position: null,
          serpCount: 0,
          warning: "CSE API未設定",
        });
        continue;
      }

      const position = serpCheck.serpResults.findIndex((r) => {
        const serpClean = cleanDomain(r.domain);
        const urlClean = cleanDomain(r.url);
        return domainMatches(serpClean, project.domain) || urlClean.includes(cleanDomain(project.domain));
      });

      const matchedResult = position >= 0 ? serpCheck.serpResults[position] : null;

      const history = await prisma.rankingHistory.create({
        data: {
          trackedKeywordId: kw.id,
          position: position >= 0 ? position + 1 : null,
          url: matchedResult?.url || null,
          title: matchedResult?.title || null,
        },
      });

      results.push({
        keyword: kw.keyword,
        position: position >= 0 ? position + 1 : null,
        serpCount: serpCheck.serpResults.length,
        history,
      });
    }

    return NextResponse.json(results);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "順位チェックに失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
