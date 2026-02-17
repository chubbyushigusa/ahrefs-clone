import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkUsageLimit } from "@/lib/auth-helpers";
import { runSiteAudit } from "@/lib/seo/site-auditor";
import { extractDomain, normalizeUrl } from "@/lib/seo/crawler";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user) {
      return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });
    }

    const canUse = await checkUsageLimit(user.id, user.plan, "audit");
    if (!canUse) {
      return NextResponse.json({ error: "本日の監査回数上限に達しました" }, { status: 429 });
    }

    const { url, maxPages = 50 } = await req.json();
    if (!url?.trim()) {
      return NextResponse.json({ error: "URLを入力してください" }, { status: 400 });
    }

    const domain = extractDomain(normalizeUrl(url.trim()));

    // Create audit record
    const audit = await prisma.siteAudit.create({
      data: {
        userId: user.id,
        domain,
        status: "crawling",
      },
    });

    // Run audit
    const result = await runSiteAudit(domain, Math.min(maxPages, 100));

    // Update audit record
    await prisma.siteAudit.update({
      where: { id: audit.id },
      data: {
        status: "completed",
        score: result.score,
        totalPages: result.totalPages,
        crawledPages: result.crawledPages,
        errors: result.errors,
        warnings: result.warnings,
        notices: result.notices,
        resultJson: JSON.stringify(result),
        completedAt: new Date(),
      },
    });

    // Save individual pages
    for (const page of result.pages) {
      await prisma.auditPage.create({
        data: {
          auditId: audit.id,
          url: page.url,
          statusCode: page.statusCode,
          title: page.title,
          loadTime: page.loadTime,
          issuesJson: JSON.stringify(page.issues),
        },
      });
    }

    return NextResponse.json({ id: audit.id, ...result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "監査中にエラーが発生しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const audits = await prisma.siteAudit.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json(audits);
  } catch {
    return NextResponse.json({ error: "監査履歴の取得に失敗しました" }, { status: 500 });
  }
}
