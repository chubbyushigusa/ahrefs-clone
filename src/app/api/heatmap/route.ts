import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { crawlUrl } from "@/lib/seo/crawler";
import { analyzeHeatmap } from "@/lib/seo/heatmap-analyzer";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const { url: inputUrl } = await req.json();
    if (!inputUrl || typeof inputUrl !== "string") {
      return NextResponse.json({ error: "URLを入力してください" }, { status: 400 });
    }

    const url = inputUrl.startsWith("http") ? inputUrl : `https://${inputUrl}`;
    const crawlResult = await crawlUrl(url);
    const { $, html } = crawlResult;

    const heatmap = analyzeHeatmap($, url, html);

    return NextResponse.json(heatmap);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "ヒートマップ分析に失敗しました";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
