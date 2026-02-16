"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Flame,
  MousePointerClick,
  ArrowDownToLine,
  Loader2,
  AlertCircle,
  Eye,
  Lightbulb,
  Plus,
  Copy,
  Check,
  Trash2,
  Globe,
  BarChart3,
  Users,
  Clock,
  Code,
  ChevronDown,
} from "lucide-react";
import type { HeatmapAnalysis } from "@/types";

type MainTab = "predict" | "realdata";
type HeatmapMode = "scroll" | "click" | "attention";

interface HeatmapSite {
  id: string;
  domain: string;
  name: string;
  siteKey: string;
  isActive: boolean;
  createdAt: string;
  _count: { pageviews: number };
}

interface RealHeatmapData {
  totalPV: number;
  uniqueSessions: number;
  avgDwell: number;
  avgPageHeight: number;
  scrollDepth: { depth: number; reach: number }[];
  clickMap: { x: number; y: number; count: number; topSelector: string | null }[];
  pages: { path: string; views: number }[];
}

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

function formatDwell(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec}秒`;
  return `${Math.floor(sec / 60)}分${sec % 60}秒`;
}

// ────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ────────────────────────────────────────────────────────────
export default function HeatmapPage() {
  const [mainTab, setMainTab] = useState<MainTab>("realdata");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: "24px", fontWeight: 700, display: "flex", alignItems: "center", gap: "8px" }}>
          <Flame style={{ width: "24px", height: "24px", color: "#f97316" }} />
          ヒートマップ分析
        </h1>
        <p style={{ fontSize: "14px", color: "#64748b", marginTop: "4px" }}>
          リアルトラッキングまたはHTML構造解析による推定ヒートマップ
        </p>
      </div>

      {/* Main Tab Selector */}
      <div style={{ display: "flex", gap: "4px", backgroundColor: "#f1f5f9", padding: "4px", borderRadius: "10px", width: "fit-content" }}>
        {([
          { key: "realdata" as MainTab, label: "リアルデータ", icon: BarChart3, desc: "実際の訪問者データ" },
          { key: "predict" as MainTab, label: "推定分析", icon: Eye, desc: "HTML構造から推定" },
        ]).map((t) => (
          <button
            key={t.key}
            onClick={() => setMainTab(t.key)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 20px",
              borderRadius: "8px",
              border: "none",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: mainTab === t.key ? 600 : 400,
              backgroundColor: mainTab === t.key ? "#fff" : "transparent",
              color: mainTab === t.key ? "#0f172a" : "#64748b",
              boxShadow: mainTab === t.key ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              transition: "all 0.2s",
            }}
          >
            <t.icon style={{ width: "16px", height: "16px" }} />
            {t.label}
          </button>
        ))}
      </div>

      {mainTab === "realdata" ? <RealDataPanel /> : <PredictPanel />}
    </div>
  );
}

// ════════════════════════════════════════════════════════════
// REAL DATA PANEL
// ════════════════════════════════════════════════════════════
function RealDataPanel() {
  const [sites, setSites] = useState<HeatmapSite[]>([]);
  const [loadingSites, setLoadingSites] = useState(true);
  const [selectedSite, setSelectedSite] = useState<HeatmapSite | null>(null);
  const [showAddSite, setShowAddSite] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  const [addingDomain, setAddingDomain] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Data state
  const [selectedPath, setSelectedPath] = useState("/");
  const [heatmapData, setHeatmapData] = useState<RealHeatmapData | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [dataMode, setDataMode] = useState<"scroll" | "click">("scroll");
  const [showPaths, setShowPaths] = useState(false);

  const fetchSites = useCallback(async () => {
    try {
      const res = await fetch("/api/heatmap/sites");
      const data = await res.json();
      setSites(data.sites || []);
      if (!selectedSite && data.sites?.length > 0) {
        setSelectedSite(data.sites[0]);
      }
    } catch { /* ignore */ } finally {
      setLoadingSites(false);
    }
  }, [selectedSite]);

  useEffect(() => { fetchSites(); }, [fetchSites]);

  const handleAddSite = async () => {
    if (!newDomain.trim()) return;
    setAddingDomain(true);
    try {
      const res = await fetch("/api/heatmap/sites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: newDomain.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setNewDomain("");
        setShowAddSite(false);
        await fetchSites();
        setSelectedSite(data.site);
      }
    } catch { /* ignore */ } finally {
      setAddingDomain(false);
    }
  };

  const handleDeleteSite = async (siteId: string) => {
    if (!confirm("このサイトと全トラッキングデータを削除しますか？")) return;
    await fetch("/api/heatmap/sites", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ siteId }),
    });
    if (selectedSite?.id === siteId) setSelectedSite(null);
    fetchSites();
  };

  const copySnippet = (siteKey: string) => {
    const snippet = `<script src="https://analyzer.chubby.co.jp/t.js" data-site="${siteKey}"></script>`;
    navigator.clipboard.writeText(snippet);
    setCopiedKey(siteKey);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Fetch heatmap data
  const fetchData = useCallback(async () => {
    if (!selectedSite) return;
    setLoadingData(true);
    try {
      const res = await fetch(`/api/heatmap/data?siteId=${selectedSite.id}&path=${encodeURIComponent(selectedPath)}`);
      const data = await res.json();
      if (res.ok) setHeatmapData(data);
    } catch { /* ignore */ } finally {
      setLoadingData(false);
    }
  }, [selectedSite, selectedPath]);

  useEffect(() => {
    if (selectedSite) fetchData();
  }, [selectedSite, selectedPath, fetchData]);

  if (loadingSites) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "60px" }}>
        <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#f97316" }} />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Site Selector + Add */}
      <Card>
        <CardContent className="pt-6">
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1 }}>
              <Globe style={{ width: "18px", height: "18px", color: "#64748b" }} />
              <span style={{ fontSize: "14px", fontWeight: 600, color: "#0f172a" }}>登録サイト:</span>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {sites.map((site) => (
                  <button
                    key={site.id}
                    onClick={() => { setSelectedSite(site); setSelectedPath("/"); }}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "6px 14px",
                      borderRadius: "8px",
                      border: selectedSite?.id === site.id ? "2px solid #f97316" : "1px solid #e2e8f0",
                      backgroundColor: selectedSite?.id === site.id ? "#fff7ed" : "#fff",
                      cursor: "pointer",
                      fontSize: "13px",
                      fontWeight: selectedSite?.id === site.id ? 600 : 400,
                      color: "#0f172a",
                    }}
                  >
                    {site.domain}
                    <Badge variant="secondary" style={{ fontSize: "10px", padding: "1px 5px" }}>
                      {site._count.pageviews} PV
                    </Badge>
                  </button>
                ))}
              </div>
            </div>
            <Button size="sm" variant="outline" onClick={() => setShowAddSite(!showAddSite)}>
              <Plus className="h-4 w-4 mr-1" />
              サイト追加
            </Button>
          </div>

          {/* Add Site Form */}
          {showAddSite && (
            <div style={{ marginTop: "12px", padding: "16px", backgroundColor: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", gap: "8px" }}>
                <Input
                  placeholder="例: example.com"
                  value={newDomain}
                  onChange={(e) => setNewDomain(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddSite()}
                  style={{ flex: 1 }}
                />
                <Button onClick={handleAddSite} disabled={addingDomain}>
                  {addingDomain ? <Loader2 className="h-4 w-4 animate-spin" /> : "登録"}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selected Site Detail */}
      {selectedSite && (
        <>
          {/* Tracking Code Card */}
          <Card>
            <CardHeader className="py-3 px-4">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Code style={{ width: "14px", height: "14px" }} />
                  トラッキングコード - {selectedSite.domain}
                </CardTitle>
                <div style={{ display: "flex", gap: "6px" }}>
                  <Button size="sm" variant="ghost" onClick={() => copySnippet(selectedSite.siteKey)}>
                    {copiedKey === selectedSite.siteKey ? (
                      <><Check className="h-3 w-3 mr-1 text-green-500" />コピー済み</>
                    ) : (
                      <><Copy className="h-3 w-3 mr-1" />コピー</>
                    )}
                  </Button>
                  <Button size="sm" variant="ghost" className="text-red-500" onClick={() => handleDeleteSite(selectedSite.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <div style={{
                fontFamily: "monospace",
                fontSize: "12px",
                backgroundColor: "#1e293b",
                color: "#e2e8f0",
                padding: "12px 16px",
                borderRadius: "6px",
                overflowX: "auto",
              }}>
                <span style={{ color: "#94a3b8" }}>&lt;</span>
                <span style={{ color: "#f97316" }}>script</span>
                {" "}
                <span style={{ color: "#a78bfa" }}>src</span>
                <span style={{ color: "#94a3b8" }}>=</span>
                <span style={{ color: "#34d399" }}>&quot;https://analyzer.chubby.co.jp/t.js&quot;</span>
                {" "}
                <span style={{ color: "#a78bfa" }}>data-site</span>
                <span style={{ color: "#94a3b8" }}>=</span>
                <span style={{ color: "#34d399" }}>&quot;{selectedSite.siteKey}&quot;</span>
                <span style={{ color: "#94a3b8" }}>&gt;&lt;/</span>
                <span style={{ color: "#f97316" }}>script</span>
                <span style={{ color: "#94a3b8" }}>&gt;</span>
              </div>
              <p style={{ fontSize: "11px", color: "#94a3b8", marginTop: "8px" }}>
                このコードをサイトの &lt;head&gt; または &lt;/body&gt; 直前に貼り付けてください。訪問者のスクロール・クリックデータが自動で収集されます。
              </p>
            </CardContent>
          </Card>

          {/* Stats */}
          {heatmapData && heatmapData.totalPV > 0 && (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "12px" }}>
                {[
                  { label: "ページビュー", value: heatmapData.totalPV.toLocaleString(), icon: Eye, color: "#3b82f6" },
                  { label: "ユニークセッション", value: heatmapData.uniqueSessions.toLocaleString(), icon: Users, color: "#8b5cf6" },
                  { label: "平均滞在時間", value: formatDwell(heatmapData.avgDwell), icon: Clock, color: "#10b981" },
                  { label: "クリック数", value: heatmapData.clickMap.reduce((s, c) => s + c.count, 0).toLocaleString(), icon: MousePointerClick, color: "#f97316" },
                ].map((s) => (
                  <Card key={s.label}>
                    <CardContent className="pt-4 pb-4">
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{ width: "36px", height: "36px", borderRadius: "8px", backgroundColor: `${s.color}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <s.icon style={{ width: "18px", height: "18px", color: s.color }} />
                        </div>
                        <div>
                          <p style={{ fontSize: "20px", fontWeight: 700, color: "#0f172a" }}>{s.value}</p>
                          <p style={{ fontSize: "11px", color: "#94a3b8" }}>{s.label}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Page Selector */}
              <Card>
                <CardContent className="pt-4 pb-4">
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "#0f172a" }}>ページ:</span>
                    <div style={{ position: "relative", flex: 1 }}>
                      <button
                        onClick={() => setShowPaths(!showPaths)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          width: "100%",
                          padding: "8px 12px",
                          borderRadius: "6px",
                          border: "1px solid #e2e8f0",
                          backgroundColor: "#fff",
                          cursor: "pointer",
                          fontSize: "13px",
                          color: "#0f172a",
                        }}
                      >
                        <span>{selectedPath}</span>
                        <ChevronDown style={{ width: "14px", height: "14px", color: "#94a3b8" }} />
                      </button>
                      {showPaths && heatmapData.pages.length > 0 && (
                        <div style={{
                          position: "absolute",
                          top: "100%",
                          left: 0,
                          right: 0,
                          backgroundColor: "#fff",
                          border: "1px solid #e2e8f0",
                          borderRadius: "6px",
                          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                          zIndex: 20,
                          maxHeight: "200px",
                          overflowY: "auto",
                          marginTop: "4px",
                        }}>
                          {heatmapData.pages.map((p) => (
                            <button
                              key={p.path}
                              onClick={() => { setSelectedPath(p.path); setShowPaths(false); }}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                width: "100%",
                                padding: "8px 12px",
                                border: "none",
                                borderBottom: "1px solid #f1f5f9",
                                backgroundColor: selectedPath === p.path ? "#f8fafc" : "#fff",
                                cursor: "pointer",
                                fontSize: "12px",
                                color: "#0f172a",
                              }}
                            >
                              <span>{p.path}</span>
                              <Badge variant="secondary" style={{ fontSize: "10px" }}>{p.views} PV</Badge>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Mode selector */}
                    <div style={{ display: "flex", gap: "4px", backgroundColor: "#f1f5f9", padding: "3px", borderRadius: "6px" }}>
                      <button
                        onClick={() => setDataMode("scroll")}
                        style={{
                          padding: "4px 12px",
                          borderRadius: "4px",
                          border: "none",
                          cursor: "pointer",
                          fontSize: "12px",
                          fontWeight: dataMode === "scroll" ? 600 : 400,
                          backgroundColor: dataMode === "scroll" ? "#fff" : "transparent",
                          color: dataMode === "scroll" ? "#ef4444" : "#64748b",
                        }}
                      >
                        スクロール
                      </button>
                      <button
                        onClick={() => setDataMode("click")}
                        style={{
                          padding: "4px 12px",
                          borderRadius: "4px",
                          border: "none",
                          cursor: "pointer",
                          fontSize: "12px",
                          fontWeight: dataMode === "click" ? 600 : 400,
                          backgroundColor: dataMode === "click" ? "#fff" : "transparent",
                          color: dataMode === "click" ? "#f97316" : "#64748b",
                        }}
                      >
                        クリック
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Real Heatmap Visualization */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "16px" }}>
                {/* Main - Page with Overlay */}
                <div style={{ backgroundColor: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
                  {/* Browser chrome */}
                  <div style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid #e2e8f0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <div style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: "#ef4444" }} />
                        <div style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: "#eab308" }} />
                        <div style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: "#22c55e" }} />
                      </div>
                      <span style={{ fontSize: "12px", color: "#94a3b8", marginLeft: "8px" }}>
                        https://{selectedSite.domain}{selectedPath}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {dataMode === "scroll" ? "スクロール到達率" : "クリックヒートマップ"}
                    </Badge>
                  </div>

                  {dataMode === "scroll" ? (
                    <RealScrollHeatmap data={heatmapData} domain={selectedSite.domain} path={selectedPath} />
                  ) : (
                    <RealClickHeatmap data={heatmapData} domain={selectedSite.domain} path={selectedPath} />
                  )}
                </div>

                {/* Right Sidebar */}
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                  {/* Scroll Depth Summary */}
                  <Card>
                    <CardHeader className="py-3 px-4">
                      <CardTitle className="text-sm">スクロール到達率</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 pt-0">
                      {heatmapData.scrollDepth.map((sd) => (
                        <div key={sd.depth} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "3px 0" }}>
                          <span style={{ fontSize: "11px", color: "#94a3b8", width: "32px", textAlign: "right" }}>{sd.depth}%</span>
                          <div style={{ flex: 1, height: "8px", backgroundColor: "#f1f5f9", borderRadius: "4px", overflow: "hidden" }}>
                            <div style={{
                              width: `${sd.reach}%`,
                              height: "100%",
                              borderRadius: "4px",
                              backgroundColor: sd.reach >= 70 ? "#22c55e" : sd.reach >= 40 ? "#eab308" : "#ef4444",
                            }} />
                          </div>
                          <span style={{ fontSize: "11px", fontWeight: 600, color: "#0f172a", width: "28px" }}>{sd.reach}%</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>

                  {/* Top Clicked Elements */}
                  <Card>
                    <CardHeader className="py-3 px-4">
                      <CardTitle className="text-sm">クリック上位要素</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 pt-0">
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        {heatmapData.clickMap.slice(0, 10).map((c, i) => (
                          <div key={i} style={{
                            display: "flex", alignItems: "center", gap: "6px",
                            padding: "3px 0", borderBottom: "1px solid #f8fafc",
                          }}>
                            <span style={{
                              fontSize: "10px", fontWeight: 700, color: "#fff",
                              backgroundColor: i < 3 ? "#ef4444" : "#94a3b8",
                              borderRadius: "4px", padding: "1px 5px", minWidth: "18px", textAlign: "center",
                            }}>
                              {i + 1}
                            </span>
                            <span style={{ fontSize: "11px", color: "#334155", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {c.topSelector || `(${c.x}, ${c.y})`}
                            </span>
                            <span style={{ fontSize: "10px", color: "#94a3b8" }}>{c.count}回</span>
                          </div>
                        ))}
                        {heatmapData.clickMap.length === 0 && (
                          <p style={{ fontSize: "12px", color: "#94a3b8", textAlign: "center", padding: "12px 0" }}>
                            クリックデータがありません
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Page List */}
                  <Card>
                    <CardHeader className="py-3 px-4">
                      <CardTitle className="text-sm">ページ別PV</CardTitle>
                    </CardHeader>
                    <CardContent className="px-4 pb-4 pt-0">
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        {heatmapData.pages.slice(0, 8).map((p) => (
                          <button
                            key={p.path}
                            onClick={() => setSelectedPath(p.path)}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "4px 0",
                              borderBottom: "1px solid #f8fafc",
                              border: "none",
                              backgroundColor: "transparent",
                              cursor: "pointer",
                              width: "100%",
                            }}
                          >
                            <span style={{
                              fontSize: "11px",
                              color: selectedPath === p.path ? "#f97316" : "#334155",
                              fontWeight: selectedPath === p.path ? 600 : 400,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              textAlign: "left",
                            }}>
                              {p.path}
                            </span>
                            <span style={{ fontSize: "10px", color: "#94a3b8", flexShrink: 0, marginLeft: "8px" }}>{p.views}</span>
                          </button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </>
          )}

          {/* Empty state */}
          {heatmapData && heatmapData.totalPV === 0 && !loadingData && (
            <Card>
              <CardContent className="pt-6 pb-6">
                <div style={{ textAlign: "center", padding: "40px 0" }}>
                  <BarChart3 style={{ width: "48px", height: "48px", color: "#d1d5db", margin: "0 auto" }} />
                  <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#0f172a", marginTop: "16px" }}>
                    まだデータがありません
                  </h3>
                  <p style={{ fontSize: "13px", color: "#94a3b8", marginTop: "8px", maxWidth: "400px", margin: "8px auto 0" }}>
                    上のトラッキングコードをサイトに設置してください。訪問者がアクセスするとデータが表示されます。
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {loadingData && (
            <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
              <Loader2 className="h-8 w-8 animate-spin" style={{ color: "#f97316" }} />
            </div>
          )}
        </>
      )}

      {/* No sites registered */}
      {sites.length === 0 && !showAddSite && (
        <Card>
          <CardContent className="pt-6 pb-6">
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <Globe style={{ width: "48px", height: "48px", color: "#d1d5db", margin: "0 auto" }} />
              <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#0f172a", marginTop: "16px" }}>
                サイトを登録してリアルデータを収集
              </h3>
              <p style={{ fontSize: "13px", color: "#94a3b8", marginTop: "8px" }}>
                サイトを追加すると、JSタグ1行を貼るだけで訪問者のスクロール・クリックデータが取れます
              </p>
              <Button onClick={() => setShowAddSite(true)} style={{ marginTop: "16px" }}>
                <Plus className="h-4 w-4 mr-2" />
                最初のサイトを登録
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ── Real Scroll Heatmap (with actual page iframe) ─────────
function RealScrollHeatmap({ data, domain, path }: { data: RealHeatmapData; domain: string; path: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeHeight, setIframeHeight] = useState(3000);
  const pageUrl = `https://${domain}${path}`;

  useEffect(() => {
    if (data.avgPageHeight && data.avgPageHeight > 0) {
      setIframeHeight(data.avgPageHeight);
    }
  }, [data.avgPageHeight]);

  // Try to detect iframe height after load
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const doc = iframeRef.current?.contentDocument;
        if (doc?.body) {
          const h = doc.body.scrollHeight;
          if (h > 100) setIframeHeight(h);
        }
      } catch { /* cross-origin */ }
    }, 3000);
    return () => clearTimeout(timer);
  }, [pageUrl]);

  return (
    <>
      <div style={{ position: "relative", height: "700px", overflow: "auto" }}>
        {/* Actual page iframe */}
        <iframe
          ref={iframeRef}
          src={pageUrl}
          style={{
            width: "100%",
            height: `${iframeHeight}px`,
            border: "none",
            display: "block",
            pointerEvents: "none",
          }}
          sandbox="allow-same-origin allow-scripts"
          title="Page Preview"
        />

        {/* Scroll heatmap overlay */}
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: `${iframeHeight}px`,
          pointerEvents: "none",
        }}>
          {data.scrollDepth.map((sd, i) => {
            const next = data.scrollDepth[i + 1];
            if (!next) return null;
            const top = (sd.depth / 100) * iframeHeight;
            const height = ((next.depth - sd.depth) / 100) * iframeHeight;
            return (
              <div key={sd.depth} style={{
                position: "absolute",
                top: `${top}px`,
                left: 0,
                right: 0,
                height: `${height}px`,
                backgroundColor: getScrollColor(sd.reach),
                transition: "background-color 0.3s",
              }}>
                <div style={{
                  position: "absolute",
                  right: "8px",
                  top: "4px",
                  backgroundColor: "rgba(0,0,0,0.7)",
                  color: "#fff",
                  padding: "2px 8px",
                  borderRadius: "4px",
                  fontSize: "12px",
                  fontWeight: 700,
                }}>
                  {sd.reach}%
                </div>
                <div style={{
                  position: "absolute",
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: "1px",
                  backgroundColor: "rgba(255,255,255,0.5)",
                }} />
              </div>
            );
          })}

          {/* Fold line */}
          <div style={{
            position: "absolute",
            top: `${Math.min(900, iframeHeight * 0.12)}px`,
            left: 0,
            right: 0,
            height: "2px",
            backgroundColor: "#ef4444",
            zIndex: 10,
          }}>
            <span style={{
              position: "absolute",
              left: "8px",
              top: "-10px",
              backgroundColor: "#ef4444",
              color: "#fff",
              padding: "1px 8px",
              borderRadius: "3px",
              fontSize: "10px",
              fontWeight: 700,
            }}>
              ファーストビュー
            </span>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div style={{
        padding: "8px 16px",
        borderTop: "1px solid #e2e8f0",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        fontSize: "11px",
        color: "#64748b",
      }}>
        <span>低い</span>
        <div style={{ display: "flex", height: "10px", flex: 1, borderRadius: "5px", overflow: "hidden" }}>
          <div style={{ flex: 1, backgroundColor: "#3b82f6" }} />
          <div style={{ flex: 1, backgroundColor: "#22c55e" }} />
          <div style={{ flex: 1, backgroundColor: "#eab308" }} />
          <div style={{ flex: 1, backgroundColor: "#f97316" }} />
          <div style={{ flex: 1, backgroundColor: "#ef4444" }} />
        </div>
        <span>高い (到達率)</span>
      </div>
    </>
  );
}

