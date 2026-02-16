import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkUsageLimit } from "@/lib/auth-helpers";
import { getGoogleSuggestions, getRelatedKeywords } from "@/lib/api/google-suggest";
import { checkSerp, formatTotalResults } from "@/lib/seo/serp-checker";
import { estimateKeywordDifficulty } from "@/lib/seo/scoring";
import { classifySearchIntent, classifyMultipleKeywords } from "@/lib/seo/search-intent";
import type { KeywordResult, SearchIntentType } from "@/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user) {
      return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });
    }

    const canUse = await checkUsageLimit(user.id, user.plan, "keywords");
    if (!canUse) {
      return NextResponse.json({ error: "本日の使用回数上限に達しました" }, { status: 429 });
    }

    const { keyword } = await req.json();
    if (!keyword?.trim()) {
      return NextResponse.json({ error: "キーワードを入力してください" }, { status: 400 });
    }

    // Google Suggest（公式・無制限）は常に動作する
    // SERP（Google CSE API）はAPI設定が必要
    const [suggestions, serpCheck, relatedKeywords] = await Promise.all([
      getGoogleSuggestions(keyword.trim()),
      checkSerp(keyword.trim()),
      getRelatedKeywords(keyword.trim()),
    ]);

    const difficulty = estimateKeywordDifficulty(serpCheck.serpResults, keyword.trim());
    const totalResults = formatTotalResults(serpCheck.totalResults);

    // Search intent analysis
    const searchIntent = classifySearchIntent(keyword.trim());

    // Intent distribution for suggestions
    const allKeywords = [keyword.trim(), ...suggestions];
    const allIntents = classifyMultipleKeywords(allKeywords);
    const intentCounts = new Map<SearchIntentType, number>();
    for (const result of allIntents) {
      intentCounts.set(result.intent, (intentCounts.get(result.intent) || 0) + 1);
    }
    const intentDistribution = Array.from(intentCounts.entries()).map(([intent, count]) => ({
      intent,
      count,
    }));

    const result: KeywordResult = {
      keyword: keyword.trim(),
      suggestions,
      difficulty,
      totalResults,
      serpSource: serpCheck.source,
      serpResults: serpCheck.serpResults,
      relatedKeywords,
      searchIntent,
      intentDistribution,
    };

    await prisma.keywordSearch.create({
      data: {
        userId: user.id,
        keyword: keyword.trim(),
        resultJson: JSON.stringify(result),
      },
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "キーワード分析中にエラーが発生しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
