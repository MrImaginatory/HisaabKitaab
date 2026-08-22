"use client";
import * as React from "react";

export interface LinePoint {
  date: string; // ISO
  value: number;
}

interface LineChartProps {
  points: LinePoint[];
  height?: number;
  strokeColor?: string;
}

function niceMax(v: number): number {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const n = v / p;
  const m = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return m * p;
}

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function dayLabel(iso: string) {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${SHORT_MONTHS[(m || 1) - 1]}`;
}

// Flat Binance trading-chart style — hairline gridlines, single semantic stroke, dot markers with native tooltips
export function LineChart({ points, height = 230, strokeColor = "var(--color-trading-down)" }: LineChartProps) {
  const W = 640;
  const H = height;
  const padL = 56;
  const padR = 14;
  const padT = 14;
  const padB = 30;

  const maxVal = React.useMemo(() => niceMax(Math.max(...points.map((p) => p.value), 0)), [points]);
  const hasData = points.some((p) => p.value > 0);

  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const xAt = (i: number) => (points.length <= 1 ? padL + innerW / 2 : padL + (i * innerW) / (points.length - 1));
  const yAt = (v: number) => padT + innerH - (v / maxVal) * innerH;

  // gridlines — 4 steps
  const steps = 4;
  const gridVals = Array.from({ length: steps + 1 }, (_, i) => (maxVal / steps) * i);

  // x ticks — ~6 evenly spaced
  const tickIdxs = React.useMemo(() => {
    if (points.length === 0) return [];
    const target = Math.min(6, points.length);
    const idxs = new Set<number>();
    for (let i = 0; i < target; i++) {
      idxs.add(Math.round((i * (points.length - 1)) / Math.max(target - 1, 1)));
    }
    return [...idxs].sort((a, b) => a - b);
  }, [points]);

  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"}${xAt(i).toFixed(1)},${yAt(p.value).toFixed(1)}`).join(" ");

  const fmtShort = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k` : String(Math.round(v)));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block" role="img">
      {/* gridlines */}
      {gridVals.map((gv, i) => (
        <g key={i}>
          <line x1={padL} y1={yAt(gv)} x2={W - padR} y2={yAt(gv)} stroke="var(--color-hairline-on-dark)" strokeWidth="1" />
          <text x={padL - 8} y={yAt(gv) + 3.5} textAnchor="end" fontSize="10" fill="var(--color-muted)" fontFamily="var(--font-num)">
            {fmtShort(gv)}
          </text>
        </g>
      ))}

      {/* x tick labels */}
      {tickIdxs.map((idx) => (
        <text key={idx} x={xAt(idx)} y={H - 8} textAnchor="middle" fontSize="10" fill="var(--color-muted)" fontFamily="var(--font-num)">
          {dayLabel(points[idx].date)}
        </text>
      ))}

      {/* baseline */}
      <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="var(--color-surface-elevated-dark)" strokeWidth="1" />

      {hasData && points.length > 1 && (
        <path d={pathD} fill="none" stroke={strokeColor} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      )}

      {/* point markers */}
      {points.map((p, i) =>
        p.value > 0 ? (
          <circle key={p.date} cx={xAt(i)} cy={yAt(p.value)} r={3} fill={strokeColor} stroke="var(--color-canvas-dark)" strokeWidth="1.5">
            <title>{`${dayLabel(p.date)} — ₹${Math.round(p.value).toLocaleString("en-IN")}`}</title>
          </circle>
        ) : null
      )}

      {!hasData && (
        <text x={W / 2} y={H / 2} textAnchor="middle" fontSize="12" fill="var(--color-muted)">
          No spending in this period
        </text>
      )}
    </svg>
  );
}
