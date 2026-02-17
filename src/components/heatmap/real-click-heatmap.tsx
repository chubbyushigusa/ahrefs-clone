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

interface Props {
  data: RealHeatmapData;
  domain: string;
  path: string;
  pageHtml?: string | null;
}

export function RealClickHeatmap({ data, domain, path, pageHtml }: Props) {
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

  const maxCount = data.clickMap.length > 0 ? Math.max(...data.clickMap.map((c) => c.count)) : 1;
  const pageH = data.avgPageHeight || iframeHeight;

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
          {data.clickMap.length === 0 && (
            <div style={{
              position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
              backgroundColor: "rgba(0,0,0,0.6)", color: "#fff", padding: "8px 16px", borderRadius: "6px", fontSize: "13px",
            }}>
              クリックデータがありません
            </div>
          )}
          {data.clickMap.map((click, i) => {
            const intensity = click.count / maxCount;
            const relX = (click.x / 1400) * 100;
            const relY = pageH > 0 ? (click.y / pageH) * iframeHeight : 0;
            const size = 30 + intensity * 50;
            const alpha = 0.25 + intensity * 0.55;
            return (
              <div
                key={i}
                style={{
                  position: "absolute", top: `${relY}px`, left: `${relX}%`,
                  width: `${size}px`, height: `${size}px`, borderRadius: "50%",
                  background: `radial-gradient(circle, rgba(249,115,22,${alpha}) 0%, rgba(239,68,68,${alpha * 0.6}) 50%, transparent 70%)`,
                  transform: "translate(-50%, -50%)", zIndex: Math.round(intensity * 100),
                }}
                title={`${click.topSelector || `(${click.x},${click.y})`} - ${click.count}回`}
              />
            );
          })}
        </div>
      </div>
      <div style={{
        padding: "8px 16px", borderTop: "1px solid #e2e8f0",
        display: "flex", alignItems: "center", gap: "12px", fontSize: "11px", color: "#64748b",
      }}>
        <span>クリック頻度:</span>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <div style={{ width: "16px", height: "16px", borderRadius: "50%", background: "radial-gradient(circle, rgba(249,115,22,0.8) 0%, transparent 70%)" }} />
          <span>高い</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
          <div style={{ width: "12px", height: "12px", borderRadius: "50%", background: "radial-gradient(circle, rgba(249,115,22,0.3) 0%, transparent 70%)" }} />
          <span>低い</span>
        </div>
      </div>
    </>
  );
}
