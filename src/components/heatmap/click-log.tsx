"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Monitor, Smartphone, Tablet } from "lucide-react";
import { DateRangePicker } from "./date-range-picker";
import { Pagination } from "./pagination";
import type { ClickLogResponse } from "@/types/heatmap";

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("ja-JP", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

const DeviceIcon = ({ device }: { device: string }) => {
  if (device === "mobile") return <Smartphone style={{ width: "12px", height: "12px" }} />;
  if (device === "tablet") return <Tablet style={{ width: "12px", height: "12px" }} />;
  return <Monitor style={{ width: "12px", height: "12px" }} />;
};

interface Props {
  siteId: string;
}

export function ClickLog({ siteId }: Props) {
  const [data, setData] = useState<ClickLogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(30);
  const [page, setPage] = useState(1);
  const [selectorFilter, setSelectorFilter] = useState("");
  const [hasHref, setHasHref] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ siteId, page: String(page), pageSize: "30", days: String(days) });
      if (selectorFilter) params.set("selector", selectorFilter);
      if (hasHref) params.set("hasHref", "true");
      const res = await fetch(`/api/heatmap/clicks?${params}`);
      const json = await res.json();
      if (res.ok) setData(json);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, [siteId, page, days, selectorFilter, hasHref]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* Filters */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
        <DateRangePicker value={days} onChange={(d) => { setDays(d); setPage(1); }} />
        <Input
          placeholder="セレクター検索..."
          value={selectorFilter}
          onChange={(e) => { setSelectorFilter(e.target.value); setPage(1); }}
          style={{ width: "200px", fontSize: "12px", height: "32px" }}
        />
        <button
          onClick={() => { setHasHref(!hasHref); setPage(1); }}
          style={{
            padding: "4px 12px", borderRadius: "6px", fontSize: "12px", cursor: "pointer",
            border: hasHref ? "2px solid #3b82f6" : "1px solid #e2e8f0",
            backgroundColor: hasHref ? "#eff6ff" : "#fff",
            color: hasHref ? "#3b82f6" : "#64748b",
            fontWeight: hasHref ? 600 : 400,
          }}
        >
          リンクのみ
        </button>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: "40px" }}>
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: "#f97316" }} />
        </div>
      ) : !data || data.clicks.length === 0 ? (
        <p style={{ fontSize: "13px", color: "#94a3b8", textAlign: "center", padding: "40px" }}>
          クリックデータがありません
        </p>
      ) : (
        <>
          <div style={{ border: "1px solid #e2e8f0", borderRadius: "8px", overflow: "auto" }}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead style={{ fontSize: "11px" }}>日時</TableHead>
                  <TableHead style={{ fontSize: "11px" }}>パス</TableHead>
                  <TableHead style={{ fontSize: "11px", textAlign: "center" }}>X</TableHead>
                  <TableHead style={{ fontSize: "11px", textAlign: "center" }}>Y</TableHead>
                  <TableHead style={{ fontSize: "11px" }}>セレクター</TableHead>
                  <TableHead style={{ fontSize: "11px" }}>テキスト</TableHead>
                  <TableHead style={{ fontSize: "11px" }}>リンク先</TableHead>
                  <TableHead style={{ fontSize: "11px" }}>セッション</TableHead>
                  <TableHead style={{ fontSize: "11px" }}>端末</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.clicks.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell style={{ fontSize: "11px", whiteSpace: "nowrap" }}>{formatDate(c.createdAt)}</TableCell>
                    <TableCell style={{ fontSize: "11px", maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.path}</TableCell>
                    <TableCell style={{ fontSize: "11px", textAlign: "center" }}>{c.x}</TableCell>
                    <TableCell style={{ fontSize: "11px", textAlign: "center" }}>{c.y}</TableCell>
                    <TableCell style={{ fontSize: "10px", maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "monospace", color: "#64748b" }}>
                      {c.selector || "-"}
                    </TableCell>
                    <TableCell style={{ fontSize: "11px", maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {c.text || "-"}
                    </TableCell>
                    <TableCell style={{ fontSize: "10px", maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {c.href ? (
                        <Badge variant="outline" style={{ fontSize: "10px", padding: "0 4px" }}>{c.href.slice(0, 40)}</Badge>
                      ) : "-"}
                    </TableCell>
                    <TableCell style={{ fontSize: "10px", fontFamily: "monospace", color: "#94a3b8" }}>
                      {c.sessionId.slice(0, 8)}
                    </TableCell>
                    <TableCell>
                      <DeviceIcon device={c.device} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
