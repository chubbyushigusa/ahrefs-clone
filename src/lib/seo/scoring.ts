import type {
  SeoIssue,
  MetaAnalysis,
  HeadingAnalysis,
  ImageAnalysis,
  LinkAnalysis,
  PerformanceData,
} from "@/types";

// ====================================================================
// SEO Issue Detection — Each check references Google's official guidelines
// or widely accepted SEO best practices
// ====================================================================

export function generateSeoIssues(
  meta: MetaAnalysis,
  headings: HeadingAnalysis,
  images: ImageAnalysis,
  links: LinkAnalysis,
  html: string,
  headers: Record<string, string>,
  statusCode: number,
  loadTime: number
): SeoIssue[] {
  const issues: SeoIssue[] = [];

  // ---- Title ----
  // Google displays ~60 chars (600px); below 10 is essentially empty
  if (!meta.title) {
    issues.push({ type: "error", category: "タイトル", message: "titleタグが設定されていません", details: "Google検索結果に表示されるためtitleは必須です" });
  } else {
    if (meta.titleLength < 10) {
      issues.push({ type: "warning", category: "タイトル", message: "titleが短すぎます", details: `${meta.titleLength}文字 (推奨: 30〜60文字 / Google表示上限は約60文字)` });
    }
    if (meta.titleLength > 60) {
      issues.push({ type: "warning", category: "タイトル", message: "titleが長すぎます", details: `${meta.titleLength}文字 (推奨: 30〜60文字 / 超過分はGoogle検索結果で省略される)` });
    }
  }

  // ---- Description ----
  // Google displays ~155 chars for desktop, ~120 for mobile
  if (!meta.description) {
    issues.push({ type: "error", category: "メタディスクリプション", message: "meta descriptionが設定されていません", details: "CTR向上のために120〜155文字で設定を推奨" });
  } else {
    if (meta.descriptionLength < 50) {
      issues.push({ type: "warning", category: "メタディスクリプション", message: "meta descriptionが短すぎます", details: `${meta.descriptionLength}文字 (推奨: 120〜155文字)` });
    }
    if (meta.descriptionLength > 155) {
      issues.push({ type: "warning", category: "メタディスクリプション", message: "meta descriptionが長すぎます", details: `${meta.descriptionLength}文字 (推奨: 120〜155文字 / 超過分は省略される)` });
    }
  }

  // ---- Headings ----
  // W3C: H1 should be unique per page; heading hierarchy should not skip levels
  if (headings.h1.length === 0) {
    issues.push({ type: "error", category: "見出し", message: "H1タグが存在しません", details: "ページのメインタイトルとしてH1は1つ必要です" });
  } else if (headings.h1.length > 1) {
    issues.push({ type: "warning", category: "見出し", message: "複数のH1タグがあります", details: `${headings.h1.length}個検出。HTML5ではセクションごとのH1も許容されるが、SEO上は1つを推奨` });
  }

  if (headings.h2.length === 0 && headings.h1.length > 0) {
    issues.push({ type: "notice", category: "見出し", message: "H2タグがありません", details: "コンテンツの構造化にH2の使用を推奨（直接のランキング要因ではないが読みやすさに影響）" });
  }

  // Heading hierarchy skip check
  const levels = headings.structure.map((h) => h.level);
  for (let i = 1; i < levels.length; i++) {
    if (levels[i] - levels[i - 1] > 1) {
      issues.push({ type: "warning", category: "見出し", message: "見出しの階層がスキップされています", details: `H${levels[i - 1]}→H${levels[i]} (アクセシビリティとコンテンツ構造に影響)` });
      break;
    }
  }

  // ---- Images ----
  // WCAG 2.1 Level A: All non-decorative images must have alt text
  if (images.withoutAlt > 0) {
    issues.push({
      type: "error",
      category: "画像",
      message: `alt属性のない画像が${images.withoutAlt}個あります`,
      details: "WCAG 2.1 Level A準拠 + Google画像検索のインデックスに影響",
    });
  }

  // ---- Canonical ----
  if (!meta.canonical) {
    issues.push({ type: "warning", category: "URL", message: "canonicalタグが設定されていません", details: "重複コンテンツ問題の防止に必要（Googleの推奨）" });
  }

  // ---- Viewport ----
  // Google Mobile-First Indexing requires viewport meta
  if (!meta.viewport) {
    issues.push({ type: "error", category: "モバイル", message: "viewportメタタグが設定されていません", details: "Googleのモバイルファーストインデックスに必須" });
  }

  // ---- Language ----
  if (!meta.lang) {
    issues.push({ type: "warning", category: "国際化", message: "html lang属性が設定されていません", details: "検索エンジンとスクリーンリーダーがページ言語を判別するために使用" });
  }

  // ---- Robots ----
  if (meta.robots?.includes("noindex")) {
    issues.push({ type: "notice", category: "インデックス", message: "noindexが設定されています", details: "意図的であれば問題なし。このページはGoogleにインデックスされません" });
  }

  // ---- OGP ----
  // Required for proper SNS sharing (Facebook, LINE, Slack, etc.)
  const missingOg: string[] = [];
  if (!meta.ogTitle) missingOg.push("og:title");
  if (!meta.ogDescription) missingOg.push("og:description");
  if (!meta.ogImage) missingOg.push("og:image");
  if (missingOg.length > 0) {
    issues.push({ type: "warning", category: "ソーシャル", message: "OGPタグが不完全です", details: `不足: ${missingOg.join(", ")}（SNSシェア時の表示に影響）` });
  }

  // ---- Twitter Card ----
  if (!meta.twitterCard) {
    issues.push({ type: "notice", category: "ソーシャル", message: "Twitter Cardが設定されていません" });
  }

  // ---- Favicon ----
  if (!meta.favicon) {
    issues.push({ type: "warning", category: "一般", message: "faviconが設定されていません", details: "ブラウザタブやブックマークでの視認性に影響" });
  }

  // ---- Performance ----
  // Google Core Web Vitals: LCP should be < 2.5s
  if (loadTime > 3000) {
    issues.push({ type: "warning", category: "パフォーマンス", message: "ページの読み込みが遅い", details: `${(loadTime / 1000).toFixed(1)}秒（サーバー応答〜HTML取得の時間。Google推奨LCP < 2.5秒）` });
  }

  // ---- Status code ----
  if (statusCode >= 400) {
    issues.push({ type: "error", category: "HTTP", message: `HTTPステータスコード ${statusCode}`, details: "クロールエラーとなりインデックスされません" });
  } else if (statusCode >= 300 && statusCode < 400) {
    issues.push({ type: "notice", category: "HTTP", message: `リダイレクト (${statusCode})`, details: "リダイレクトチェーンが長いとクロール効率が下がる" });
  }

  // ---- Content length ----
  const textContent = html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const charCount = textContent.length;
  if (charCount < 300) {
    issues.push({ type: "warning", category: "コンテンツ", message: "テキストコンテンツが少ない", details: `約${charCount}文字。薄いコンテンツはGoogleに低品質と判断される可能性あり` });
  }

  // ---- Links ----
  if (links.internal === 0 && links.external === 0) {
    issues.push({ type: "warning", category: "リンク", message: "ページにリンクがありません", details: "内部リンクはクロール促進とPageRank分配に重要" });
  }

  // ---- Charset ----
  if (!meta.charset) {
    issues.push({ type: "notice", category: "一般", message: "文字コードが明示されていません", details: "文字化け防止のためUTF-8の明示を推奨" });
  }

  // ---- Security headers ----
  if (!headers["strict-transport-security"]) {
    issues.push({ type: "notice", category: "セキュリティ", message: "HSTSヘッダーが設定されていません", details: "HTTPS強制でセキュリティとSEO評価を向上" });
  }
  if (!headers["x-content-type-options"]) {
    issues.push({ type: "notice", category: "セキュリティ", message: "X-Content-Type-Optionsヘッダーが設定されていません" });
  }
  if (!headers["x-frame-options"] && !headers["content-security-policy"]) {
    issues.push({ type: "notice", category: "セキュリティ", message: "X-Frame-Options / CSPが設定されていません", details: "クリックジャッキング対策" });
  }

  return issues;
}

