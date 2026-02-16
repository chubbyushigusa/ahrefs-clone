"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Globe, Search, FileSearch, TrendingUp, Users, Flame,
  Target, Shield, Activity, BarChart3,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell,
} from "recharts";

interface DashboardData {
  projects: { id: string; name: string; domain: string; keywordCount: number }[];
  recentAudits: { id: string; domain: string; score: number; createdAt: string }[];
  recentAnalyses: { id: string; domain: string; score: number; createdAt: string }[];
  trackedKeywords: number;
  totalProjects: number;
  totalAudits: number;
  totalAnalyses: number;
}

const POSITION_COLORS = ["#22c55e", "#3b82f6", "#f97316", "#eab308", "#ef4444"];

const quickActions = [
  { href: "/site-explorer", icon: Globe, title: "サイト分析", desc: "URLを入力してSEO分析", color: "#2563eb", bg: "#eff6ff" },
  { href: "/keywords", icon: Search, title: "キーワード調査", desc: "難易度と検索ボリューム", color: "#f97316", bg: "#fff7ed" },
  { href: "/audit", icon: FileSearch, title: "サイト監査", desc: "SEO問題を検出・修正", color: "#22c55e", bg: "#f0fdf4" },
  { href: "/rank-tracker", icon: TrendingUp, title: "ランクトラッカー", desc: "キーワード順位を追跡", color: "#8b5cf6", bg: "#f5f3ff" },
  { href: "/competitors", icon: Users, title: "競合分析", desc: "複数ドメインを比較", color: "#ec4899", bg: "#fdf2f8" },
  { href: "/heatmap", icon: Flame, title: "ヒートマップ", desc: "ユーザー行動を予測分析", color: "#ef4444", bg: "#fef2f2" },
  { href: "/content-gap", icon: Target, title: "コンテンツギャップ", desc: "不足コンテンツを発見", color: "#14b8a6", bg: "#f0fdfa" },
];

