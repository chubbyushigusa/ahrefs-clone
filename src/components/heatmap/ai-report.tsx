"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Info,
  AlertCircle,
  Lightbulb,
  Clock,
  BarChart3,
  MousePointerClick,
  Eye,
} from "lucide-react";

/* ─── Types ─────────────────────────────────────────────── */

interface AiInsight {
  title: string;
  description: string;
  severity: "high" | "medium" | "low";
  category: string;
  metricName?: string;
  metricChange?: number;
  metricDirection?: "up" | "down";
}

interface AiReportData {
  summary: string;
  insights: AiInsight[];
  generatedAt: string;
}

interface Props {
  siteId: string;
}

/* ─── Helpers ───────────────────────────────────────────── */

function getSeverityStyles(severity: "high" | "medium" | "low") {
  switch (severity) {
    case "high":
      return {
        borderColor: "#fecaca",
        backgroundColor: "#fef2f2",
        badgeColor: "#ef4444",
        badgeBg: "#fef2f2",
        badgeLabel: "重要",
      };
    case "medium":
      return {
        borderColor: "#fde68a",
        backgroundColor: "#fffbeb",
        badgeColor: "#d97706",
        badgeBg: "#fffbeb",
        badgeLabel: "注意",
      };
    case "low":
      return {
        borderColor: "#bfdbfe",
        backgroundColor: "#eff6ff",
        badgeColor: "#3b82f6",
        badgeBg: "#eff6ff",
        badgeLabel: "情報",
      };
  }
}

function getSeverityIcon(severity: "high" | "medium" | "low") {
  switch (severity) {
    case "high":
      return <AlertCircle style={{ width: "18px", height: "18px", color: "#ef4444" }} />;
    case "medium":
      return <AlertTriangle style={{ width: "18px", height: "18px", color: "#d97706" }} />;
    case "low":
      return <Info style={{ width: "18px", height: "18px", color: "#3b82f6" }} />;
  }
}

function getCategoryIcon(category: string) {
  const c = category.toLowerCase();
  if (c.includes("click") || c.includes("クリック"))
    return <MousePointerClick style={{ width: "14px", height: "14px", color: "#64748b" }} />;
  if (c.includes("scroll") || c.includes("スクロール"))
    return <BarChart3 style={{ width: "14px", height: "14px", color: "#64748b" }} />;
  if (c.includes("page") || c.includes("ページ") || c.includes("view"))
    return <Eye style={{ width: "14px", height: "14px", color: "#64748b" }} />;
  return <Lightbulb style={{ width: "14px", height: "14px", color: "#64748b" }} />;
}

/* ─── Component ─────────────────────────────────────────── */