// ====================================================================
// SEO Score — weighted by actual impact
//
// Methodology:
// - Score starts at 100
// - Errors: things that directly prevent indexing or violate must-have standards → heavy penalty
// - Warnings: best-practice violations that impact ranking/CTR → moderate penalty
// - Notices: nice-to-have improvements → minor penalty
//
// When PageSpeed data is available, we blend it in (Google uses CWV as a ranking signal)
// ====================================================================

export function calculateSeoScore(
  issues: SeoIssue[],
  performance?: PerformanceData | null
): number {
  const errors = issues.filter((i) => i.type === "error").length;
  const warnings = issues.filter((i) => i.type === "warning").length;
  const notices = issues.filter((i) => i.type === "notice").length;

  // On-page score (60% weight when PageSpeed available, 100% otherwise)
  let onPageScore = 100;
  onPageScore -= errors * 10;   // Critical: missing title, alt, viewport
  onPageScore -= warnings * 4;  // Important: too-long title, no canonical, no OGP
  onPageScore -= notices * 1;   // Minor: no twitter card, no HSTS
  onPageScore = Math.max(0, Math.min(100, onPageScore));

  if (performance) {
    // Blend on-page checks (60%) with Google's actual Lighthouse SEO score (40%)
    const lighthouseSeo = performance.seoScore; // 0-100 from Google
    return Math.round(onPageScore * 0.6 + lighthouseSeo * 0.4);
  }

  return onPageScore;
}

