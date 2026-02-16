export async function getGoogleSuggestions(keyword: string): Promise<string[]> {
  try {
    const url = `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(keyword)}&hl=ja`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
    });
    const data = await response.json();
    return (data[1] as string[]) || [];
  } catch {
    return [];
  }
}

export async function getRelatedKeywords(keyword: string): Promise<string[]> {
  const suffixes = ["とは", "方法", "おすすめ", "比較", "ランキング", "無料", "有料", "使い方", "メリット", "デメリット"];
  const related: string[] = [];

  const promises = suffixes.map(async (suffix) => {
    try {
      const url = `https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(keyword + " " + suffix)}&hl=ja`;
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });
      const data = await response.json();
      return (data[1] as string[]).slice(0, 3);
    } catch {
      return [];
    }
  });

  const results = await Promise.all(promises);
  for (const r of results) {
    related.push(...r);
  }

  // Remove duplicates
  return [...new Set(related)].filter(r => r !== keyword).slice(0, 30);
}
