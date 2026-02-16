// ====================================================================
// Moz Links API v2 — 被リンク・ドメインオーソリティ取得
//
// 公式: https://moz.com/products/api
// 無料枠: 月10リクエスト（小さいが実データ）
// セットアップ:
//   1. https://moz.com/community/join でアカウント作成
//   2. https://moz.com/products/api/keys で API キーを取得
//   3. .env に MOZ_ACCESS_ID と MOZ_SECRET_KEY を設定
//
// 提供データ:
//   - Domain Authority (DA): 0-100 — ドメインの検索ランキング力を予測
//   - Page Authority (PA): 0-100 — 個別ページのランキング力を予測
//   - Spam Score: 0-100 — スパムサイトの特徴との類似度
//   - Linking Domains: 被リンク元のユニークドメイン数
//   - Total Backlinks: 被リンク総数
// ====================================================================

export interface MozMetrics {
  domainAuthority: number;
  pageAuthority: number;
  spamScore: number;
  linkingDomains: number;
  totalBacklinks: number;
  source: "moz-api";
}

interface MozApiResult {
  domain_authority: number;
  page_authority: number;
  spam_score: number;
  root_domains_to_root_domain: number;
  external_pages_to_root_domain: number;
}

interface MozApiResponse {
  results: MozApiResult[];
}

export async function getMozMetrics(domain: string): Promise<MozMetrics | null> {
  const accessId = process.env.MOZ_ACCESS_ID;
  const secretKey = process.env.MOZ_SECRET_KEY;

  if (!accessId || !secretKey) {
    return null;
  }

  try {
    const credentials = Buffer.from(`${accessId}:${secretKey}`).toString("base64");

    const response = await fetch("https://lsapi.seomoz.com/v2/url_metrics", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        targets: [domain],
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error(`Moz API error: ${response.status} ${errorText}`);
      return null;
    }

    const data: MozApiResponse = await response.json();

    if (!data.results || data.results.length === 0) {
      return null;
    }

    const result = data.results[0];

    return {
      domainAuthority: Math.round(result.domain_authority || 0),
      pageAuthority: Math.round(result.page_authority || 0),
      spamScore: Math.round(result.spam_score || 0),
      linkingDomains: result.root_domains_to_root_domain || 0,
      totalBacklinks: result.external_pages_to_root_domain || 0,
      source: "moz-api",
    };
  } catch (error) {
    console.error("Moz API fetch error:", error);
    return null;
  }
}