// ── Real Click Heatmap (with actual page iframe) ──────────
function RealClickHeatmap({ data, domain, path }: { data: RealHeatmapData; domain: string; path: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeHeight, setIframeHeight] = useState(3000);
  const pageUrl = `https://${domain}${path}`;

  useEffect(() => {
    if (data.avgPageHeight && data.avgPageHeight > 0) {
      setIframeHeight(data.avgPageHeight);
    }
  }, [data.avgPageHeight]);

  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const doc = iframeRef.current?.contentDocument;
        if (doc?.body) {
          const h = doc.body.scrollHeight;
          if (h > 100) setIframeHeight(h);
        }
      } catch { /* cross-origin */ }
    }, 3000);
    return () => clearTimeout(timer);
  }, [pageUrl]);

  const maxCount = data.clickMap.length > 0 ? Math.max(...data.clickMap.map((c) => c.count)) : 1;
  const pageH = data.avgPageHeight || iframeHeight;

  return (
    <>
      <div style={{ position: "relative", height: "700px", overflow: "auto" }}>
        {/* Actual page iframe */}
        <iframe
          ref={iframeRef}
          src={pageUrl}
          style={{
            width: "100%",
            height: `${iframeHeight}px`,
            border: "none",
            display: "block",
            pointerEvents: "none",
          }}
          sandbox="allow-same-origin allow-scripts"
          title="Page Preview"
        />

        {/* Click overlay */}
        <div style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: `${iframeHeight}px`,
          pointerEvents: "none",
        }}>
          {data.clickMap.length === 0 && (
            <div style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              backgroundColor: "rgba(0,0,0,0.6)",
              color: "#fff",
              padding: "8px 16px",
              borderRadius: "6px",
              fontSize: "13px",
            }}>
              クリックデータがありません
            </div>
          )}
          {data.clickMap.map((click, i) => {
            const intensity = click.count / maxCount;
            // Map click coordinates relative to iframe
            const relX = (click.x / 1400) * 100; // percentage
            const relY = click.y / pageH * iframeHeight;
            const size = 30 + intensity * 50;
            const alpha = 0.25 + intensity * 0.55;
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  top: `${relY}px`,
                  left: `${relX}%`,
                  width: `${size}px`,
                  height: `${size}px`,
                  borderRadius: "50%",
                  background: `radial-gradient(circle, rgba(249,115,22,${alpha}) 0%, rgba(239,68,68,${alpha * 0.6}) 50%, transparent 70%)`,
                  transform: "translate(-50%, -50%)",
                  zIndex: Math.round(intensity * 100),
                }}
                title={`${click.topSelector || `(${click.x},${click.y})`} - ${click.count}回`}
              />
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div style={{
        padding: "8px 16px",
        borderTop: "1px solid #e2e8f0",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        fontSize: "11px",
        color: "#64748b",
      }}>
        <span>クリック頻度:</span>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <div style={{ width: "16px", height: "16px", borderRadius: "50%", background: "radial-gradient(circle, rgba(249,115,22,0.8) 0%, transparent 70%)" }} />
          <span>高い</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "radial-gradient(circle, rgba(249,115,22,0.3) 0%, transparent 70%)" }} />
          <span>低い</span>
        </div>
      </div>
    </>
  );
}

