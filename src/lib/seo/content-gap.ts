import type { CheerioAPI } from "cheerio";
import type {
  ContentGapResult,
  ContentGapItem,
  ContentImprovement,
  CompetitorPage,
  MetaAnalysis,
  HeadingAnalysis,
  ImageAnalysis,
  LinkAnalysis,
  SerpResult,
} from "@/types";
import { classifySearchIntent } from "./search-intent";

/**
 * Analyze content gaps by comparing a page against SERP competitors.
 */
export function analyzeContentGap(
  url: string,
  domain: string,
  $: CheerioAPI,
  html: string,
  meta: MetaAnalysis,
  headings: HeadingAnalysis,
  images: ImageAnalysis,
  links: LinkAnalysis,
  serpResults: SerpResult[],
  competitorTexts: { url: string; domain: string; title: string; keywords: string[] }[]
): ContentGapResult {
  // Extract current page keywords from content
  const currentKeywords = extractKeywordsFromPage($, meta, headings);

  // Find missing topics from competitor analysis
  const missingTopics = findMissingTopics(currentKeywords, competitorTexts);

  // Generate content improvements
  const improvements = generateImprovements(meta, headings, images, links, html);

  // Build competitor page list
  const competitorPages: CompetitorPage[] = competitorTexts.slice(0, 10).map((comp, i) => {
    const uniqueTopics = comp.keywords.filter(
      (k) => !currentKeywords.some((ck) => ck.toLowerCase() === k.toLowerCase())
    );
    return {
      url: comp.url,
      domain: comp.domain,
      title: comp.title,
      position: i + 1,
      uniqueTopics: uniqueTopics.slice(0, 10),
    };
  });

  return {
    url,
    domain,
    currentKeywords,
    missingTopics,
    improvements,
    competitorPages,
  };
}

function extractKeywordsFromPage($: CheerioAPI, meta: MetaAnalysis, headings: HeadingAnalysis): string[] {
  const keywords = new Set<string>();

  // From title
  if (meta.title) {
    splitIntoKeywords(meta.title).forEach((k) => keywords.add(k));
  }

  // From meta description
  if (meta.description) {
    splitIntoKeywords(meta.description).forEach((k) => keywords.add(k));
  }

  // From headings
  [...headings.h1, ...headings.h2, ...headings.h3].forEach((h) => {
    splitIntoKeywords(h).forEach((k) => keywords.add(k));
  });

  // From meta keywords if present
  const metaKeywords = $('meta[name="keywords"]').attr("content");
  if (metaKeywords) {
    metaKeywords.split(",").map((k) => k.trim()).filter(Boolean).forEach((k) => keywords.add(k));
  }

  return Array.from(keywords).slice(0, 50);
}

function splitIntoKeywords(text: string): string[] {
  // Remove common stop words and split into meaningful terms
  const stopWords = new Set([
    "の", "に", "は", "を", "た", "が", "で", "て", "と", "し", "れ", "さ",
    "ある", "いる", "する", "も", "な", "こと", "これ", "それ", "あれ",
    "この", "その", "あの", "ため", "から", "まで", "より", "など",
    "the", "a", "an", "is", "are", "was", "were", "be", "been",
    "have", "has", "had", "do", "does", "did", "will", "would",
    "could", "should", "may", "might", "and", "or", "but", "in",
    "on", "at", "to", "for", "of", "with", "by", "from", "as",
    "into", "about", "like", "through", "after", "over", "between",
  ]);

  return text
    .replace(/[「」【】（）()[\]{}|/\\<>、。,.:;!?！？・]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !stopWords.has(w.toLowerCase()))
    .slice(0, 20);
}

function findMissingTopics(
  currentKeywords: string[],
  competitorTexts: { keywords: string[] }[]
): ContentGapItem[] {
  const currentSet = new Set(currentKeywords.map((k) => k.toLowerCase()));
  const topicCounts = new Map<string, number>();

  // Count how many competitors mention each topic
  for (const comp of competitorTexts) {
    const seen = new Set<string>();
    for (const keyword of comp.keywords) {
      const lower = keyword.toLowerCase();
      if (!currentSet.has(lower) && !seen.has(lower)) {
        seen.add(lower);
        topicCounts.set(lower, (topicCounts.get(lower) || 0) + 1);
      }
    }
  }

  // Convert to ContentGapItem and sort by coverage
  const items: ContentGapItem[] = [];
  for (const [keyword, count] of topicCounts) {
    if (count < 2) continue; // Only include topics 2+ competitors cover

    const intentResult = classifySearchIntent(keyword);
    const priority = Math.min(100, Math.round((count / Math.max(competitorTexts.length, 1)) * 100));

    items.push({
      keyword,
      intent: intentResult.intent,
      competitorCoverage: count,
      priority,
    });
  }

  return items.sort((a, b) => b.priority - a.priority).slice(0, 30);
}

