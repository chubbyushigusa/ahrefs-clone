"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, Plus, Copy, Check, Trash2, Globe, BarChart3,
  Eye, Clock, MousePointerClick, Code, ChevronDown,
  List, LineChart, Monitor, Smartphone, ArrowDown, Flame,
} from "lucide-react";
import { RealScrollHeatmap } from "./real-scroll-heatmap";
import { RealClickHeatmap } from "./real-click-heatmap";
import { RealAttentionHeatmap } from "./real-attention-heatmap";
import { SessionList } from "./session-list";
import { ClickLog } from "./click-log";
import { AnalyticsOverview } from "./analytics-overview";

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
  medianDwell: number;
  fvExitRate: number;
  bottomReachRate: number;
  attentionZones: number[];
  avgPageHeight: number;
  scrollDepth: { depth: number; reach: number }[];
  clickMap: { x: number; y: number; count: number; topSelector: string | null }[];
  pages: { path: string; views: number }[];
}

function formatDwell(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec}秒`;
  return `${Math.floor(sec / 60)}分${sec % 60}秒`;
}

type SubTab = "heatmap" | "sessions" | "clicks" | "analytics";
type HeatmapMode = "attention" | "scroll" | "click";
type DeviceFilter = "all" | "pc" | "sp";

export function RealDataPanel() {
  const [sites, setSites] = useState<HeatmapSite[]>([]);
  const [loadingSites, setLoadingSites] = useState(true);
  const [selectedSite, setSelectedSite] = useState<HeatmapSite | null>(null);
  const [showAddSite, setShowAddSite] = useState(false);
  const [newDomain, setNewDomain] = useState("");
  const [addingDomain, setAddingDomain] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [subTab, setSubTab] = useState<SubTab>("heatmap");

  // Heatmap data state
  const [selectedPath, setSelectedPath] = useState("/");
  const [heatmapData, setHeatmapData] = useState<RealHeatmapData | null>(null);
  const [loadingData, setLoadingData] = useState(false);
  const [dataMode, setDataMode] = useState<HeatmapMode>("attention");
  const [deviceFilter, setDeviceFilter] = useState<DeviceFilter>("all");
  const [showPaths, setShowPaths] = useState(false);
  const [pageHtml, setPageHtml] = useState<string | null>(null);

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

  // Fetch heatmap data + proxy HTML in parallel
  const fetchData = useCallback(async () => {
    if (!selectedSite) return;
    setLoadingData(true);
    try {
      const proxyUrl = `/api/heatmap/proxy?url=${encodeURIComponent(`https://${selectedSite.domain}${selectedPath}`)}`;
      const [dataRes, proxyRes] = await Promise.all([
        fetch(`/api/heatmap/data?siteId=${selectedSite.id}&path=${encodeURIComponent(selectedPath)}&device=${deviceFilter}`),
        fetch(proxyUrl).catch(() => null),
      ]);
      const data = await dataRes.json();
      if (dataRes.ok) setHeatmapData(data);

      if (proxyRes?.ok) {
        const proxyData = await proxyRes.json();
        setPageHtml(proxyData.html || null);
      } else {
        setPageHtml(null);
      }
    } catch { /* ignore */ } finally {
      setLoadingData(false);
    }
  }, [selectedSite, selectedPath, deviceFilter]);

  useEffect(() => {
    if (selectedSite && subTab === "heatmap") fetchData();
  }, [selectedSite, selectedPath, fetchData, subTab, deviceFilter]);

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
                      display: "flex", alignItems: "center", gap: "6px",
                      padding: "6px 14px", borderRadius: "8px",
                      border: selectedSite?.id === site.id ? "2px solid #f97316" : "1px solid #e2e8f0",
                      backgroundColor: selectedSite?.id === site.id ? "#fff7ed" : "#fff",
                      cursor: "pointer", fontSize: "13px",
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
                fontFamily: "monospace", fontSize: "12px", backgroundColor: "#1e293b", color: "#e2e8f0",
                padding: "12px 16px", borderRadius: "6px", overflowX: "auto",
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
                このコードをサイトの &lt;head&gt; または &lt;/body&gt; 直前に貼り付けてください。
              </p>
            </CardContent>
          </Card>

          {/* Sub-Tab Selector */}
          <div style={{ display: "flex", gap: "4px", backgroundColor: "#f1f5f9", padding: "4px", borderRadius: "10px", width: "fit-content" }}>
            {([
              { key: "heatmap" as SubTab, label: "ヒートマップ", icon: BarChart3 },
              { key: "sessions" as SubTab, label: "セッション一覧", icon: List },
              { key: "clicks" as SubTab, label: "クリックログ", icon: MousePointerClick },
              { key: "analytics" as SubTab, label: "アクセス解析", icon: LineChart },
            ]).map((t) => (
              <button
                key={t.key}
                onClick={() => setSubTab(t.key)}
                style={{
                  display: "flex", alignItems: "center", gap: "6px",
                  padding: "8px 16px", borderRadius: "8px", border: "none", cursor: "pointer",
                  fontSize: "13px", fontWeight: subTab === t.key ? 600 : 400,
                  backgroundColor: subTab === t.key ? "#fff" : "transparent",
                  color: subTab === t.key ? "#0f172a" : "#64748b",
                  boxShadow: subTab === t.key ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                  transition: "all 0.2s",
                }}
              >
                <t.icon style={{ width: "15px", height: "15px" }} />
                {t.label}
              </button>
            ))}
          </div>

          {/* Sub-Tab Content */}
          {subTab === "heatmap" && (
            <>
              {/* SiteLead-style Stats Bar - 5 metrics */}
              {heatmapData && heatmapData.totalPV > 0 && (
                <>
                  <div style={{
                    display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "1px",
                    backgroundColor: "#e2e8f0", borderRadius: "12px", overflow: "hidden",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
                  }}>
                    {[
                      { label: "PV数", value: heatmapData.totalPV.toLocaleString(), icon: Eye, color: "#3b82f6", bg: "#eff6ff" },
                      { label: "FV離脱率", value: `${heatmapData.fvExitRate || 0}%`, icon: ArrowDown, color: "#ef4444", bg: "#fef2f2" },
                      { label: "最下部到達率", value: `${heatmapData.bottomReachRate || 0}%`, icon: ArrowDown, color: "#10b981", bg: "#ecfdf5" },
                      { label: "平均滞在時間", value: formatDwell(heatmapData.avgDwell), icon: Clock, color: "#8b5cf6", bg: "#f5f3ff" },
                      { label: "中央値滞在時間", value: formatDwell(heatmapData.medianDwell || 0), icon: Clock, color: "#f97316", bg: "#fff7ed" },
                    ].map((s) => (
                      <div key={s.label} style={{
                        backgroundColor: "#fff", padding: "16px 12px",
                        display: "flex", flexDirection: "column", alignItems: "center", gap: "6px",
                      }}>
                        <div style={{
                          width: "32px", height: "32px", borderRadius: "8px",
                          backgroundColor: s.bg, display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          <s.icon style={{ width: "16px", height: "16px", color: s.color }} />
                        </div>
                        <p style={{ fontSize: "20px", fontWeight: 700, color: "#0f172a", lineHeight: 1 }}>{s.value}</p>
                        <p style={{ fontSize: "11px", color: "#94a3b8", textAlign: "center" }}>{s.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Toolbar: Mode Tabs + Device Toggle + Page Selector */}
                  <Card>
                    <CardContent className="pt-4 pb-4">
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        {/* Mode tabs: Attention / Scroll / Click */}
                        <div style={{ display: "flex", gap: "2px", backgroundColor: "#f1f5f9", padding: "3px", borderRadius: "8px" }}>
                          {([
                            { key: "attention" as HeatmapMode, label: "アテンション", color: "#ef4444" },
                            { key: "scroll" as HeatmapMode, label: "スクロール", color: "#22c55e" },
                            { key: "click" as HeatmapMode, label: "クリック", color: "#f97316" },
                          ]).map((m) => (
                            <button
                              key={m.key}
                              onClick={() => setDataMode(m.key)}
                              style={{
                                padding: "5px 14px", borderRadius: "6px", border: "none", cursor: "pointer",
                                fontSize: "12px", fontWeight: dataMode === m.key ? 600 : 400,
                                backgroundColor: dataMode === m.key ? "#fff" : "transparent",
                                color: dataMode === m.key ? m.color : "#64748b",
                                boxShadow: dataMode === m.key ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
                                transition: "all 0.15s",
                              }}
                            >{m.label}</button>
                          ))}
                        </div>

                        {/* Device toggle: ALL / PC / SP */}
                        <div style={{ display: "flex", gap: "2px", backgroundColor: "#f1f5f9", padding: "3px", borderRadius: "8px" }}>
                          {([
                            { key: "all" as DeviceFilter, label: "ALL", icon: null },
                            { key: "pc" as DeviceFilter, label: "PC", icon: Monitor },
                            { key: "sp" as DeviceFilter, label: "SP", icon: Smartphone },
                          ]).map((d) => (
                            <button
                              key={d.key}
                              onClick={() => setDeviceFilter(d.key)}
                              style={{
                                display: "flex", alignItems: "center", gap: "4px",
                                padding: "5px 10px", borderRadius: "6px", border: "none", cursor: "pointer",
                                fontSize: "11px", fontWeight: deviceFilter === d.key ? 600 : 400,
                                backgroundColor: deviceFilter === d.key ? "#fff" : "transparent",
                                color: deviceFilter === d.key ? "#0f172a" : "#94a3b8",
                                boxShadow: deviceFilter === d.key ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
                                transition: "all 0.15s",
                              }}
                            >
                              {d.icon && <d.icon style={{ width: "12px", height: "12px" }} />}
                              {d.label}
                            </button>
                          ))}
                        </div>

                        {/* Page selector */}
                        <div style={{ position: "relative", flex: 1 }}>
                          <button
                            onClick={() => setShowPaths(!showPaths)}
                            style={{
                              display: "flex", alignItems: "center", justifyContent: "space-between",
                              width: "100%", padding: "7px 12px", borderRadius: "6px",
                              border: "1px solid #e2e8f0", backgroundColor: "#fff",
                              cursor: "pointer", fontSize: "13px", color: "#0f172a",
                            }}
                          >
                            <span>{selectedPath}</span>
                            <ChevronDown style={{ width: "14px", height: "14px", color: "#94a3b8" }} />
                          </button>
                          {showPaths && heatmapData.pages.length > 0 && (
                            <div style={{
                              position: "absolute", top: "100%", left: 0, right: 0,
                              backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "6px",
                              boxShadow: "0 4px 12px rgba(0,0,0,0.1)", zIndex: 20, maxHeight: "200px",
                              overflowY: "auto", marginTop: "4px",
                            }}>
                              {heatmapData.pages.map((p) => (
                                <button
                                  key={p.path}
                                  onClick={() => { setSelectedPath(p.path); setShowPaths(false); }}
                                  style={{
                                    display: "flex", alignItems: "center", justifyContent: "space-between",
                                    width: "100%", padding: "8px 12px", border: "none",
                                    borderBottom: "1px solid #f1f5f9",
                                    backgroundColor: selectedPath === p.path ? "#f8fafc" : "#fff",
                                    cursor: "pointer", fontSize: "12px", color: "#0f172a",
                                  }}
                                >
                                  <span>{p.path}</span>
                                  <Badge variant="secondary" style={{ fontSize: "10px" }}>{p.views} PV</Badge>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Heatmap Visualization + Sidebar */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "16px" }}>
                    {/* Main heatmap area */}
                    <div style={{ backgroundColor: "#fff", borderRadius: "12px", border: "1px solid #e2e8f0", overflow: "hidden" }}>
                      <div style={{
                        padding: "10px 16px", borderBottom: "1px solid #e2e8f0",
                        display: "flex", alignItems: "center", justifyContent: "space-between",
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
                          {dataMode === "attention" ? "アテンションヒートマップ" : dataMode === "scroll" ? "スクロール到達率" : "クリックヒートマップ"}
                        </Badge>
                      </div>

                      {dataMode === "attention" ? (
                        <RealAttentionHeatmap data={heatmapData} domain={selectedSite.domain} path={selectedPath} pageHtml={pageHtml} />
                      ) : dataMode === "scroll" ? (
                        <RealScrollHeatmap data={heatmapData} domain={selectedSite.domain} path={selectedPath} pageHtml={pageHtml} />
                      ) : (
                        <RealClickHeatmap data={heatmapData} domain={selectedSite.domain} path={selectedPath} pageHtml={pageHtml} />
                      )}
                    </div>

                    {/* Right Sidebar — mode-linked */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      {/* Mode-specific sidebar content */}
                      {dataMode === "attention" && (
                        <Card>
                          <CardHeader className="py-3 px-4">
                            <CardTitle className="text-sm flex items-center gap-2">
                              <Flame style={{ width: "14px", height: "14px", color: "#ef4444" }} />
                              アテンションスコア
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="px-4 pb-4 pt-0">
                            {(heatmapData.attentionZones || []).map((score, i) => (
                              <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "3px 0" }}>
                                <span style={{ fontSize: "10px", color: "#94a3b8", width: "42px", textAlign: "right" }}>
                                  {i * 10}-{(i + 1) * 10}%
                                </span>
                                <div style={{ flex: 1, height: "8px", backgroundColor: "#f1f5f9", borderRadius: "4px", overflow: "hidden" }}>
                                  <div style={{
                                    width: `${score}%`, height: "100%", borderRadius: "4px",
                                    backgroundColor: score >= 70 ? "#ef4444" : score >= 40 ? "#eab308" : "#3b82f6",
                                    transition: "width 0.3s",
                                  }} />
                                </div>
                                <span style={{ fontSize: "11px", fontWeight: 600, color: "#0f172a", width: "28px" }}>{score}%</span>
                              </div>
                            ))}
                          </CardContent>
                        </Card>
                      )}

                      {dataMode === "scroll" && (
                        <Card>
                          <CardHeader className="py-3 px-4">
                            <CardTitle className="text-sm">スクロール到達率</CardTitle>
                          </CardHeader>
                          <CardContent className="px-4 pb-4 pt-0">
                            {heatmapData.scrollDepth.map((sd, i) => {
                              const next = heatmapData.scrollDepth[i + 1];
                              const exitRate = next ? sd.reach - next.reach : 0;
                              return (
                                <div key={sd.depth} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "3px 0" }}>
                                  <span style={{ fontSize: "11px", color: "#94a3b8", width: "32px", textAlign: "right" }}>{sd.depth}%</span>
                                  <div style={{ flex: 1, height: "8px", backgroundColor: "#f1f5f9", borderRadius: "4px", overflow: "hidden" }}>
                                    <div style={{
                                      width: `${sd.reach}%`, height: "100%", borderRadius: "4px",
                                      backgroundColor: sd.reach >= 70 ? "#22c55e" : sd.reach >= 40 ? "#eab308" : "#ef4444",
                                    }} />
                                  </div>
                                  <span style={{ fontSize: "11px", fontWeight: 600, color: "#0f172a", width: "28px" }}>{sd.reach}%</span>
                                  {exitRate > 0 && (
                                    <span style={{ fontSize: "9px", color: "#ef4444", width: "28px" }}>-{exitRate}%</span>
                                  )}
                                </div>
                              );
                            })}
                          </CardContent>
                        </Card>
                      )}

                      {dataMode === "click" && (
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
                                  }}>{i + 1}</span>
                                  <span style={{ fontSize: "11px", color: "#334155", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {c.topSelector || `(${c.x}, ${c.y})`}
                                  </span>
                                  <span style={{ fontSize: "10px", color: "#94a3b8" }}>{c.count}回</span>
                                </div>
                              ))}
                              {heatmapData.clickMap.length === 0 && (
                                <p style={{ fontSize: "12px", color: "#94a3b8", textAlign: "center", padding: "12px 0" }}>クリックデータがありません</p>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      )}

                      {/* Page list - always shown */}
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
                                  display: "flex", alignItems: "center", justifyContent: "space-between",
                                  padding: "4px 0", border: "none", backgroundColor: "transparent",
                                  cursor: "pointer", width: "100%",
                                }}
                              >
                                <span style={{
                                  fontSize: "11px",
                                  color: selectedPath === p.path ? "#f97316" : "#334155",
                                  fontWeight: selectedPath === p.path ? 600 : 400,
                                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "left",
                                }}>{p.path}</span>
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

              {heatmapData && heatmapData.totalPV === 0 && !loadingData && (
                <Card>
                  <CardContent className="pt-6 pb-6">
                    <div style={{ textAlign: "center", padding: "40px 0" }}>
                      <BarChart3 style={{ width: "48px", height: "48px", color: "#d1d5db", margin: "0 auto" }} />
                      <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#0f172a", marginTop: "16px" }}>まだデータがありません</h3>
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

          {subTab === "sessions" && <SessionList siteId={selectedSite.id} />}
          {subTab === "clicks" && <ClickLog siteId={selectedSite.id} />}
          {subTab === "analytics" && <AnalyticsOverview siteId={selectedSite.id} />}
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
