// Thin re-export for CategoryPage — type + CSV helpers only.
// Domain persistence now lives in lib/db.ts (SQLite), NOT localStorage.
// LocalStorage keeps only: hk_theme_mode, hk_accent_color, hk_last_db_name.

export type CategoryType = "income" | "expense";
export interface Category {
  id: string;
  name: string;
  nameKey: string;
  type: CategoryType;
  color: string;
  isDeleted?: boolean;
  createdAt: number;
}

// CSV parsing + preview analysis stay here (pure, no IO)
export interface ParsedCsvRow {
  rowIndex: number;
  name: string;
  type: string;
  color: string;
  valid: boolean;
  error?: string;
  normalizedName?: string;
  normalizedType?: CategoryType;
  normalizedColor?: string;
}

export function parseCategoryCsv(text: string): ParsedCsvRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const headerGuess = lines[0].toLowerCase();
  const hasHeader = headerGuess.includes("category") && (headerGuess.includes("name") || headerGuess.includes("type") || headerGuess.includes("color"));
  const dataLines = hasHeader ? lines.slice(1) : lines;
  const startRowOffset = hasHeader ? 2 : 1;
  return dataLines.map((line, idx) => {
    const cells = splitCsvLine(line);
    const rawName = (cells[0] ?? "").trim();
    const rawType = (cells[1] ?? "").trim().toLowerCase();
    const rawColor = (cells[2] ?? "").trim();
    const rowIndex = startRowOffset + idx;
    let error: string | undefined;
    let valid = true;
    if (!rawName) { error = "Missing categoryname"; valid = false; }
    let nt: CategoryType | undefined;
    if (rawType !== "income" && rawType !== "expense") {
      error = (error ? error + "; " : "") + "type must be income or expense";
      valid = false;
    } else nt = rawType as CategoryType;
    let nc: string | undefined;
    const hex = rawColor.startsWith("#") ? rawColor : `#${rawColor}`;
    if (!/^#[0-9a-fA-F]{6}$/.test(hex)) {
      error = (error ? error + "; " : "") + "color must be hex #rrggbb";
      valid = false;
    } else nc = hex.toLowerCase();
    return { rowIndex, name: rawName, type: rawType, color: rawColor, valid, error, normalizedName: rawName, normalizedType: nt, normalizedColor: nc };
  });
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = ""; let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++; } else inQ = !inQ;
    } else if (ch === "," && !inQ) { out.push(cur); cur = ""; } else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim().replace(/^"(.*)"$/, "$1"));
}

export interface PreviewAnalysis {
  rows: ParsedCsvRow[];
  duplicatesAgainstDb: Set<number>;
  duplicatesInsideCsv: Set<number>;
  invalid: Set<number>;
}

export function analyzeForPreview(rows: ParsedCsvRow[], existing: Category[]): PreviewAnalysis {
  const dbKeys = new Set(existing.map((c) => c.nameKey));
  const seen = new Map<string, number>();
  const dupAgainst = new Set<number>();
  const dupInside = new Set<number>();
  const invalid = new Set<number>();
  rows.forEach((r, i) => {
    if (!r.valid || !r.normalizedName) { invalid.add(i); return; }
    const key = r.normalizedName.trim().toLowerCase();
    if (dbKeys.has(key)) dupAgainst.add(i);
    if (seen.has(key)) dupInside.add(i);
    else seen.set(key, i);
  });
  return { rows, duplicatesAgainstDb: dupAgainst, duplicatesInsideCsv: dupInside, invalid };
}

export function sampleCsv(): string {
  return `categoryname,category type,color\nGroceries,expense,#f6465d\nSalary,income,#0ecb81\nRent,expense,#f0b90b\nGroceries,expense,#ff0000\n`;
}

// Legacy stubs removed — use lib/db.ts for load/add/delete (SQLite).
