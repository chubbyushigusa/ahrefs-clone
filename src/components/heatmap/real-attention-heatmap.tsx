"use client";

import { useRef, useState, useEffect } from "react";

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

function getAttentionColor(score: number): string {
  // Red (high attention 100%) → Yellow (50%) → Blue (low attention 0%)
  if (score >= 70) {
    // Red zone
    const t = (score - 70) / 30;
    return `rgba(239, 68, 68, ${0.25 + t * 0.25})`;
  }
  if (score >= 40) {
    // Yellow-orange zone
    const t = (score - 40) / 30;
    return `rgba(234, 179, 8, ${0.2 + t * 0.15})`;
  }
  // Blue zone
  const t = score / 40;
  return `rgba(59, 130, 246, ${0.15 + t * 0.1})`;
}

interface Props {
  data: RealHeatmapData;
  domain: string;
  path: string;
  pageHtml?: string | null;
}

export function RealAttentionHeatmap({ data, domain, path, pageHtml }: Props) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [iframeHeight, setIframeHeight] = useState(3000);
  const pageUrl = `https://${domain}${path}`;

  useEffect(() => {
    if (data.avgPageHeight && data.avgPageHeight > 0) {
      setIframeHeight(data.avgPageHeight);
    }
  }, [data.avgPageHeight]);

  useEffect(() => {
    if (pageHtml) {
      const handler = (e: MessageEvent) => {
        if (e.data?.type === "proxy-page-height" && typeof e.data.height === "number" && e.data.height > 100) {
          setIframeHeight(e.data.height);
        }
      };
      window.addEventListener("message", handler);
      return () => window.removeEventListener("message", handler);
    } else {
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
    }
  }, [pageUrl, pageHtml]);

  const zones = data.attentionZones || [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

  return (
    <>
      <div style={{ position: "relative", height: "700px", overflow: "auto" }}>
        <iframe
          ref={iframeRef}
          {...(pageHtml ? { srcDoc: pageHtml } : { src: pageUrl })}
          style={{ width: "100%", height: `${iframeHeight}px`, border: "none", display: "block", pointerEvents: "none" }}
          sandbox="allow-same-origin allow-scripts"
          title="Page Preview"
        />
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: `${iframeHeight}px`, pointerEvents: "none" }}>
          {zones.map((score, i) => {
            const top = (i / 10) * iframeHeight;
            const height = iframeHeight / 10;
            return (
              <div key={i} style={{
                position: "absolute", top: `${top}px`, left: 0, right: 0, height: `${height}px`,
                backgroundColor: getAttentionColor(score), transition: "background-color 0.3s",
              }}>
                {/* Attention score badge on right side */}
                <div style={{
                  position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)",
                  backgroundColor: score >= 70 ? "rgba(239,68,68,0.9)"
                    : score >= 40 ? "rgba(234,179,8,0.9)"
                    : "rgba(59,130,246,0.9)",
                  color: "#fff",
                  padding: "3px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: 700,
                  boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
                }}>
                  {score}%
                </div>
                {/* Zone label on left */}
                <div style={{
                  position: "absolute", left: "8px", top: "50%", transform: "translateY(-50%)",
                  backgroundColor: "rgba(0,0,0,0.5)", color: "#fff",
                  padding: "2px 8px", borderRadius: "4px", fontSize: "10px", fontWeight: 600,
                }}>
                  {i * 10}-{(i + 1) * 10}%
                </div>
                {/* Bottom separator line */}
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "1px", backgroundColor: "rgba(255,255,255,0.4)" }} />
              </div>
            );
          })}
          {/* First view line */}
          <div style={{
            position: "absolute", top: `${Math.min(900, iframeHeight * 0.12)}px`,
            left: 0, right: 0, height: "2px", backgroundColor: "#ef4444", zIndex: 10,
          }}>
            <span style={{
              position: "absolute", left: "8px", top: "-10px",
              backgroundColor: "#ef4444", color: "#fff", padding: "1px 8px", borderRadius: "3px", fontSize: "10px", fontWeight: 700,
            }}>
              ファーストビュー
            </span>
          </div>
        </div>
      </div>
      {/* Legend bar */}
      <div style={{
        padding: "8px 16px", borderTop: "1px solid #e2e8f0",
        display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", color: "#64748b",
      }}>
        <span>低注目</span>
        <div style={{ display: "flex", height: "10px", flex: 1, borderRadius: "5px", overflow: "hidden" }}>
          <div style={{ flex: 1, backgroundColor: "#3b82f6" }} />
          <div style={{ flex: 1, backgroundColor: "#60a5fa" }} />
          <div style={{ flex: 1, backgroundColor: "#eab308" }} />
          <div style={{ flex: 1, backgroundColor: "#f97316" }} />
          <div style={{ flex: 1, backgroundColor: "#ef4444" }} />
        </div>
        <span>熟読 (アテンション)</span>
      </div>
    </>
  );
}
