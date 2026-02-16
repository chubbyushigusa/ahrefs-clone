"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScoreGauge } from "@/components/charts/score-gauge";
import {
  Globe,
  Search,
  Loader2,
  AlertCircle,
  AlertTriangle,
  Info,
  ExternalLink,
  ImageIcon,
  Link2,
  Code,
  Shield,
  Server,
  FileText,
  Link as LinkIcon,
} from "lucide-react";
import type { SeoAnalysis } from "@/types";

export default function SiteExplorerPage() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SeoAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/site-explorer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
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
        <h1 className="text-2xl font-bold">サイトエクスプローラー</h1>
        <p className="text-muted-foreground">URLを入力してSEO分析を実行</p>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="https://example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
                className="pl-10"
              />
            </div>
            <Button onClick={handleAnalyze} disabled={loading} className="bg-primary hover:bg-primary/90">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
              分析
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
          <p className="text-muted-foreground">サイトを分析中...</p>
          <p className="text-sm text-muted-foreground mt-1">PageSpeed分析を含むため30秒ほどかかります</p>
        </div>
      )}

      {result && (
        <>
          {/* Overview */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6 flex flex-col items-center">
                <ScoreGauge score={result.score} label="SEOスコア" />
              </CardContent>
            </Card>
            {result.performance && (
              <>
                <Card>
                  <CardContent className="pt-6 flex flex-col items-center">
                    <ScoreGauge score={result.performance.performanceScore} label="パフォーマンス" />
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 flex flex-col items-center">
                    <ScoreGauge score={result.performance.accessibilityScore} label="アクセシビリティ" />
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6 flex flex-col items-center">
                    <ScoreGauge score={result.performance.bestPracticesScore} label="ベストプラクティス" />
                  </CardContent>
                </Card>
              </>
            )}
          </div>

          {/* Backlink Data (Moz API) */}
          {result.backlinks ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LinkIcon className="h-5 w-5" />
                  被リンク分析
                  <Badge variant="outline" className="text-xs font-normal">Moz API</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 gap-4">
                  <div className="text-center p-4 rounded-lg bg-blue-50">
                    <p className="text-3xl font-bold text-blue-600">{result.backlinks.domainAuthority}</p>
                    <p className="text-xs text-muted-foreground mt-1">ドメインオーソリティ</p>
                    <p className="text-[10px] text-muted-foreground">DA (0-100)</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-indigo-50">
                    <p className="text-3xl font-bold text-indigo-600">{result.backlinks.pageAuthority}</p>
                    <p className="text-xs text-muted-foreground mt-1">ページオーソリティ</p>
                    <p className="text-[10px] text-muted-foreground">PA (0-100)</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-purple-50">
                    <p className="text-3xl font-bold text-purple-600">{result.backlinks.linkingDomains.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground mt-1">参照ドメイン数</p>
                    <p className="text-[10px] text-muted-foreground">ユニークドメイン</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-green-50">
                    <p className="text-3xl font-bold text-green-600">{result.backlinks.totalBacklinks.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground mt-1">被リンク総数</p>
                    <p className="text-[10px] text-muted-foreground">外部からの全リンク</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-orange-50">
                    <p className={`text-3xl font-bold ${result.backlinks.spamScore >= 60 ? "text-red-600" : result.backlinks.spamScore >= 30 ? "text-orange-600" : "text-green-600"}`}>
                      {result.backlinks.spamScore}%
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">スパムスコア</p>
                    <p className="text-[10px] text-muted-foreground">{result.backlinks.spamScore >= 60 ? "危険" : result.backlinks.spamScore >= 30 ? "注意" : "安全"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed">
              <CardContent className="pt-6 flex items-center gap-3">
                <LinkIcon className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">被リンクデータ未取得</p>
                  <p className="text-xs text-muted-foreground">
                    Moz API を設定すると DA・PA・被リンク数が表示されます（.env に MOZ_ACCESS_ID と MOZ_SECRET_KEY を設定）
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Issue Summary */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="pt-6 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-red-50">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{result.issues.filter(i => i.type === "error").length}</p>
                  <p className="text-sm text-muted-foreground">エラー</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-50">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{result.issues.filter(i => i.type === "warning").length}</p>
                  <p className="text-sm text-muted-foreground">警告</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6 flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-50">
                  <Info className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{result.issues.filter(i => i.type === "notice").length}</p>
                  <p className="text-sm text-muted-foreground">情報</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Tabs */}
          <Tabs defaultValue="issues" className="space-y-4">
            <TabsList className="grid w-full grid-cols-7">
              <TabsTrigger value="issues">問題</TabsTrigger>
              <TabsTrigger value="backlinks">被リンク</TabsTrigger>
              <TabsTrigger value="meta">メタ情報</TabsTrigger>
              <TabsTrigger value="headings">見出し</TabsTrigger>
              <TabsTrigger value="images">画像</TabsTrigger>
              <TabsTrigger value="links">リンク</TabsTrigger>
              <TabsTrigger value="tech">技術情報</TabsTrigger>
            </TabsList>

            <TabsContent value="issues">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5" />
                    SEO問題一覧
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {result.issues.length === 0 ? (
                      <p className="text-muted-foreground py-4 text-center">問題は検出されませんでした</p>
                    ) : (
                      result.issues.map((issue, i) => (
                        <div key={i} className="flex items-start gap-3 p-3 rounded-lg border">
                          {issue.type === "error" && <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />}
                          {issue.type === "warning" && <AlertTriangle className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />}
                          {issue.type === "notice" && <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />}
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <Badge variant={issue.type === "error" ? "destructive" : issue.type === "warning" ? "default" : "secondary"} className="text-xs">
                                {issue.category}
                              </Badge>
                              <span className="text-sm font-medium">{issue.message}</span>
                            </div>
                            {issue.details && (
                              <p className="text-xs text-muted-foreground mt-1">{issue.details}</p>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="backlinks">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LinkIcon className="h-5 w-5" />
                    被リンク詳細
                    <Badge variant="outline" className="text-xs font-normal">Moz API</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {result.backlinks ? (
                    <div className="space-y-6">
                      {/* DA/PA explanation */}
                      <div className="space-y-4">
                        <div className="flex items-start gap-4 p-4 rounded-lg border">
                          <div className="text-center min-w-[80px]">
                            <p className={`text-4xl font-bold ${result.backlinks.domainAuthority >= 50 ? "text-green-600" : result.backlinks.domainAuthority >= 20 ? "text-orange-500" : "text-red-500"}`}>
                              {result.backlinks.domainAuthority}
                            </p>
                            <p className="text-xs text-muted-foreground">DA</p>
                          </div>
                          <div>
                            <p className="font-medium">ドメインオーソリティ (DA)</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              Moz が開発した 0〜100 のスコア。検索エンジンでのランキング力を予測する指標。
                              被リンクの質と量から算出。DA 50+ は強いドメイン、20未満は新規または弱いドメイン。
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-4 p-4 rounded-lg border">
                          <div className="text-center min-w-[80px]">
                            <p className="text-4xl font-bold text-indigo-600">{result.backlinks.pageAuthority}</p>
                            <p className="text-xs text-muted-foreground">PA</p>
                          </div>
                          <div>
                            <p className="font-medium">ページオーソリティ (PA)</p>
                            <p className="text-sm text-muted-foreground mt-1">
                              個別ページのランキング力。DA がドメイン全体の指標であるのに対し、PA は特定ページの強さを示す。
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 rounded-lg border">
                            <p className="text-sm font-medium text-muted-foreground">参照ドメイン数</p>
                            <p className="text-3xl font-bold mt-1">{result.backlinks.linkingDomains.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              このドメインにリンクしているユニークなドメインの数。SEO で最も重要な指標の一つ。
                            </p>
                          </div>
                          <div className="p-4 rounded-lg border">
                            <p className="text-sm font-medium text-muted-foreground">被リンク総数</p>
                            <p className="text-3xl font-bold mt-1">{result.backlinks.totalBacklinks.toLocaleString()}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              外部サイトからの全リンク数。1つのドメインから複数リンクがある場合も個別にカウント。
                            </p>
                          </div>
                        </div>

                        <div className="p-4 rounded-lg border">
                          <p className="text-sm font-medium text-muted-foreground">スパムスコア</p>
                          <div className="flex items-center gap-3 mt-2">
                            <p className={`text-3xl font-bold ${result.backlinks.spamScore >= 60 ? "text-red-600" : result.backlinks.spamScore >= 30 ? "text-orange-500" : "text-green-600"}`}>
                              {result.backlinks.spamScore}%
                            </p>
                            <Badge variant={result.backlinks.spamScore >= 60 ? "destructive" : result.backlinks.spamScore >= 30 ? "default" : "secondary"}>
                              {result.backlinks.spamScore >= 60 ? "高リスク" : result.backlinks.spamScore >= 30 ? "中リスク" : "低リスク"}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">
                            Moz のスパム検出アルゴリズムに基づく。60%以上はペナルティリスクあり。低品質な被リンクの否認を検討。
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <LinkIcon className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">
                        Moz API を設定すると被リンクデータが表示されます
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        .env に MOZ_ACCESS_ID と MOZ_SECRET_KEY を設定してください
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="meta">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    メタタグ情報
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <MetaRow label="タイトル" value={result.meta.title} maxLen={60} len={result.meta.titleLength} />
                    <MetaRow label="ディスクリプション" value={result.meta.description} maxLen={160} len={result.meta.descriptionLength} />
                    <MetaRow label="Canonical" value={result.meta.canonical} />
                    <MetaRow label="Robots" value={result.meta.robots} />
                    <MetaRow label="Viewport" value={result.meta.viewport} />
                    <MetaRow label="言語" value={result.meta.lang} />
                    <MetaRow label="文字コード" value={result.meta.charset} />
                    <MetaRow label="OG Title" value={result.meta.ogTitle} />
                    <MetaRow label="OG Description" value={result.meta.ogDescription} />
                    <MetaRow label="OG Image" value={result.meta.ogImage} />
                    <MetaRow label="Twitter Card" value={result.meta.twitterCard} />
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="headings">
              <Card>
                <CardHeader>
                  <CardTitle>見出し構造</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {result.headings.structure.length === 0 ? (
                      <p className="text-muted-foreground py-4 text-center">見出しが検出されませんでした</p>
                    ) : (
                      result.headings.structure.map((h, i) => (
                        <div key={i} className="flex items-center gap-2" style={{ paddingLeft: `${(h.level - 1) * 20}px` }}>
                          <Badge variant="outline" className="text-xs font-mono">H{h.level}</Badge>
                          <span className="text-sm truncate">{h.text}</span>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="images">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5" />
                    画像分析 ({result.images.total}枚)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center p-3 rounded-lg bg-muted">
                      <p className="text-2xl font-bold">{result.images.total}</p>
                      <p className="text-xs text-muted-foreground">合計</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-green-50">
                      <p className="text-2xl font-bold text-green-600">{result.images.withAlt}</p>
                      <p className="text-xs text-muted-foreground">Alt有り</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-red-50">
                      <p className="text-2xl font-bold text-red-600">{result.images.withoutAlt}</p>
                      <p className="text-xs text-muted-foreground">Alt無し</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="links">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Link2 className="h-5 w-5" />
                    リンク分析
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4 mb-4">
                    <div className="text-center p-3 rounded-lg bg-muted">
                      <p className="text-2xl font-bold">{result.links.internal + result.links.external}</p>
                      <p className="text-xs text-muted-foreground">合計</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-blue-50">
                      <p className="text-2xl font-bold text-blue-600">{result.links.internal}</p>
                      <p className="text-xs text-muted-foreground">内部リンク</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-purple-50">
                      <p className="text-2xl font-bold text-purple-600">{result.links.external}</p>
                      <p className="text-xs text-muted-foreground">外部リンク</p>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-orange-50">
                      <p className="text-2xl font-bold text-orange-600">{result.links.nofollow}</p>
                      <p className="text-xs text-muted-foreground">Nofollow</p>
                    </div>
                  </div>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {result.links.links.slice(0, 50).map((link, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm p-2 rounded border">
                        {link.isExternal ? (
                          <ExternalLink className="h-3 w-3 text-purple-500 flex-shrink-0" />
                        ) : (
                          <Link2 className="h-3 w-3 text-blue-500 flex-shrink-0" />
                        )}
                        <span className="truncate flex-1">{link.text || link.href}</span>
                        <span className="text-xs text-muted-foreground truncate max-w-[200px]">{link.href}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="tech">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Code className="h-5 w-5" />
                      検出された技術
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {result.technologies.length === 0 ? (
                        <p className="text-muted-foreground">技術が検出されませんでした</p>
                      ) : (
                        result.technologies.map((tech) => (
                          <Badge key={tech} variant="secondary" className="text-sm">{tech}</Badge>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
                {result.dns && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Server className="h-5 w-5" />
                        DNS情報
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {result.dns.a.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">Aレコード</p>
                          {result.dns.a.map((ip, i) => <Badge key={i} variant="outline" className="mr-1 mb-1">{ip}</Badge>)}
                        </div>
                      )}
                      {result.dns.ns.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">ネームサーバー</p>
                          {result.dns.ns.map((ns, i) => <Badge key={i} variant="outline" className="mr-1 mb-1">{ns}</Badge>)}
                        </div>
                      )}
                      {result.dns.mx.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1">MXレコード</p>
                          {result.dns.mx.map((mx, i) => <Badge key={i} variant="outline" className="mr-1 mb-1">{mx.exchange}</Badge>)}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {/* Performance Metrics */}
          {result.performance && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Core Web Vitals
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-5 gap-4">
                  <MetricCard label="FCP" value={`${(result.performance.fcp / 1000).toFixed(1)}s`} />
                  <MetricCard label="LCP" value={`${(result.performance.lcp / 1000).toFixed(1)}s`} />
                  <MetricCard label="CLS" value={result.performance.cls.toFixed(3)} />
                  <MetricCard label="TBT" value={`${Math.round(result.performance.tbt)}ms`} />
                  <MetricCard label="Speed Index" value={`${(result.performance.speedIndex / 1000).toFixed(1)}s`} />
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function MetaRow({ label, value, maxLen, len }: { label: string; value: string | null; maxLen?: number; len?: number }) {
  return (
    <div className="flex items-start gap-4 py-2 border-b last:border-0">
      <span className="text-sm font-medium text-muted-foreground w-40 flex-shrink-0">{label}</span>
      <div className="flex-1">
        {value ? (
          <div>
            <span className="text-sm">{value}</span>
            {maxLen && len !== undefined && (
              <span className={`text-xs ml-2 ${len > maxLen ? "text-red-500" : "text-green-500"}`}>
                ({len}/{maxLen}文字)
              </span>
            )}
          </div>
        ) : (
          <span className="text-sm text-red-400">未設定</span>
        )}
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center p-3 rounded-lg bg-muted">
      <p className="text-lg font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
