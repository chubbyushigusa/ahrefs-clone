import * as cheerio from "cheerio";

export interface CrawlResult {
  url: string;
  statusCode: number;
  html: string;
  $: cheerio.CheerioAPI;
  headers: Record<string, string>;
  loadTime: number;
  redirectUrl?: string;
}

export async function crawlUrl(url: string): Promise<CrawlResult> {
  const normalizedUrl = normalizeUrl(url);
  const start = Date.now();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(normalizedUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; SEOAnalyzer/1.0; +https://seoanalyzer.example.com)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ja,en;q=0.9",
      },
      redirect: "follow",
    });

    const html = await response.text();
    const loadTime = Date.now() - start;
    const $ = cheerio.load(html);

    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    return {
      url: response.url,
      statusCode: response.status,
      html,
      $,
      headers,
      loadTime,
      redirectUrl: response.url !== normalizedUrl ? response.url : undefined,
    };
  } finally {
    clearTimeout(timeout);
  }
}

export function normalizeUrl(url: string): string {
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = "https://" + url;
  }
  try {
    const parsed = new URL(url);
    return parsed.href;
  } catch {
    return url;
  }
}

export function extractDomain(url: string): string {
  try {
    const parsed = new URL(normalizeUrl(url));
    return parsed.hostname;
  } catch {
    return url;
  }
}

export function extractLinks($: cheerio.CheerioAPI, baseUrl: string): { href: string; text: string; isExternal: boolean; rel: string }[] {
  const links: { href: string; text: string; isExternal: boolean; rel: string }[] = [];
  const baseDomain = extractDomain(baseUrl);

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href") || "";
    const text = $(el).text().trim().substring(0, 100);
    const rel = $(el).attr("rel") || "";

    if (href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:") || href === "#") {
      return;
    }

    try {
      const absoluteUrl = new URL(href, baseUrl).href;
      const linkDomain = extractDomain(absoluteUrl);
      links.push({
        href: absoluteUrl,
        text,
        isExternal: linkDomain !== baseDomain,
        rel,
      });
    } catch {
      // Skip invalid URLs
    }
  });

  return links;
}
