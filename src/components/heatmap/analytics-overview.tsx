"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Clock, FileText, LogOut } from "lucide-react";
import { AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { DateRangePicker } from "./date-range-picker";
import type { AnalyticsResponse } from "@/types/heatmap";

function formatDwell(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec}秒`;
  return `${Math.floor(sec / 60)}分${sec % 60}秒`;
}

const PIE_COLORS = ["#3b82f6", "#f97316", "#22c55e", "#8b5cf6", "#ec4899", "#06b6d4", "#eab308"];

interface Props {
  siteId: string;
}

export function AnalyticsOverview({ siteId }: Props) {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/heatmap/analytics?siteId=${siteId}&days=${days}`);
      const json = await res.json();
      if (res.ok) setData(json);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [siteId, days]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: "#f97316" }} />
      </div>
    );
  }

  if (!data) {
    return <p style={{ fontSize: "13px", color: "#94a3b8", textAlign: "center", padding: "40px" }}>データがありません</p>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Filter */}
      <DateRangePicker value={days} onChange={setDays} />

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
        {[
          { label: "平均セッション時間", value: formatDwell(data.avgSessionDurationMs), icon: Clock, color: "#3b82f6" },
          { label: "平均ページ数/セッション", value: String(data.avgPagesPerSession), icon: FileText, color: "#8b5cf6" },
          { label: "直帰率", value: `${data.bounceRate}%`, icon: LogOut, color: "#ef4444" },
        ].map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="pt-4 pb-4">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <div style={{ width: "36px", height: "36px", borderRadius: "8px", backgroundColor: `${kpi.color}15`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <kpi.icon style={{ width: "18px", height: "18px", color: kpi.color }} />
                </div>
                <div>
                  <p style={{ fontSize: "20px", fontWeight: 700, color: "#0f172a" }}>{kpi.value}</p>
                  <p style={{ fontSize: "11px", color: "#94a3b8" }}>{kpi.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* PV / Session Time Series */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm">ページビュー推移</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={data.daily}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} width={30} />
                <Tooltip labelFormatter={(v) => v} contentStyle={{ fontSize: "12px" }} />
                <Area type="monotone" dataKey="pageviews" stroke="#3b82f6" fill="#3b82f680" name="PV" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm">セッション推移</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={data.daily}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} width={30} />
                <Tooltip labelFormatter={(v) => v} contentStyle={{ fontSize: "12px" }} />
                <Area type="monotone" dataKey="sessions" stroke="#8b5cf6" fill="#8b5cf680" name="セッション" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Device Distribution Pie + Browser/OS Bar */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm">デバイス分布</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            {data.deviceDist.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={data.deviceDist}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={70}
                    label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                    style={{ fontSize: "11px" }}
                  >
                    {data.deviceDist.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ fontSize: "12px" }} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p style={{ fontSize: "12px", color: "#94a3b8", textAlign: "center", padding: "40px 0" }}>データなし</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm">ブラウザ分布</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            {data.browserDist.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.browserDist.slice(0, 5)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={60} />
                  <Tooltip contentStyle={{ fontSize: "12px" }} />
                  <Bar dataKey="count" fill="#f97316" name="セッション数" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p style={{ fontSize: "12px", color: "#94a3b8", textAlign: "center", padding: "40px 0" }}>データなし</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* OS Distribution + Referrer Table */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm">OS分布</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            {data.osDist.length > 0 ? (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.osDist.slice(0, 5)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={60} />
                  <Tooltip contentStyle={{ fontSize: "12px" }} />
                  <Bar dataKey="count" fill="#22c55e" name="セッション数" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p style={{ fontSize: "12px", color: "#94a3b8", textAlign: "center", padding: "40px 0" }}>データなし</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm">リファラー</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {data.referrerDist.length > 0 ? data.referrerDist.map((r, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "4px 0", borderBottom: "1px solid #f8fafc",
                }}>
                  <span style={{ fontSize: "12px", color: "#334155", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {r.name}
                  </span>
                  <Badge variant="secondary" style={{ fontSize: "10px", marginLeft: "8px" }}>{r.count}</Badge>
                </div>
              )) : (
                <p style={{ fontSize: "12px", color: "#94a3b8", textAlign: "center", padding: "40px 0" }}>データなし</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Screen Size Table */}
      {data.screenDist.length > 0 && (
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm">画面サイズ</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {data.screenDist.map((s, i) => (
                <Badge key={i} variant="outline" style={{ fontSize: "11px" }}>
                  {s.name} ({s.count})
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
