"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  TrendingUp,
  Plus,
  Loader2,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  Minus,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  Legend,
} from "recharts";

interface Project {
  id: string;
  name: string;
  domain: string;
  trackedKeywords: {
    id: string;
    keyword: string;
    rankingHistory: { position: number | null; checkedAt: string }[];
  }[];
}

export default function RankTrackerPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectDomain, setNewProjectDomain] = useState("");
  const [newKeyword, setNewKeyword] = useState("");
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [addingProject, setAddingProject] = useState(false);
  const [addingKeyword, setAddingKeyword] = useState(false);
  const [checking, setChecking] = useState(false);
  const [chartData, setChartData] = useState<{ date: string; position: number | null }[]>([]);
  const [selectedKeywordId, setSelectedKeywordId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await fetch("/api/projects");
      const data = await res.json();
      if (Array.isArray(data)) {
        setProjects(data);
        if (data.length > 0 && !selectedProject) {
          setSelectedProject(data[0].id);
        }
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  const handleAddProject = async () => {
    if (!newProjectName.trim() || !newProjectDomain.trim()) return;
    setAddingProject(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newProjectName.trim(), domain: newProjectDomain.trim() }),
      });
      if (res.ok) {
        setNewProjectName("");
        setNewProjectDomain("");
        setDialogOpen(false);
        fetchProjects();
      }
    } catch {} finally {
      setAddingProject(false);
    }
  };

  const handleAddKeyword = async () => {
    if (!newKeyword.trim() || !selectedProject) return;
    setAddingKeyword(true);
    try {
      const res = await fetch("/api/rank-tracker", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: selectedProject, keyword: newKeyword.trim() }),
      });
      if (res.ok) {
        setNewKeyword("");
        fetchProjects();
      }
    } catch {} finally {
      setAddingKeyword(false);
    }
  };

  const handleCheckAll = async () => {
    if (!selectedProject) return;
    setChecking(true);
    try {
      await fetch("/api/rank-tracker", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: selectedProject }),
      });
      fetchProjects();
    } catch {} finally {
      setChecking(false);
    }
  };

  const loadHistory = async (keywordId: string) => {
    setSelectedKeywordId(keywordId);
    try {
      const res = await fetch(`/api/rank-tracker/history?keywordId=${keywordId}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setChartData(
          data.map((h: { position: number | null; checkedAt: string }) => ({
            date: new Date(h.checkedAt).toLocaleDateString("ja-JP", { month: "short", day: "numeric" }),
            position: h.position,
          }))
        );
      }
    } catch {}
  };

  const currentProject = projects.find((p) => p.id === selectedProject);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">ランクトラッカー</h1>
          <p className="text-muted-foreground">キーワードの検索順位を追跡</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />プロジェクト追加</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>新しいプロジェクト</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div>
                <Label>プロジェクト名</Label>
                <Input
                  placeholder="マイサイト"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                />
              </div>
              <div>
                <Label>ドメイン</Label>
                <Input
                  placeholder="example.com"
                  value={newProjectDomain}
                  onChange={(e) => setNewProjectDomain(e.target.value)}
                />
              </div>
              <Button onClick={handleAddProject} disabled={addingProject} className="w-full">
                {addingProject ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                作成
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : projects.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold">プロジェクトがありません</h3>
            <p className="text-muted-foreground mt-1">プロジェクトを作成してキーワードの順位追跡を開始しましょう</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Project Tabs */}
          <div className="flex gap-2 flex-wrap">
            {projects.map((project) => (
              <Button
                key={project.id}
                variant={selectedProject === project.id ? "default" : "outline"}
                onClick={() => setSelectedProject(project.id)}
                size="sm"
              >
                {project.name}
              </Button>
            ))}
          </div>

          {currentProject && (
            <>
              {/* Add Keyword + Check All */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex gap-3">
                    <Input
                      placeholder="追跡するキーワードを入力..."
                      value={newKeyword}
                      onChange={(e) => setNewKeyword(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddKeyword()}
                    />
                    <Button onClick={handleAddKeyword} disabled={addingKeyword}>
                      {addingKeyword ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                      追加
                    </Button>
                    <Button variant="outline" onClick={handleCheckAll} disabled={checking}>
                      {checking ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                      全て再チェック
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Keywords Table */}
              <Card>
                <CardHeader>
                  <CardTitle>
                    追跡中のキーワード ({currentProject.trackedKeywords.length}件)
                    <span className="text-sm font-normal text-muted-foreground ml-2">
                      ドメイン: {currentProject.domain}
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {currentProject.trackedKeywords.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      キーワードを追加して順位追跡を開始しましょう
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {currentProject.trackedKeywords.map((kw) => {
                        const latestPosition = kw.rankingHistory[0]?.position;
                        return (
                          <div
                            key={kw.id}
                            className="flex items-center gap-4 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                            onClick={() => loadHistory(kw.id)}
                          >
                            <div className="flex-1">
                              <span className="text-sm font-medium">{kw.keyword}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {latestPosition ? (
                                <>
                                  <Badge variant={latestPosition <= 3 ? "default" : latestPosition <= 10 ? "secondary" : "outline"}>
                                    #{latestPosition}
                                  </Badge>
                                  {latestPosition <= 3 && <ArrowUp className="h-4 w-4 text-green-500" />}
                                  {latestPosition > 10 && <ArrowDown className="h-4 w-4 text-red-500" />}
                                </>
                              ) : (
                                <Badge variant="outline" className="text-muted-foreground">
                                  <Minus className="h-3 w-3 mr-1" />
                                  圏外
                                </Badge>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Position Distribution (Ahrefs-style) */}
              {currentProject.trackedKeywords.length > 0 && (() => {
                const positions = currentProject.trackedKeywords.map((kw) => kw.rankingHistory[0]?.position || null);
                const ranges = [
                  { range: "1-3位", min: 1, max: 3, color: "#22c55e" },
                  { range: "4-10位", min: 4, max: 10, color: "#3b82f6" },
                  { range: "11-20位", min: 11, max: 20, color: "#f97316" },
                  { range: "21-50位", min: 21, max: 50, color: "#eab308" },
                  { range: "51位+", min: 51, max: 999, color: "#ef4444" },
                  { range: "圏外", min: -1, max: -1, color: "#94a3b8" },
                ];
                const distData = ranges.map((r) => ({
                  name: r.range,
                  count: positions.filter((p) =>
                    r.min === -1 ? p === null : p !== null && p >= r.min && p <= r.max
                  ).length,
                  color: r.color,
                })).filter((d) => d.count > 0);

                return (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">オーガニックポジション分布</CardTitle>
                        <p className="text-xs text-muted-foreground">
                          追跡キーワードの順位帯別分布（Ahrefs風）
                        </p>
                      </CardHeader>
                      <CardContent>
                        <div className="h-48">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={distData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="name" fontSize={11} />
                              <YAxis fontSize={11} allowDecimals={false} />
                              <Tooltip />
                              <Bar dataKey="count" name="キーワード数" radius={[4, 4, 0, 0]}>
                                {distData.map((entry, i) => (
                                  <Cell key={i} fill={entry.color} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">順位分布 (円グラフ)</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-48">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={distData}
                                cx="50%"
                                cy="50%"
                                innerRadius={35}
                                outerRadius={65}
                                dataKey="count"
                                label={({ name, value }) => `${name}: ${value}`}
                                labelLine={false}
                                fontSize={10}
                              >
                                {distData.map((entry, i) => (
                                  <Cell key={i} fill={entry.color} />
                                ))}
                              </Pie>
                              <Legend fontSize={11} />
                              <Tooltip />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                );
              })()}

              {/* Ranking Chart */}
              {selectedKeywordId && chartData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>順位推移</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" fontSize={12} />
                          <YAxis reversed domain={[1, 20]} fontSize={12} />
                          <Tooltip />
                          <Line
                            type="monotone"
                            dataKey="position"
                            stroke="hsl(224, 76%, 48%)"
                            strokeWidth={2}
                            dot={{ r: 4 }}
                            connectNulls={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
