"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, MousePointerClick, ArrowDownToLine, Loader2, AlertCircle, Lightbulb } from "lucide-react";
import type { HeatmapAnalysis } from "@/types";

type HeatmapMode = "scroll" | "click" | "attention";

function getScrollColor(reach: number): string {
  if (reach >= 90) return "rgba(239, 68, 68, 0.45)";
  if (reach >= 70) return "rgba(249, 115, 22, 0.40)";
  if (reach >= 50) return "rgba(234, 179, 8, 0.35)";
  if (reach >= 30) return "rgba(34, 197, 94, 0.30)";
  return "rgba(59, 130, 246, 0.25)";
}

function getAttentionColor(score: number): string {
  if (score >= 80) return "rgba(234, 179, 8, 0.50)";
  if (score >= 60) return "rgba(250, 204, 21, 0.40)";
  if (score >= 40) return "rgba(163, 230, 53, 0.30)";
  if (score >= 20) return "rgba(134, 239, 172, 0.20)";
  return "rgba(209, 213, 219, 0.15)";
}

export function PredictPanel() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<HeatmapAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<HeatmapMode>("scroll");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeHeight, setIframeHeight] = useState(2000);

  const handleAnalyze = async () => {
    if (!url.trim()) { setError("URLを入力してください"); return; }
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/heatmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
      setIframeHeight(data.pageHeight || 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "分析に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!result || !iframeRef.current) return;
    const timer = setTimeout(() => {
      try {
        const doc = iframeRef.current?.contentDocument;
        if (doc?.body) {
          const h = doc.body.scrollHeight;
          if (h > 100) setIframeHeight(h);
        }
      } catch { /* cross-origin */ }
    }, 2000);
    return () => clearTimeout(timer);
  }, [result]);

  const modeConfig = {
    scroll: { label: "スクロールヒートマップ", subtitle: "どこで離脱したかが分かる！", icon: ArrowDownToLine, color: "#ef4444" },
    click: { label: "クリックヒートマップ", subtitle: "クリックした場所が分かる！", icon: MousePointerClick, color: "#f97316" },
    attention: { label: "アテンションヒートマップ", subtitle: "熟読エリアが分かる！", icon: Eye, color: "#eab308" },
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <Card style={{ borderLeft: "3px solid #eab308" }}>
        <CardContent className="pt-4 pb-4">
          <p style={{ fontSize: "12px", color: "#92400e" }}>
            <strong>推定モード:</strong> HTML構造を解析してユーザー行動を推定します。実際の訪問者データではありません。リアルデータが必要な場合は「リアルデータ」タブでサイトを登録してください。
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div style={{ display: "flex", gap: "12px" }}>
            <Input
              placeholder="分析するURL (例: https://example.com)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
              style={{ flex: 1 }}
            />
            <Button onClick={handleAnalyze} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
              分析開始
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6 flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" /><span>{error}</span>
          </CardContent>
        </Card>
      )}

      {loading && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 0" }}>
          <Loader2 style={{ width: "48px", height: "48px", color: "#f97316" }} className="animate-spin" />
          <p style={{ color: "#64748b", marginTop: "16px", fontSize: "16px" }}>ページをクロール＆分析中...</p>
          <p style={{ color: "#94a3b8", marginTop: "4px", fontSize: "13px" }}>HTML構造・コンテンツ量・要素配置から推定ヒートマップを生成しています</p>
        </div>
      )}

      {result && (
        <>
          {/* Mode Selector */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
            {(["scroll", "click", "attention"] as HeatmapMode[]).map((m) => {
              const cfg = modeConfig[m];
              const isActive = mode === m;
              return (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  style={{
                    padding: "16px", borderRadius: "12px",
                    border: isActive ? `2px solid ${cfg.color}` : "2px solid #e2e8f0",
                    backgroundColor: isActive ? `${cfg.color}08` : "#fff",
                    cursor: "pointer", textAlign: "center", transition: "all 0.2s ease",
                    boxShadow: isActive ? `0 4px 12px ${cfg.color}30` : "none",
                  }}
                >
                  <p style={{ fontSize: "12px", color: cfg.color, fontWeight: 600, marginBottom: "4px" }}>{cfg.subtitle}</p>
                  <p style={{ fontSize: "15px", fontWeight: 700, color: "#0f172a" }}>{cfg.label}</p>
                </button>
              );
            })}
          </div>

          {/* Stats Bar */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "12px" }}>
            {[
              { label: "セクション", value: result.totalSections, icon: "📄" },
              { label: "クリック要素", value: result.clickTargets.length, icon: "👆" },
              { label: "画像", value: result.structure.imageCount, icon: "🖼️" },
              { label: "リンク", value: result.structure.linkCount, icon: "🔗" },
              { label: "テキスト量", value: `${result.structure.wordCount}語`, icon: "📝" },
            ].map((s) => (
              <div key={s.label} style={{
                backgroundColor: "#fff", borderRadius: "10px", padding: "12px", border: "1px solid #e2e8f0", textAlign: "center",
              }}>
                <span style={{ fontSize: "20px" }}>{s.icon}</span>
                <p style={{ fontSize: "18px", fontWeight: 700, color: "#0f172a", marginTop: "2px" }}>{s.value}</p>
                <p style={{ fontSize: "11px", color: "#94a3b8" }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Main Heatmap View */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "16px" }}>
            <div style={{ backgroundColor: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
              <div style={{
                padding: "12px 16px", borderBottom: "1px solid #e2e8f0",
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <div style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: "#ef4444" }} />
                    <div style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: "#eab308" }} />
                    <div style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: "#22c55e" }} />
                  </div>
                  <span style={{ fontSize: "12px", color: "#94a3b8", marginLeft: "8px" }}>{result.url}</span>
                </div>
                <Badge variant="outline" className="text-xs">{modeConfig[mode].label}</Badge>
              </div>

              <div style={{ position: "relative", height: "700px", overflow: "auto" }}>
                <iframe
                  ref={iframeRef}
                  srcDoc={result.pageHtml}
                  style={{ width: "100%", height: `${iframeHeight}px`, border: "none", display: "block", pointerEvents: "none" }}
                  sandbox="allow-same-origin"
                  title="Page Preview"
                />

                {mode === "scroll" && (
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: `${iframeHeight}px`, pointerEvents: "none" }}>
                    {result.scrollDepth.map((sd, i) => {
                      const nextDepth = result.scrollDepth[i + 1];
                      if (!nextDepth) return null;
                      const top = (sd.depth / 100) * iframeHeight;
                      const height = ((nextDepth.depth - sd.depth) / 100) * iframeHeight;
                      return (
                        <div key={sd.depth} style={{
                          position: "absolute", top: `${top}px`, left: 0, right: 0, height: `${height}px`,
                          backgroundColor: getScrollColor(sd.estimatedReach),
                        }}>
                          <div style={{
                            position: "absolute", right: "8px", top: "4px",
                            backgroundColor: "rgba(0,0,0,0.7)", color: "#fff",
                            padding: "2px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: 700,
                          }}>{sd.estimatedReach}%</div>
                          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "1px", backgroundColor: "rgba(255,255,255,0.5)" }} />
                        </div>
                      );
                    })}
                    <div style={{ position: "absolute", top: `${Math.min(900, iframeHeight * 0.25)}px`, left: 0, right: 0, height: "2px", backgroundColor: "#ef4444", zIndex: 10 }}>
                      <span style={{ position: "absolute", left: "8px", top: "-10px", backgroundColor: "#ef4444", color: "#fff", padding: "1px 8px", borderRadius: "3px", fontSize: "10px", fontWeight: 700 }}>ファーストビュー</span>
                    </div>
                  </div>
                )}

                {mode === "click" && (
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: `${iframeHeight}px`, pointerEvents: "none" }}>
                    {result.clickTargets.slice(0, 30).map((target, i) => {
                      const yPct = target.yPosition / Math.max(result.pageHeight, 1);
                      const top = yPct * iframeHeight;
                      const hash = target.label.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
                      const left = 15 + (hash % 70);
                      const size = Math.max(30, target.prominence * 0.8);
                      const opacity = 0.3 + (target.prominence / 100) * 0.5;
                      return (
                        <div key={i} style={{
                          position: "absolute", top: `${top}px`, left: `${left}%`,
                          width: `${size}px`, height: `${size}px`, borderRadius: "50%",
                          background: `radial-gradient(circle, rgba(249,115,22,${opacity}) 0%, rgba(239,68,68,${opacity * 0.6}) 50%, transparent 70%)`,
                          transform: "translate(-50%, -50%)", zIndex: Math.round(target.prominence),
                        }} title={`${target.label} (注目度: ${target.prominence})`} />
                      );
                    })}
                  </div>
                )}

                {mode === "attention" && (
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: `${iframeHeight}px`, pointerEvents: "none" }}>
                    {result.zones.map((zone) => {
                      const topPct = zone.yOffset / Math.max(result.pageHeight, 1);
                      const heightPct = zone.height / Math.max(result.pageHeight, 1);
                      return (
                        <div key={zone.index} style={{
                          position: "absolute", top: `${topPct * iframeHeight}px`, left: 0, right: 0,
                          height: `${heightPct * iframeHeight}px`, backgroundColor: getAttentionColor(zone.attentionScore),
                        }}>
                          <div style={{
                            position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)",
                            backgroundColor: zone.attentionScore >= 60 ? "rgba(234,179,8,0.9)" : "rgba(0,0,0,0.6)",
                            color: "#fff", padding: "2px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: 700,
                          }}>{zone.attentionScore}%</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div style={{
                padding: "8px 16px", borderTop: "1px solid #e2e8f0",
                display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", color: "#64748b",
              }}>
                {mode === "scroll" && (
                  <>
                    <span>低い</span>
                    <div style={{ display: "flex", height: "10px", flex: 1, borderRadius: "5px", overflow: "hidden" }}>
                      <div style={{ flex: 1, backgroundColor: "#3b82f6" }} />
                      <div style={{ flex: 1, backgroundColor: "#22c55e" }} />
                      <div style={{ flex: 1, backgroundColor: "#eab308" }} />
                      <div style={{ flex: 1, backgroundColor: "#f97316" }} />
                      <div style={{ flex: 1, backgroundColor: "#ef4444" }} />
                    </div>
                    <span>高い (到達率)</span>
                  </>
                )}
                {mode === "click" && (
                  <>
                    <span>クリック頻度:</span>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <div style={{ width: "16px", height: "16px", borderRadius: "50%", background: "radial-gradient(circle, rgba(249,115,22,0.8) 0%, transparent 70%)" }} />
                        <span>高い</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "radial-gradient(circle, rgba(249,115,22,0.4) 0%, transparent 70%)" }} />
                        <span>低い</span>
                      </div>
                    </div>
                  </>
                )}
                {mode === "attention" && (
                  <>
                    <span>低い</span>
                    <div style={{ display: "flex", height: "10px", flex: 1, borderRadius: "5px", overflow: "hidden" }}>
                      <div style={{ flex: 1, backgroundColor: "#d1d5db" }} />
                      <div style={{ flex: 1, backgroundColor: "#86efac" }} />
                      <div style={{ flex: 1, backgroundColor: "#a3e635" }} />
                      <div style={{ flex: 1, backgroundColor: "#facc15" }} />
                      <div style={{ flex: 1, backgroundColor: "#eab308" }} />
                    </div>
                    <span>高い (熟読度)</span>
                  </>
                )}
              </div>
            </div>

            {/* Right Sidebar */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <Card>
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm">ページ構造</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 pt-0">
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    {[
                      { label: "ヒーロー", ok: result.structure.hasHero },
                      { label: "CTA", ok: result.structure.hasCta },
                      { label: "フォーム", ok: result.structure.hasForm },
                      { label: "ナビ", ok: result.structure.hasNav },
                    ].map((item) => (
                      <div key={item.label} style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "4px 0", borderBottom: "1px solid #f1f5f9",
                      }}>
                        <span style={{ fontSize: "12px", color: "#64748b" }}>{item.label}</span>
                        <span style={{ fontSize: "12px", color: item.ok ? "#22c55e" : "#ef4444", fontWeight: 600 }}>
                          {item.ok ? "✓ あり" : "✗ なし"}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm">推定スクロール到達率</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 pt-0">
                  {result.scrollDepth.map((sd) => (
                    <div key={sd.depth} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "3px 0" }}>
                      <span style={{ fontSize: "11px", color: "#94a3b8", width: "32px", textAlign: "right" }}>{sd.depth}%</span>
                      <div style={{ flex: 1, height: "8px", backgroundColor: "#f1f5f9", borderRadius: "4px", overflow: "hidden" }}>
                        <div style={{
                          width: `${sd.estimatedReach}%`, height: "100%", borderRadius: "4px",
                          backgroundColor: sd.estimatedReach >= 70 ? "#22c55e" : sd.estimatedReach >= 40 ? "#eab308" : "#ef4444",
                        }} />
                      </div>
                      <span style={{ fontSize: "11px", fontWeight: 600, color: "#0f172a", width: "28px" }}>{sd.estimatedReach}%</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm">推定クリック注目度</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 pt-0">
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    {result.clickTargets.slice(0, 8).map((t, i) => (
                      <div key={i} style={{
                        display: "flex", alignItems: "center", gap: "6px",
                        padding: "3px 0", borderBottom: "1px solid #f8fafc",
                      }}>
                        <span style={{
                          fontSize: "10px", fontWeight: 700, color: "#fff",
                          backgroundColor: i < 3 ? "#ef4444" : "#94a3b8",
                          borderRadius: "4px", padding: "1px 5px", minWidth: "18px", textAlign: "center",
                        }}>{i + 1}</span>
                        <span style={{ fontSize: "11px", color: "#334155", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {t.label}
                        </span>
                        <span style={{ fontSize: "10px", color: "#94a3b8" }}>{t.prominence}pt</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="py-3 px-4">
                  <CardTitle className="text-sm flex items-center gap-1">
                    <Lightbulb style={{ width: "14px", height: "14px", color: "#eab308" }} />
                    改善提案 ({result.suggestions.length})
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 pt-0">
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    {result.suggestions.map((s, i) => (
                      <div key={i} style={{
                        padding: "8px", borderRadius: "6px",
                        backgroundColor: s.severity === "high" ? "#fef2f2" : s.severity === "medium" ? "#fffbeb" : "#f0f9ff",
                        border: `1px solid ${s.severity === "high" ? "#fecaca" : s.severity === "medium" ? "#fed7aa" : "#bfdbfe"}`,
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "2px" }}>
                          <Badge variant={s.severity === "high" ? "destructive" : "secondary"} className="text-xs" style={{ fontSize: "10px", padding: "1px 6px" }}>
                            {s.severity === "high" ? "重要" : s.severity === "medium" ? "推奨" : "参考"}
                          </Badge>
                        </div>
                        <p style={{ fontSize: "11px", fontWeight: 600, color: "#0f172a" }}>{s.message}</p>
                        <p style={{ fontSize: "10px", color: "#64748b", marginTop: "2px" }}>{s.details}</p>
                      </div>
                    ))}
                    {result.suggestions.length === 0 && (
                      <p style={{ fontSize: "12px", color: "#94a3b8", textAlign: "center", padding: "12px 0" }}>問題は見つかりませんでした</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
