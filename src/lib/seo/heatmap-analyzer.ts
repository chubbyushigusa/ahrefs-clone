import type { CheerioAPI } from "cheerio";
import type { HeatmapAnalysis, HeatmapZone, ClickTarget, HeatmapSuggestion } from "@/types";

const VIEWPORT_HEIGHT = 900;

function sanitizeHtml(html: string, url: string): string {
  let safe = html.replace(/<script[\s\S]*?<\/script>/gi, "");
  safe = safe.replace(/\son\w+\s*=\s*"[^"]*"/gi, "");
  safe = safe.replace(/\son\w+\s*=\s*'[^']*'/gi, "");
  const origin = (() => { try { return new URL(url).origin; } catch { return ""; } })();
  const baseTag = `<base href="${origin}/" target="_blank">`;
  safe = safe.replace(/<head([^>]*)>/i, `<head$1>${baseTag}`);
  if (!/<head/i.test(safe)) {
    safe = `<html><head>${baseTag}</head><body>${safe}</body></html>`;
  }
  const overrideStyle = `<style>
    * { pointer-events: none !important; cursor: default !important; }
    body { overflow: hidden !important; margin: 0 !important; }
    ::-webkit-scrollbar { display: none !important; }
  </style>`;
  safe = safe.replace(/<\/head>/i, `${overrideStyle}</head>`);
  return safe;
}

// ── Height estimation ──────────────────────────────────────
// Estimate section height from its HTML content.
// These heuristics mimic typical rendered heights.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function estimateSectionHeight($: CheerioAPI, $el: any): number {
  const text = $el.text().replace(/\s+/g, " ").trim();
  const textLen = text.length;
  const imgCount = $el.find("img").length;
  const headingCount = $el.find("h1,h2,h3,h4,h5,h6").length;
  const listItems = $el.find("li").length;
  const formFields = $el.find("input,textarea,select").length;

  let height = 80; // base padding/margin

  // Text: ~60px per 200 chars (roughly 3 lines)
  height += Math.ceil(textLen / 200) * 60;

  // Images: ~300px each on average
  height += imgCount * 300;

  // Headings add vertical space
  height += headingCount * 48;

  // Lists
  height += listItems * 32;

  // Form fields
  height += formFields * 56;

  // Clamp to realistic values
  return Math.max(120, Math.min(height, 3000));
}

// ── Deterministic hash ──────────────────────────────────────
// Simple numeric hash for deterministic but varied x positions.
function simpleHash(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) - h + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

// ── Scroll depth model ──────────────────────────────────────
// Exponential decay based on page characteristics.
// engagementFactor: 0 (boring page) → 1 (very engaging)
function computeScrollDepth(
  pageHeight: number,
  engagementFactor: number,
): { depth: number; estimatedReach: number }[] {
  // Decay rate: shorter/more engaging pages → slower decay
  // Typical web: ~50% reach at 50% depth
  // Long boring page: ~30% reach at 50% depth
  // Short engaging page: ~70% reach at 50% depth
  const pageScreens = pageHeight / VIEWPORT_HEIGHT;
  const baseLambda = 1.8 + pageScreens * 0.3; // longer page → steeper decay
  const lambda = baseLambda * (1 - engagementFactor * 0.5); // engagement reduces decay

  const milestones = [0, 10, 25, 50, 75, 90, 100];
  return milestones.map((depth) => {
    const t = depth / 100;
    const reach = Math.round(100 * Math.exp(-lambda * t));
    return { depth, estimatedReach: Math.max(3, Math.min(100, reach)) };
  });
}

// ── Engagement factor ───────────────────────────────────────
// Compute how engaging a page is (0-1) based on structure.
function computeEngagementFactor(
  imageCount: number,
  headingCount: number,
  sectionCount: number,
  hasCta: boolean,
  hasForm: boolean,
  hasVideo: boolean,
  wordCount: number,
): number {
  let score = 0;
  // Visual richness
  if (imageCount >= 5) score += 0.15;
  else if (imageCount >= 2) score += 0.10;
  else if (imageCount >= 1) score += 0.05;

  // Good structure
  if (headingCount >= 5) score += 0.15;
  else if (headingCount >= 3) score += 0.10;
  else if (headingCount >= 1) score += 0.05;

  // Section variety
  if (sectionCount >= 6) score += 0.15;
  else if (sectionCount >= 3) score += 0.10;

  // Interactive elements
  if (hasCta) score += 0.10;
  if (hasForm) score += 0.10;
  if (hasVideo) score += 0.15;

  // Content density penalty
  if (wordCount < 100) score -= 0.10;
  else if (wordCount > 3000) score -= 0.05; // too long

  return Math.max(0, Math.min(1, score));
}

