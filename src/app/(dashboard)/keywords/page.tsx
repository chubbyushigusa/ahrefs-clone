"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Loader2,
  AlertCircle,
  TrendingUp,
  Globe,
  Target,
  ArrowRight,
  ExternalLink,
  Info,
  Brain,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import type { KeywordResult, SearchIntentType } from "@/types";

const INTENT_CONFIG: Record<SearchIntentType, { label: string; color: string; description: string }> = {
  informational: { label: "情報収集", color: "#3b82f6", description: "知識・情報を求めている" },
  navigational: { label: "ナビゲーション", color: "#8b5cf6", description: "特定のサイト・ページを探している" },
  commercial: { label: "比較検討", color: "#f97316", description: "購入前に比較・調査している" },
  transactional: { label: "購入・申込", color: "#22c55e", description: "具体的なアクションを起こしたい" },
};

export default function KeywordsPage() {
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<KeywordResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!keyword.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: keyword.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const getDifficultyColor = (d: number) => {
    if (d < 0) return "text-gray-400";
    if (d >= 70) return "text-red-500";
    if (d >= 40) return "text-orange-500";
    return "text-green-500";
  };

  const getDifficultyLabel = (d: number) => {
    if (d < 0) return "推定不可";
    if (d >= 70) return "高難度";
    if (d >= 40) return "中難度";
    return "低難度";
  };

  const intentPieData = result?.intentDistribution.map((d) => ({
    name: INTENT_CONFIG[d.intent]?.label || d.intent,
    value: d.count,
    fill: INTENT_CONFIG[d.intent]?.color || "#94a3b8",
  })) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">キーワードエクスプローラー</h1>
        <p className="text-muted-foreground">キーワードの難易度、検索意図、サジェスト、SERP結果を分析</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="キーワードを入力..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-10"
              />
            </div>
            <Button onClick={handleSearch} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
              検索
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6 flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </CardContent>
        </Card>
      )}

      {loading && (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">キーワードを分析中...</p>
        </div>
      )}

      {result && (
        <>
          {/* API Warning */}
          {result.serpSource === "unavailable" && (
            <Card className="border-orange-300 bg-orange-50">
              <CardContent className="pt-6 flex items-start gap-3">
                <Info className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-orange-800">Serper.dev API が未設定です</p>
                  <p className="text-xs text-orange-600 mt-1">
                    SERP分析・キーワード難易度・検索結果数を取得するには、serper.dev でAPIキーを取得し .env に SERPER_API_KEY を設定してください。
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Overview Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            {/* Search Intent Card */}
            <Card>
              <CardContent className="pt-6 flex items-center gap-4">
                <div className="p-3 rounded-xl" style={{ backgroundColor: INTENT_CONFIG[result.searchIntent.intent]?.color + "20" }}>
                  <Brain className="h-6 w-6" style={{ color: INTENT_CONFIG[result.searchIntent.intent]?.color }} />
                </div>
                <div>
                  <Badge
                    className="text-white text-xs"
                    style={{ backgroundColor: INTENT_CONFIG[result.searchIntent.intent]?.color }}
                  >
                    {INTENT_CONFIG[result.searchIntent.intent]?.label}
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-1">
                    検索意図 (信頼度 {result.searchIntent.confidence}%)
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {INTENT_CONFIG[result.searchIntent.intent]?.description}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <Target className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className={`text-3xl font-bold ${getDifficultyColor(result.difficulty)}`}>
                    {result.difficulty < 0 ? "--" : result.difficulty}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    難易度 ({getDifficultyLabel(result.difficulty)})
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-orange-500/10">
                  <Globe className="h-6 w-6 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{result.totalResults}</p>
                  <p className="text-sm text-muted-foreground">検索結果数</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6 flex items-center gap-4">
                <div className="p-3 rounded-xl bg-green-500/10">
                  <TrendingUp className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-3xl font-bold">{result.suggestions.length}</p>
                  <p className="text-sm text-muted-foreground">サジェストKW</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search Intent Distribution + Suggestions */}
          <div className="grid gap-6 md:grid-cols-3">
            {/* Intent Distribution Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  検索意図の分布
                </CardTitle>
                <p className="text-xs text-muted-foreground">キーワード＋サジェスト全体の意図分布</p>
              </CardHeader>
              <CardContent>
                {intentPieData.length > 0 ? (
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={intentPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={35}
                          outerRadius={65}
                          dataKey="value"
                          fontSize={11}
                        >
                          {intentPieData.map((entry, i) => (
                            <Cell key={i} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Legend fontSize={11} />
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8 text-sm">データなし</p>
                )}
                {/* Intent signals */}
                {result.searchIntent.signals.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-muted-foreground mb-1">検出シグナル:</p>
                    <div className="flex flex-wrap gap-1">
                      {result.searchIntent.signals.map((s, i) => (
                        <Badge key={i} variant="outline" className="text-xs">{s}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Suggestions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">サジェストキーワード</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {result.suggestions.length === 0 ? (
                    <p className="text-muted-foreground text-sm py-4 text-center">見つかりませんでした</p>
                  ) : (
                    result.suggestions.map((s, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted transition-colors">
                        <ArrowRight className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm">{s}</span>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Related Keywords */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">関連キーワード</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {result.relatedKeywords.length === 0 ? (
                    <p className="text-muted-foreground text-sm py-4 text-center w-full">見つかりませんでした</p>
                  ) : (
                    result.relatedKeywords.map((r, i) => (
                      <Badge key={i} variant="secondary" className="cursor-pointer hover:bg-secondary/80">
                        {r}
                      </Badge>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* SERP Results */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                SERP分析結果
                {result.serpResults.length > 0 && ` (検索上位${result.serpResults.length}件)`}
                <Badge variant="outline" className="ml-2 text-xs font-normal">
                  {result.serpSource === "serper" ? "Serper.dev" : "API未設定"}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {result.serpResults.length === 0 ? (
                  <div className="text-center py-8">
                    <Search className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">
                      {result.serpSource === "unavailable"
                        ? "Serper.devを設定するとSERP結果が表示されます"
                        : "SERP結果が取得できませんでした"}
                    </p>
                  </div>
                ) : (
                  result.serpResults.map((sr) => (
                    <div key={sr.position} className="flex items-start gap-4 p-4 rounded-lg border hover:shadow-sm transition-shadow">
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-bold text-primary">{sr.position}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-medium text-primary truncate">{sr.title}</h3>
                          <a href={sr.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3 w-3 text-muted-foreground" />
                          </a>
                        </div>
                        <p className="text-xs text-green-600 truncate">{sr.domain}</p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{sr.description}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
