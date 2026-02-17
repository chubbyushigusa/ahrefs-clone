"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Plus,
  Trash2,
  Filter,
  ArrowDown,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

/* ─── Types ─────────────────────────────────────────────── */

interface FunnelStep {
  label: string;
  path: string;
  sessions: number;
  conversionRate: number;
  dropOffRate: number;
}

interface Funnel {
  id: string;
  name: string;
  steps: FunnelStep[];
  createdAt: string;
}

interface FunnelListData {
  funnels: Funnel[];
}

interface Props {
  siteId: string;
}

/* ─── Helpers ───────────────────────────────────────────── */

function getStepColor(index: number, total: number): string {
  if (total <= 1) return "#22c55e";
  const ratio = index / (total - 1);
  // Gradient: green (#22c55e) -> yellow (#eab308) -> red (#ef4444)
  if (ratio <= 0.5) {
    const t = ratio * 2;
    const r = Math.round(34 + (234 - 34) * t);
    const g = Math.round(197 + (179 - 197) * t);
    const b = Math.round(94 + (8 - 94) * t);
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    const t = (ratio - 0.5) * 2;
    const r = Math.round(234 + (239 - 234) * t);
    const g = Math.round(179 + (68 - 179) * t);
    const b = Math.round(8 + (68 - 8) * t);
    return `rgb(${r}, ${g}, ${b})`;
  }
}

/* ─── Component ─────────────────────────────────────────── */

