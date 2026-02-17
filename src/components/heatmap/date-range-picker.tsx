"use client";

interface DateRangePickerProps {
  value: number;
  onChange: (days: number) => void;
}

const OPTIONS = [
  { label: "7日", value: 7 },
  { label: "14日", value: 14 },
  { label: "30日", value: 30 },
  { label: "60日", value: 60 },
  { label: "90日", value: 90 },
];

export function DateRangePicker({ value, onChange }: DateRangePickerProps) {
  return (
    <div style={{ display: "flex", gap: "4px", backgroundColor: "#f1f5f9", padding: "3px", borderRadius: "6px" }}>
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          style={{
            padding: "4px 10px",
            borderRadius: "4px",
            border: "none",
            cursor: "pointer",
            fontSize: "12px",
            fontWeight: value === opt.value ? 600 : 400,
            backgroundColor: value === opt.value ? "#fff" : "transparent",
            color: value === opt.value ? "#0f172a" : "#64748b",
            boxShadow: value === opt.value ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
