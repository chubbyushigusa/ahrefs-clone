import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkUsageLimit } from "@/lib/auth-helpers";
import { crawlUrl, extractLinks, extractDomain } from "@/lib/seo/crawler";
import { analyzeMetaTags, analyzeHeadings, analyzeImages } from "@/lib/seo/meta-analyzer";
import { detectTechnologies } from "@/lib/seo/tech-detector";
import { getDnsInfo } from "@/lib/seo/domain-info";
import { getPageSpeedData } from "@/lib/api/google-pagespeed";
import { getMozMetrics } from "@/lib/api/moz";
import { generateSeoIssues, calculateSeoScore } from "@/lib/seo/scoring";
import type { SeoAnalysis } from "@/types";

export const dynamic = "force-dynamic";

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

    const canUse = await checkUsageLimit(user.id, user.plan, "siteExplorer");
    if (!canUse) {
      return NextResponse.json({ error: "本日の使用回数上限に達しました。プランをアップグレードしてください。" }, { status: 429 });
    }

    const { url } = await req.json();
    if (!url) {
      return NextResponse.json({ error: "URLを入力してください" }, { status: 400 });
    }

    // Crawl the page
    const crawlResult = await crawlUrl(url);
    const { $, html, headers, statusCode, loadTime } = crawlResult;
    const domain = extractDomain(crawlResult.url);

    // Run analyses in parallel
    const [meta, headings, images, technologies, dns, performance, backlinks] = await Promise.all([
      Promise.resolve(analyzeMetaTags($, crawlResult.url)),
      Promise.resolve(analyzeHeadings($)),
      Promise.resolve(analyzeImages($, crawlResult.url)),
      Promise.resolve(detectTechnologies(html, $, headers)),
      getDnsInfo(domain),
      getPageSpeedData(crawlResult.url),
      getMozMetrics(domain),
    ]);

    // Extract links
    const rawLinks = extractLinks($, crawlResult.url);
    const links = {
      internal: rawLinks.filter(l => !l.isExternal).length,
      external: rawLinks.filter(l => l.isExternal).length,
      broken: 0,
      nofollow: rawLinks.filter(l => l.rel.includes("nofollow")).length,
      links: rawLinks.slice(0, 100),
    };

    // Generate issues and score
    // calculateSeoScore blends on-page checks (60%) with Lighthouse SEO (40%) when PageSpeed data is available
    const issues = generateSeoIssues(meta, headings, images, links, html, headers, statusCode, loadTime);
    const score = calculateSeoScore(issues, performance);

    const result: SeoAnalysis = {
      url: crawlResult.url,
      domain,
      title: meta.title || "",
      description: meta.description || "",
      score,
      performance,
      backlinks,
      meta,
      headings,
      images,
      links,
      technologies,
      dns,
      issues,
    };

    // Save to database
    await prisma.domainAnalysis.create({
      data: {
        userId: user.id,
        domain,
        resultJson: JSON.stringify(result),
      },
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "分析中にエラーが発生しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
