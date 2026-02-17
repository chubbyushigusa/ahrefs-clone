"use client";

import { useState } from "react";
import { Flame, BarChart3, Eye } from "lucide-react";
import { RealDataPanel } from "@/components/heatmap/real-data-panel";
import { PredictPanel } from "@/components/heatmap/predict-panel";

type MainTab = "realdata" | "predict";

export default function HeatmapPage() {
  const [mainTab, setMainTab] = useState<MainTab>("realdata");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: "24px", fontWeight: 700, display: "flex", alignItems: "center", gap: "8px" }}>
          <Flame style={{ width: "24px", height: "24px", color: "#f97316" }} />
          ヒートマップ分析
        </h1>
        <p style={{ fontSize: "14px", color: "#64748b", marginTop: "4px" }}>
          リアルトラッキングまたはHTML構造解析による推定ヒートマップ
        </p>
      </div>

      {/* Main Tab Selector */}
      <div style={{ display: "flex", gap: "4px", backgroundColor: "#f1f5f9", padding: "4px", borderRadius: "10px", width: "fit-content" }}>
        {([
          { key: "realdata" as MainTab, label: "リアルデータ", icon: BarChart3, desc: "実際の訪問者データ" },
          { key: "predict" as MainTab, label: "推定分析", icon: Eye, desc: "HTML構造から推定" },
        ]).map((t) => (
          <button
            key={t.key}
            onClick={() => setMainTab(t.key)}
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              padding: "8px 20px", borderRadius: "8px", border: "none", cursor: "pointer",
              fontSize: "14px", fontWeight: mainTab === t.key ? 600 : 400,
              backgroundColor: mainTab === t.key ? "#fff" : "transparent",
              color: mainTab === t.key ? "#0f172a" : "#64748b",
              boxShadow: mainTab === t.key ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              transition: "all 0.2s",
            }}
          >
            <t.icon style={{ width: "16px", height: "16px" }} />
            {t.label}
          </button>
        ))}
      </div>

      {mainTab === "realdata" ? <RealDataPanel /> : <PredictPanel />}
    </div>
  );
}
