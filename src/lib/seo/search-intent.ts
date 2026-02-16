import type { SearchIntentType, SearchIntentResult } from "@/types";

// Pattern-based keyword intent classification
// Based on modifier words that strongly signal user intent

const TRANSACTIONAL_MODIFIERS = [
  "買う", "購入", "注文", "申し込み", "契約", "予約", "ダウンロード",
  "登録", "サインアップ", "入会", "加入", "お試し", "無料体験",
  "buy", "purchase", "order", "subscribe", "download", "sign up",
  "coupon", "discount", "deal", "cheap", "price", "pricing",
  "クーポン", "割引", "セール", "安い", "最安", "料金", "価格",
  "送料無料", "即日", "通販",
];

const COMMERCIAL_MODIFIERS = [
  "おすすめ", "比較", "ランキング", "レビュー", "口コミ", "評判",
  "人気", "最新", "選び方", "メリット", "デメリット", "違い",
  "best", "top", "review", "comparison", "vs", "versus",
  "alternative", "recommend", "rating",
  "ベスト", "トップ", "代替", "乗り換え",
];

const INFORMATIONAL_MODIFIERS = [
  "とは", "方法", "やり方", "仕方", "使い方", "始め方",
  "意味", "定義", "解説", "説明", "仕組み", "原因", "理由",
  "なぜ", "どうして", "いつ", "どこ", "何",
  "how to", "what is", "why", "when", "where", "who",
  "guide", "tutorial", "tips", "例", "一覧", "まとめ",
  "歴史", "種類", "特徴", "効果", "コツ",
];

const NAVIGATIONAL_MODIFIERS = [
  "公式", "ログイン", "マイページ", "サイト", "ホームページ",
  "アプリ", "ダウンロードページ", "カスタマーサポート",
  "login", "sign in", "official", "website", "app",
  "homepage", "account", "support", "contact",
  ".com", ".jp", ".co.jp", ".net", ".org",
];

function countMatches(keyword: string, modifiers: string[]): { count: number; matched: string[] } {
  const lower = keyword.toLowerCase();
  const matched: string[] = [];
  for (const mod of modifiers) {
    if (lower.includes(mod.toLowerCase())) {
      matched.push(mod);
    }
  }
  return { count: matched.length, matched };
}

export function classifySearchIntent(keyword: string): SearchIntentResult {
  const transactional = countMatches(keyword, TRANSACTIONAL_MODIFIERS);
  const commercial = countMatches(keyword, COMMERCIAL_MODIFIERS);
  const informational = countMatches(keyword, INFORMATIONAL_MODIFIERS);
  const navigational = countMatches(keyword, NAVIGATIONAL_MODIFIERS);

  const scores: { intent: SearchIntentType; score: number; signals: string[] }[] = [
    { intent: "transactional", score: transactional.count * 3, signals: transactional.matched },
    { intent: "commercial", score: commercial.count * 2.5, signals: commercial.matched },
    { intent: "informational", score: informational.count * 2, signals: informational.matched },
    { intent: "navigational", score: navigational.count * 3, signals: navigational.matched },
  ];

  // Question patterns strongly signal informational
  if (/^(how|what|why|when|where|who|which|can|do|does|is|are)\b/i.test(keyword)) {
    scores[2].score += 4;
    scores[2].signals.push("question-pattern");
  }
  if (/[？?]$/.test(keyword)) {
    scores[2].score += 3;
    scores[2].signals.push("question-mark");
  }

  // Brand-like patterns signal navigational
  if (/^[A-Z][a-z]+(?:\s[A-Z][a-z]+)*$/.test(keyword.trim())) {
    scores[3].score += 2;
    scores[3].signals.push("brand-pattern");
  }

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score);

  const top = scores[0];
  const totalScore = scores.reduce((sum, s) => sum + s.score, 0);

  // If no signals, default to informational (most common intent)
  if (totalScore === 0) {
    return {
      keyword,
      intent: "informational",
      confidence: 40,
      signals: ["default-informational"],
    };
  }

  const confidence = Math.min(95, Math.round((top.score / Math.max(totalScore, 1)) * 100));

  return {
    keyword,
    intent: top.intent,
    confidence,
    signals: top.signals,
  };
}

export function classifyMultipleKeywords(keywords: string[]): SearchIntentResult[] {
  return keywords.map(classifySearchIntent);
}

export function getIntentColor(intent: SearchIntentType): string {
  switch (intent) {
    case "informational": return "#3b82f6"; // blue
    case "navigational": return "#8b5cf6";  // purple
    case "commercial": return "#f97316";    // orange
    case "transactional": return "#22c55e"; // green
  }
}

export function getIntentLabel(intent: SearchIntentType): string {
  switch (intent) {
    case "informational": return "情報収集";
    case "navigational": return "ナビゲーション";
    case "commercial": return "比較検討";
    case "transactional": return "購入・申込";
  }
}
