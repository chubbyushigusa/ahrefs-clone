import type { CheerioAPI } from "cheerio";
import type { MetaAnalysis } from "@/types";

export function analyzeMetaTags($: CheerioAPI, url: string): MetaAnalysis {
  const title = $("title").first().text().trim() || null;
  const description = $('meta[name="description"]').attr("content")?.trim() || null;
  const canonical = $('link[rel="canonical"]').attr("href") || null;
  const robots = $('meta[name="robots"]').attr("content") || null;
  const viewport = $('meta[name="viewport"]').attr("content") || null;
  const charset = $("meta[charset]").attr("charset") || $('meta[http-equiv="Content-Type"]').attr("content")?.match(/charset=([^\s;]+)/)?.[1] || null;

  const ogTitle = $('meta[property="og:title"]').attr("content") || null;
  const ogDescription = $('meta[property="og:description"]').attr("content") || null;
  const ogImage = $('meta[property="og:image"]').attr("content") || null;
  const twitterCard = $('meta[name="twitter:card"]').attr("content") || null;

  const lang = $("html").attr("lang") || null;

  let favicon = $('link[rel="icon"]').attr("href") || $('link[rel="shortcut icon"]').attr("href") || null;
  if (favicon && !favicon.startsWith("http")) {
    try {
      favicon = new URL(favicon, url).href;
    } catch {}
  }

  const hreflang: { lang: string; url: string }[] = [];
  $('link[rel="alternate"][hreflang]').each((_, el) => {
    const lang = $(el).attr("hreflang");
    const href = $(el).attr("href");
    if (lang && href) {
      hreflang.push({ lang, url: href });
    }
  });

  return {
    title,
    titleLength: title?.length || 0,
    description,
    descriptionLength: description?.length || 0,
    canonical,
    robots,
    viewport,
    charset,
    ogTitle,
    ogDescription,
    ogImage,
    twitterCard,
    lang,
    favicon,
    hreflang,
  };
}

export function analyzeHeadings($: CheerioAPI) {
  const headings: { level: number; text: string }[] = [];
  const hMap: Record<string, string[]> = { h1: [], h2: [], h3: [], h4: [], h5: [], h6: [] };

  for (let i = 1; i <= 6; i++) {
    $(`h${i}`).each((_, el) => {
      const text = $(el).text().trim().substring(0, 200);
      hMap[`h${i}`].push(text);
      headings.push({ level: i, text });
    });
  }

  return {
    h1: hMap.h1,
    h2: hMap.h2,
    h3: hMap.h3,
    h4: hMap.h4,
    h5: hMap.h5,
    h6: hMap.h6,
    structure: headings,
  };
}

export function analyzeImages($: CheerioAPI, baseUrl: string) {
  const images: { src: string; alt: string; width?: string; height?: string }[] = [];
  let withAlt = 0;
  let withoutAlt = 0;

  $("img").each((_, el) => {
    const src = $(el).attr("src") || "";
    const alt = $(el).attr("alt") || "";
    const width = $(el).attr("width");
    const height = $(el).attr("height");

    let absoluteSrc = src;
    if (src && !src.startsWith("data:")) {
      try {
        absoluteSrc = new URL(src, baseUrl).href;
      } catch {}
    }

    if (alt.trim()) {
      withAlt++;
    } else {
      withoutAlt++;
    }

    images.push({ src: absoluteSrc, alt, width, height });
  });

  const largeImages = images.filter(img => !img.src.startsWith("data:")).slice(0, 20);

  return {
    total: images.length,
    withAlt,
    withoutAlt,
    largeImages: largeImages.map(img => ({ src: img.src, alt: img.alt })),
    images,
  };
}
