"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
  ChevronDown,
} from "lucide-react";

/* ─── Types ─────────────────────────────────────────────── */

interface ComparisonMetric {
  label: string;
  key: string;
  periodA: number;
  periodB: number;
  unit: string;
  higherIsBetter: boolean;
}

interface PeriodStats {
  totalPV: number;
  uniqueSessions: number;
  avgDwell: number;
  medianDwell: number;
  fvExitRate: number;
  bottomReachRate: number;
}

interface ComparisonData {
  periodA: PeriodStats;
  periodB: PeriodStats;
  changes: Record<string, number>;
}

interface Props {
  siteId: string;
  pages: { path: string; views: number }[];
}

/* ─── Helpers ───────────────────────────────────────────── */

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ja-JP", {
    month: "short",
    day: "numeric",
  });
}

function getDefaultDateRange(
  offsetDays: number,
  spanDays: number
): { start: string; end: string } {
  const end = new Date();
  end.setDate(end.getDate() - offsetDays);
  const start = new Date(end);
  start.setDate(start.getDate() - spanDays);
  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  };
}

function formatMetricValue(value: number, unit: string): string {
  if (unit === "秒") {
    if (value < 60) return `${Math.round(value)}秒`;
    return `${Math.floor(value / 60)}分${Math.round(value % 60)}秒`;
  }
  if (unit === "%") return `${value.toFixed(1)}%`;
  return value.toLocaleString();
}

/* ─── Component ─────────────────────────────────────────── */

