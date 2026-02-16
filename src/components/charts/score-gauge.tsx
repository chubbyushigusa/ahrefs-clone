"use client";

interface ScoreGaugeProps {
  score: number;
  size?: number;
  label?: string;
}

export function ScoreGauge({ score, size = 120, label }: ScoreGaugeProps) {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const getColor = (score: number) => {
    if (score >= 90) return "#22c55e";
    if (score >= 50) return "#f97316";
    return "#ef4444";
  };

  const color = getColor(score);

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox="0 0 100 100">
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth="8"
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 50 50)"
          className="gauge-animated"
        />
        <text
          x="50"
          y="50"
          textAnchor="middle"
          dominantBaseline="central"
          className="text-2xl font-bold"
          fill={color}
          fontSize="24"
        >
          {score}
        </text>
      </svg>
      {label && (
        <span className="mt-1 text-sm font-medium text-muted-foreground">{label}</span>
      )}
    </div>
  );
}