export function analyzeHeatmap($: CheerioAPI, url: string, rawHtml: string): HeatmapAnalysis {
  const zones: HeatmapZone[] = [];
  const clickTargets: ClickTarget[] = [];

  const allText = $("body").text().replace(/\s+/g, " ").trim();
  const wordCount = allText.split(/\s+/).filter(Boolean).length;

  const allLinks = $("a[href]");
  const allImages = $("img");
  const allButtons = $("button, input[type='submit'], input[type='button'], [role='button']");
  const allForms = $("form");
  const allHeadings = $("h1, h2, h3, h4, h5, h6");
  const hasVideo = $("video, iframe[src*='youtube'], iframe[src*='vimeo'], [class*='video']").length > 0;

  const hasNav = $("nav, [role='navigation'], .nav, .navbar, .navigation, header nav").length > 0;
  const hasHero = $(".hero, .jumbotron, [class*='hero'], [class*='banner'], [class*='main-visual'], [class*='kv']").length > 0
    || ($("header img, .hero img, section:first-of-type img").length > 0 && allHeadings.length > 0);
  const hasCta = $("a.btn, a.button, .cta, [class*='cta'], button.primary, .btn-primary, a[class*='btn']").length > 0;
  const hasForm = allForms.length > 0;

  // ── Collect major sections ──────────────────────────────
  const processedElements = new Set<string>();
  interface SectionInfo {
    element: string;
    text: string;
    type: HeatmapZone["type"];
    childLinks: number;
    childImages: number;
    childHeadings: number;
    hasForm: boolean;
    hasCta: boolean;
    estimatedHeight: number;
  }
  const majorSections: SectionInfo[] = [];

  $("header, nav, main, section, article, aside, footer, .hero, [class*='hero'], [class*='section']").each((_, el) => {
    const $el = $(el);
    const tag = el.type === "tag" ? (el as unknown as { tagName: string }).tagName : "";
    const cls = $el.attr("class") || "";
    const id = $el.attr("id") || "";
    const key = `${tag}.${cls}#${id}`;
    if (processedElements.has(key)) return;
    processedElements.add(key);

    const text = $el.text().replace(/\s+/g, " ").trim().substring(0, 200);
    const childLinks = $el.find("a[href]").length;
    const childImages = $el.find("img").length;
    const childHeadings = $el.find("h1, h2, h3, h4, h5, h6").length;
    const sectionHasForm = $el.find("form").length > 0;
    const sectionHasCta = $el.find(".btn, .button, .cta, [class*='btn'], [class*='cta']").length > 0;

    let type: HeatmapZone["type"] = "other";
    if (tag === "nav" || cls.includes("nav")) type = "nav";
    else if (tag === "header" && majorSections.length === 0) type = "hero";
    else if (cls.includes("hero") || cls.includes("banner") || cls.includes("kv") || cls.includes("main-visual")) type = "hero";
    else if (tag === "footer" || cls.includes("footer")) type = "footer";
    else if (sectionHasForm) type = "form";
    else if (sectionHasCta) type = "cta";
    else if (childImages > 0 && text.length < 100) type = "image";
    else if (childHeadings > 0) type = "heading";
    else type = "text";

    const estimatedHeight = estimateSectionHeight($, $el);

    majorSections.push({
      element: `${tag}${cls ? "." + cls.split(" ")[0] : ""}${id ? "#" + id : ""}`,
      text: text.substring(0, 100),
      type,
      childLinks,
      childImages,
      childHeadings,
      hasForm: sectionHasForm,
      hasCta: sectionHasCta,
      estimatedHeight,
    });
  });

  if (majorSections.length === 0) {
    majorSections.push(
      { element: "header", text: $("header").text().substring(0, 100) || "Header", type: "hero", childLinks: 0, childImages: 0, childHeadings: 0, hasForm: false, hasCta: false, estimatedHeight: 400 },
      { element: "body", text: allText.substring(0, 100), type: "text", childLinks: allLinks.length, childImages: allImages.length, childHeadings: allHeadings.length, hasForm, hasCta, estimatedHeight: Math.max(600, Math.ceil(wordCount / 3) * 20) },
      { element: "footer", text: $("footer").text().substring(0, 100) || "Footer", type: "footer", childLinks: 0, childImages: 0, childHeadings: 0, hasForm: false, hasCta: false, estimatedHeight: 250 },
    );
  }

  // ── Compute cumulative heights ────────────────────────────
  let cumulativeY = 0;
  const sectionOffsets: number[] = [];
  for (const section of majorSections) {
    sectionOffsets.push(cumulativeY);
    cumulativeY += section.estimatedHeight;
  }
  const estimatedPageHeight = cumulativeY;

  // ── Engagement factor ────────────────────────────────────
  const engagement = computeEngagementFactor(
    allImages.length,
    allHeadings.length,
    majorSections.length,
    hasCta,
    hasForm,
    hasVideo,
    wordCount,
  );

  // ── Scroll depth (page-specific) ─────────────────────────
  const scrollDepth = computeScrollDepth(estimatedPageHeight, engagement);

  // Helper: get scroll reach at a given y-offset
  function getReachAtY(y: number): number {
    const depthPct = (y / Math.max(estimatedPageHeight, 1)) * 100;
    // Interpolate from scrollDepth milestones
    for (let i = 0; i < scrollDepth.length - 1; i++) {
      const a = scrollDepth[i];
      const b = scrollDepth[i + 1];
      if (depthPct >= a.depth && depthPct <= b.depth) {
        const t = (depthPct - a.depth) / (b.depth - a.depth);
        return Math.round(a.estimatedReach + t * (b.estimatedReach - a.estimatedReach));
      }
    }
    return scrollDepth[scrollDepth.length - 1].estimatedReach;
  }

  // ── Build zones ─────────────────────────────────────────
  majorSections.forEach((section, i) => {
    const yOffset = sectionOffsets[i];
    const isAboveFold = yOffset < VIEWPORT_HEIGHT;

    // Attention score based on: scroll reach + content type bonus + structural bonus
    const scrollReach = getReachAtY(yOffset);
    let attention = Math.round(scrollReach * 0.6); // base from scroll reach

    // Content type bonus
    if (section.type === "hero") attention += 25;
    else if (section.type === "cta") attention += 18;
    else if (section.type === "form") attention += 12;
    else if (section.type === "heading") attention += 8;
    else if (section.type === "nav") attention -= 5;
    else if (section.type === "footer") attention -= 10;

    // Structural bonuses
    if (isAboveFold) attention += 12;
    if (section.childImages > 0) attention += 6;
    if (section.childHeadings > 0) attention += 4;
    if (section.hasCta) attention += 8;
    if (section.hasForm) attention += 5;

    // Content density: very short text → less attention
    if (section.text.length < 20 && section.childImages === 0) attention -= 10;

    attention = Math.max(3, Math.min(100, attention));

    zones.push({
      index: i,
      selector: section.element,
      yOffset,
      height: section.estimatedHeight,
      attentionScore: attention,
      scrollReach,
      content: section.text,
      type: section.type,
    });
  });

  // ── Click targets ─────────────────────────────────────────
  let linkIndex = 0;
  allLinks.each((_, el) => {
    const $el = $(el);
    const href = $el.attr("href") || "";
    const text = $el.text().replace(/\s+/g, " ").trim().substring(0, 80);
    const cls = $el.attr("class") || "";
    if (!href || href === "#" || !text) return;
    const isNav = $el.closest("nav, header, [role='navigation']").length > 0;
    const isFooter = $el.closest("footer").length > 0;
    const isCta = cls.includes("btn") || cls.includes("button") || cls.includes("cta");

    // Determine y position: find matching zone by traversing up
    let yPos = 0;
    let aboveFold = false;
    let matchedZone = false;
    for (const zone of zones) {
      if ($el.closest(zone.selector).length > 0) {
        // Deterministic position within zone based on link index
        const offsetInZone = ((linkIndex * 137 + simpleHash(text)) % 100) / 100;
        yPos = zone.yOffset + Math.round(offsetInZone * zone.height * 0.8) + 20;
        aboveFold = zone.yOffset < VIEWPORT_HEIGHT;
        matchedZone = true;
        break;
      }
    }
    if (!matchedZone) {
      const ratio = linkIndex / Math.max(allLinks.length, 1);
      yPos = Math.round(ratio * estimatedPageHeight);
      aboveFold = yPos < VIEWPORT_HEIGHT;
    }

    // Prominence: how likely users are to click this
    let prominence = 25;
    if (isCta) prominence += 45;
    else if (isNav) prominence += 15;
    else if (isFooter) prominence -= 15;

    // Position bonus: higher position = more visible
    const scrollReachAtPos = getReachAtY(yPos);
    prominence += Math.round(scrollReachAtPos * 0.2);

    // Text quality bonus
    if (text.length >= 3 && text.length <= 30) prominence += 5;

    let type: ClickTarget["type"] = "link";
    if (isCta) type = "button";
    if (isNav) type = "nav-link";
    if ($el.find("img").length > 0) type = "image-link";

    prominence = Math.max(3, Math.min(100, prominence));
    clickTargets.push({ label: text || href.substring(0, 50), href, type, prominence, yPosition: yPos, aboveFold });
    linkIndex++;
  });

  allButtons.each((_, el) => {
    const $el = $(el);
    const text = $el.text().replace(/\s+/g, " ").trim() || $el.attr("value") || "Button";

    // Find zone for this button
    let yPos = Math.round(estimatedPageHeight * 0.15);
    for (const zone of zones) {
      if ($el.closest(zone.selector).length > 0) {
        yPos = zone.yOffset + Math.round(zone.height * 0.5);
        break;
      }
    }

    const scrollReachAtPos = getReachAtY(yPos);
    const prominence = Math.min(100, 50 + Math.round(scrollReachAtPos * 0.3));

    clickTargets.push({
      label: text.substring(0, 80),
      href: "#",
      type: "button",
      prominence,
      yPosition: yPos,
      aboveFold: yPos < VIEWPORT_HEIGHT,
    });
  });

  clickTargets.sort((a, b) => b.prominence - a.prominence);

  // ── Suggestions ──────────────────────────────────────────
  const suggestions: HeatmapSuggestion[] = [];
  const hasCtaAboveFold = clickTargets.some((t) => t.aboveFold && (t.type === "button" || t.prominence >= 70));
  if (!hasCtaAboveFold) suggestions.push({ type: "click", severity: "high", message: "ファーストビューにCTAがありません", details: "ファーストビュー（スクロールなしで見える範囲）に明確なCTA（行動喚起）ボタンを配置することで、コンバージョン率が大幅に向上します。" });
  if (!hasHero) suggestions.push({ type: "attention", severity: "medium", message: "ヒーローセクションが検出されませんでした", details: "ページ上部に大きな画像やキャッチコピーを含むヒーローセクションを配置すると、ユーザーの注目を集め滞在時間が向上します。" });
  if (wordCount < 300) suggestions.push({ type: "content", severity: "high", message: "コンテンツ量が不足しています", details: `現在のページのテキスト量は約${wordCount}語です。最低でも300語以上のコンテンツが推奨されます。` });
  if (allImages.length === 0) suggestions.push({ type: "attention", severity: "medium", message: "画像がありません", details: "テキストのみのページはユーザーの注目を集めにくく、離脱率が高くなります。" });
  if (!hasForm && !hasCta) suggestions.push({ type: "click", severity: "medium", message: "コンバージョンポイントがありません", details: "お問い合わせフォーム、申し込みボタンなどのアクション要素がありません。" });

  const h1Count = $("h1").length;
  if (h1Count === 0) suggestions.push({ type: "content", severity: "high", message: "H1見出しがありません", details: "H1見出しはページの主題を示す最も重要な要素です。" });
  else if (h1Count > 1) suggestions.push({ type: "content", severity: "medium", message: `H1見出しが${h1Count}個あります`, details: "H1見出しは1ページにつき1つが推奨されます。" });

  if (zones.length < 3 && wordCount > 500) suggestions.push({ type: "scroll", severity: "medium", message: "ページの構造化が不十分です", details: "長いコンテンツをセクションに分割し、見出しや画像で区切ることで読了率が向上します。" });

  // Scroll depth specific suggestions
  const reach50 = scrollDepth.find((s) => s.depth === 50);
  if (reach50 && reach50.estimatedReach < 40) {
    suggestions.push({ type: "scroll", severity: "high", message: "ページ中盤で大量に離脱しています", details: `ページ50%地点での推定到達率が${reach50.estimatedReach}%です。コンテンツの構成や視覚要素を改善して離脱を防ぎましょう。` });
  }
  if (engagement < 0.2) {
    suggestions.push({ type: "attention", severity: "high", message: "ページのエンゲージメント要素が不足", details: "画像、動画、CTA、フォームなどのインタラクティブ要素を追加してユーザーエンゲージメントを高めましょう。" });
  }

  const pageHtml = sanitizeHtml(rawHtml, url);

  return {
    url,
    pageHtml,
    pageHeight: estimatedPageHeight,
    viewportHeight: VIEWPORT_HEIGHT,
    totalSections: zones.length,
    zones,
    clickTargets: clickTargets.slice(0, 50),
    scrollDepth,
    structure: { hasHero, hasCta, hasForm, hasNav, imageCount: allImages.length, linkCount: allLinks.length, wordCount, sectionCount: zones.length },
    suggestions,
  };
}
