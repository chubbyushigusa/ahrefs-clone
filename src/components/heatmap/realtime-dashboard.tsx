"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Users,
  Globe,
  RefreshCw,
} from "lucide-react";

/* ─── Types ─────────────────────────────────────────────── */

interface RealtimeData {
  activeVisitors: number;
  topPages: { path: string; count: number }[];
}

interface Props {
  siteId: string;
}

/* ─── Component ─────────────────────────────────────────── */

export function RealtimeDashboard({ siteId }: Props) {
  const [data, setData] = useState<RealtimeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [displayCount, setDisplayCount] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const animationRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`/api/heatmap/realtime?siteId=${siteId}`);
      const json = await res.json();
      if (res.ok) {
        setData(json);
        setError(null);
        setLastUpdated(new Date());
      } else {
        setError(json.error || "データ取得に失敗しました");
      }
    } catch {
      setError("データ取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  // Initial fetch + auto-refresh every 10 seconds
  useEffect(() => {
    fetchData();
    intervalRef.current = setInterval(fetchData, 10000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchData]);

  // Animated count-up effect
  useEffect(() => {
    if (data === null) return;
    const target = data.activeVisitors;
    const start = displayCount;
    const diff = target - start;

    if (diff === 0) return;

    const steps = 20;
    const stepDuration = 30;
    let step = 0;

    if (animationRef.current) clearInterval(animationRef.current);

    animationRef.current = setInterval(() => {
      step++;
      const progress = step / steps;
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(start + diff * eased);
      setDisplayCount(current);

      if (step >= steps) {
        setDisplayCount(target);
        if (animationRef.current) clearInterval(animationRef.current);
      }
    }, stepDuration);

    return () => {
      if (animationRef.current) clearInterval(animationRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.activeVisitors]);

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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Active visitors card */}
      <Card>
        <CardContent className="pt-6 pb-6">
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "12px",
            }}
          >
            {/* Live indicator */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <div
                style={{
                  position: "relative",
                  width: "12px",
                  height: "12px",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: "50%",
                    backgroundColor: "#22c55e",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    inset: "-4px",
                    borderRadius: "50%",
                    backgroundColor: "#22c55e",
                    opacity: 0.3,
                    animation: "livePulse 2s ease-in-out infinite",
                  }}
                />
              </div>
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#22c55e",
                  letterSpacing: "0.05em",
                }}
              >
                ライブ
              </span>
            </div>

            {/* Large number */}
            <div
              style={{
                fontSize: "72px",
                fontWeight: 800,
                color: "#0f172a",
                lineHeight: 1,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {displayCount}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Users style={{ width: "16px", height: "16px", color: "#64748b" }} />
              <span style={{ fontSize: "14px", color: "#64748b" }}>
                アクティブ訪問者
              </span>
            </div>

            {/* Last updated */}
            {lastUpdated && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  marginTop: "4px",
                }}
              >
                <RefreshCw style={{ width: "10px", height: "10px", color: "#94a3b8" }} />
                <span style={{ fontSize: "10px", color: "#94a3b8" }}>
                  最終更新: {lastUpdated.toLocaleTimeString("ja-JP")} (10秒ごとに自動更新)
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Active pages */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Globe style={{ width: "14px", height: "14px", color: "#3b82f6" }} />
            閲覧中のページ
            {data && data.topPages.length > 0 && (
              <Badge variant="secondary" style={{ fontSize: "10px" }}>
                {data.topPages.length}ページ
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          {!data || data.topPages.length === 0 ? (
            <p style={{ fontSize: "12px", color: "#94a3b8", textAlign: "center", padding: "20px 0" }}>
              現在アクティブなページはありません
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {data.topPages.map((page, i) => {
                const maxCount = data.topPages[0].count;
                const barWidth = maxCount > 0 ? (page.count / maxCount) * 100 : 0;

                return (
                  <div
                    key={page.path}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      padding: "8px 10px",
                      borderRadius: "6px",
                      backgroundColor: i === 0 ? "#eff6ff" : "#f8fafc",
                      border: i === 0 ? "1px solid #bfdbfe" : "1px solid #f1f5f9",
                    }}
                  >
                    {/* Rank number */}
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        color: i < 3 ? "#3b82f6" : "#94a3b8",
                        width: "20px",
                        textAlign: "center",
                        flexShrink: 0,
                      }}
                    >
                      {i + 1}
                    </span>

                    {/* Path + bar */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          fontSize: "12px",
                          color: "#0f172a",
                          fontWeight: i === 0 ? 600 : 400,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          marginBottom: "4px",
                        }}
                      >
                        {page.path}
                      </p>
                      <div
                        style={{
                          height: "4px",
                          backgroundColor: "#e2e8f0",
                          borderRadius: "2px",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            width: `${barWidth}%`,
                            height: "100%",
                            backgroundColor: i === 0 ? "#3b82f6" : "#94a3b8",
                            borderRadius: "2px",
                            transition: "width 0.5s ease-out",
                          }}
                        />
                      </div>
                    </div>

                    {/* Count */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        flexShrink: 0,
                      }}
                    >
                      <Users style={{ width: "11px", height: "11px", color: "#64748b" }} />
                      <span
                        style={{
                          fontSize: "13px",
                          fontWeight: 600,
                          color: i === 0 ? "#3b82f6" : "#0f172a",
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {page.count}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Inject keyframe animation for live pulse */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes livePulse {
              0%, 100% { transform: scale(1); opacity: 0.3; }
              50% { transform: scale(1.8); opacity: 0; }
            }
          `,
        }}
      />
    </div>
  );
}