// ════════════════════════════════════════════════════════════
// PREDICT (ESTIMATE) PANEL - Original functionality
// ════════════════════════════════════════════════════════════
function PredictPanel() {
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

      {/* URL Input */}
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
                    padding: "16px",
                    borderRadius: "12px",
                    border: isActive ? `2px solid ${cfg.color}` : "2px solid #e2e8f0",
                    backgroundColor: isActive ? `${cfg.color}08` : "#fff",
                    cursor: "pointer",
                    textAlign: "center",
                    transition: "all 0.2s ease",
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
                backgroundColor: "#fff",
                borderRadius: "10px",
                padding: "12px",
                border: "1px solid #e2e8f0",
                textAlign: "center",
              }}>
                <span style={{ fontSize: "20px" }}>{s.icon}</span>
                <p style={{ fontSize: "18px", fontWeight: 700, color: "#0f172a", marginTop: "2px" }}>{s.value}</p>
                <p style={{ fontSize: "11px", color: "#94a3b8" }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Main Heatmap View */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "16px" }}>
            {/* Page Preview with Overlay */}
            <div style={{
              backgroundColor: "#fff",
              borderRadius: "12px",
              border: "1px solid #e2e8f0",
              overflow: "hidden",
            }}>
              <div style={{
                padding: "12px 16px",
                borderBottom: "1px solid #e2e8f0",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <div style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: "#ef4444" }} />
                    <div style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: "#eab308" }} />
                    <div style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: "#22c55e" }} />
                  </div>
                  <span style={{ fontSize: "12px", color: "#94a3b8", marginLeft: "8px" }}>{result.url}</span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {modeConfig[mode].label}
                </Badge>
              </div>

              {/* Heatmap Container */}
              <div style={{ position: "relative", height: "700px", overflow: "auto" }}>
                <iframe
                  ref={iframeRef}
                  srcDoc={result.pageHtml}
                  style={{ width: "100%", height: `${iframeHeight}px`, border: "none", display: "block", pointerEvents: "none" }}
                  sandbox="allow-same-origin"
                  title="Page Preview"
                />

                {/* Scroll Overlay */}
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
                          }}>
                            {sd.estimatedReach}%
                          </div>
                          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "1px", backgroundColor: "rgba(255,255,255,0.5)" }} />
                        </div>
                      );
                    })}
                    <div style={{ position: "absolute", top: `${Math.min(900, iframeHeight * 0.25)}px`, left: 0, right: 0, height: "2px", backgroundColor: "#ef4444", zIndex: 10 }}>
                      <span style={{ position: "absolute", left: "8px", top: "-10px", backgroundColor: "#ef4444", color: "#fff", padding: "1px 8px", borderRadius: "3px", fontSize: "10px", fontWeight: 700 }}>
                        ファーストビュー
                      </span>
                    </div>
                  </div>
                )}

                {/* Click Overlay */}
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

                {/* Attention Overlay */}
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
                          }}>
                            {zone.attentionScore}%
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Color Legend */}
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
                        }}>
                          {i + 1}
                        </span>
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
