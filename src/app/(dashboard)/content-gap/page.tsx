"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  FileSearch,
  Loader2,
  AlertCircle,
  Target,
  TrendingUp,
  Lightbulb,
  ExternalLink,
  CheckCircle,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import type { ContentGapResult, SearchIntentType } from "@/types";

const INTENT_COLORS: Record<SearchIntentType, string> = {
  informational: "#3b82f6",
  navigational: "#8b5cf6",
  commercial: "#f97316",
  transactional: "#22c55e",
};

const INTENT_LABELS: Record<SearchIntentType, string> = {
  informational: "情報収集",
  navigational: "ナビゲーション",
  commercial: "比較検討",
  transactional: "購入・申込",
};

const SEVERITY_CONFIG = {
  high: { icon: XCircle, color: "text-red-500", badge: "destructive" as const, label: "重要" },
  medium: { icon: AlertTriangle, color: "text-yellow-500", badge: "secondary" as const, label: "推奨" },
  low: { icon: CheckCircle, color: "text-blue-500", badge: "outline" as const, label: "参考" },
};

export default function ContentGapPage() {
  const [url, setUrl] = useState("");
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ContentGapResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!url.trim()) {
      setError("URLを入力してください");
      return;
    }
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/content-gap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), keyword: keyword.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "分析に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  // Intent distribution for missing topics
  const intentDistribution = result?.missingTopics.reduce((acc, t) => {
    acc[t.intent] = (acc[t.intent] || 0) + 1;
    return acc;
  }, {} as Record<string, number>) || {};

  const intentPieData = Object.entries(intentDistribution).map(([intent, count]) => ({
    name: INTENT_LABELS[intent as SearchIntentType] || intent,
    value: count,
    fill: INTENT_COLORS[intent as SearchIntentType] || "#94a3b8",
  }));

  const priorityChartData = result?.missingTopics.slice(0, 15).map((t) => ({
    keyword: t.keyword.length > 15 ? t.keyword.substring(0, 15) + "…" : t.keyword,
    priority: t.priority,
    coverage: t.competitorCoverage,
  })) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Target className="h-6 w-6 text-blue-500" />
          コンテンツギャップ分析
        </h1>
        <p className="text-muted-foreground">競合が持っていて自社が不足しているコンテンツを発見</p>
      </div>

      {/* Input */}
      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="flex gap-3">
            <Input
              placeholder="分析するURL (例: https://example.com)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="flex-1"
            />
          </div>
          <div className="flex gap-3">
            <Input
              placeholder="ターゲットキーワード (任意: 空欄ならタイトルから推測)"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
              className="flex-1"
            />
            <Button onClick={handleAnalyze} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileSearch className="h-4 w-4 mr-2" />}
              ギャップ分析
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
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="h-12 w-12 animate-spin text-blue-500 mb-4" />
          <p className="text-muted-foreground">ページと競合を分析中...</p>
          <p className="text-xs text-muted-foreground mt-1">SERP分析を含むため少々お待ちください</p>
        </div>
      )}

      {result && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-3xl font-bold text-blue-600">{result.currentKeywords.length}</p>
                <p className="text-xs text-muted-foreground">現在のキーワード</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-3xl font-bold text-orange-600">{result.missingTopics.length}</p>
                <p className="text-xs text-muted-foreground">不足トピック</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-3xl font-bold text-red-600">
                  {result.improvements.filter((i) => i.severity === "high").length}
                </p>
                <p className="text-xs text-muted-foreground">重要な改善点</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-3xl font-bold text-green-600">{result.competitorPages.length}</p>
                <p className="text-xs text-muted-foreground">競合ページ</p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="missing">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="missing" className="text-xs">
                <Target className="h-3 w-3 mr-1" />不足トピック
              </TabsTrigger>
              <TabsTrigger value="improvements" className="text-xs">
                <Lightbulb className="h-3 w-3 mr-1" />改善提案
              </TabsTrigger>
              <TabsTrigger value="competitors" className="text-xs">
                <TrendingUp className="h-3 w-3 mr-1" />競合分析
              </TabsTrigger>
              <TabsTrigger value="keywords" className="text-xs">
                <FileSearch className="h-3 w-3 mr-1" />現在のKW
              </TabsTrigger>
            </TabsList>

            {/* Missing Topics */}
            <TabsContent value="missing">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">不足しているトピック（優先度順）</CardTitle>
                      <p className="text-xs text-muted-foreground">
                        競合サイトがカバーしていて、自社ページに含まれていないトピック
                      </p>
                    </CardHeader>
                    <CardContent>
                      {result.missingTopics.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">不足トピックは検出されませんでした</p>
                      ) : (
                        <>
                          <div className="h-64 mb-4">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={priorityChartData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" domain={[0, 100]} fontSize={11} />
                                <YAxis dataKey="keyword" type="category" fontSize={10} width={120} />
                                <Tooltip />
                                <Bar dataKey="priority" fill="#f97316" radius={[0, 4, 4, 0]} name="優先度" />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="overflow-y-auto max-h-64">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="border-b">
                                  <th className="text-left py-2 px-3 font-medium">キーワード</th>
                                  <th className="text-center py-2 px-3 font-medium">検索意図</th>
                                  <th className="text-center py-2 px-3 font-medium">競合数</th>
                                  <th className="text-center py-2 px-3 font-medium">優先度</th>
                                </tr>
                              </thead>
                              <tbody>
                                {result.missingTopics.map((topic, i) => (
                                  <tr key={i} className="border-b hover:bg-muted/50">
                                    <td className="py-2 px-3 font-medium">{topic.keyword}</td>
                                    <td className="text-center py-2 px-3">
                                      <Badge
                                        style={{
                                          backgroundColor: INTENT_COLORS[topic.intent],
                                          color: "white",
                                        }}
                                      >
                                        {INTENT_LABELS[topic.intent]}
                                      </Badge>
                                    </td>
                                    <td className="text-center py-2 px-3">{topic.competitorCoverage}</td>
                                    <td className="text-center py-2 px-3">
                                      <div className="flex items-center gap-2">
                                        <Progress value={topic.priority} className="h-2 flex-1" />
                                        <span className="text-xs w-8">{topic.priority}%</span>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">検索意図の分布</CardTitle>
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
                              innerRadius={40}
                              outerRadius={70}
                              dataKey="value"
                              label={({ name, value }) => `${name}: ${value}`}
                              labelLine={false}
                              fontSize={10}
                            >
                              {intentPieData.map((entry, i) => (
                                <Cell key={i} fill={entry.fill} />
                              ))}
                            </Pie>
                            <Legend fontSize={11} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <p className="text-center text-muted-foreground py-4">データなし</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* Improvements */}
            <TabsContent value="improvements">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <Lightbulb className="h-5 w-5 text-yellow-500" />
                    SEO改善提案 ({result.improvements.length}件)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {result.improvements.map((imp, i) => {
                      const config = SEVERITY_CONFIG[imp.severity];
                      const Icon = config.icon;
                      return (
                        <div key={i} className="p-4 border rounded-lg">
                          <div className="flex items-start gap-3">
                            <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${config.color}`} />
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant={config.badge}>{config.label}</Badge>
                                <Badge variant="outline">{imp.category}</Badge>
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                                <div className="p-2 bg-red-50 rounded text-sm">
                                  <p className="text-xs text-red-600 font-medium mb-1">現在</p>
                                  <p>{imp.current}</p>
                                </div>
                                <div className="p-2 bg-green-50 rounded text-sm">
                                  <p className="text-xs text-green-600 font-medium mb-1">推奨</p>
                                  <p>{imp.recommended}</p>
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
                                <TrendingUp className="h-3 w-3" />
                                期待効果: {imp.impact}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Competitors */}
            <TabsContent value="competitors">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">SERP競合ページ</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    同じキーワードで上位表示されている競合ページと、その独自トピック
                  </p>
                </CardHeader>
                <CardContent>
                  {result.competitorPages.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">競合データなし（Serper.dev API未設定の可能性）</p>
                  ) : (
                    <div className="space-y-3">
                      {result.competitorPages.map((comp, i) => (
                        <div key={i} className="p-4 border rounded-lg">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline">#{comp.position}</Badge>
                                <span className="font-medium text-sm truncate">{comp.title}</span>
                              </div>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <ExternalLink className="h-3 w-3" />
                                {comp.domain}
                              </p>
                              {comp.uniqueTopics.length > 0 && (
                                <div className="mt-2">
                                  <p className="text-xs text-muted-foreground mb-1">この競合だけが持つトピック:</p>
                                  <div className="flex flex-wrap gap-1">
                                    {comp.uniqueTopics.map((t, j) => (
                                      <Badge key={j} variant="secondary" className="text-xs">
                                        {t}
                                      </Badge>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Current Keywords */}
            <TabsContent value="keywords">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">ページの現在のキーワード</CardTitle>
                  <p className="text-xs text-muted-foreground">
                    タイトル、メタディスクリプション、見出しから抽出されたキーワード
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {result.currentKeywords.map((kw, i) => (
                      <Badge key={i} variant="outline" className="text-sm py-1 px-3">
                        {kw}
                      </Badge>
                    ))}
                  </div>
                  {result.currentKeywords.length === 0 && (
                    <p className="text-center text-muted-foreground py-8">キーワードが検出されませんでした</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
