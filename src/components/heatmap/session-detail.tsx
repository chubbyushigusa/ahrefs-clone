"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Loader2, Globe, ArrowDownToLine, MousePointerClick, Monitor, Smartphone, Tablet } from "lucide-react";
import type { SessionDetailResponse, SessionTimelineEvent } from "@/types/heatmap";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function formatDwell(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec}秒`;
  return `${Math.floor(sec / 60)}分${sec % 60}秒`;
}

const DeviceIcon = ({ device }: { device: string }) => {
  if (device === "mobile") return <Smartphone style={{ width: "14px", height: "14px" }} />;
  if (device === "tablet") return <Tablet style={{ width: "14px", height: "14px" }} />;
  return <Monitor style={{ width: "14px", height: "14px" }} />;
};

const EventIcon = ({ type }: { type: SessionTimelineEvent["type"] }) => {
  if (type === "pageview") return <Globe style={{ width: "14px", height: "14px", color: "#3b82f6" }} />;
  if (type === "scroll") return <ArrowDownToLine style={{ width: "14px", height: "14px", color: "#22c55e" }} />;
  return <MousePointerClick style={{ width: "14px", height: "14px", color: "#f97316" }} />;
};

interface Props {
  siteId: string;
  sessionId: string;
}

export function SessionDetail({ siteId, sessionId }: Props) {
  const [data, setData] = useState<SessionDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/heatmap/sessions/${sessionId}?siteId=${siteId}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [siteId, sessionId]);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
        <Loader2 className="h-6 w-6 animate-spin" style={{ color: "#f97316" }} />
      </div>
    );
  }

  if (!data || !data.events) {
    return <p style={{ fontSize: "13px", color: "#94a3b8", textAlign: "center", padding: "40px" }}>セッションデータがありません</p>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Header info */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", padding: "12px", backgroundColor: "#f8fafc", borderRadius: "8px" }}>
        <Badge variant="secondary" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <DeviceIcon device={data.device} />
          {data.device}
        </Badge>
        <Badge variant="secondary">{data.os}</Badge>
        <Badge variant="secondary">{data.browser}</Badge>
        {data.screenW && data.screenH && (
          <Badge variant="secondary">{data.screenW}x{data.screenH}</Badge>
        )}
        {data.referrer && (
          <Badge variant="outline" style={{ fontSize: "10px" }}>
            ref: {(() => { try { return new URL(data.referrer).hostname; } catch { return data.referrer; } })()}
          </Badge>
        )}
      </div>

      {/* Timeline */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0px" }}>
        {data.events.map((ev, i) => (
          <div key={i} style={{ display: "flex", gap: "12px", minHeight: "36px" }}>
            {/* Timeline line */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "28px", flexShrink: 0 }}>
              <div style={{
                width: "28px", height: "28px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                backgroundColor: ev.type === "pageview" ? "#eff6ff" : ev.type === "scroll" ? "#f0fdf4" : "#fff7ed",
                border: `2px solid ${ev.type === "pageview" ? "#3b82f6" : ev.type === "scroll" ? "#22c55e" : "#f97316"}`,
              }}>
                <EventIcon type={ev.type} />
              </div>
              {i < data.events.length - 1 && (
                <div style={{ width: "2px", flex: 1, backgroundColor: "#e2e8f0", minHeight: "8px" }} />
              )}
            </div>

            {/* Content */}
            <div style={{ flex: 1, paddingBottom: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span style={{ fontSize: "10px", color: "#94a3b8" }}>{formatTime(ev.timestamp)}</span>
                <Badge variant="secondary" style={{ fontSize: "10px", padding: "0px 5px" }}>
                  {ev.type === "pageview" ? "ページ表示" : ev.type === "scroll" ? "スクロール" : "クリック"}
                </Badge>
              </div>
              <div style={{ fontSize: "12px", color: "#334155", marginTop: "2px" }}>
                {ev.type === "pageview" && (
                  <span>{ev.path} {ev.title && <span style={{ color: "#94a3b8" }}>- {ev.title}</span>}</span>
                )}
                {ev.type === "scroll" && (
                  <span>
                    深度 {ev.maxDepth}%
                    {ev.dwellMs ? ` / 滞在 ${formatDwell(ev.dwellMs)}` : ""}
                  </span>
                )}
                {ev.type === "click" && (
                  <span>
                    ({ev.x}, {ev.y})
                    {ev.selector && <span style={{ color: "#64748b" }}> {ev.selector}</span>}
                    {ev.text && <span style={{ color: "#94a3b8" }}> &quot;{ev.text.slice(0, 30)}&quot;</span>}
                    {ev.href && (
                      <span style={{ color: "#3b82f6", fontSize: "11px" }}> → {ev.href.slice(0, 50)}</span>
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
