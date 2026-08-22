"use client";
import * as React from "react";

export interface DonutDatum {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  data: DonutDatum[];
  size?: number;
  thickness?: number;
  centerLabel?: string;
}

// Flat Binance-style donut — no gradients, category-color strokes, tabular center number
export function DonutChart({ data, size = 190, thickness = 28, centerLabel = "Spent" }: DonutChartProps) {
  const total = React.useMemo(() => data.reduce((s, d) => s + d.value, 0), [data]);
  const r = (size - thickness) / 2 - 2;
  const c = size / 2;
  const circ = 2 * Math.PI * r;

  // Precompute dash offsets so nothing mutates during render
  const segments = React.useMemo(() => {
    if (total <= 0) return [];
    let acc = 0;
    return data
      .filter((d) => d.value > 0)
      .map((d, i) => {
        const frac = d.value / total;
        const len = Math.max(frac * circ, 1.5); // min sliver visibility
        const seg = { key: i, color: d.color, label: d.label, value: d.value, frac, len, off: -acc };
        acc += len;
        return seg;
      });
  }, [data, total, circ]);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="block">
        {/* track */}
        <circle cx={c} cy={c} r={r} fill="none" stroke="var(--color-surface-elevated-dark)" strokeWidth={thickness} />
        <g transform={`rotate(-90 ${c} ${c})`}>
          {segments.map((seg) => (
            <circle
              key={seg.key}
              cx={c}
              cy={c}
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth={thickness}
              strokeDasharray={`${seg.len} ${circ - seg.len}`}
              strokeDashoffset={seg.off}
            >
              <title>{`${seg.label} — ₹${Math.round(seg.value).toLocaleString("en-IN")} (${(seg.frac * 100).toFixed(1)}%)`}</title>
            </circle>
          ))}
        </g>
      </svg>
      {/* center stat-callout — BinancePlex tabular */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-[11px] font-bold tracking-wide uppercase text-[var(--color-muted)]">{centerLabel}</span>
        <span className="font-num text-[20px] font-bold leading-none mt-1 text-white">
          ₹{Math.round(total).toLocaleString("en-IN")}
        </span>
      </div>
    </div>
  );
}

export function DonutLegend({ data, total }: { data: DonutDatum[]; total: number }) {
  if (total <= 0) {
    return <div className="flex-1 min-w-[160px] text-[12px] text-[var(--color-muted)]">No spending recorded.</div>;
  }
  return (
    <div className="flex-1 min-w-[160px] flex flex-col gap-1.5 overflow-auto">
      {data.map((d, i) => {
        const pct = (d.value / total) * 100;
        return (
          <div key={i} className="flex items-center gap-2 text-[12px]">
            <span className="w-2.5 h-2.5 rounded-full border border-white/15 shrink-0" style={{ background: d.color }} />
            <span className="text-[var(--color-muted-strong)] truncate flex-1">{d.label}</span>
            <span className="font-num font-semibold text-white whitespace-nowrap">₹{Math.round(d.value).toLocaleString("en-IN")}</span>
            <span className={`font-num w-[46px] text-right whitespace-nowrap ${pct >= 0 ? "text-[var(--color-muted)]" : ""}`}>{pct.toFixed(1)}%</span>
          </div>
        );
      })}
    </div>
  );
}
