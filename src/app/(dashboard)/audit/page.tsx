"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScoreGauge } from "@/components/charts/score-gauge";
import {
  FileSearch,
  Loader2,
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle,
  Globe,
  Clock,
  FileText,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts";

interface AuditResult {
  id: string;
  domain: string;
  score: number;
  totalPages: number;
  crawledPages: number;
  errors: number;
  warnings: number;
  notices: number;
  issues: { type: string; category: string; message: string; details?: string }[];
  pages: { url: string; statusCode: number; title: string; loadTime: number; issues: { type: string; category: string; message: string }[] }[];
  categories: { name: string; score: number; maxScore: number; issues: { type: string; category: string; message: string }[] }[];
}

interface AuditHistory {
  id: string;
  domain: string;
  status: string;
  score: number | null;
  errors: number;
  warnings: number;
  notices: number;
  createdAt: string;
}

export default function AuditPage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AuditResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<AuditHistory[]>([]);

  useEffect(() => {
    fetch("/api/audit")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) setHistory(data);
      })
      .catch(() => {});
  }, []);

  const handleAudit = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim(), maxPages: 10 }),
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">サイト監査</h1>
        <p className="text-muted-foreground">BFSクロールでSEO問題を検出</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAudit()}
                className="pl-10"
              />
            </div>
            <Button onClick={handleAudit} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileSearch className="h-4 w-4 mr-2" />}
              監査開始
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
        <Card>
          <CardContent className="py-12">
            <div className="flex flex-col items-center">
              <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
              <p className="text-lg font-medium">サイトをクロール中...</p>
              <p className="text-sm text-muted-foreground mt-1">最大10ページをクロールします</p>
              <div className="w-64 mt-4">
                <Progress value={33} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {result && (
        <>
          {/* Score Overview */}
          <div className="grid gap-4 md:grid-cols-5">
            <Card className="md:col-span-1">
              <CardContent className="pt-6 flex flex-col items-center">
                <ScoreGauge score={result.score} size={140} label="総合スコア" />
              </CardContent>
            </Card>
            <Card className="md:col-span-4">
              <CardContent className="pt-6">
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center p-4 rounded-lg bg-muted">
                    <p className="text-3xl font-bold">{result.crawledPages}</p>
                    <p className="text-sm text-muted-foreground">クロール済み</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-red-50">
                    <p className="text-3xl font-bold text-red-600">{result.errors}</p>
                    <p className="text-sm text-muted-foreground">エラー</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-orange-50">
                    <p className="text-3xl font-bold text-orange-600">{result.warnings}</p>
                    <p className="text-sm text-muted-foreground">警告</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-blue-50">
                    <p className="text-3xl font-bold text-blue-600">{result.notices}</p>
                    <p className="text-sm text-muted-foreground">情報</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Categories */}
          {result.categories.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>カテゴリ別スコア</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2">
                  {result.categories.map((cat) => (
                    <div key={cat.name} className="flex items-center gap-3 p-3 rounded-lg border">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{cat.name}</span>
                          <span className="text-sm text-muted-foreground">{cat.issues.length}件</span>
                        </div>
                        <Progress value={cat.maxScore > 0 ? (cat.score / cat.maxScore) * 100 : 100} className="h-2" />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* HTTP Status Breakdown (Ahrefs a9 style) */}
          {result.pages.length > 0 && (() => {
            const statusGroups: Record<string, { count: number; color: string }> = {};
            for (const page of result.pages) {
              const code = page.statusCode;
              let group: string;
              let color: string;
              if (code >= 200 && code < 300) { group = `${code} OK`; color = "#22c55e"; }
              else if (code >= 300 && code < 400) { group = `${code} リダイレクト`; color = "#3b82f6"; }
              else if (code === 404) { group = "404 Not Found"; color = "#ef4444"; }
              else if (code >= 400 && code < 500) { group = `${code} クライアントエラー`; color = "#f97316"; }
              else if (code >= 500) { group = `${code} サーバーエラー`; color = "#dc2626"; }
              else { group = `${code}`; color = "#94a3b8"; }
              if (!statusGroups[group]) statusGroups[group] = { count: 0, color };
              statusGroups[group].count++;
            }
            const statusData = Object.entries(statusGroups).map(([name, { count, color }]) => ({
              name, count, color,
            })).sort((a, b) => b.count - a.count);

            // Load time distribution
            const loadTimeRanges = [
              { range: "< 1秒", max: 1000, color: "#22c55e" },
              { range: "1-3秒", max: 3000, color: "#3b82f6" },
              { range: "3-5秒", max: 5000, color: "#f97316" },
              { range: "5秒+", max: Infinity, color: "#ef4444" },
            ];
            const loadTimeData = loadTimeRanges.map((r, i) => ({
              name: r.range,
              count: result.pages.filter((p) => {
                const min = i === 0 ? 0 : loadTimeRanges[i - 1].max;
                return p.loadTime >= min && p.loadTime < r.max;
              }).length,
              color: r.color,
            }));

            return (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">HTTPステータス分布</CardTitle>
                    <p className="text-xs text-muted-foreground">クロール済みページのHTTPレスポンスコード</p>
                  </CardHeader>
                  <CardContent>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={statusData}
                            cx="50%"
                            cy="50%"
                            outerRadius={65}
                            dataKey="count"
                            label={({ name, value }) => `${name}: ${value}`}
                            labelLine={false}
                            fontSize={10}
                          >
                            {statusData.map((entry, i) => (
                              <Cell key={i} fill={entry.color} />
                            ))}
                          </Pie>
                          <Legend fontSize={11} />
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">ページ読み込み速度分布</CardTitle>
                    <p className="text-xs text-muted-foreground">各ページのレスポンス速度</p>
                  </CardHeader>
                  <CardContent>
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={loadTimeData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" fontSize={11} />
                          <YAxis fontSize={11} allowDecimals={false} />
                          <Tooltip />
                          <Bar dataKey="count" name="ページ数" radius={[4, 4, 0, 0]}>
                            {loadTimeData.map((entry, i) => (
                              <Cell key={i} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })()}

          {/* Issues List */}
          <Card>
            <CardHeader>
              <CardTitle>検出された問題 ({result.issues.length}件)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {result.issues.map((issue, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-lg border">
                    {issue.type === "error" && <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />}
                    {issue.type === "warning" && <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />}
                    {issue.type === "notice" && <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={issue.type === "error" ? "destructive" : "secondary"} className="text-xs">
                          {issue.category}
                        </Badge>
                        <span className="text-sm">{issue.message}</span>
                      </div>
                      {issue.details && (
                        <p className="text-xs text-muted-foreground mt-1">{issue.details}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Pages */}
          <Card>
            <CardHeader>
              <CardTitle>クロール済みページ ({result.pages.length}件)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {result.pages.map((page, i) => (
                  <div key={i} className="flex items-center gap-4 p-3 rounded-lg border">
                    {page.statusCode >= 200 && page.statusCode < 400 ? (
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{page.title || page.url}</p>
                      <p className="text-xs text-muted-foreground truncate">{page.url}</p>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground flex-shrink-0">
                      <span className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {page.statusCode}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {(page.loadTime / 1000).toFixed(1)}s
                      </span>
                      <Badge variant={page.issues.length === 0 ? "secondary" : "destructive"} className="text-xs">
                        {page.issues.length}件
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Audit History */}
      {!result && history.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>監査履歴</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {history.map((item) => (
                <div key={item.id} className="flex items-center gap-4 p-3 rounded-lg border">
                  <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{item.domain}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.createdAt).toLocaleString("ja-JP")}
                    </p>
                  </div>
                  {item.score !== null && (
                    <Badge variant={item.score >= 70 ? "secondary" : "destructive"}>
                      スコア: {item.score}
                    </Badge>
                  )}
                  <Badge variant="outline">{item.status}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