function generateImprovements(
  meta: MetaAnalysis,
  headings: HeadingAnalysis,
  images: ImageAnalysis,
  links: LinkAnalysis,
  html: string
): ContentImprovement[] {
  const improvements: ContentImprovement[] = [];

  // Title analysis
  if (!meta.title) {
    improvements.push({
      category: "title",
      severity: "high",
      current: "未設定",
      recommended: "ターゲットキーワードを含む30〜60文字のタイトルを設定",
      impact: "検索結果のCTR向上、キーワード順位改善",
    });
  } else if (meta.titleLength < 10) {
    improvements.push({
      category: "title",
      severity: "high",
      current: `${meta.titleLength}文字 (短すぎ)`,
      recommended: "30〜60文字のタイトルに拡張。キーワードを先頭に配置",
      impact: "検索結果でのクリック率向上",
    });
  } else if (meta.titleLength > 60) {
    improvements.push({
      category: "title",
      severity: "medium",
      current: `${meta.titleLength}文字 (長すぎ)`,
      recommended: "60文字以内に短縮。重要なキーワードを先頭に",
      impact: "検索結果での表示切れ防止",
    });
  }

  // Meta description
  if (!meta.description) {
    improvements.push({
      category: "meta",
      severity: "high",
      current: "未設定",
      recommended: "70〜155文字のメタディスクリプションを設定。行動喚起を含める",
      impact: "検索結果CTR 5-10%向上が期待できる",
    });
  } else if (meta.descriptionLength < 50) {
    improvements.push({
      category: "meta",
      severity: "medium",
      current: `${meta.descriptionLength}文字`,
      recommended: "70〜155文字に拡張。ユーザーベネフィットと行動喚起を含める",
      impact: "検索結果でのクリック率向上",
    });
  }

  // Heading structure
  if (headings.h1.length === 0) {
    improvements.push({
      category: "headings",
      severity: "high",
      current: "H1見出しなし",
      recommended: "ターゲットキーワードを含むH1見出しを1つ設定",
      impact: "ページのテーマ明確化、キーワード順位改善",
    });
  }
  if (headings.h2.length === 0) {
    improvements.push({
      category: "headings",
      severity: "medium",
      current: "H2見出しなし",
      recommended: "コンテンツをH2見出しで区切り、関連キーワードを含める",
      impact: "ユーザー読了率向上、関連キーワードでの順位獲得",
    });
  }

  // Content length
  const textContent = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const charCount = textContent.length;

  if (charCount < 500) {
    improvements.push({
      category: "content",
      severity: "high",
      current: `約${charCount}文字`,
      recommended: "最低でも1,000文字以上のコンテンツを追加。ユーザーの疑問に答える内容を充実させる",
      impact: "薄いコンテンツペナルティ回避、滞在時間向上",
    });
  } else if (charCount < 2000) {
    improvements.push({
      category: "content",
      severity: "medium",
      current: `約${charCount}文字`,
      recommended: "2,000〜3,000文字程度まで拡充。関連トピックの深掘り、FAQ追加を検討",
      impact: "キーワード網羅性向上、ロングテール獲得",
    });
  }

  // Images
  if (images.total === 0) {
    improvements.push({
      category: "images",
      severity: "medium",
      current: "画像なし",
      recommended: "関連する画像を3〜5枚追加。alt属性にキーワードを含める",
      impact: "画像検索からの流入獲得、ユーザー体験向上",
    });
  } else if (images.withoutAlt > 0) {
    improvements.push({
      category: "images",
      severity: "medium",
      current: `${images.withoutAlt}枚のalt属性なし画像`,
      recommended: "全ての画像にキーワードを含むalt属性を設定",
      impact: "画像SEO改善、アクセシビリティ向上",
    });
  }

  // Internal links
  if (links.internal < 3) {
    improvements.push({
      category: "links",
      severity: "medium",
      current: `内部リンク${links.internal}個`,
      recommended: "関連ページへの内部リンクを5〜10個追加。アンカーテキストにキーワードを含める",
      impact: "クロール効率向上、ページ間のリンクジュース循環",
    });
  }

  // Schema markup
  const hasSchema = html.includes("application/ld+json") || html.includes("itemtype=");
  if (!hasSchema) {
    improvements.push({
      category: "schema",
      severity: "medium",
      current: "構造化データなし",
      recommended: "JSON-LD形式で適切な構造化データを追加（Article, LocalBusiness, Product等）",
      impact: "リッチスニペット表示、CTR向上",
    });
  }

  // Canonical
  if (!meta.canonical) {
    improvements.push({
      category: "meta",
      severity: "medium",
      current: "canonical未設定",
      recommended: "正規URLをcanonicalタグで指定",
      impact: "重複コンテンツ問題の防止",
    });
  }

  // OGP
  if (!meta.ogTitle || !meta.ogDescription || !meta.ogImage) {
    const missing = [];
    if (!meta.ogTitle) missing.push("og:title");
    if (!meta.ogDescription) missing.push("og:description");
    if (!meta.ogImage) missing.push("og:image");
    improvements.push({
      category: "meta",
      severity: "low",
      current: `OGP不完全 (${missing.join(", ")} が未設定)`,
      recommended: "全てのOGPタグを設定してSNSシェア時の表示を最適化",
      impact: "SNSからの流入品質向上",
    });
  }

  // Mobile viewport
  if (!meta.viewport) {
    improvements.push({
      category: "ux",
      severity: "high",
      current: "viewport未設定",
      recommended: 'viewportメタタグを追加: <meta name="viewport" content="width=device-width, initial-scale=1">',
      impact: "モバイルフレンドリー必須要件",
    });
  }

  return improvements.sort((a, b) => {
    const sevOrder = { high: 0, medium: 1, low: 2 };
    return sevOrder[a.severity] - sevOrder[b.severity];
  });
}

/**
 * Extract keyword-like terms from competitor page data (SERP results).
 */
export function extractCompetitorKeywords(title: string, description: string): string[] {
  const combined = `${title} ${description}`;
  return splitIntoKeywords(combined);
}