export function AiReport({ siteId }: Props) {
  const [data, setData] = useState<AiReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/heatmap/ai-report?siteId=${siteId}`);
      const json = await res.json();
      if (res.ok) {
        setData(json);
      } else {
        setError(json.error || "レポート取得に失敗しました");
      }
    } catch {
      setError("レポート取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Loading state with AI animation
  if (loading) {
    return (
      <Card>
        <CardContent className="pt-8 pb-8">
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "16px",
            }}
          >
            <div
              style={{
                position: "relative",
                width: "64px",
                height: "64px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "50%",
                  border: "3px solid #e2e8f0",
                  borderTopColor: "#f97316",
                  animation: "aiSpin 1s linear infinite",
                }}
              />
              <Sparkles style={{ width: "24px", height: "24px", color: "#f97316" }} />
            </div>
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: "16px", fontWeight: 600, color: "#0f172a" }}>
                AIが分析中...
              </p>
              <p style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>
                サイトデータを解析してインサイトを生成しています
              </p>
            </div>
          </div>
          <style
            dangerouslySetInnerHTML={{
              __html: `
                @keyframes aiSpin {
                  0% { transform: rotate(0deg); }
                  100% { transform: rotate(360deg); }
                }
              `,
            }}
          />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6 pb-6">
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <AlertCircle style={{ width: "48px", height: "48px", color: "#ef4444", margin: "0 auto" }} />
            <p style={{ fontSize: "14px", color: "#ef4444", marginTop: "12px" }}>
              {error}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="pt-6 pb-6">
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <Sparkles style={{ width: "48px", height: "48px", color: "#d1d5db", margin: "0 auto" }} />
            <p style={{ fontSize: "14px", color: "#94a3b8", marginTop: "12px" }}>
              レポートデータがありません
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Summary card */}
      <Card
        style={{
          background: "linear-gradient(135deg, #fff7ed 0%, #fef3c7 50%, #fdf2f8 100%)",
          border: "1px solid #fed7aa",
        }}
      >
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Sparkles style={{ width: "16px", height: "16px", color: "#f97316" }} />
            AI分析サマリー
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          <p
            style={{
              fontSize: "14px",
              color: "#0f172a",
              lineHeight: 1.7,
              whiteSpace: "pre-wrap",
            }}
          >
            {data.summary}
          </p>
        </CardContent>
      </Card>

      {/* Generated timestamp */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "flex-end",
          gap: "6px",
        }}
      >
        <Clock style={{ width: "12px", height: "12px", color: "#94a3b8" }} />
        <span style={{ fontSize: "11px", color: "#94a3b8" }}>
          生成日時: {new Date(data.generatedAt).toLocaleString("ja-JP")}
        </span>
      </div>

      {/* Insight cards */}
      {data.insights && data.insights.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {data.insights.map((insight, i) => {
            const styles = getSeverityStyles(insight.severity);

            return (
              <Card
                key={i}
                style={{
                  borderLeft: `4px solid ${styles.borderColor}`,
                  borderColor: styles.borderColor,
                }}
              >
                <CardContent className="pt-4 pb-4">
                  <div style={{ display: "flex", gap: "12px" }}>
                    {/* Severity icon */}
                    <div style={{ flexShrink: 0, paddingTop: "2px" }}>
                      {getSeverityIcon(insight.severity)}
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1 }}>
                      {/* Title + badges */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          flexWrap: "wrap",
                          marginBottom: "6px",
                        }}
                      >
                        <span style={{ fontSize: "14px", fontWeight: 600, color: "#0f172a" }}>
                          {insight.title}
                        </span>
                        <Badge
                          style={{
                            fontSize: "10px",
                            backgroundColor: styles.badgeBg,
                            color: styles.badgeColor,
                            border: `1px solid ${styles.borderColor}`,
                          }}
                        >
                          {styles.badgeLabel}
                        </Badge>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          {getCategoryIcon(insight.category)}
                          <span style={{ fontSize: "10px", color: "#94a3b8" }}>
                            {insight.category}
                          </span>
                        </div>
                      </div>

                      {/* Description */}
                      <p
                        style={{
                          fontSize: "13px",
                          color: "#475569",
                          lineHeight: 1.6,
                          marginBottom: insight.metricName ? "8px" : "0",
                        }}
                      >
                        {insight.description}
                      </p>

                      {/* Metric change */}
                      {insight.metricName && insight.metricChange !== undefined && (
                        <div
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            padding: "4px 10px",
                            borderRadius: "6px",
                            backgroundColor:
                              insight.metricDirection === "up" ? "#f0fdf4" : "#fef2f2",
                            border: `1px solid ${insight.metricDirection === "up" ? "#bbf7d0" : "#fecaca"}`,
                          }}
                        >
                          {insight.metricDirection === "up" ? (
                            <TrendingUp
                              style={{ width: "14px", height: "14px", color: "#16a34a" }}
                            />
                          ) : (
                            <TrendingDown
                              style={{ width: "14px", height: "14px", color: "#ef4444" }}
                            />
                          )}
                          <span
                            style={{
                              fontSize: "12px",
                              fontWeight: 600,
                              color:
                                insight.metricDirection === "up" ? "#16a34a" : "#ef4444",
                            }}
                          >
                            {insight.metricName}:{" "}
                            {insight.metricDirection === "up" ? "+" : ""}
                            {insight.metricChange}%
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* No insights */}
      {data.insights.length === 0 && (
        <Card>
          <CardContent className="pt-6 pb-6">
            <p style={{ fontSize: "13px", color: "#94a3b8", textAlign: "center" }}>
              現時点で特筆すべきインサイトはありません
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
