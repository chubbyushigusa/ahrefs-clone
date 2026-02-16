"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app-store";
import {
  LayoutDashboard,
  Globe,
  Search,
  FileSearch,
  TrendingUp,
  Users,
  Settings,
  ChevronLeft,
  Zap,
  Flame,
  Target,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "ダッシュボード", icon: LayoutDashboard },
  { href: "/site-explorer", label: "サイトエクスプローラー", icon: Globe },
  { href: "/keywords", label: "キーワードエクスプローラー", icon: Search },
  { href: "/audit", label: "サイト監査", icon: FileSearch },
  { href: "/rank-tracker", label: "ランクトラッカー", icon: TrendingUp },
  { href: "/competitors", label: "競合分析", icon: Users },
  { href: "/heatmap", label: "ヒートマップ分析", icon: Flame },
  { href: "/content-gap", label: "コンテンツギャップ", icon: Target },
  { href: "/settings", label: "設定", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, toggleSidebar } = useAppStore();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen flex flex-col transition-all duration-300",
        sidebarOpen ? "w-64" : "w-[68px]"
      )}
      style={{ backgroundColor: "#172554" }}
    >
      {/* Logo */}
      <div
        className="flex h-16 items-center justify-between px-4"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}
      >
        {sidebarOpen && (
          <Link href="/dashboard" className="flex items-center gap-2" style={{ textDecoration: "none" }}>
            <Zap className="h-7 w-7" style={{ color: "#f97316" }} />
            <span style={{ fontSize: "18px", fontWeight: 700, color: "#ffffff" }}>
              SEO Analyzer
            </span>
          </Link>
        )}
        {!sidebarOpen && (
          <Zap className="h-7 w-7 mx-auto" style={{ color: "#f97316" }} />
        )}
        <button
          onClick={toggleSidebar}
          style={{
            padding: "6px",
            borderRadius: "6px",
            color: "rgba(255,255,255,0.6)",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            display: sidebarOpen ? "block" : "none",
          }}
          onMouseOver={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.1)")}
          onMouseOut={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto" style={{ padding: "16px 8px" }}>
        <div className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3"
                style={{
                  padding: sidebarOpen ? "10px 12px" : "10px",
                  justifyContent: sidebarOpen ? "flex-start" : "center",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: 500,
                  textDecoration: "none",
                  transition: "all 0.15s ease",
                  backgroundColor: isActive ? "#2563eb" : "transparent",
                  color: isActive ? "#ffffff" : "rgba(255,255,255,0.65)",
                  boxShadow: isActive ? "0 4px 12px rgba(37,99,235,0.3)" : "none",
                }}
                onMouseOver={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.08)";
                    e.currentTarget.style.color = "#ffffff";
                  }
                }}
                onMouseOut={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.color = "rgba(255,255,255,0.65)";
                  }
                }}
                title={!sidebarOpen ? item.label : undefined}
              >
                <item.icon style={{ width: "20px", height: "20px", flexShrink: 0 }} />
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      {sidebarOpen && (
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", padding: "16px" }}>
          <div
            style={{
              borderRadius: "8px",
              backgroundColor: "rgba(255,255,255,0.05)",
              padding: "12px",
            }}
          >
            <p style={{ fontSize: "12px", fontWeight: 500, color: "rgba(255,255,255,0.85)" }}>
              Free プラン
            </p>
            <p style={{ fontSize: "11px", color: "rgba(255,255,255,0.45)", marginTop: "4px" }}>
              5回/日のサイト分析
            </p>
            <Link
              href="/pricing"
              style={{
                display: "block",
                textAlign: "center",
                borderRadius: "6px",
                backgroundColor: "#f97316",
                padding: "6px 12px",
                fontSize: "12px",
                fontWeight: 500,
                color: "#ffffff",
                textDecoration: "none",
                marginTop: "8px",
                transition: "background-color 0.15s ease",
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#ea580c")}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#f97316")}
            >
              アップグレード
            </Link>
          </div>
        </div>
      )}
    </aside>
  );
}
