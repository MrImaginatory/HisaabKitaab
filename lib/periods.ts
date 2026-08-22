// Spend analytics period helpers — ISO YYYY-MM-DD inclusive ranges

export type PeriodPreset = "thisMonth" | "lastMonth" | "last7" | "last30" | "thisYear" | "custom";

export const PERIOD_OPTIONS: { value: PeriodPreset; label: string }[] = [
  { value: "thisMonth", label: "This Month" },
  { value: "lastMonth", label: "Last Month" },
  { value: "last30", label: "Last 30 Days" },
  { value: "last7", label: "Last 7 Days" },
  { value: "thisYear", label: "This Year" },
  { value: "custom", label: "Custom Range" },
];

export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export interface DateRange {
  start: string; // ISO
  end: string; // ISO
}

export function getRange(preset: PeriodPreset, custom?: Partial<DateRange>): DateRange {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  switch (preset) {
    case "thisMonth": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: toISO(start), end: toISO(today) };
    }
    case "lastMonth": {
      const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const end = new Date(now.getFullYear(), now.getMonth(), 0);
      return { start: toISO(start), end: toISO(end) };
    }
    case "last30": {
      const s = new Date(today);
      s.setDate(s.getDate() - 29);
      return { start: toISO(s), end: toISO(today) };
    }
    case "last7": {
      const s = new Date(today);
      s.setDate(s.getDate() - 6);
      return { start: toISO(s), end: toISO(today) };
    }
    case "thisYear": {
      const start = new Date(now.getFullYear(), 0, 1);
      return { start: toISO(start), end: toISO(today) };
    }
    case "custom":
    default:
      return {
        start: custom?.start || toISO(new Date(now.getFullYear(), now.getMonth(), 1)),
        end: custom?.end || toISO(today),
      };
  }
}

export function eachDay(startIso: string, endIso: string): string[] {
  const out: string[] = [];
  const [sy, sm, sd] = startIso.split("-").map(Number);
  const [ey, em, ed] = endIso.split("-").map(Number);
  const cur = new Date(sy, sm - 1, sd);
  const end = new Date(ey, em - 1, ed);
  let guard = 0;
  while (cur <= end && guard < 4000) {
    out.push(toISO(cur));
    cur.setDate(cur.getDate() + 1);
    guard++;
  }
  return out;
}

// Fallback palette for categories without a color — Binance-adjacent hues
export const FALLBACK_PALETTE = ["#fcd535", "#0ecb81", "#f6465d", "#3b82f6", "#8b5cf6", "#ec4899", "#f97316", "#14b8a6", "#707a8a"];