// Sample chart data for when no real data exists
const sampleHealthData = [
  { name: "SEO", score: 0 },
  { name: "パフォ", score: 0 },
  { name: "コンテンツ", score: 0 },
  { name: "技術", score: 0 },
  { name: "被リンク", score: 0 },
];

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await fetch("/api/projects");
        if (res.ok) {
          const projects = await res.json();
          setData({
            projects: projects.slice(0, 5),
            recentAudits: [],
            recentAnalyses: [],
            trackedKeywords: projects.reduce((sum: number, p: { _count?: { trackedKeywords?: number } }) => sum + (p._count?.trackedKeywords || 0), 0),
            totalProjects: projects.length,
            totalAudits: 0,
            totalAnalyses: 0,
          });
        }
      } catch {
        // Dashboard data fetch failed silently
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#0f172a" }}>ダッシュボード</h1>
        <p style={{ fontSize: "14px", color: "#64748b", marginTop: "4px" }}>SEO分析プラットフォームの概要</p>
      </div>

      {/* KPI Cards - Ahrefs style */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "16px" }}>
        {[
          { title: "プロジェクト", value: data?.totalProjects || 0, icon: BarChart3, color: "#2563eb", desc: "ランクトラッカー" },
          { title: "追跡キーワード", value: data?.trackedKeywords || 0, icon: TrendingUp, color: "#f97316", desc: "アクティブなKW" },
          { title: "サイト監査", value: data?.totalAudits || 0, icon: Shield, color: "#22c55e", desc: "完了した監査" },
          { title: "サイト分析", value: data?.totalAnalyses || 0, icon: Activity, color: "#8b5cf6", desc: "分析済みドメイン" },
        ].map((stat) => (
          <div
            key={stat.title}
            style={{
              backgroundColor: "#ffffff",
              borderRadius: "12px",
              padding: "20px",
              border: "1px solid #e2e8f0",
              boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
              <span style={{ fontSize: "13px", fontWeight: 500, color: "#64748b" }}>{stat.title}</span>
              <div style={{ padding: "8px", borderRadius: "8px", backgroundColor: stat.color + "12" }}>
                <stat.icon style={{ width: "18px", height: "18px", color: stat.color }} />
              </div>
            </div>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#0f172a" }}>{stat.value}</div>
            <p style={{ fontSize: "12px", color: "#94a3b8", marginTop: "6px" }}>{stat.desc}</p>
          </div>
        ))}
      </div>

      {/* Projects Overview (Ahrefs-style) */}
      {data && data.projects.length > 0 && (
        <div style={{
          backgroundColor: "#ffffff",
          borderRadius: "12px",
          padding: "20px",
          border: "1px solid #e2e8f0",
        }}>
          <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#0f172a", marginBottom: "16px" }}>
            プロジェクト一覧
          </h2>
          <table style={{ width: "100%", fontSize: "14px", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                <th style={{ textAlign: "left", padding: "10px 12px", fontWeight: 500, color: "#64748b" }}>プロジェクト</th>
                <th style={{ textAlign: "left", padding: "10px 12px", fontWeight: 500, color: "#64748b" }}>ドメイン</th>
                <th style={{ textAlign: "center", padding: "10px 12px", fontWeight: 500, color: "#64748b" }}>追跡KW数</th>
                <th style={{ textAlign: "right", padding: "10px 12px", fontWeight: 500, color: "#64748b" }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {data.projects.map((project) => (
                <tr key={project.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "12px" }}>
                    <span style={{ fontWeight: 600, color: "#0f172a" }}>{project.name}</span>
                  </td>
                  <td style={{ padding: "12px" }}>
                    <span style={{ color: "#2563eb", fontSize: "13px" }}>{project.domain}</span>
                  </td>
                  <td style={{ textAlign: "center", padding: "12px" }}>
                    <span style={{
                      backgroundColor: "#f1f5f9",
                      borderRadius: "12px",
                      padding: "2px 10px",
                      fontSize: "13px",
                      fontWeight: 500,
                    }}>
                      {project.keywordCount || 0}
                    </span>
                  </td>
                  <td style={{ textAlign: "right", padding: "12px" }}>
                    <Link
                      href="/rank-tracker"
                      style={{ color: "#2563eb", fontSize: "13px", textDecoration: "none" }}
                    >
                      詳細 →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Feature Overview Chart + Quick Actions */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        {/* Health Score Overview */}
        <div style={{
          backgroundColor: "#ffffff",
          borderRadius: "12px",
          padding: "20px",
          border: "1px solid #e2e8f0",
        }}>
          <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#0f172a", marginBottom: "4px" }}>
            ヘルススコア概要
          </h2>
          <p style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "16px" }}>
            サイトの総合的な健全性（分析後に反映）
          </p>
          <div style={{ height: "200px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sampleHealthData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={11} />
                <YAxis domain={[0, 100]} fontSize={11} />
                <Tooltip />
                <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                  {sampleHealthData.map((_, i) => (
                    <Cell key={i} fill={POSITION_COLORS[i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p style={{ fontSize: "11px", color: "#94a3b8", textAlign: "center", marginTop: "8px" }}>
            サイトエクスプローラーで分析するとデータが表示されます
          </p>
        </div>

        {/* Feature Map */}
        <div style={{
          backgroundColor: "#ffffff",
          borderRadius: "12px",
          padding: "20px",
          border: "1px solid #e2e8f0",
        }}>
          <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#0f172a", marginBottom: "4px" }}>
            利用可能な機能
          </h2>
          <p style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "16px" }}>
            8つのSEO分析ツール
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "8px" }}>
            {quickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid #e2e8f0",
                  textDecoration: "none",
                  transition: "all 0.15s ease",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = action.color;
                  e.currentTarget.style.backgroundColor = action.bg;
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = "#e2e8f0";
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                <div style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "8px",
                  backgroundColor: action.bg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <action.icon style={{ width: "18px", height: "18px", color: action.color }} />
                </div>
                <div>
                  <p style={{ fontSize: "13px", fontWeight: 600, color: "#0f172a" }}>{action.title}</p>
                  <p style={{ fontSize: "11px", color: "#94a3b8" }}>{action.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Data Sources Info */}
      <div style={{
        backgroundColor: "#ffffff",
        borderRadius: "12px",
        padding: "20px",
        border: "1px solid #e2e8f0",
      }}>
        <h2 style={{ fontSize: "16px", fontWeight: 600, color: "#0f172a", marginBottom: "16px" }}>
          データソース
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
          {[
            { name: "Google PageSpeed Insights", desc: "パフォーマンス・SEOスコア", status: "無料 API", color: "#22c55e" },
            { name: "Serper.dev", desc: "SERP データ・検索結果", status: "2,500クエリ無料", color: "#3b82f6" },
            { name: "Moz Links API", desc: "被リンク・ドメインオーソリティ", status: "10リクエスト/月", color: "#8b5cf6" },
            { name: "Google Suggest", desc: "キーワードサジェスト", status: "無料", color: "#f97316" },
            { name: "カスタムクローラー", desc: "メタタグ・技術検出・リンク分析", status: "無制限", color: "#ef4444" },
            { name: "DNS over HTTPS", desc: "DNS レコード解析", status: "無料", color: "#14b8a6" },
          ].map((source) => (
            <div
              key={source.name}
              style={{
                padding: "12px",
                borderRadius: "8px",
                border: "1px solid #f1f5f9",
                backgroundColor: "#fafafa",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: source.color }} />
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#0f172a" }}>{source.name}</span>
              </div>
              <p style={{ fontSize: "12px", color: "#64748b" }}>{source.desc}</p>
              <p style={{ fontSize: "11px", color: source.color, fontWeight: 500, marginTop: "4px" }}>{source.status}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