export function FunnelAnalysis({ siteId }: Props) {
  const [funnels, setFunnels] = useState<Funnel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFunnel, setSelectedFunnel] = useState<Funnel | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  // Create form state
  const [newName, setNewName] = useState("");
  const [newSteps, setNewSteps] = useState<{ label: string; path: string }[]>([
    { label: "", path: "" },
    { label: "", path: "" },
  ]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // ── Fetch funnels ───────────────────────────────────────
  const fetchFunnels = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/heatmap/funnel?siteId=${siteId}`);
      const json: FunnelListData = await res.json();
      if (res.ok) {
        setFunnels(json.funnels || []);
        if (!selectedFunnel && json.funnels && json.funnels.length > 0) {
          setSelectedFunnel(json.funnels[0]);
        }
      } else {
        setError((json as { error?: string }).error || "データ取得に失敗しました");
      }
    } catch {
      setError("データ取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [siteId, selectedFunnel]);

  useEffect(() => {
    fetchFunnels();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteId]);

  // ── Create funnel ───────────────────────────────────────
  const handleCreate = async () => {
    const validSteps = newSteps.filter((s) => s.path.trim() !== "");
    if (!newName.trim()) {
      setCreateError("ファネル名を入力してください");
      return;
    }
    if (validSteps.length < 2) {
      setCreateError("ステップは2つ以上必要です");
      return;
    }

    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/heatmap/funnel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteId,
          name: newName.trim(),
          steps: validSteps.map((s) => ({
            label: s.label.trim() || s.path.trim(),
            path: s.path.trim(),
          })),
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setNewName("");
        setNewSteps([
          { label: "", path: "" },
          { label: "", path: "" },
        ]);
        setShowCreate(false);
        await fetchFunnels();
        if (json.funnel) {
          setSelectedFunnel(json.funnel);
        }
      } else {
        setCreateError(json.error || "作成に失敗しました");
      }
    } catch {
      setCreateError("作成に失敗しました");
    } finally {
      setCreating(false);
    }
  };

  // ── Add step ────────────────────────────────────────────
  const addStep = () => {
    setNewSteps([...newSteps, { label: "", path: "" }]);
  };

  // ── Remove step ─────────────────────────────────────────
  const removeStep = (index: number) => {
    if (newSteps.length <= 2) return;
    setNewSteps(newSteps.filter((_, i) => i !== index));
  };

  // ── Update step ─────────────────────────────────────────
  const updateStep = (
    index: number,
    field: "label" | "path",
    value: string
  ) => {
    const updated = [...newSteps];
    updated[index] = { ...updated[index], [field]: value };
    setNewSteps(updated);
  };

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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Funnel selector + create button */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <Filter style={{ width: "16px", height: "16px", color: "#64748b" }} />
            <span style={{ fontSize: "13px", fontWeight: 600, color: "#0f172a" }}>
              ファネル:
            </span>

            {/* Funnel tabs */}
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", flex: 1 }}>
              {funnels.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setSelectedFunnel(f)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: "8px",
                    border:
                      selectedFunnel?.id === f.id
                        ? "2px solid #f97316"
                        : "1px solid #e2e8f0",
                    backgroundColor:
                      selectedFunnel?.id === f.id ? "#fff7ed" : "#fff",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: selectedFunnel?.id === f.id ? 600 : 400,
                    color: "#0f172a",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  {f.name}
                  <Badge variant="secondary" style={{ fontSize: "10px" }}>
                    {f.steps.length}ステップ
                  </Badge>
                </button>
              ))}
              {funnels.length === 0 && (
                <span style={{ fontSize: "12px", color: "#94a3b8" }}>
                  ファネルがまだ作成されていません
                </span>
              )}
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowCreate(!showCreate)}
            >
              <Plus className="h-4 w-4 mr-1" />
              新規作成
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Create funnel form */}
      {showCreate && (
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm">新規ファネル作成</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {/* Funnel name */}
              <div>
                <label
                  style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", display: "block", marginBottom: "4px" }}
                >
                  ファネル名
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="例: 購入フロー"
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    borderRadius: "6px",
                    border: "1px solid #e2e8f0",
                    fontSize: "13px",
                    color: "#0f172a",
                    outline: "none",
                  }}
                />
              </div>

              {/* Steps */}
              <div>
                <label
                  style={{ fontSize: "11px", fontWeight: 600, color: "#64748b", display: "block", marginBottom: "8px" }}
                >
                  ステップ
                </label>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {newSteps.map((step, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      {/* Step number */}
                      <div
                        style={{
                          width: "24px",
                          height: "24px",
                          borderRadius: "50%",
                          backgroundColor: getStepColor(i, newSteps.length),
                          color: "#fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "11px",
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {i + 1}
                      </div>

                      {/* Label */}
                      <input
                        type="text"
                        value={step.label}
                        onChange={(e) => updateStep(i, "label", e.target.value)}
                        placeholder="ラベル (例: トップページ)"
                        style={{
                          flex: 1,
                          padding: "6px 10px",
                          borderRadius: "6px",
                          border: "1px solid #e2e8f0",
                          fontSize: "12px",
                          color: "#0f172a",
                          outline: "none",
                        }}
                      />

                      {/* Path */}
                      <input
                        type="text"
                        value={step.path}
                        onChange={(e) => updateStep(i, "path", e.target.value)}
                        placeholder="パス (例: /)"
                        style={{
                          flex: 1,
                          padding: "6px 10px",
                          borderRadius: "6px",
                          border: "1px solid #e2e8f0",
                          fontSize: "12px",
                          color: "#0f172a",
                          outline: "none",
                          fontFamily: "monospace",
                        }}
                      />

                      {/* Remove */}
                      <button
                        onClick={() => removeStep(i)}
                        disabled={newSteps.length <= 2}
                        style={{
                          padding: "4px",
                          borderRadius: "4px",
                          border: "none",
                          backgroundColor: "transparent",
                          cursor: newSteps.length <= 2 ? "not-allowed" : "pointer",
                          color: newSteps.length <= 2 ? "#d1d5db" : "#ef4444",
                          flexShrink: 0,
                        }}
                      >
                        <Trash2 style={{ width: "14px", height: "14px" }} />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  onClick={addStep}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    padding: "6px 12px",
                    marginTop: "8px",
                    borderRadius: "6px",
                    border: "1px dashed #e2e8f0",
                    backgroundColor: "transparent",
                    cursor: "pointer",
                    fontSize: "12px",
                    color: "#64748b",
                  }}
                >
                  <Plus style={{ width: "12px", height: "12px" }} />
                  ステップを追加
                </button>
              </div>

              {/* Error */}
              {createError && (
                <p style={{ fontSize: "12px", color: "#ef4444" }}>{createError}</p>
              )}

              {/* Submit */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowCreate(false)}
                >
                  キャンセル
                </Button>
                <Button size="sm" onClick={handleCreate} disabled={creating}>
                  {creating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "作成"
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Funnel visualization */}
      {selectedFunnel && selectedFunnel.steps.length > 0 && (
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <ChevronRight style={{ width: "14px", height: "14px", color: "#f97316" }} />
              {selectedFunnel.name}
              <Badge variant="secondary" style={{ fontSize: "10px" }}>
                {selectedFunnel.steps.length}ステップ
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div style={{ display: "flex", flexDirection: "column", gap: "0px", padding: "16px 0" }}>
              {selectedFunnel.steps.map((step, i) => {
                const isFirst = i === 0;
                const isLast = i === selectedFunnel.steps.length - 1;
                const color = getStepColor(i, selectedFunnel.steps.length);
                const maxSessions = selectedFunnel.steps[0].sessions || 1;
                const barWidth = maxSessions > 0
                  ? Math.max((step.sessions / maxSessions) * 100, 8)
                  : 8;

                return (
                  <div key={i}>
                    {/* Step */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "16px",
                        padding: "12px 0",
                      }}
                    >
                      {/* Step number circle */}
                      <div
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "50%",
                          backgroundColor: color,
                          color: "#fff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "13px",
                          fontWeight: 700,
                          flexShrink: 0,
                        }}
                      >
                        {i + 1}
                      </div>

                      {/* Funnel bar + info */}
                      <div style={{ flex: 1 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginBottom: "4px",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span style={{ fontSize: "13px", fontWeight: 600, color: "#0f172a" }}>
                              {step.label}
                            </span>
                            <span
                              style={{
                                fontSize: "11px",
                                color: "#94a3b8",
                                fontFamily: "monospace",
                              }}
                            >
                              {step.path}
                            </span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span
                              style={{
                                fontSize: "14px",
                                fontWeight: 700,
                                color: "#0f172a",
                                fontVariantNumeric: "tabular-nums",
                              }}
                            >
                              {step.sessions.toLocaleString()}
                            </span>
                            <span style={{ fontSize: "11px", color: "#64748b" }}>
                              セッション
                            </span>
                          </div>
                        </div>

                        {/* Trapezoid / funnel bar */}
                        <div
                          style={{
                            position: "relative",
                            height: "28px",
                            display: "flex",
                            justifyContent: "center",
                          }}
                        >
                          <div
                            style={{
                              width: `${barWidth}%`,
                              height: "100%",
                              backgroundColor: color,
                              borderRadius: isFirst
                                ? "6px 6px 4px 4px"
                                : isLast
                                  ? "4px 4px 6px 6px"
                                  : "4px",
                              opacity: 0.8,
                              transition: "width 0.5s ease-out",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "11px",
                                fontWeight: 600,
                                color: "#fff",
                              }}
                            >
                              {step.conversionRate}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Drop-off arrow between steps */}
                    {!isLast && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "16px",
                          padding: "2px 0",
                        }}
                      >
                        {/* Spacer for alignment with step number */}
                        <div style={{ width: "32px", display: "flex", justifyContent: "center" }}>
                          <ArrowDown style={{ width: "16px", height: "16px", color: "#d1d5db" }} />
                        </div>

                        {/* Drop-off info */}
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            padding: "4px 12px",
                            backgroundColor: step.dropOffRate > 50 ? "#fef2f2" : "#f8fafc",
                            borderRadius: "6px",
                            border: `1px solid ${step.dropOffRate > 50 ? "#fecaca" : "#f1f5f9"}`,
                          }}
                        >
                          <ChevronDown
                            style={{
                              width: "12px",
                              height: "12px",
                              color: step.dropOffRate > 50 ? "#ef4444" : "#94a3b8",
                            }}
                          />
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: 600,
                              color: step.dropOffRate > 50 ? "#ef4444" : "#64748b",
                            }}
                          >
                            離脱 {step.dropOffRate}%
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Overall conversion */}
            {selectedFunnel.steps.length >= 2 && (
              <div
                style={{
                  marginTop: "16px",
                  padding: "12px 16px",
                  backgroundColor: "#f0fdf4",
                  borderRadius: "8px",
                  border: "1px solid #bbf7d0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <span style={{ fontSize: "13px", fontWeight: 600, color: "#166534" }}>
                  全体コンバージョン率
                </span>
                <span
                  style={{
                    fontSize: "20px",
                    fontWeight: 700,
                    color: "#16a34a",
                  }}
                >
                  {selectedFunnel.steps[0].sessions > 0
                    ? (
                        (selectedFunnel.steps[selectedFunnel.steps.length - 1].sessions /
                          selectedFunnel.steps[0].sessions) *
                        100
                      ).toFixed(1)
                    : "0.0"}
                  %
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* No funnel selected */}
      {!selectedFunnel && funnels.length === 0 && !showCreate && (
        <Card>
          <CardContent className="pt-6 pb-6">
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <Filter style={{ width: "48px", height: "48px", color: "#d1d5db", margin: "0 auto" }} />
              <h3 style={{ fontSize: "16px", fontWeight: 600, color: "#0f172a", marginTop: "16px" }}>
                ファネルを作成してコンバージョンを分析
              </h3>
              <p style={{ fontSize: "13px", color: "#94a3b8", marginTop: "8px" }}>
                ページの流れを定義して、離脱ポイントを特定します
              </p>
              <Button
                onClick={() => setShowCreate(true)}
                style={{ marginTop: "16px" }}
              >
                <Plus className="h-4 w-4 mr-2" />
                最初のファネルを作成
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
