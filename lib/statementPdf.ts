import type { DateRange } from "./periods";
import type { StatementRow } from "./exports";

export interface AccountSummary {
  name: string;
  openingBalance: number;
  currentBalance: number;
  accountNumber: string;
}

export interface ProfileSummary {
  name: string;
  address: string;
  email: string;
  contact: string;
}

export interface PDFExportData {
  rows: StatementRow[];
  range: DateRange;
  totalCredit: number;
  totalDebit: number;
  accounts: AccountSummary[];
  watermark?: string;
}

const C = {
  black: "#000000",
  gray800: "#1f2937",
  gray500: "#6b7280",
  gray300: "#d1d5db",
  gray100: "#f3f4f6",
  green: "#16a34a",
  red: "#dc2626",
};

const M = 28;
const FOOTER_ZONE = 18;

interface Col {
  label: string;
  w: number;
  align: "left" | "right" | "center";
}

const TXN_COLS: Col[] = [
  { label: "#", w: 20, align: "left" },
  { label: "Date", w: 58, align: "left" },
  { label: "Category", w: 65, align: "left" },
  { label: "Notes", w: 90, align: "left" },
  { label: "Payment Mode", w: 65, align: "left" },
  { label: "Account", w: 70, align: "left" },
  { label: "Credit", w: 60, align: "right" },
  { label: "Debit", w: 60, align: "right" },
  { label: "Remaining", w: 65, align: "right" },
];

const ACC_COLS: Col[] = [
  { label: "Account", w: 200, align: "left" },
  { label: "A/C (Last 6)", w: 80, align: "left" },
  { label: "Opening Balance", w: 90, align: "right" },
  { label: "Current Balance", w: 90, align: "right" },
];

function fmt(rupee: string, n: number): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(Math.round(n));
  return `${sign}${abs.toLocaleString("en-IN")} ${rupee}`;
}

function fit(doc: PDFKit.PDFDocument, text: string, maxW: number): string {
  if (text.length === 0 || doc.widthOfString(text) <= maxW) return text;
  let t = text;
  while (t.length > 1 && doc.widthOfString(t + "\u2026") > maxW) t = t.slice(0, -1);
  return t + "\u2026";
}

/**
 * Renders the statement into `doc`. Pure layout logic — no browser or Node
 * specific APIs — so it works with both the standalone (browser) and main
 * (Node) pdfkit builds.
 *
 * `opts.fontFace` must be a family already registered on `doc`
 * (e.g. "Noto"), falling back to Helvetica when no custom font is available.
 */