export function PageComparison({ siteId, pages }: Props) {
  // Period A: previous period (default: 30-60 days ago)
  const defaultA = getDefaultDateRange(30, 30);
  // Period B: current period (default: last 30 days)
  const defaultB = getDefaultDateRange(0, 30);

  const [periodAStart, setPeriodAStart] = useState(defaultA.start);
  const [periodAEnd, setPeriodAEnd] = useState(defaultA.end);
  const [periodBStart, setPeriodBStart] = useState(defaultB.start);
  const [periodBEnd, setPeriodBEnd] = useState(defaultB.end);
  const [selectedPath, setSelectedPath] = useState(pages[0]?.path || "/");
  const [showPathDropdown, setShowPathDropdown] = useState(false);

  const [data, setData] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch comparison ────────────────────────────────────
  const fetchComparison = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        siteId,
        path: selectedPath,
        startA: periodAStart,
        endA: periodAEnd,
        startB: periodBStart,
        endB: periodBEnd,
      });
      const res = await fetch(`/api/heatmap/compare?${params}`);
      const json = await res.json();
      if (res.ok) {
        setData(json);
      } else {
        setError(json.error || "比較データ取得に失敗しました");
      }
    } catch {
      setError("比較データ取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [siteId, selectedPath, periodAStart, periodAEnd, periodBStart, periodBEnd]);

  useEffect(() => {
    fetchComparison();
  }, [fetchComparison]);

  // Build metrics from API response { periodA, periodB, changes }
  const metrics: ComparisonMetric[] = data?.periodA
    ? [
        { label: "ページビュー", key: "pv", periodA: data.periodA.totalPV, periodB: data.periodB.totalPV, unit: "PV", higherIsBetter: true },
        { label: "平均滞在時間", key: "avgDwell", periodA: Math.round(data.periodA.avgDwell / 1000), periodB: Math.round(data.periodB.avgDwell / 1000), unit: "秒", higherIsBetter: true },
        { label: "FV離脱率", key: "fvExitRate", periodA: data.periodA.fvExitRate, periodB: data.periodB.fvExitRate, unit: "%", higherIsBetter: false },
        { label: "最下部到達率", key: "bottomReach", periodA: data.periodA.bottomReachRate, periodB: data.periodB.bottomReachRate, unit: "%", higherIsBetter: true },
      ]
    : [
        { label: "ページビュー", key: "pv", periodA: 0, periodB: 0, unit: "PV", higherIsBetter: true },
        { label: "平均滞在時間", key: "avgDwell", periodA: 0, periodB: 0, unit: "秒", higherIsBetter: true },
        { label: "FV離脱率", key: "fvExitRate", periodA: 0, periodB: 0, unit: "%", higherIsBetter: false },
        { label: "最下部到達率", key: "bottomReach", periodA: 0, periodB: 0, unit: "%", higherIsBetter: true },
      ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Controls */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              flexWrap: "wrap",
            }}
          >
            {/* Page selector */}
            <div style={{ position: "relative" }}>
              <button
                onClick={() => setShowPathDropdown(!showPathDropdown)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "7px 12px",
                  borderRadius: "6px",
                  border: "1px solid #e2e8f0",
                  backgroundColor: "#fff",
                  cursor: "pointer",
                  fontSize: "12px",
                  color: "#0f172a",
                  minWidth: "160px",
                }}
              >
                <span style={{ flex: 1, textAlign: "left" }}>{selectedPath}</span>
                <ChevronDown style={{ width: "12px", height: "12px", color: "#94a3b8" }} />
              </button>
              {showPathDropdown && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    marginTop: "4px",
                    backgroundColor: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "6px",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    zIndex: 20,
                    maxHeight: "200px",
                    overflowY: "auto",
                  }}
                >
                  {pages.map((p) => (
                    <button
                      key={p.path}
                      onClick={() => {
                        setSelectedPath(p.path);
                        setShowPathDropdown(false);
                      }}
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
                      <Badge variant="secondary" style={{ fontSize: "10px" }}>
                        {p.views} PV
                      </Badge>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Period A */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                borderRadius: "8px",
                backgroundColor: "#eff6ff",
                border: "1px solid #bfdbfe",
              }}
            >
              <Calendar style={{ width: "12px", height: "12px", color: "#3b82f6" }} />
              <span style={{ fontSize: "11px", fontWeight: 600, color: "#3b82f6" }}>
                期間A:
              </span>
              <input
                type="date"
                value={periodAStart}
                onChange={(e) => setPeriodAStart(e.target.value)}
                style={{
                  border: "none",
                  backgroundColor: "transparent",
                  fontSize: "11px",
                  color: "#1e40af",
                  outline: "none",
                  width: "110px",
                }}
              />
              <span style={{ fontSize: "11px", color: "#3b82f6" }}>~</span>
              <input
                type="date"
                value={periodAEnd}
                onChange={(e) => setPeriodAEnd(e.target.value)}
                style={{
                  border: "none",
                  backgroundColor: "transparent",
                  fontSize: "11px",
                  color: "#1e40af",
                  outline: "none",
                  width: "110px",
                }}
              />
            </div>

            <ArrowLeftRight style={{ width: "16px", height: "16px", color: "#94a3b8" }} />

            {/* Period B */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "6px",
                padding: "6px 12px",
                borderRadius: "8px",
                backgroundColor: "#f0fdf4",
                border: "1px solid #bbf7d0",
              }}
            >
              <Calendar style={{ width: "12px", height: "12px", color: "#22c55e" }} />
              <span style={{ fontSize: "11px", fontWeight: 600, color: "#22c55e" }}>
                期間B:
              </span>
              <input
                type="date"
                value={periodBStart}
                onChange={(e) => setPeriodBStart(e.target.value)}
                style={{
                  border: "none",
                  backgroundColor: "transparent",
                  fontSize: "11px",
                  color: "#166534",
                  outline: "none",
                  width: "110px",
                }}
              />
              <span style={{ fontSize: "11px", color: "#22c55e" }}>~</span>
              <input
                type="date"
                value={periodBEnd}
                onChange={(e) => setPeriodBEnd(e.target.value)}
                style={{
                  border: "none",
                  backgroundColor: "transparent",
                  fontSize: "11px",
                  color: "#166534",
                  outline: "none",
                  width: "110px",
                }}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading */}
      {loading && (
        <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: "#f97316" }} />
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <p style={{ fontSize: "13px", color: "#ef4444", textAlign: "center", padding: "20px" }}>
          {error}
        </p>
      )}

      {/* Comparison display */}
      {!loading && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, 1fr)",
            gap: "12px",
          }}
        >
          {metrics.map((metric) => {
            const diff =
              metric.periodA !== 0
                ? ((metric.periodB - metric.periodA) / Math.abs(metric.periodA)) * 100
                : metric.periodB > 0
                  ? 100
                  : 0;

            const isImprovement = metric.higherIsBetter
              ? diff > 0
              : diff < 0;
            const isDecline = metric.higherIsBetter
              ? diff < 0
              : diff > 0;
            const isNeutral = diff === 0;

            const changeColor = isImprovement
              ? "#16a34a"
              : isDecline
                ? "#ef4444"
                : "#94a3b8";

            const changeBg = isImprovement
              ? "#f0fdf4"
              : isDecline
                ? "#fef2f2"
                : "#f8fafc";

            return (
              <Card key={metric.key}>
                <CardContent className="pt-4 pb-4">
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {/* Metric title */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <span style={{ fontSize: "13px", fontWeight: 600, color: "#0f172a" }}>
                        {metric.label}
                      </span>
                      {/* Change badge */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: "3px 8px",
                          borderRadius: "6px",
                          backgroundColor: changeBg,
                        }}
                      >
                        {isImprovement && (
                          <TrendingUp style={{ width: "12px", height: "12px", color: changeColor }} />
                        )}
                        {isDecline && (
                          <TrendingDown style={{ width: "12px", height: "12px", color: changeColor }} />
                        )}
                        {isNeutral && (
                          <Minus style={{ width: "12px", height: "12px", color: changeColor }} />
                        )}
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 600,
                            color: changeColor,
                          }}
                        >
                          {diff > 0 ? "+" : ""}
                          {diff.toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    {/* Side-by-side values */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "12px",
                      }}
                    >
                      {/* Period A */}
                      <div
                        style={{
                          padding: "12px",
                          borderRadius: "8px",
                          backgroundColor: "#eff6ff",
                          border: "1px solid #bfdbfe",
                          textAlign: "center",
                        }}
                      >
                        <p style={{ fontSize: "10px", color: "#3b82f6", fontWeight: 600, marginBottom: "4px" }}>
                          期間A
                        </p>
                        <p
                          style={{
                            fontSize: "22px",
                            fontWeight: 700,
                            color: "#1e40af",
                            lineHeight: 1,
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {formatMetricValue(metric.periodA, metric.unit)}
                        </p>
                      </div>

                      {/* Period B */}
                      <div
                        style={{
                          padding: "12px",
                          borderRadius: "8px",
                          backgroundColor: "#f0fdf4",
                          border: "1px solid #bbf7d0",
                          textAlign: "center",
                        }}
                      >
                        <p style={{ fontSize: "10px", color: "#22c55e", fontWeight: 600, marginBottom: "4px" }}>
                          期間B
                        </p>
                        <p
                          style={{
                            fontSize: "22px",
                            fontWeight: 700,
                            color: "#166534",
                            lineHeight: 1,
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {formatMetricValue(metric.periodB, metric.unit)}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Comparison legend */}
      <Card>
        <CardContent className="pt-3 pb-3">
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "24px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{ width: "12px", height: "12px", borderRadius: "3px", backgroundColor: "#3b82f6" }} />
              <span style={{ fontSize: "11px", color: "#64748b" }}>
                期間A ({formatDate(periodAStart)} - {formatDate(periodAEnd)})
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <div style={{ width: "12px", height: "12px", borderRadius: "3px", backgroundColor: "#22c55e" }} />
              <span style={{ fontSize: "11px", color: "#64748b" }}>
                期間B ({formatDate(periodBStart)} - {formatDate(periodBEnd)})
              </span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <TrendingUp style={{ width: "12px", height: "12px", color: "#16a34a" }} />
              <span style={{ fontSize: "11px", color: "#64748b" }}>改善</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <TrendingDown style={{ width: "12px", height: "12px", color: "#ef4444" }} />
              <span style={{ fontSize: "11px", color: "#64748b" }}>悪化</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