// ====================================================================
// Keyword Difficulty Estimation
//
// Methodology (transparent to user):
// - Based on domain authority signals in top-10 SERP results
// - High-authority domains (Wikipedia, Amazon, etc.) indicate higher competition
// - HTTPS adoption rate of top results
// - Title optimization rate (keyword in title)
//
// Score: 0-100 (higher = harder to rank)
// This is an ESTIMATE — real KD requires backlink data (Ahrefs/Moz API)
// ====================================================================

export function estimateKeywordDifficulty(
  serpResults: { title: string; url: string; description: string }[],
  keyword?: string
): number {
  if (serpResults.length === 0) return -1; // -1 = unable to estimate

  let difficulty = 0;
  const total = Math.min(serpResults.length, 10);

  const highAuthorityDomains = [
    "wikipedia.org", "amazon.com", "amazon.co.jp", "youtube.com",
    "facebook.com", "twitter.com", "x.com", "instagram.com",
    "linkedin.com", "reddit.com", "apple.com", "microsoft.com",
    "google.com", "gov.go.jp", "go.jp", "ac.jp", "ed.jp",
    "rakuten.co.jp", "yahoo.co.jp", "nikkei.com", "nhk.or.jp",
  ];

  let authorityCount = 0;
  let httpsCount = 0;
  let titleMatchCount = 0;

  for (const result of serpResults.slice(0, 10)) {
    try {
      const url = new URL(result.url);
      const domain = url.hostname;

      // Authority signal
      if (highAuthorityDomains.some((d) => domain.endsWith(d))) {
        authorityCount++;
      }

      // HTTPS adoption
      if (url.protocol === "https:") {
        httpsCount++;
      }

      // Title optimization (keyword appears in title)
      if (keyword && result.title.toLowerCase().includes(keyword.toLowerCase())) {
        titleMatchCount++;
      }
    } catch {
      // skip
    }
  }

  // Authority component: 0-40 points
  difficulty += Math.round((authorityCount / total) * 40);

  // HTTPS component: 0-10 points (indicates established sites)
  difficulty += Math.round((httpsCount / total) * 10);

  // Title optimization: 0-30 points (indicates intentional SEO competition)
  difficulty += Math.round((titleMatchCount / total) * 30);

  // Base difficulty from result count (if Google returns 10 full results)
  difficulty += total >= 10 ? 15 : Math.round((total / 10) * 15);

  // Cap at 0-100
  return Math.max(0, Math.min(100, difficulty));
}
