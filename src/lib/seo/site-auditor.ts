import { crawlUrl, extractLinks, extractDomain } from "./crawler";
import { analyzeMetaTags, analyzeHeadings, analyzeImages } from "./meta-analyzer";
import { generateSeoIssues, calculateSeoScore } from "./scoring";
import type { SeoIssue, AuditCategory } from "@/types";

export interface AuditProgress {
  status: string;
  crawledPages: number;
  totalPages: number;
}

export interface PageAuditResult {
  url: string;
  statusCode: number;
  title: string;
  loadTime: number;
  issues: SeoIssue[];
}

export interface FullAuditResult {
  domain: string;
  score: number;
  totalPages: number;
  crawledPages: number;
  errors: number;
  warnings: number;
  notices: number;
  issues: SeoIssue[];
  pages: PageAuditResult[];
  categories: AuditCategory[];
}

export async function runSiteAudit(
  domain: string,
  maxPages: number = 10
): Promise<FullAuditResult> {
  const startUrl = `https://${domain}`;
  const visited = new Set<string>();
  const queue: string[] = [startUrl];
  const allIssues: SeoIssue[] = [];
  const pages: PageAuditResult[] = [];

  // BFS crawl
  while (queue.length > 0 && visited.size < maxPages) {
    const url = queue.shift()!;
    if (visited.has(url)) continue;
    visited.add(url);

    try {
      const result = await crawlUrl(url);
      const { $, html, headers, statusCode, loadTime } = result;

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

      const pageIssues = generateSeoIssues(
        meta,
        headings,
        images,
        links,
        html,
        headers,
        statusCode,
        loadTime
      );

      // Add page context to issues
      const contextualIssues = pageIssues.map((issue) => ({
        ...issue,
        details: `${issue.details || ""} [${url}]`.trim(),
      }));

      allIssues.push(...contextualIssues);

      pages.push({
        url,
        statusCode,
        title: meta.title || "",
        loadTime,
        issues: pageIssues,
      });

      // Add internal links to queue
      for (const link of rawLinks) {
        if (
          !link.isExternal &&
          !visited.has(link.href) &&
          !queue.includes(link.href)
        ) {
          const linkDomain = extractDomain(link.href);
          if (linkDomain === domain) {
            queue.push(link.href);
          }
        }
      }
    } catch (err) {
      pages.push({
        url,
        statusCode: 0,
        title: "",
        loadTime: 0,
        issues: [
          {
            type: "error",
            category: "クロール",
            message: `ページのクロールに失敗: ${err instanceof Error ? err.message : "不明なエラー"}`,
          },
        ],
      });
    }
  }

  // Deduplicate issues
  const uniqueIssues = deduplicateIssues(allIssues);
  const errors = uniqueIssues.filter((i) => i.type === "error").length;
  const warnings = uniqueIssues.filter((i) => i.type === "warning").length;
  const notices = uniqueIssues.filter((i) => i.type === "notice").length;
  const score = calculateSeoScore(uniqueIssues);

  // Group by category
  const categoryMap = new Map<string, SeoIssue[]>();
  for (const issue of uniqueIssues) {
    const cat = issue.category;
    if (!categoryMap.has(cat)) categoryMap.set(cat, []);
    categoryMap.get(cat)!.push(issue);
  }

  const categories: AuditCategory[] = Array.from(categoryMap.entries()).map(
    ([name, issues]) => {
      const catErrors = issues.filter((i) => i.type === "error").length;
      const catWarnings = issues.filter((i) => i.type === "warning").length;
      // Category score: percentage of issues that are NOT errors/warnings
      // This aligns with the main score methodology (errors=critical, warnings=important)
      const catNotices = issues.filter((i) => i.type === "notice").length;
      const maxScore = 100;
      // Each error = -20pts, warning = -10pts, notice = -3pts (relative to category)
      const deductions = Math.min(100, catErrors * 20 + catWarnings * 10 + catNotices * 3);
      return {
        name,
        score: Math.max(0, maxScore - deductions),
        maxScore,
        issues,
      };
    }
  );

  return {
    domain,
    score,
    totalPages: queue.length + visited.size,
    crawledPages: visited.size,
    errors,
    warnings,
    notices,
    issues: uniqueIssues,
    pages,
    categories,
  };
}

function deduplicateIssues(issues: SeoIssue[]): SeoIssue[] {
  const seen = new Set<string>();
  return issues.filter((issue) => {
    const key = `${issue.type}:${issue.category}:${issue.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
