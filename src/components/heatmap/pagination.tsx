"use client";

import { Button } from "@/components/ui/button";

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, pageSize, total, onPageChange }: PaginationProps) {
  const totalPages = Math.ceil(total / pageSize);
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  if (total === 0) return null;

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0" }}>
      <span style={{ fontSize: "12px", color: "#64748b" }}>
        {total}件中 {start}-{end}件
      </span>
      <div style={{ display: "flex", gap: "4px" }}>
        <Button
          size="sm"
          variant="outline"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          style={{ fontSize: "12px" }}
        >
          前へ
        </Button>
        <span style={{ fontSize: "12px", color: "#64748b", display: "flex", alignItems: "center", padding: "0 8px" }}>
          {page} / {totalPages}
        </span>
        <Button
          size="sm"
          variant="outline"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          style={{ fontSize: "12px" }}
        >
          次へ
        </Button>
      </div>
    </div>
  );
}
