"use client";
import * as React from "react";
import { Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, createHorizontalChart } from "recharts";

export interface LinePoint {
  date: string; // ISO
  value: number;
}

export interface LineSeries {
  id: string;
  points: LinePoint[];
  color: string;
  name?: string;
}

interface LineChartProps {
  series: LineSeries[];
  height?: number;
}

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function dayLabel(iso: string) {
  const [, m, d] = iso.split("-").map(Number);
  return `${d} ${SHORT_MONTHS[(m || 1) - 1]}`;
}

type ChartData = Record<string, any>;

const Typed = createHorizontalChart<ChartData, string, number>()({ XAxis, YAxis, Tooltip, Line });

export function LineChart({ series, height = 230 }: LineChartProps) {
  const data = React.useMemo(() => {
    if (!series || series.length === 0 || !series[0].points) return [];
    const basePoints = series[0].points;
    return basePoints.map((p, i) => {
      const datum: ChartData = { label: dayLabel(p.date) };
      series.forEach((s) => {
        datum[s.id] = s.points[i]?.value || 0;
      });
      return datum;
    });
  }, [series]);

  const hasData = React.useMemo(() => {
    return series.some((s) => s.points.some((p) => p.value > 0));
  }, [series]);

  if (!hasData) {
    return (
      <div style={{ height }} className="flex items-center justify-center text-[12px] text-[var(--color-muted)]">
        No data in this period
      </div>
    );
  }

  return (
    <div style={{ height, width: "100%" }}>
      <Typed.LineChart
        style={{ width: "100%", height: "100%" }}
        responsive
        data={data}
        margin={{
          top: 10,
          right: 20,
          left: -10,
          bottom: 0,
        }}
      >
        <CartesianGrid stroke="var(--color-hairline-on-dark)" strokeDasharray="3 3" vertical={false} />
        <Typed.XAxis dataKey="label" tick={{ fill: "var(--color-muted)", fontSize: 10 }} tickLine={false} axisLine={false} />
        <Typed.YAxis 
          width={50} 
          tick={{ fill: "var(--color-muted)", fontSize: 10 }} 
          tickLine={false} 
          axisLine={false} 
          tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k` : String(v))} 
        />
        <Tooltip 
          contentStyle={{ backgroundColor: "var(--color-surface-card-dark)", borderColor: "var(--color-hairline-on-dark)", borderRadius: "8px", fontSize: "12px" }}
          itemStyle={{ fontWeight: "bold" }}
        />
        <Legend wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }} />
        
        {series.map((s) => (
          <Typed.Line 
            key={s.id} 
            type="monotone" 
            dataKey={s.id} 
            name={s.name || s.id} 
            stroke={s.color} 
            strokeWidth={2} 
            dot={{ r: 3, fill: "var(--color-canvas-dark)", stroke: s.color, strokeWidth: 1.5 }}
            activeDot={{ r: 5, fill: s.color, stroke: "var(--color-canvas-dark)", strokeWidth: 2 }}
          />
        ))}
      </Typed.LineChart>
    </div>
  );
}
