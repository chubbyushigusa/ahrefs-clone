"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Link2,
  Search,
  Megaphone,
  Share2,
  Globe,
  Mail,
} from "lucide-react";

/* ─── Types ─────────────────────────────────────────────── */

interface UtmEntry {
  source: string;
  medium: string;
  campaign: string;
  count: number;
  percentage: number;
}

interface UtmData {
  sources: UtmEntry[];
}

interface Props {
  siteId: string;
}

/* ─── Helpers ───────────────────────────────────────────── */

function getSourceColor(medium: string): string {
  const m = medium.toLowerCase();
  if (m === "organic" || m === "seo") return "#22c55e";
  if (m === "cpc" || m === "paid" || m === "ppc") return "#3b82f6";
  if (m === "social" || m === "sns") return "#8b5cf6";
  if (m === "email" || m === "newsletter") return "#f97316";
  if (m === "(not set)" || m === "direct" || m === "(none)") return "#94a3b8";
  return "#06b6d4";
}

function getSourceBgColor(medium: string): string {
  const m = medium.toLowerCase();
  if (m === "organic" || m === "seo") return "#f0fdf4";
  if (m === "cpc" || m === "paid" || m === "ppc") return "#eff6ff";
  if (m === "social" || m === "sns") return "#f5f3ff";
  if (m === "email" || m === "newsletter") return "#fff7ed";
  if (m === "(not set)" || m === "direct" || m === "(none)") return "#f8fafc";
  return "#ecfeff";
}

function getSourceIcon(medium: string) {
  const m = medium.toLowerCase();
  if (m === "organic" || m === "seo")
    return <Search style={{ width: "14px", height: "14px" }} />;
  if (m === "cpc" || m === "paid" || m === "ppc")
    return <Megaphone style={{ width: "14px", height: "14px" }} />;
  if (m === "social" || m === "sns")
    return <Share2 style={{ width: "14px", height: "14px" }} />;
  if (m === "email" || m === "newsletter")
    return <Mail style={{ width: "14px", height: "14px" }} />;
  if (m === "(not set)" || m === "direct" || m === "(none)")
    return <Globe style={{ width: "14px", height: "14px" }} />;
  return <Link2 style={{ width: "14px", height: "14px" }} />;
}

function getMediumLabel(medium: string): string {
  const m = medium.toLowerCase();
  if (m === "organic" || m === "seo") return "オーガニック";
  if (m === "cpc" || m === "paid" || m === "ppc") return "有料広告";
  if (m === "social" || m === "sns") return "ソーシャル";
  if (m === "email" || m === "newsletter") return "メール";
  if (m === "(not set)" || m === "direct" || m === "(none)") return "ダイレクト";
  return medium;
}

/* ─── Component ─────────────────────────────────────────── */

