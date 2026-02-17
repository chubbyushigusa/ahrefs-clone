"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  AlertTriangle,
  MousePointerClick,
  Ban,
  Flame,
} from "lucide-react";

/* ─── Types ─────────────────────────────────────────────── */

interface RageClickItem {
  selector: string;
  count: number;
  path: string;
  lastOccurred: string;
}

interface DeadClickItem {
  selector: string;
  count: number;
  path: string;
  lastOccurred: string;
}

interface RageClickData {
  rageClicks: RageClickItem[];
  deadClicks: DeadClickItem[];
  totalRageClicks: number;
  totalDeadClicks: number;
}

interface Props {
  siteId: string;
}

/* ─── Component ─────────────────────────────────────────── */

export function RageClickView({ siteId }: Props) {
  const [data, setData] = useState<RageClickData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/heatmap/rage-clicks?siteId=${siteId}`);
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

  if (!data) {
    return (
      <p style={{ fontSize: "13px", color: "#94a3b8", textAlign: "center", padding: "40px" }}>
        データがありません
      </p>
    );
  }

  const maxRageCount = data.rageClicks.length > 0
    ? Math.max(...data.rageClicks.map((r) => r.count))
    : 1;
  const maxDeadCount = data.deadClicks.length > 0
    ? Math.max(...data.deadClicks.map((d) => d.count))
    : 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        {/* Rage clicks total */}
        <Card>
          <CardContent className="pt-5 pb-5">
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "12px",
                  backgroundColor: "#fef2f2",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Flame style={{ width: "24px", height: "24px", color: "#ef4444" }} />
              </div>
              <div>
                <p style={{ fontSize: "28px", fontWeight: 700, color: "#ef4444", lineHeight: 1 }}>
                  {data.totalRageClicks.toLocaleString()}
                </p>
                <p style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                  レイジクリック合計
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dead clicks total */}
        <Card>
          <CardContent className="pt-5 pb-5">
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: "12px",
                  backgroundColor: "#fff7ed",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Ban style={{ width: "24px", height: "24px", color: "#f97316" }} />
              </div>
              <div>
                <p style={{ fontSize: "28px", fontWeight: 700, color: "#f97316", lineHeight: 1 }}>
                  {data.totalDeadClicks.toLocaleString()}
                </p>
                <p style={{ fontSize: "12px", color: "#64748b", marginTop: "4px" }}>
                  デッドクリック合計
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Rage clicks list */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <AlertTriangle style={{ width: "14px", height: "14px", color: "#ef4444" }} />
            レイジクリック要素
            <Badge
              variant="secondary"
              style={{ fontSize: "10px", backgroundColor: "#fef2f2", color: "#ef4444" }}
            >
              {data.rageClicks.length}件
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          {data.rageClicks.length === 0 ? (
            <p style={{ fontSize: "12px", color: "#94a3b8", textAlign: "center", padding: "20px 0" }}>
              レイジクリックは検出されていません
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {data.rageClicks.map((item, i) => (
                <div
                  key={`rage-${i}`}
                  style={{
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid #fecaca",
                    backgroundColor: "#fef2f2",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: 0 }}>
                      <MousePointerClick style={{ width: "14px", height: "14px", color: "#ef4444", flexShrink: 0 }} />
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: 600,
                          color: "#991b1b",
                          fontFamily: "monospace",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.selector}
                      </span>
                    </div>
                    <Badge
                      style={{
                        fontSize: "10px",
                        backgroundColor: "#ef4444",
                        color: "#fff",
                        flexShrink: 0,
                        marginLeft: "8px",
                      }}
                    >
                      {item.count}回
                    </Badge>
                  </div>
                  {/* Bar chart */}
                  <div
                    style={{
                      height: "6px",
                      backgroundColor: "#fecaca",
                      borderRadius: "3px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${(item.count / maxRageCount) * 100}%`,
                        height: "100%",
                        backgroundColor: "#ef4444",
                        borderRadius: "3px",
                        transition: "width 0.3s",
                      }}
                    />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                    <span style={{ fontSize: "10px", color: "#b91c1c" }}>
                      {item.path}
                    </span>
                    <span style={{ fontSize: "10px", color: "#94a3b8" }}>
                      最終: {new Date(item.lastOccurred).toLocaleDateString("ja-JP")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dead clicks list */}
      <Card>
        <CardHeader className="py-3 px-4">
          <CardTitle className="text-sm" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Ban style={{ width: "14px", height: "14px", color: "#f97316" }} />
            デッドクリック要素
            <Badge
              variant="secondary"
              style={{ fontSize: "10px", backgroundColor: "#fff7ed", color: "#f97316" }}
            >
              {data.deadClicks.length}件
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          {data.deadClicks.length === 0 ? (
            <p style={{ fontSize: "12px", color: "#94a3b8", textAlign: "center", padding: "20px 0" }}>
              デッドクリックは検出されていません
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {data.deadClicks.map((item, i) => (
                <div
                  key={`dead-${i}`}
                  style={{
                    padding: "10px 12px",
                    borderRadius: "8px",
                    border: "1px solid #fed7aa",
                    backgroundColor: "#fff7ed",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "6px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: 0 }}>
                      <MousePointerClick style={{ width: "14px", height: "14px", color: "#f97316", flexShrink: 0 }} />
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: 600,
                          color: "#9a3412",
                          fontFamily: "monospace",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {item.selector}
                      </span>
                    </div>
                    <Badge
                      style={{
                        fontSize: "10px",
                        backgroundColor: "#f97316",
                        color: "#fff",
                        flexShrink: 0,
                        marginLeft: "8px",
                      }}
                    >
                      {item.count}回
                    </Badge>
                  </div>
                  {/* Bar chart */}
                  <div
                    style={{
                      height: "6px",
                      backgroundColor: "#fed7aa",
                      borderRadius: "3px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${(item.count / maxDeadCount) * 100}%`,
                        height: "100%",
                        backgroundColor: "#f97316",
                        borderRadius: "3px",
                        transition: "width 0.3s",
                      }}
                    />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                    <span style={{ fontSize: "10px", color: "#c2410c" }}>
                      {item.path}
                    </span>
                    <span style={{ fontSize: "10px", color: "#94a3b8" }}>
                      最終: {new Date(item.lastOccurred).toLocaleDateString("ja-JP")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
