import type { SerpResult } from "@/types";

// ====================================================================
// Serper.dev API — Google SERP データ取得
//
// 公式サイト: https://serper.dev
// 無料枠: 2,500クエリ（アカウント作成時に付与）
// セットアップ:
//   1. https://serper.dev でアカウント作成
//   2. ダッシュボードから API キーをコピー
//   3. .env に SERPER_API_KEY を設定
//
// 旧実装: Google Custom Search API → 「ウェブ全体を検索」が非推奨で使えない
// 新実装: Serper.dev → Google SERP の構造化データを直接取得
// ====================================================================

interface SerperOrganicResult {
  title: string;
  link: string;
  snippet: string;
  position: number;
}

interface SerperResponse {
  organic?: SerperOrganicResult[];
  searchParameters?: {
    q: string;
    gl: string;
    hl: string;
    num: number;
    type: string;
  };
  searchInformation?: {
    totalResults: number;
    timeTaken: number;
  };
}

export interface SerpApiResult {
  serpResults: SerpResult[];
  totalResults: string;
}

/**
 * Serper.dev API でキーワードの Google 検索結果を取得
 * @returns 検索結果。APIが未設定または失敗時は null
 */
export async function searchSerp(keyword: string): Promise<SerpApiResult | null> {
  const apiKey = process.env.SERPER_API_KEY;

  if (!apiKey) {
    return null;
  }

  try {
    const response = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: keyword,
        gl: "jp",
        hl: "ja",
        num: 10,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      console.error(`Serper API error: ${response.status}`);
      return null;
    }

    const data: SerperResponse = await response.json();

    const serpResults: SerpResult[] = (data.organic || []).map((item, index) => {
      let domain = "";
      try {
        domain = new URL(item.link).hostname;
      } catch {
        domain = item.link;
      }

      return {
        position: item.position || index + 1,
        title: item.title || "",
        url: item.link || "",
        description: item.snippet || "",
        domain,
      };
    });

    const totalResults = data.searchInformation?.totalResults?.toString() || "0";

    return {
      serpResults,
      totalResults,
    };
  } catch (error) {
    console.error("Serper API fetch error:", error);
    return null;
  }
}
