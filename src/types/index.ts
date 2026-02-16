export interface SeoAnalysis {
  url: string;
  domain: string;
  title: string;
  description: string;
  score: number;
  performance: PerformanceData | null;
  backlinks: BacklinkData | null;
  meta: MetaAnalysis;
  headings: HeadingAnalysis;
  images: ImageAnalysis;
  links: LinkAnalysis;
  technologies: string[];
  dns: DnsInfo | null;
  issues: SeoIssue[];
}

export interface BacklinkData {
  domainAuthority: number;
  pageAuthority: number;
  spamScore: number;
  linkingDomains: number;
  totalBacklinks: number;
  source: "moz-api";
}

export interface PerformanceData {
  performanceScore: number;
  seoScore: number;
  accessibilityScore: number;
  bestPracticesScore: number;
  fcp: number;
  lcp: number;
  cls: number;
  tbt: number;
  speedIndex: number;
}

export interface MetaAnalysis {
  title: string | null;
  titleLength: number;
  description: string | null;
  descriptionLength: number;
  canonical: string | null;
  robots: string | null;
  viewport: string | null;
  charset: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  twitterCard: string | null;
  lang: string | null;
  favicon: string | null;
  hreflang: { lang: string; url: string }[];
}

export interface HeadingAnalysis {
  h1: string[];
  h2: string[];
  h3: string[];
  h4: string[];
  h5: string[];
  h6: string[];
  structure: { level: number; text: string }[];
}

export interface ImageAnalysis {
  total: number;
  withAlt: number;
  withoutAlt: number;
  largeImages: { src: string; alt: string }[];
  images: { src: string; alt: string; width?: string; height?: string }[];
}

export interface LinkAnalysis {
  internal: number;
  external: number;
  broken: number;
  nofollow: number;
  links: { href: string; text: string; isExternal: boolean; rel: string }[];
}

export interface DnsInfo {
  a: string[];
  aaaa: string[];
  mx: { exchange: string; priority: number }[];
  ns: string[];
  txt: string[];
  cname: string[];
}

export interface SeoIssue {
  type: "error" | "warning" | "notice";
  category: string;
  message: string;
  details?: string;
}

export interface KeywordResult {
  keyword: string;
  suggestions: string[];
  difficulty: number;
  /** Google検索結果数（フォーマット済み文字列） */
  totalResults: string;
  /** SERP データの取得元 */
  serpSource: "serper" | "unavailable";
  serpResults: SerpResult[];
  relatedKeywords: string[];
  /** 検索意図分析 */
  searchIntent: SearchIntentResult;
  /** サジェストKWの検索意図分布 */
  intentDistribution: { intent: SearchIntentType; count: number }[];
}

export interface SerpResult {
  position: number;
  title: string;
  url: string;
  description: string;
  domain: string;
}

export interface AuditResult {
  id: string;
  domain: string;
  score: number;
  totalPages: number;
  crawledPages: number;
  errors: number;
  warnings: number;
  notices: number;
  issues: SeoIssue[];
  pages: AuditPageResult[];
  categories: AuditCategory[];
}

export interface AuditPageResult {
  url: string;
  statusCode: number;
  title: string;
  loadTime: number;
  issues: SeoIssue[];
}

export interface AuditCategory {
  name: string;
  score: number;
  maxScore: number;
  issues: SeoIssue[];
}

export interface CompetitorData {
  domain: string;
  scores: {
    seo: number;
    performance: number;
    content: number;
    technical: number;
    domainAuthority: number;
    backlinks: number;
  };
  meta: MetaAnalysis;
  technologies: string[];
}

// ─── Search Intent ───────────────────────────────────────────

export type SearchIntentType =
  | "informational"
  | "navigational"
  | "commercial"
  | "transactional";

export interface SearchIntentResult {
  keyword: string;
  intent: SearchIntentType;
  confidence: number; // 0-100
  signals: string[];
}

// ─── Heatmap Analysis ────────────────────────────────────────

export interface HeatmapZone {
  /** Section index from top */
  index: number;
  /** Selector or descriptive label */
  selector: string;
  /** Estimated Y offset (px from top) */
  yOffset: number;
  /** Section height (px) */
  height: number;
  /** Attention score 0-100 (higher = more attention) */
  attentionScore: number;
  /** Estimated scroll reach % (how many users see this section) */
  scrollReach: number;
  /** Content summary */
  content: string;
  /** Content type */
  type: "hero" | "heading" | "text" | "image" | "cta" | "nav" | "form" | "footer" | "other";
}

export interface ClickTarget {
  /** Element tag + text */
  label: string;
  /** Link URL or action */
  href: string;
  /** Element type */
  type: "link" | "button" | "form" | "image-link" | "nav-link";
  /** Estimated prominence score 0-100 */
  prominence: number;
  /** Position from top */
  yPosition: number;
  /** Is above the fold */
  aboveFold: boolean;
}

export interface HeatmapAnalysis {
  url: string;
  /** Sanitized HTML for iframe preview */
  pageHtml: string;
  /** Total page height estimate */
  pageHeight: number;
  /** Viewport height estimate */
  viewportHeight: number;
  /** Number of sections analyzed */
  totalSections: number;
  /** Attention zones from top to bottom */
  zones: HeatmapZone[];
  /** All clickable targets ranked by prominence */
  clickTargets: ClickTarget[];
  /** Scroll depth milestones */
  scrollDepth: { depth: number; estimatedReach: number }[];
  /** Page structure summary */
  structure: {
    hasHero: boolean;
    hasCta: boolean;
    hasForm: boolean;
    hasNav: boolean;
    imageCount: number;
    linkCount: number;
    wordCount: number;
    sectionCount: number;
  };
  /** Improvement suggestions */
  suggestions: HeatmapSuggestion[];
}

export interface HeatmapSuggestion {
  type: "attention" | "scroll" | "click" | "content";
  severity: "high" | "medium" | "low";
  message: string;
  details: string;
}

// ─── Content Gap Analysis ────────────────────────────────────

export interface ContentGapResult {
  url: string;
  domain: string;
  /** Keywords the page currently targets */
  currentKeywords: string[];
  /** Missing topics/keywords competitors cover */
  missingTopics: ContentGapItem[];
  /** Content improvement suggestions */
  improvements: ContentImprovement[];
  /** Competitor pages that rank for related terms */
  competitorPages: CompetitorPage[];
}

export interface ContentGapItem {
  keyword: string;
  /** Estimated search intent */
  intent: SearchIntentType;
  /** How many top-10 competitors cover this topic */
  competitorCoverage: number;
  /** Priority score 0-100 */
  priority: number;
}

export interface ContentImprovement {
  category: "title" | "meta" | "headings" | "content" | "links" | "images" | "schema" | "ux";
  severity: "high" | "medium" | "low";
  current: string;
  recommended: string;
  impact: string;
}

export interface CompetitorPage {
  url: string;
  domain: string;
  title: string;
  position: number;
  /** Topics this competitor covers that target page doesn't */
  uniqueTopics: string[];
}

// ─── Position Distribution ───────────────────────────────────

export interface PositionDistribution {
  range: string;
  count: number;
  keywords: string[];
}
