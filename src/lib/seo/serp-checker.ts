import { searchSerp } from "@/lib/api/google-cse";
import type { SerpResult } from "@/types";

// ====================================================================
// SERP Checker — Serper.dev API ベース
//
// データソース: Serper.dev (Google SERP の公式対応パートナー)
// 無料枠: 2,500クエリ
// 信頼性: 公式 API → ブロック・CAPTCHA なし
//
// APIが未設定の場合は結果なしを返す（嘘のデータは返さない）
// ====================================================================

export interface SerpCheckResult {
  serpResults: SerpResult[];
  totalResults: string;
  source: "serper" | "unavailable";
}

/**
 * キーワードの SERP（検索結果）を取得
 * Serper.dev API を使用（Google SERP データを安定取得）
 */
export async function checkSerp(keyword: string): Promise<SerpCheckResult> {
  const result = await searchSerp(keyword);

  if (result) {
    return {
      serpResults: result.serpResults,
      totalResults: result.totalResults,
      source: "serper",
    };
  }

  // API が未設定
  return {
    serpResults: [],
    totalResults: "0",
    source: "unavailable",
  };
}

/**
 * Google の totalResults をフォーマット
 * 例: "1230000" → "約 123万件"
 */
export function formatTotalResults(totalResults: string): string {
  const num = parseInt(totalResults, 10);
  if (isNaN(num) || num === 0) return "データなし";
  if (num >= 100000000) return `約 ${(num / 100000000).toFixed(1)}億件`;
  if (num >= 10000) return `約 ${Math.round(num / 10000).toLocaleString()}万件`;
  if (num >= 1000) return `約 ${num.toLocaleString()}件`;
  return `${num}件`;
}
