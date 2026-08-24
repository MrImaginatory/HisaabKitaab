import * as XLSX from "xlsx";
import { DateRange } from "./periods";
import { buildStatementPDF, PDFExportData, ProfileSummary } from "./statementPdf";

export interface StatementRow {
  date: string;
  category: string;
  notes: string;
  paymentMode?: string;
  account: string;
  credit: number;
  debit: number;
  remaining: number;
}

export type { AccountSummary, PDFExportData } from "./statementPdf";

// ─── PDF export ───────────────────────────────────────────────────────────────

let notoSansCache: Promise<Uint8Array | null> | null = null;

/** Fetches the Noto Sans TTF once; returns null when unavailable (offline). */
function loadNotoSans(): Promise<Uint8Array | null> {
  if (!notoSansCache) {
    notoSansCache = fetch("/fonts/NotoSans-Regular.ttf")
      .then((res) => (res.ok ? res.arrayBuffer() : Promise.reject(new Error(String(res.status)))))
      .then((buf) => new Uint8Array(buf))
      .catch(() => null);
  }
  return notoSansCache;
}

export async function generateStatementPDF(
  data: PDFExportData,
  profile: ProfileSummary
): Promise<Blob> {
  const [{ default: StandalonePDFDocument }, fontBytes] = await Promise.all([
    import("pdfkit/js/pdfkit.standalone.js"),
    loadNotoSans(),
  ]);

  const doc = new StandalonePDFDocument({
    size: "A4",
    layout: "landscape",
    margin: 28,
    bufferPages: true,
    info: { Title: "HisaabKitaab Statement", Author: profile.name || "HisaabKitaab" },
  });

  if (fontBytes) {
    doc.registerFont("NotoSans", fontBytes);
    doc.font("NotoSans");
    buildStatementPDF(doc, data, profile, { fontFace: "NotoSans", rupeeSymbol: "\u20B9" });
  } else {
    buildStatementPDF(doc, data, profile, { fontFace: "Helvetica", rupeeSymbol: "Rs." });
  }

  const chunks: BlobPart[] = [];
  await new Promise<void>((resolve, reject) => {
    doc.on("data", (chunk: unknown) => chunks.push(chunk as BlobPart));
    doc.on("end", () => resolve());
    doc.on("error", reject);
    doc.end();
  });
  return new Blob(chunks, { type: "application/pdf" });
}

export async function downloadPDF(data: PDFExportData, profile: ProfileSummary): Promise<void> {
  const blob = await generateStatementPDF(data, profile);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `statement-${data.range.start}-to-${data.range.end}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadExcel(
  rows: StatementRow[],
  range: DateRange,
  totalCredit: number,
  totalDebit: number
) {
  const data: Record<string, string | number>[] = rows.map((r, i) => ({
    "#": i + 1,
    Date: r.date,
    Category: r.category,
    Notes: r.notes,
    "Payment Mode": r.paymentMode || "\u2014",
    Account: r.account,
    Credit: r.credit > 0 ? r.credit : "",
    Debit: r.debit > 0 ? r.debit : "",
    Remaining: r.remaining,
  }));

  data.push({
    "#": "",
    Date: "",
    Category: "",
    Notes: "",
    "Payment Mode": "TOTAL",
    Account: "",
    Credit: totalCredit,
    Debit: totalDebit,
    Remaining: "",
  });

  const ws = XLSX.utils.json_to_sheet(data);
  ws["!cols"] = [
    { wch: 5 },
    { wch: 12 },
    { wch: 18 },
    { wch: 30 },
    { wch: 18 },
    { wch: 18 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Statement");
  XLSX.writeFile(wb, `statement-${range.start}-to-${range.end}.xlsx`);
}
