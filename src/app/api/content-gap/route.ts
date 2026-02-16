import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { crawlUrl, extractLinks } from "@/lib/seo/crawler";
import { analyzeMetaTags, analyzeHeadings, analyzeImages } from "@/lib/seo/meta-analyzer";
import { analyzeContentGap, extractCompetitorKeywords } from "@/lib/seo/content-gap";
import { checkSerp } from "@/lib/seo/serp-checker";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { url: inputUrl, keyword } = await req.json();
    if (!inputUrl || typeof inputUrl !== "string") {
      return NextResponse.json({ error: "URLを入力してください" }, { status: 400 });
    }

    const url = inputUrl.startsWith("http") ? inputUrl : `https://${inputUrl}`;
    const domain = new URL(url).hostname;

    // Crawl target page
    const crawlResult = await crawlUrl(url);
    const { $, html } = crawlResult;

    const meta = analyzeMetaTags($, url);
    const headings = analyzeHeadings($);
    const images = analyzeImages($, url);
    const rawLinks = extractLinks($, url);
    const links = {
      internal: rawLinks.filter((l) => !l.isExternal).length,
      external: rawLinks.filter((l) => l.isExternal).length,
      broken: 0,
      nofollow: rawLinks.filter((l) => l.rel.includes("nofollow")).length,
      links: rawLinks,
    };

    // Get SERP data for keyword (or use title as fallback)
    const searchKeyword = keyword || meta.title || domain;
    let serpResults: { position: number; title: string; url: string; description: string; domain: string }[] = [];

    try {
      const serpCheck = await checkSerp(searchKeyword);
      serpResults = serpCheck.serpResults;
    } catch {
      // SERP data unavailable - continue without it
    }

    // Extract competitor keywords from SERP results
    const competitorTexts = serpResults
      .filter((r) => !r.url.includes(domain))
      .map((r) => ({
        url: r.url,
        domain: r.domain,
        title: r.title,
        keywords: extractCompetitorKeywords(r.title, r.description),
      }));

    const result = analyzeContentGap(
      url,
      domain,
      $,
      html,
      meta,
      headings,
      images,
      links,
      serpResults,
      competitorTexts
    );

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "コンテンツギャップ分析に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
