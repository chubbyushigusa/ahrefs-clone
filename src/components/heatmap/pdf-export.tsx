"use client";

import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, FileDown } from "lucide-react";

/* ─── Types ─────────────────────────────────────────────── */

interface HeatmapData {
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

interface Props {
  data: HeatmapData;
  domain: string;
  path: string;
}

/* ─── Helpers ───────────────────────────────────────────── */

function formatDwell(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec}秒`;
  return `${Math.floor(sec / 60)}分${sec % 60}秒`;
}

function formatNow(): string {
  return new Date().toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

/* ─── Component ─────────────────────────────────────────── */

export function PdfExport({ data, domain, path }: Props) {
  const [exporting, setExporting] = useState(false);
  const printContainerRef = useRef<HTMLDivElement>(null);

  const handleExport = useCallback(() => {
    setExporting(true);

    // Short timeout to allow state update / render
    setTimeout(() => {
      try {
        window.print();
      } finally {
        setExporting(false);
      }
    }, 200);
  }, []);

  const generatedAt = formatNow();

  return (
    <>
      {/* Export button */}
      <Button
        size="sm"
        variant="outline"
        onClick={handleExport}
        disabled={exporting}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
        }}
      >
        {exporting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FileDown style={{ width: "14px", height: "14px" }} />
        )}
        PDF出力
      </Button>

      {/* Print-only content (hidden on screen) */}
      <div
        ref={printContainerRef}
        style={{
          position: "fixed",
          left: "-9999px",
          top: 0,
          width: "210mm",
          backgroundColor: "#fff",
          color: "#000",
          fontFamily:
            "'Noto Sans JP', 'Hiragino Kaku Gothic ProN', 'Yu Gothic', sans-serif",
        }}
        className="print-export-content"
      >
        {/* Title */}
        <div
          style={{
            borderBottom: "2px solid #000",
            paddingBottom: "12px",
            marginBottom: "20px",
          }}
        >
          <h1 style={{ fontSize: "20px", fontWeight: 700, margin: 0 }}>
            ヒートマップレポート
          </h1>
          <p style={{ fontSize: "14px", margin: "6px 0 0 0", color: "#333" }}>
            {domain}
            {path}
          </p>
          <p style={{ fontSize: "11px", margin: "4px 0 0 0", color: "#666" }}>
            レポート生成日: {generatedAt}
          </p>
        </div>

        {/* Stats table */}
        <div style={{ marginBottom: "24px" }}>
          <h2
            style={{
              fontSize: "14px",
              fontWeight: 700,
              borderBottom: "1px solid #ccc",
              paddingBottom: "6px",
              marginBottom: "10px",
            }}
          >
            基本統計
          </h2>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "12px",
            }}
          >
            <tbody>
              {[
                { label: "ページビュー数", value: data.totalPV.toLocaleString() },
                {
                  label: "ユニークセッション数",
                  value: data.uniqueSessions.toLocaleString(),
                },
                { label: "平均滞在時間", value: formatDwell(data.avgDwell) },
                {
                  label: "中央値滞在時間",
                  value: formatDwell(data.medianDwell || 0),
                },
                { label: "FV離脱率", value: `${data.fvExitRate || 0}%` },
                {
                  label: "最下部到達率",
                  value: `${data.bottomReachRate || 0}%`,
                },
                {
                  label: "平均ページ高さ",
                  value: `${data.avgPageHeight.toLocaleString()}px`,
                },
              ].map((row, i) => (
                <tr
                  key={row.label}
                  style={{
                    backgroundColor: i % 2 === 0 ? "#f5f5f5" : "#fff",
                  }}
                >
                  <td
                    style={{
                      padding: "6px 10px",
                      borderBottom: "1px solid #eee",
                      fontWeight: 500,
                    }}
                  >
                    {row.label}
                  </td>
                  <td
                    style={{
                      padding: "6px 10px",
                      borderBottom: "1px solid #eee",
                      textAlign: "right",
                      fontWeight: 700,
                    }}
                  >
                    {row.value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Scroll depth chart */}
        {data.scrollDepth.length > 0 && (
          <div style={{ marginBottom: "24px" }}>
            <h2
              style={{
                fontSize: "14px",
                fontWeight: 700,
                borderBottom: "1px solid #ccc",
                paddingBottom: "6px",
                marginBottom: "10px",
              }}
            >
              スクロール到達率
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {data.scrollDepth.map((sd) => (
                <div
                  key={sd.depth}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "11px",
                      width: "40px",
                      textAlign: "right",
                      color: "#333",
                    }}
                  >
                    {sd.depth}%
                  </span>
                  <div
                    style={{
                      flex: 1,
                      height: "14px",
                      backgroundColor: "#eee",
                      borderRadius: "2px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${sd.reach}%`,
                        height: "100%",
                        backgroundColor: "#333",
                        borderRadius: "2px",
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      width: "36px",
                      color: "#000",
                    }}
                  >
                    {sd.reach}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Attention zones chart */}
        {data.attentionZones && data.attentionZones.length > 0 && (
          <div style={{ marginBottom: "24px" }}>
            <h2
              style={{
                fontSize: "14px",
                fontWeight: 700,
                borderBottom: "1px solid #ccc",
                paddingBottom: "6px",
                marginBottom: "10px",
              }}
            >
              アテンションゾーン
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              {data.attentionZones.map((score, i) => (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "11px",
                      width: "60px",
                      textAlign: "right",
                      color: "#333",
                    }}
                  >
                    {i * 10}-{(i + 1) * 10}%
                  </span>
                  <div
                    style={{
                      flex: 1,
                      height: "14px",
                      backgroundColor: "#eee",
                      borderRadius: "2px",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${score}%`,
                        height: "100%",
                        backgroundColor: score >= 70 ? "#333" : score >= 40 ? "#666" : "#999",
                        borderRadius: "2px",
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      width: "36px",
                      color: "#000",
                    }}
                  >
                    {score}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Click summary table */}
        {data.clickMap.length > 0 && (
          <div style={{ marginBottom: "24px" }}>
            <h2
              style={{
                fontSize: "14px",
                fontWeight: 700,
                borderBottom: "1px solid #ccc",
                paddingBottom: "6px",
                marginBottom: "10px",
              }}
            >
              クリックサマリー (上位20)
            </h2>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "11px",
              }}
            >
              <thead>
                <tr style={{ backgroundColor: "#eee" }}>
                  <th
                    style={{
                      padding: "6px 8px",
                      textAlign: "left",
                      borderBottom: "1px solid #ccc",
                      fontWeight: 600,
                    }}
                  >
                    #
                  </th>
                  <th
                    style={{
                      padding: "6px 8px",
                      textAlign: "left",
                      borderBottom: "1px solid #ccc",
                      fontWeight: 600,
                    }}
                  >
                    要素 / 座標
                  </th>
                  <th
                    style={{
                      padding: "6px 8px",
                      textAlign: "right",
                      borderBottom: "1px solid #ccc",
                      fontWeight: 600,
                    }}
                  >
                    クリック数
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.clickMap.slice(0, 20).map((click, i) => (
                  <tr
                    key={i}
                    style={{
                      backgroundColor: i % 2 === 0 ? "#fafafa" : "#fff",
                    }}
                  >
                    <td
                      style={{
                        padding: "4px 8px",
                        borderBottom: "1px solid #eee",
                      }}
                    >
                      {i + 1}
                    </td>
                    <td
                      style={{
                        padding: "4px 8px",
                        borderBottom: "1px solid #eee",
                        fontFamily: "monospace",
                        fontSize: "10px",
                        maxWidth: "300px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {click.topSelector || `(${click.x}, ${click.y})`}
                    </td>
                    <td
                      style={{
                        padding: "4px 8px",
                        borderBottom: "1px solid #eee",
                        textAlign: "right",
                        fontWeight: 600,
                      }}
                    >
                      {click.count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        <div
          style={{
            borderTop: "1px solid #ccc",
            paddingTop: "10px",
            marginTop: "20px",
            display: "flex",
            justifyContent: "space-between",
            fontSize: "10px",
            color: "#999",
          }}
        >
          <span>ヒートマップ分析レポート - {domain}</span>
          <span>生成日時: {generatedAt}</span>
        </div>
      </div>

      {/* Print styles */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              /* Hide everything except print content */
              body > *:not(.print-export-content) {
                display: none !important;
              }

              /* Show the print content */
              .print-export-content {
                position: static !important;
                left: auto !important;
                display: block !important;
                width: 100% !important;
                padding: 20mm 15mm !important;
                margin: 0 !important;
                background: #fff !important;
                color: #000 !important;
                font-size: 12px !important;
              }

              /* Page setup */
              @page {
                size: A4;
                margin: 10mm;
              }

              /* Ensure tables don't break across pages */
              table { page-break-inside: auto; }
              tr { page-break-inside: avoid; page-break-after: auto; }
              h2 { page-break-after: avoid; }

              /* Remove shadows and borders for clean print */
              * {
                box-shadow: none !important;
                text-shadow: none !important;
              }
            }

            @media screen {
              .print-export-content {
                position: fixed !important;
                left: -9999px !important;
              }
            }
          `,
        }}
      />
    </>
  );
}
