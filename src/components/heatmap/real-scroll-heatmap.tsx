"use client";

import { useRef, useState, useEffect } from "react";

interface RealHeatmapData {
  totalPV: number;
  uniqueSessions: number;
  avgDwell: number;
  avgPageHeight: number;
  scrollDepth: { depth: number; reach: number }[];
  clickMap: { x: number; y: number; count: number; topSelector: string | null }[];
  pages: { path: string; views: number }[];
}

function getReachColor(reach: number): string {
  // Green (high reach) → Yellow → Red (low reach)
  if (reach >= 80) return "rgba(34, 197, 94, 0.30)";
  if (reach >= 60) return "rgba(132, 204, 22, 0.28)";
  if (reach >= 40) return "rgba(234, 179, 8, 0.26)";
  if (reach >= 20) return "rgba(249, 115, 22, 0.24)";
  return "rgba(239, 68, 68, 0.22)";
}

function getReachBadgeColor(reach: number): string {
  if (reach >= 80) return "#16a34a";
  if (reach >= 60) return "#65a30d";
  if (reach >= 40) return "#ca8a04";
  if (reach >= 20) return "#ea580c";
  return "#dc2626";
}

interface Props {
  data: RealHeatmapData;
  domain: string;
  path: string;
  pageHtml?: string | null;
}

export function RealScrollHeatmap({ data, domain, path, pageHtml }: Props) {
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
          {data.scrollDepth.map((sd, i) => {
            const next = data.scrollDepth[i + 1];
            if (!next) return null;
            const top = (sd.depth / 100) * iframeHeight;
            const height = ((next.depth - sd.depth) / 100) * iframeHeight;
            const exitRate = sd.reach - next.reach;
            return (
              <div key={sd.depth} style={{
                position: "absolute", top: `${top}px`, left: 0, right: 0, height: `${height}px`,
                backgroundColor: getReachColor(sd.reach), transition: "background-color 0.3s",
              }}>
                {/* Left side: reach rate label */}
                <div style={{
                  position: "absolute", left: "6px", top: "4px",
                  display: "flex", flexDirection: "column", gap: "2px",
                }}>
                  <div style={{
                    backgroundColor: getReachBadgeColor(sd.reach), color: "#fff",
                    padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 700,
                    display: "flex", alignItems: "center", gap: "4px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                  }}>
                    <span style={{ fontSize: "9px", opacity: 0.9 }}>到達</span>
                    {sd.reach}%
                  </div>
                </div>

                {/* Right side: exit rate badge */}
                {exitRate > 0 && (
                  <div style={{
                    position: "absolute", right: "8px", top: "4px",
                    backgroundColor: "rgba(0,0,0,0.7)", color: "#fff",
                    padding: "2px 8px", borderRadius: "4px", fontSize: "11px", fontWeight: 700,
                    display: "flex", alignItems: "center", gap: "4px",
                  }}>
                    <span style={{ fontSize: "9px", opacity: 0.8 }}>離脱</span>
                    <span style={{ color: "#fca5a5" }}>{exitRate}%</span>
                  </div>
                )}

                {/* Bottom separator line */}
                <div style={{
                  position: "absolute", bottom: 0, left: 0, right: 0,
                  height: "2px", backgroundColor: "rgba(255,255,255,0.6)",
                  boxShadow: "0 1px 2px rgba(0,0,0,0.1)",
                }} />
              </div>
            );
          })}
          {/* First View line */}
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
      {/* Legend */}
      <div style={{
        padding: "8px 16px", borderTop: "1px solid #e2e8f0",
        display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", color: "#64748b",
      }}>
        <span>低い</span>
        <div style={{ display: "flex", height: "10px", flex: 1, borderRadius: "5px", overflow: "hidden" }}>
          <div style={{ flex: 1, backgroundColor: "#ef4444" }} />
          <div style={{ flex: 1, backgroundColor: "#f97316" }} />
          <div style={{ flex: 1, backgroundColor: "#eab308" }} />
          <div style={{ flex: 1, backgroundColor: "#84cc16" }} />
          <div style={{ flex: 1, backgroundColor: "#22c55e" }} />
        </div>
        <span>高い (到達率)</span>
      </div>
    </>
  );
}
