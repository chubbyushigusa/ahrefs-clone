import type { PerformanceData } from "@/types";

export async function getPageSpeedData(url: string): Promise<PerformanceData | null> {
  const apiKey = process.env.PAGESPEED_API_KEY;
  const apiUrl = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
  apiUrl.searchParams.set("url", url);
  apiUrl.searchParams.set("category", "performance");
  apiUrl.searchParams.set("category", "seo");
  apiUrl.searchParams.set("category", "accessibility");
  apiUrl.searchParams.set("category", "best-practices");
  apiUrl.searchParams.set("strategy", "mobile");

  if (apiKey) {
    apiUrl.searchParams.set("key", apiKey);
  }

  try {
    const response = await fetch(apiUrl.toString(), {
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const categories = data.lighthouseResult?.categories || {};
    const audits = data.lighthouseResult?.audits || {};

    return {
      performanceScore: Math.round((categories.performance?.score || 0) * 100),
      seoScore: Math.round((categories.seo?.score || 0) * 100),
      accessibilityScore: Math.round((categories.accessibility?.score || 0) * 100),
      bestPracticesScore: Math.round((categories["best-practices"]?.score || 0) * 100),
      fcp: audits["first-contentful-paint"]?.numericValue || 0,
      lcp: audits["largest-contentful-paint"]?.numericValue || 0,
      cls: audits["cumulative-layout-shift"]?.numericValue || 0,
      tbt: audits["total-blocking-time"]?.numericValue || 0,
      speedIndex: audits["speed-index"]?.numericValue || 0,
    };
  } catch {
    return null;
  }
}