export function UtmAnalysis({ siteId }: Props) {
  const [data, setData] = useState<UtmData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/heatmap/utm?siteId=${siteId}`);
      const json = await res.json();
      if (res.ok) {
        setData(json);
      } else {
        setError(json.error || "データ取得に失敗しました");
      }
    } catch {
      setError("データ取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: "#f97316" }} />
      </div>
    );
  }

  if (error) {
    return (
      <p style={{ fontSize: "13px", color: "#ef4444", textAlign: "center", padding: "40px" }}>
        {error}
      </p>
    );
  }

  if (!data || data.sources.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 pb-6">
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <Link2 style={{ width: "48px", height: "48px", color: "#d1d5db", margin: "0 auto" }} />
            <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#0f172a", marginTop: "16px" }}>
              UTMデータがありません
            </h3>
            <p style={{ fontSize: "13px", color: "#94a3b8", marginTop: "8px" }}>
              UTMパラメータ付きのリンクからの訪問があるとデータが表示されます
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxCount = data.sources.length > 0
    ? Math.max(...data.sources.map((s) => s.count))
    : 1;

  const totalSessions = data.sources.reduce((sum, s) => sum + s.count, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Horizontal bar chart */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Link2 style={{ width: "14px", height: "14px", color: "#3b82f6" }} />
            トラフィックソース
            <Badge variant="secondary" style={{ fontSize: "10px" }}>
              合計 {totalSessions.toLocaleString()} セッション
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {data.sources.slice(0, 10).map((entry, i) => {
              const color = getSourceColor(entry.medium);
              const bgColor = getSourceBgColor(entry.medium);

              return (
                <div
                  key={`bar-${i}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  {/* Icon + Source */}
                  <div
                    style={{
                      width: "140px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      flexShrink: 0,
                    }}
                  >
                    <div
                      style={{
                        width: "24px",
                        height: "24px",
                        borderRadius: "6px",
                        backgroundColor: bgColor,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: color,
                        flexShrink: 0,
                      }}
                    >
                      {getSourceIcon(entry.medium)}
                    </div>
                    <span
                      style={{
                        fontSize: "12px",
                        fontWeight: 500,
                        color: "#0f172a",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {entry.source}
                    </span>
                  </div>

                  {/* Bar */}
                  <div
                    style={{
                      flex: 1,
                      height: "20px",
                      backgroundColor: "#f1f5f9",
                      borderRadius: "4px",
                      overflow: "hidden",
                      position: "relative",
                    }}
                  >
                    <div
                      style={{
                        width: `${(entry.count / maxCount) * 100}%`,
                        height: "100%",
                        backgroundColor: color,
                        borderRadius: "4px",
                        transition: "width 0.5s ease-out",
                        minWidth: "2px",
                      }}
                    />
                    {/* Percentage label inside bar */}
                    <span
                      style={{
                        position: "absolute",
                        right: "6px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        fontSize: "10px",
                        fontWeight: 600,
                        color: "#64748b",
                      }}
                    >
                      {entry.percentage}%
                    </span>
                  </div>

                  {/* Count */}
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "#0f172a",
                      width: "50px",
                      textAlign: "right",
                      flexShrink: 0,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {entry.count.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Detailed table */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm">UTM詳細テーブル</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          <div
            style={{
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              overflow: "hidden",
            }}
          >
            {/* Table header */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr 80px 60px",
                backgroundColor: "#f8fafc",
                borderBottom: "1px solid #e2e8f0",
                padding: "8px 12px",
              }}
            >
              <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b" }}>Source</span>
              <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b" }}>Medium</span>
              <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b" }}>Campaign</span>
              <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textAlign: "right" }}>Sessions</span>
              <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", textAlign: "right" }}>%</span>
            </div>

            {/* Table rows */}
            {data.sources.map((entry, i) => {
              const color = getSourceColor(entry.medium);

              return (
                <div
                  key={`row-${i}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr 80px 60px",
                    padding: "8px 12px",
                    borderBottom: i < data.sources.length - 1 ? "1px solid #f1f5f9" : "none",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      fontSize: "12px",
                      color: "#0f172a",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {entry.source}
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <div
                      style={{
                        width: "8px",
                        height: "8px",
                        borderRadius: "2px",
                        backgroundColor: color,
                        flexShrink: 0,
                      }}
                    />
                    <span
                      style={{
                        fontSize: "12px",
                        color: "#64748b",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {getMediumLabel(entry.medium)}
                    </span>
                  </div>
                  <span
                    style={{
                      fontSize: "12px",
                      color: "#94a3b8",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {entry.campaign}
                  </span>
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "#0f172a",
                      textAlign: "right",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {entry.count.toLocaleString()}
                  </span>
                  <span
                    style={{
                      fontSize: "12px",
                      color: "#64748b",
                      textAlign: "right",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {entry.percentage}%
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", justifyContent: "center" }}>
            {[
              { label: "オーガニック", color: "#22c55e" },
              { label: "有料広告", color: "#3b82f6" },
              { label: "ソーシャル", color: "#8b5cf6" },
              { label: "ダイレクト", color: "#94a3b8" },
              { label: "メール", color: "#f97316" },
              { label: "その他", color: "#06b6d4" },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <div
                  style={{
                    width: "10px",
                    height: "10px",
                    borderRadius: "2px",
                    backgroundColor: item.color,
                  }}
                />
                <span style={{ fontSize: "11px", color: "#64748b" }}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
