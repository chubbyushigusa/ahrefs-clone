import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { crawlUrl, extractLinks } from "@/lib/seo/crawler";
import { analyzeMetaTags, analyzeHeadings, analyzeImages } from "@/lib/seo/meta-analyzer";
import { detectTechnologies } from "@/lib/seo/tech-detector";
import { getPageSpeedData } from "@/lib/api/google-pagespeed";
import { getMozMetrics } from "@/lib/api/moz";
import { generateSeoIssues, calculateSeoScore } from "@/lib/seo/scoring";
import type { CompetitorData } from "@/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { domains } = await req.json();
    if (!Array.isArray(domains) || domains.length < 2 || domains.length > 5) {
      return NextResponse.json({ error: "2〜5個のドメインを指定してください" }, { status: 400 });
    }

    const results: CompetitorData[] = [];

    for (const domain of domains) {
      try {
        const url = `https://${domain.trim()}`;
        const crawlResult = await crawlUrl(url);
        const { $, html, headers, statusCode, loadTime } = crawlResult;

        const meta = analyzeMetaTags($, url);
        const headings = analyzeHeadings($);
        const images = analyzeImages($, url);
        const rawLinks = extractLinks($, url);
        const technologies = detectTechnologies(html, $, headers);

        const links = {
          internal: rawLinks.filter((l) => !l.isExternal).length,
          external: rawLinks.filter((l) => l.isExternal).length,
          broken: 0,
          nofollow: rawLinks.filter((l) => l.rel.includes("nofollow")).length,
          links: rawLinks,
        };

        const issues = generateSeoIssues(meta, headings, images, links, html, headers, statusCode, loadTime);

        // Get PageSpeed + Moz data in parallel
        const [performance, mozData] = await Promise.all([
          getPageSpeedData(url),
          getMozMetrics(domain.trim()),
        ]);

        // SEO score: blends on-page checks (60%) with Lighthouse SEO (40%) when available
        const seoScore = calculateSeoScore(issues, performance);

        // Content Score — based on measurable content quality signals
        // Each check is binary (met or not), transparent to user
        const textContent = html
          .replace(/<script[\s\S]*?<\/script>/gi, "")
          .replace(/<style[\s\S]*?<\/style>/gi, "")
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        const charCount = textContent.length;
        let contentScore = 0;
        // Text length: 0-30pts (300=10, 1000=20, 3000+=30)
        if (charCount >= 3000) contentScore += 30;
        else if (charCount >= 1000) contentScore += 20;
        else if (charCount >= 300) contentScore += 10;
        // H1 present: 15pts
        if (headings.h1.length === 1) contentScore += 15;
        else if (headings.h1.length > 1) contentScore += 5; // multiple H1 is suboptimal
        // H2 structure: 0-15pts (1=5, 2=10, 3+=15)
        contentScore += Math.min(15, headings.h2.length * 5);
        // Image alt coverage: 0-15pts
        const altRatio = images.total > 0 ? images.withAlt / images.total : 1;
        contentScore += Math.round(altRatio * 15);
        // Meta description present + good length: 0-15pts
        if (meta.description) {
          contentScore += 5;
          if (meta.descriptionLength >= 50 && meta.descriptionLength <= 155) contentScore += 10;
          else contentScore += 3;
        }
        // Title present + good length: 0-10pts
        if (meta.title) {
          contentScore += 4;
          if (meta.titleLength >= 10 && meta.titleLength <= 60) contentScore += 6;
          else contentScore += 2;
        }
        contentScore = Math.min(100, contentScore);

        // Technical Score — percentage of technical best-practice checks passed
        // 10 checks × 10pts each = 100pts max
        let technicalScore = 0;
        if (meta.canonical) technicalScore += 10;   // canonical URL
        if (meta.viewport) technicalScore += 10;    // mobile viewport
        if (meta.charset) technicalScore += 10;     // charset declared
        if (meta.lang) technicalScore += 10;        // language attribute
        if (meta.favicon) technicalScore += 10;     // favicon
        if (headers["strict-transport-security"]) technicalScore += 10; // HSTS
        if (headers["x-content-type-options"]) technicalScore += 10;    // Content-Type sniffing prevention
        if (meta.ogTitle && meta.ogDescription && meta.ogImage) technicalScore += 10; // OGP complete
        if (meta.twitterCard) technicalScore += 10; // Twitter Card
        if (!meta.robots?.includes("noindex")) technicalScore += 10; // not blocking indexing

        results.push({
          domain: domain.trim(),
          scores: {
            seo: seoScore,
            performance: performance?.performanceScore || 0,
            content: contentScore,
            technical: technicalScore,
            domainAuthority: mozData?.domainAuthority || 0,
            backlinks: mozData?.linkingDomains || 0,
          },
          meta,
          technologies,
        });
      } catch {
        results.push({
          domain: domain.trim(),
          scores: {
            seo: 0,
            performance: 0,
            content: 0,
            technical: 0,
            domainAuthority: 0,
            backlinks: 0,
          },
          meta: {
            title: null,
            titleLength: 0,
            description: null,
            descriptionLength: 0,
            canonical: null,
            robots: null,
            viewport: null,
            charset: null,
            ogTitle: null,
            ogDescription: null,
            ogImage: null,
            twitterCard: null,
            lang: null,
            favicon: null,
            hreflang: [],
          },
          technologies: [],
        });
      }
    }

    return NextResponse.json(results);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "競合分析に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
