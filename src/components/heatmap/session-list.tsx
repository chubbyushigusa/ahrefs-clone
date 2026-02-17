"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Monitor, Smartphone, Tablet } from "lucide-react";
import { DateRangePicker } from "./date-range-picker";
import { Pagination } from "./pagination";
import { SessionDetail } from "./session-detail";
import type { SessionListItem, SessionListResponse } from "@/types/heatmap";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("ja-JP", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatDwell(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec}秒`;
  return `${Math.floor(sec / 60)}分${sec % 60}秒`;
}

const DeviceIcon = ({ device }: { device: string }) => {
  if (device === "mobile") return <Smartphone style={{ width: "13px", height: "13px" }} />;
  if (device === "tablet") return <Tablet style={{ width: "13px", height: "13px" }} />;
  return <Monitor style={{ width: "13px", height: "13px" }} />;
};

interface Props {
  siteId: string;
}

export function SessionList({ siteId }: Props) {
  const [data, setData] = useState<SessionListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [page, setPage] = useState(1);
  const [deviceFilter, setDeviceFilter] = useState<string>("");
  const [selectedSession, setSelectedSession] = useState<SessionListItem | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ siteId, page: String(page), pageSize: "20", days: String(days) });
      if (deviceFilter) params.set("device", deviceFilter);
      const res = await fetch(`/api/heatmap/sessions?${params}`);
      const json = await res.json();
      if (res.ok) setData(json);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [siteId, page, days, deviceFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* Filters */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
        <DateRangePicker value={days} onChange={(d) => { setDays(d); setPage(1); }} />
        <div style={{ display: "flex", gap: "4px", backgroundColor: "#f1f5f9", padding: "3px", borderRadius: "6px" }}>
          {[
            { label: "全て", value: "" },
            { label: "PC", value: "desktop" },
            { label: "モバイル", value: "mobile" },
            { label: "タブレット", value: "tablet" },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => { setDeviceFilter(opt.value); setPage(1); }}
              style={{
                padding: "4px 10px", borderRadius: "4px", border: "none", cursor: "pointer",
                fontSize: "12px", fontWeight: deviceFilter === opt.value ? 600 : 400,
                backgroundColor: deviceFilter === opt.value ? "#fff" : "transparent",
                color: deviceFilter === opt.value ? "#0f172a" : "#64748b",
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: "#f97316" }} />
        </div>
      ) : !data || data.sessions.length === 0 ? (
        <p style={{ fontSize: "13px", color: "#94a3b8", textAlign: "center", padding: "40px" }}>
          セッションデータがありません
        </p>
      ) : (
        <>
          <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "hidden" }}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead style={{ fontSize: "12px" }}>日時</TableHead>
                  <TableHead style={{ fontSize: "12px" }}>エントリーページ</TableHead>
                  <TableHead style={{ fontSize: "12px", textAlign: "center" }}>ページ数</TableHead>
                  <TableHead style={{ fontSize: "12px", textAlign: "center" }}>クリック</TableHead>
                  <TableHead style={{ fontSize: "12px" }}>滞在時間</TableHead>
                  <TableHead style={{ fontSize: "12px" }}>デバイス</TableHead>
                  <TableHead style={{ fontSize: "12px" }}>リファラー</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.sessions.map((s) => (
                  <TableRow
                    key={s.sessionId}
                    onClick={() => setSelectedSession(s)}
                    style={{ cursor: "pointer" }}
                    className="hover:bg-slate-50"
                  >
                    <TableCell style={{ fontSize: "12px", whiteSpace: "nowrap" }}>{formatDate(s.startedAt)}</TableCell>
                    <TableCell style={{ fontSize: "12px", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.entryPage}</TableCell>
                    <TableCell style={{ fontSize: "12px", textAlign: "center" }}>
                      <Badge variant="secondary" style={{ fontSize: "10px" }}>{s.pageCount}</Badge>
                    </TableCell>
                    <TableCell style={{ fontSize: "12px", textAlign: "center" }}>
                      <Badge variant={s.totalClicks > 0 ? "default" : "secondary"} style={{ fontSize: "10px" }}>{s.totalClicks}</Badge>
                    </TableCell>
                    <TableCell style={{ fontSize: "12px" }}>{formatDwell(s.dwellMs)}</TableCell>
                    <TableCell style={{ fontSize: "12px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <DeviceIcon device={s.device} />
                        <span>{s.browser}</span>
                      </div>
                    </TableCell>
                    <TableCell style={{ fontSize: "11px", color: "#64748b", maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {s.referrer ? (() => { try { return new URL(s.referrer).hostname; } catch { return s.referrer; } })() : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={setPage} />
        </>
      )}

      {/* Session Detail Sheet */}
      <Sheet open={!!selectedSession} onOpenChange={(open) => { if (!open) setSelectedSession(null); }}>
        <SheetContent style={{ width: "480px", maxWidth: "90vw", overflowY: "auto" }}>
          <SheetHeader>
            <SheetTitle style={{ fontSize: "14px" }}>
              セッション詳細
            </SheetTitle>
            {selectedSession && (
              <p style={{ fontSize: "11px", color: "#94a3b8" }}>
                ID: {selectedSession.sessionId.slice(0, 12)}... / {formatDate(selectedSession.startedAt)}
              </p>
            )}
          </SheetHeader>
          {selectedSession && (
            <div style={{ marginTop: "16px" }}>
              <SessionDetail siteId={siteId} sessionId={selectedSession.sessionId} />
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
