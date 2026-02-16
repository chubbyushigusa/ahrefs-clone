"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Plus,
  Trash2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import type { CompetitorData } from "@/types";

const COLORS = ["#1e40af", "#f97316", "#22c55e", "#8b5cf6", "#ef4444"];

export default function CompetitorsPage() {
  const [domains, setDomains] = useState<string[]>(["", ""]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<CompetitorData[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const addDomain = () => {
    if (domains.length < 5) {
      setDomains([...domains, ""]);
    }
  };

  const removeDomain = (index: number) => {
    if (domains.length > 2) {
      setDomains(domains.filter((_, i) => i !== index));
    }
  };

  const updateDomain = (index: number, value: string) => {
    const updated = [...domains];
    updated[index] = value;
    setDomains(updated);
  };

  const handleAnalyze = async () => {
    const validDomains = domains.filter((d) => d.trim());
    if (validDomains.length < 2) {
      setError("2つ以上のドメインを入力してください");
      return;
    }

    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const res = await fetch("/api/competitor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domains: validDomains }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResults(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const radarData = results
    ? [
        { subject: "SEO", ...Object.fromEntries(results.map((r) => [r.domain, r.scores.seo])) },
        { subject: "パフォーマンス", ...Object.fromEntries(results.map((r) => [r.domain, r.scores.performance])) },
        { subject: "DA", ...Object.fromEntries(results.map((r) => [r.domain, r.scores.domainAuthority])) },
        { subject: "コンテンツ", ...Object.fromEntries(results.map((r) => [r.domain, r.scores.content])) },
        { subject: "技術", ...Object.fromEntries(results.map((r) => [r.domain, r.scores.technical])) },
      ]
    : [];

  const barData = results
    ? results.map((r) => ({
        domain: r.domain.length > 15 ? r.domain.substring(0, 15) + "..." : r.domain,
        SEO: r.scores.seo,
        DA: r.scores.domainAuthority,
        コンテンツ: r.scores.content,
        技術: r.scores.technical,
      }))
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">競合分析</h1>
        <p className="text-muted-foreground">複数ドメインのSEOスコアを比較</p>
      </div>

      {/* Domain Input */}
      <Card>
        <CardContent className="pt-6 space-y-3">
          {domains.map((domain, i) => (
            <div key={i} className="flex gap-2">
              <div className="flex items-center gap-2 flex-1">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: COLORS[i] }}
                />
                <Input
                  placeholder={`ドメイン ${i + 1} (例: example.com)`}
                  value={domain}
                  onChange={(e) => updateDomain(i, e.target.value)}
                />
              </div>
              {domains.length > 2 && (
                <Button variant="ghost" size="icon" onClick={() => removeDomain(i)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          <div className="flex gap-3">
            {domains.length < 5 && (
              <Button variant="outline" onClick={addDomain} size="sm">
                <Plus className="h-4 w-4 mr-1" />
                ドメイン追加
              </Button>
            )}
            <Button onClick={handleAnalyze} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Users className="h-4 w-4 mr-2" />
              )}
              比較分析
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
          <p className="text-muted-foreground">ドメインを分析中...</p>
          <p className="text-sm text-muted-foreground mt-1">各ドメインのPageSpeed分析を含むため時間がかかります</p>
        </div>
      )}

      {results && (
        <>
          {/* Radar Chart */}
          <Card>
            <CardHeader>
              <CardTitle>総合比較 (レーダーチャート)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={radarData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="subject" fontSize={12} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} fontSize={10} />
                    {results.map((r, i) => (
                      <Radar
                        key={r.domain}
                        name={r.domain}
                        dataKey={r.domain}
                        stroke={COLORS[i]}
                        fill={COLORS[i]}
                        fillOpacity={0.15}
                        strokeWidth={2}
                      />
                    ))}
                    <Legend />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle>スコア比較 (バーチャート)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="domain" fontSize={11} />
                    <YAxis domain={[0, 100]} fontSize={11} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="SEO" fill="#1e40af" />
                    <Bar dataKey="DA" fill="#f97316" />
                    <Bar dataKey="コンテンツ" fill="#22c55e" />
                    <Bar dataKey="技術" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Comparison Table */}
          <Card>
            <CardHeader>
              <CardTitle>詳細比較</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">項目</th>
                      {results.map((r, i) => (
                        <th key={r.domain} className="text-left py-3 px-4 font-medium">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i] }} />
                            {r.domain}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="py-3 px-4 font-medium">SEOスコア</td>
                      {results.map((r) => (
                        <td key={r.domain} className="py-3 px-4">
                          <Badge variant={r.scores.seo >= 70 ? "default" : "destructive"}>{r.scores.seo}</Badge>
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b">
                      <td className="py-3 px-4 font-medium">DA (ドメインオーソリティ)</td>
                      {results.map((r) => (
                        <td key={r.domain} className="py-3 px-4">
                          {r.scores.domainAuthority > 0 ? (
                            <Badge variant={r.scores.domainAuthority >= 50 ? "default" : r.scores.domainAuthority >= 20 ? "secondary" : "destructive"}>{r.scores.domainAuthority}</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">N/A</span>
                          )}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b">
                      <td className="py-3 px-4 font-medium">参照ドメイン数</td>
                      {results.map((r) => (
                        <td key={r.domain} className="py-3 px-4 font-semibold">
                          {r.scores.backlinks > 0 ? r.scores.backlinks.toLocaleString() : <span className="text-xs text-muted-foreground font-normal">N/A</span>}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b">
                      <td className="py-3 px-4 font-medium">タイトル</td>
                      {results.map((r) => (
                        <td key={r.domain} className="py-3 px-4 text-xs max-w-48 truncate">{r.meta.title || "未設定"}</td>
                      ))}
                    </tr>
                    <tr className="border-b">
                      <td className="py-3 px-4 font-medium">ディスクリプション</td>
                      {results.map((r) => (
                        <td key={r.domain} className="py-3 px-4 text-xs max-w-48 truncate">{r.meta.description || "未設定"}</td>
                      ))}
                    </tr>
                    <tr className="border-b">
                      <td className="py-3 px-4 font-medium">技術スタック</td>
                      {results.map((r) => (
                        <td key={r.domain} className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {r.technologies.slice(0, 5).map((t) => (
                              <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
                            ))}
                          </div>
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b">
                      <td className="py-3 px-4 font-medium">言語</td>
                      {results.map((r) => (
                        <td key={r.domain} className="py-3 px-4">{r.meta.lang || "未設定"}</td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-3 px-4 font-medium">OGP</td>
                      {results.map((r) => (
                        <td key={r.domain} className="py-3 px-4">
                          <Badge variant={r.meta.ogTitle && r.meta.ogDescription ? "default" : "destructive"}>
                            {r.meta.ogTitle && r.meta.ogDescription ? "設定済み" : "不完全"}
                          </Badge>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