export function buildStatementPDF(
  doc: PDFKit.PDFDocument,
  data: PDFExportData,
  profile: ProfileSummary,
  opts: { fontFace: string; rupeeSymbol: string }
): void {
  const face = opts.fontFace;
  const rupee = opts.rupeeSymbol;

  let cur = M;
  const Y = () => cur;
  const setY = (v: number) => {
    cur = v;
    doc.y = v;
  };

  const tableW = (cols: Col[]) => cols.reduce((s, c) => s + c.w, 0);

  const availableW = doc.page.width - 2 * M;
  const scaleCols = (cols: Col[]) => {
    const total = cols.reduce((s, c) => s + c.w, 0);
    const scale = availableW / total;
    return cols.map(c => ({ ...c, w: c.w * scale }));
  };

  const txnCols = scaleCols(TXN_COLS);
  const accCols = scaleCols(ACC_COLS);

  const drawWatermark = () => {
    const { width, height } = doc.page;
    doc.save();
    doc.fillOpacity(0.12);
    doc.fillColor("#cccccc");
    doc.font(face).fontSize(64);
    doc.rotate(-40, { origin: [width / 2, height / 2] });
    doc.text((data.watermark ?? "").trim().toUpperCase(), M, height / 2 - 32, {
      width: width - 2 * M,
      align: "center",
      lineBreak: false,
    });
    doc.restore();
    doc.fillColor(C.black);
    doc.fillOpacity(1);
  };

  // Footers drawn last on every buffered page. NOTE: text must stay inside
  // the page's bottom margin or pdfkit will silently spawn extra pages.
  const drawFooters = () => {
    const name = profile.name || "User";
    const { start, count } = doc.bufferedPageRange();
    for (let i = start; i < start + count; i++) {
      doc.switchToPage(i);
      const fy = doc.page.height - M - FOOTER_ZONE + 7;
      const w = doc.page.width - 2 * M;
      doc.moveTo(M, fy - 4).lineTo(M + w, fy - 4).lineWidth(0.4).strokeColor(C.gray300).stroke();
      doc.font(face).fontSize(7).fillColor(C.gray500);
      doc.text(`HisaabKitaab  |  ${name}`, M, fy, { width: w * 0.4, lineBreak: false });
      doc.text(`Period: ${data.range.start} to ${data.range.end}`, M, fy, {
        width: w,
        align: "center",
        lineBreak: false,
      });
      doc.text(`Page ${i - start + 1} / ${count}`, M, fy, { width: w, align: "right", lineBreak: false });
    }
    doc.fillColor(C.black);
  };

  const newPage = () => {
    doc.addPage();
    if (data.watermark?.trim()) drawWatermark();
    setY(M);
  };

  const ensureSpace = (h: number) => {
    if (Y() + h > doc.page.height - M - FOOTER_ZONE) {
      newPage();
      return true;
    }
    return false;
  };

  const drawHeaderRow = (cols: Col[]) => {
    const hy = Y();
    doc.font(face).fontSize(8).fillColor(C.black);
    let cx = M;
    for (const c of cols) {
      doc.text(c.label, cx, hy + 4, { width: c.w, align: c.align, lineBreak: false });
      cx += c.w;
    }
    setY(hy + 14);
    doc.moveTo(M, hy + 15).lineTo(M + tableW(cols), hy + 15)
      .lineWidth(1).strokeColor(C.gray500).stroke();
    setY(hy + 18);
  };

  // ── Page 1 ─────────────────────────────────────────────────────────────
  if (data.watermark?.trim()) drawWatermark();

  doc.font(face).fontSize(16).fillColor(C.black);
  doc.text("Financial Statement", M, Y(), { width: doc.page.width - 2 * M, align: "center", lineBreak: false });
  setY(Y() + 24);

  doc.moveTo(M, Y()).lineTo(doc.page.width - M, Y()).lineWidth(0.8).strokeColor(C.black).stroke();
  setY(Y() + 12);

  // Profile information
  ensureSpace(120);
  doc.font(face).fontSize(10).fillColor(C.black);
  doc.text("Profile Information", M, Y(), { lineBreak: false });
  setY(Y() + 14);

  const kvRows: [string, string][] = [
    ["Name", profile.name || "\u2014"],
    ["Address", profile.address || "\u2014"],
    ["Email", profile.email || "\u2014"],
    ["Contact", profile.contact || "\u2014"],
    ["Period", `${data.range.start} to ${data.range.end}`],
    ["Generated", new Date().toLocaleDateString("en-IN")],
  ];
  for (const [k, v] of kvRows) {
    const ky = Y();
    doc.font(face).fontSize(8.5).fillColor(C.gray800);
    doc.text(k, M, ky, { width: 90, lineBreak: false });
    doc.text(v, M + 90, ky, { width: doc.page.width - 2 * M - 90, lineBreak: false });
    doc.moveTo(M, ky + 11).lineTo(doc.page.width - M, ky + 11)
      .lineWidth(0.3).strokeColor(C.gray300).stroke();
    setY(ky + 15);
  }
  setY(Y() + 8);

  // Accounts summary
  ensureSpace(80);
  doc.font(face).fontSize(10).fillColor(C.black);
  doc.text("Accounts Summary", M, Y(), { lineBreak: false });
  setY(Y() + 14);

  if (data.accounts.length === 0) {
    doc.font(face).fontSize(8).fillColor(C.gray500);
    doc.text("No accounts found.", M, Y(), { lineBreak: false });
    setY(Y() + 12);
  } else {
    drawHeaderRow(accCols);
    for (const a of data.accounts) {
      ensureSpace(16);
      const ry = Y();
      doc.font(face).fontSize(8).fillColor(C.gray800);
      doc.text(fit(doc, a.name, accCols[0].w - 8), M, ry + 3, { width: accCols[0].w, lineBreak: false });
      doc.text(a.accountNumber ? a.accountNumber.slice(-6) : "\u2014", M + accCols[0].w, ry + 3, {
        width: accCols[1].w, lineBreak: false,
      });
      doc.text(fmt(rupee, a.openingBalance), M + accCols[0].w + accCols[1].w, ry + 3, {
        width: accCols[2].w, align: "right", lineBreak: false,
      });
      doc.text(
        fmt(rupee, a.currentBalance),
        M + accCols[0].w + accCols[1].w + accCols[2].w,
        ry + 3,
        { width: accCols[3].w, align: "right", lineBreak: false },
      );
      setY(ry + 14);
      doc.moveTo(M, Y()).lineTo(doc.page.width - M, Y())
        .lineWidth(0.5).strokeColor(C.gray300).stroke();
    }

    const totalOpen = data.accounts.reduce((s, a) => s + a.openingBalance, 0);
    const totalCurr = data.accounts.reduce((s, a) => s + a.currentBalance, 0);
    const ty = Y() + 1;
    doc.rect(M, ty, tableW(accCols), 16).fill(C.gray100);
    doc.font(face).fontSize(8).fillColor(C.black);
    doc.text("Total", M, ty + 5, { width: accCols[0].w, lineBreak: false });
    doc.text(fmt(rupee, totalOpen), M + accCols[0].w + accCols[1].w, ty + 5, {
      width: accCols[2].w, align: "right", lineBreak: false,
    });
    doc.text(
      fmt(rupee, totalCurr),
      M + accCols[0].w + accCols[1].w + accCols[2].w,
      ty + 5,
      { width: accCols[3].w, align: "right", lineBreak: false },
    );
    setY(ty + 20);
  }

  // ── Transactions (auto-paginating) ─────────────────────────────────────
  newPage();

  doc.font(face).fontSize(10).fillColor(C.black);
  doc.text("Transactions Details", M, Y(), { lineBreak: false });
  setY(Y() + 13);

  doc.font(face).fontSize(8).fillColor(C.gray500);
  doc.text(
    `${data.rows.length} transactions  |  Total Credit: ${fmt(rupee, data.totalCredit)}  |  Total Debit: ${fmt(rupee, data.totalDebit)}`,
    M, Y(), { width: doc.page.width - 2 * M, lineBreak: false },
  );
  setY(Y() + 14);

  drawHeaderRow(txnCols);

  data.rows.forEach((r, i) => {
    if (ensureSpace(16)) drawHeaderRow(txnCols);

    const cell = (idx: number, text: string, color: string) => {
      const c = txnCols[idx];
      const cx = M + txnCols.slice(0, idx).reduce((s, cc) => s + cc.w, 0);
      doc.font(face).fontSize(8).fillColor(color);
      doc.text(fit(doc, text, c.w - 6), cx, Y() + 3, {
        width: c.w, align: c.align, lineBreak: false,
      });
    };

    cell(0, String(i + 1), C.gray800);
    cell(1, r.date, C.gray800);
    cell(2, r.category, C.gray800);
    cell(3, r.notes, C.gray800);
    cell(4, r.paymentMode || "\u2014", C.gray800);
    cell(5, r.account, C.gray800);
    cell(6, r.credit > 0 ? fmt(rupee, r.credit) : "", C.green);
    cell(7, r.debit > 0 ? fmt(rupee, r.debit) : "", C.red);
    cell(8, fmt(rupee, r.remaining), C.gray800);

    setY(Y() + 14);
    doc.moveTo(M, Y()).lineTo(M + tableW(txnCols), Y())
      .lineWidth(0.5).strokeColor(C.gray300).stroke();
  });

  ensureSpace(20);
  const tfY = Y() + 1;
  doc.rect(M, tfY, tableW(txnCols), 16).fill(C.gray100);
  const tf = (idx: number, text: string, color: string) => {
    const c = txnCols[idx];
    const cx = M + txnCols.slice(0, idx).reduce((s, cc) => s + cc.w, 0);
    doc.font(face).fontSize(8).fillColor(color);
    doc.text(text, cx, tfY + 5, { width: c.w, align: c.align, lineBreak: false });
  };
  tf(5, "TOTAL", C.black);
  tf(6, fmt(rupee, data.totalCredit), C.green);
  tf(7, fmt(rupee, data.totalDebit), C.red);
  setY(tfY + 20);

  // ── Footers on every page ──────────────────────────────────────────────
  drawFooters();
  doc.fillColor(C.black);
}
