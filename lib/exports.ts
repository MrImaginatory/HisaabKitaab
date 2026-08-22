import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { DateRange } from "./periods";
import { getProfile } from "./profile";

export interface StatementRow {
  date: string;
  category: string;
  notes: string;
  account: string;
  credit: number;
  debit: number;
  remaining: number;
}

export interface AccountSummary {
  name: string;
  openingBalance: number;
  currentBalance: number;
  accountNumber: string;
}

export interface CategorySpend {
  label: string;
  value: number;
  color: string;
}

export interface DailySpend {
  date: string;
  value: number;
}

export interface PDFExportData {
  rows: StatementRow[];
  range: DateRange;
  totalCredit: number;
  totalDebit: number;
  accounts: AccountSummary[];
  categorySpend: CategorySpend[];
  dailySpend: DailySpend[];
  totalSpent: number;
  watermark?: string;
}

function formatINR(n: number): string {
  return `\u20B9${Math.round(n).toLocaleString("en-IN")}`;
}

// Vibrant color palette for chart segments
const CHART_COLORS: [number, number, number][] = [
  [99, 102, 241],   // indigo
  [236, 72, 153],   // pink
  [251, 146, 60],   // orange
  [34, 197, 94],    // green
  [6, 182, 212],    // cyan
  [168, 85, 247],   // purple
  [250, 204, 21],   // yellow
  [239, 68, 68],    // red
  [20, 184, 166],   // teal
  [245, 158, 11],   // amber
];

function drawDonut(doc: jsPDF, cx: number, cy: number, r: number, data: { label: string; value: number }[], total: number, legendStartY: number) {
  if (total <= 0 || data.length === 0) return;
  const innerR = r * 0.55;
  let startAngle = -Math.PI / 2;

  for (let i = 0; i < data.length; i++) {
    const frac = data[i].value / total;
    const endAngle = startAngle + frac * 2 * Math.PI;
    const [cr, cg, cb] = CHART_COLORS[i % CHART_COLORS.length];

    const steps = 60;
    const thetaStep = (endAngle - startAngle) / steps;

    const points: [number, number][] = [];
    for (let s = 0; s <= steps; s++) {
      const theta = startAngle + s * thetaStep;
      points.push([cx + r * Math.cos(theta), cy + r * Math.sin(theta)]);
    }
    for (let s = steps; s >= 0; s--) {
      const theta = startAngle + s * thetaStep;
      points.push([cx + innerR * Math.cos(theta), cy + innerR * Math.sin(theta)]);
    }

    doc.setFillColor(cr, cg, cb);
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.5);
    doc.lines(
      points.slice(1).map((p, idx) => [p[0] - points[idx][0], p[1] - points[idx][1]]),
      points[0][0],
      points[0][1],
      [1, 1],
      "FD"
    );

    startAngle = endAngle;
  }

  // Center label
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7);
  doc.setTextColor(120, 120, 120);
  doc.text("SPENT", cx, cy - 2, { align: "center" });
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(formatINR(total), cx, cy + 5, { align: "center" });

  // Legend BELOW the chart
  const legendBoxSize = 3;
  const colWidth = 55;
  const itemsPerRow = 2;
  let lx = cx - colWidth;
  let ly = legendStartY;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);

  for (let i = 0; i < data.length && i < 10; i++) {
    const col = i % itemsPerRow;
    const row = Math.floor(i / itemsPerRow);
    const itemX = lx + col * colWidth;
    const itemY = ly + row * 6;

    const [cr, cg, cb] = CHART_COLORS[i % CHART_COLORS.length];
    doc.setFillColor(cr, cg, cb);
    doc.rect(itemX, itemY - legendBoxSize + 0.5, legendBoxSize, legendBoxSize, "F");

    doc.setTextColor(40, 40, 40);
    const pct = ((data[i].value / total) * 100).toFixed(1);
    doc.text(`${data[i].label} — ${formatINR(data[i].value)} (${pct}%)`, itemX + legendBoxSize + 2, itemY);
  }
}

function drawLineChart(doc: jsPDF, x: number, y: number, w: number, h: number, data: DailySpend[]) {
  if (data.length === 0) return;

  const maxVal = Math.max(...data.map(d => d.value), 0);
  if (maxVal === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text("No spending in this period", x + w / 2, y + h / 2, { align: "center" });
    return;
  }

  const padL = 6;
  const padR = 6;
  const padT = 6;
  const padB = 8;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;

  // Background
  doc.setFillColor(250, 250, 255);
  doc.setDrawColor(220, 220, 230);
  doc.setLineWidth(0.3);
  doc.rect(x, y, w, h, "FD");

  // Horizontal grid lines
  doc.setDrawColor(225, 225, 235);
  doc.setLineWidth(0.2);
  const gridSteps = 4;
  for (let i = 0; i <= gridSteps; i++) {
    const gy = y + padT + (innerH / gridSteps) * i;
    doc.line(x + padL, gy, x + w - padR, gy);
  }

  // Points
  const points: [number, number][] = data.map((d, i) => [
    x + padL + (data.length <= 1 ? innerW / 2 : (i * innerW) / (data.length - 1)),
    y + padT + innerH - (d.value / maxVal) * innerH,
  ]);

  // Fill area under line
  if (points.length > 1) {
    const areaPoints: [number, number][] = [
      [points[0][0], y + padT + innerH],
      ...points,
      [points[points.length - 1][0], y + padT + innerH],
    ];
    doc.setFillColor(99, 102, 241, 0.15);
    doc.lines(
      areaPoints.slice(1).map((p, idx) => [p[0] - areaPoints[idx][0], p[1] - areaPoints[idx][1]]),
      areaPoints[0][0],
      areaPoints[0][1],
      [1, 1],
      "F"
    );
  }

  // Draw line (indigo/blue)
  doc.setDrawColor(99, 102, 241);
  doc.setLineWidth(0.8);
  for (let i = 1; i < points.length; i++) {
    doc.line(points[i - 1][0], points[i - 1][1], points[i][0], points[i][1]);
  }

  // Draw dots
  for (let i = 0; i < points.length; i++) {
    if (data[i].value > 0) {
      const [px, py] = points[i];
      doc.setFillColor(255, 255, 255);
      doc.circle(px, py, 1.2, "F");
      doc.setFillColor(99, 102, 241);
      doc.circle(px, py, 0.8, "F");
    }
  }

  // X-axis labels
  doc.setFont("helvetica", "normal");
  doc.setFontSize(5);
  doc.setTextColor(100, 100, 100);
  const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const labelCount = Math.min(6, data.length);
  for (let i = 0; i < labelCount; i++) {
    const idx = Math.round((i * (data.length - 1)) / Math.max(labelCount - 1, 1));
    if (idx < data.length) {
      const [, m, d] = data[idx].date.split("-").map(Number);
      doc.text(`${d} ${SHORT_MONTHS[(m || 1) - 1]}`, points[idx][0], y + h - 1, { align: "center" });
    }
  }
}

export function downloadPDF(data: PDFExportData) {
  const { rows, range, totalCredit, totalDebit, accounts, categorySpend, dailySpend, totalSpent, watermark } = data;
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  const addWatermark = () => {
    if (!watermark || !watermark.trim()) return;
    const pages = doc.getNumberOfPages();
    const text = watermark.trim();
    for (let i = 1; i <= pages; i++) {
      doc.setPage(i);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(50);
      doc.setTextColor(0, 0, 0);
      doc.setGState(new (doc as any).GState({ opacity: 0.08 }));
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      // Measure text width to offset and truly center after rotation
      const tw = doc.getTextWidth(text);
      const th = 50 * 0.35; // approx cap-height
      const cx = pageW / 2;
      const cy = pageH / 2;
      const rad = (45 * Math.PI) / 180;
      // Offset so the visual bounding box center lands on (cx, cy)
      const ox = (tw / 2) * Math.cos(rad) - (th / 2) * Math.sin(rad);
      const oy = (tw / 2) * Math.sin(rad) + (th / 2) * Math.cos(rad);
      doc.text(text, cx - ox, cy + oy, {
        align: "center",
        angle: 45,
      });
      doc.setGState(new (doc as any).GState({ opacity: 1 }));
    }
  };

  // === Page 1: Profile → Charts → Accounts ===
  const profile = getProfile();
  let y = 14;

  // --- Profile Section ---
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("Profile", 14, y);
  y += 7;

  const profileLines: string[] = [];
  if (profile.name) profileLines.push(`Name: ${profile.name}`);
  if (profile.address) profileLines.push(`Address: ${profile.address}`);
  if (profile.email) profileLines.push(`Email: ${profile.email}`);
  if (profile.contact) profileLines.push(`Contact: ${profile.contact}`);
  profileLines.push(`Period: ${range.start} to ${range.end}`);
  profileLines.push(`Generated: ${new Date().toLocaleDateString("en-IN")}`);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  for (const line of profileLines) {
    doc.text(line, 14, y);
    y += 5;
  }
  y += 4;

  // --- Charts Section: Donut (left) + Line (right) ---
  const pageW = 297;
  const marginL = 14;
  const marginR = 14;
  const availW = pageW - marginL - marginR;
  const halfW = availW / 2 - 4;
  const donutChartH = 60;
  const chartY = y;

  if (categorySpend.length > 0 && totalSpent > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text("Spend by Category", marginL, chartY);
    const donutCX = marginL + halfW / 2;
    const donutCY = chartY + 5 + donutChartH / 2;
    const legendStartY = chartY + 5 + donutChartH + 6;
    drawDonut(doc, donutCX, donutCY, 26, categorySpend, totalSpent, legendStartY);
  }

  if (dailySpend.some(d => d.value > 0)) {
    const lineX = marginL + halfW + 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text("Daily Spend", lineX, chartY);
    drawLineChart(doc, lineX, chartY + 5, halfW, donutChartH + 10, dailySpend);
  }

  // Estimate charts bottom
  const maxLegendRows = Math.ceil(Math.min(categorySpend.length, 10) / 2);
  const legendH = maxLegendRows * 6 + 4;
  const chartsBottom = chartY + 5 + Math.max(donutChartH + legendH, donutChartH + 10);

  // --- Accounts Section ---
  let accY = chartsBottom + 8;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("Accounts", 14, accY);
  accY += 4;

  if (accounts.length > 0) {
    autoTable(doc, {
      startY: accY,
      head: [["Account", "A/C No. (Last 6)", "Opening Balance", "Current Balance"]],
      body: accounts.map(a => {
        const last6 = a.accountNumber ? a.accountNumber.slice(-6) : "—";
        return [
          a.name,
          last6,
          formatINR(a.openingBalance),
          formatINR(a.currentBalance),
        ];
      }),
      foot: [["Total", "", formatINR(accounts.reduce((s, a) => s + a.openingBalance, 0)), formatINR(accounts.reduce((s, a) => s + a.currentBalance, 0))]],
      styles: { fontSize: 8, cellPadding: 2.5, textColor: [0, 0, 0] },
      headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: "bold", lineColor: [180, 180, 180] },
      footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: "bold", lineColor: [180, 180, 180] },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      columnStyles: { 2: { halign: "right" }, 3: { halign: "right" } },
    });
  } else {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.text("No accounts found.", 14, accY);
  }

  // === Page 2+: Transactions ===
  doc.addPage();
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("Transactions", 14, 18);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(`${rows.length} transactions  |  Credit: ${formatINR(totalCredit)}  |  Debit: ${formatINR(totalDebit)}`, 14, 25);
  doc.setTextColor(0, 0, 0);

  autoTable(doc, {
    startY: 30,
    head: [["#", "Date", "Category", "Notes", "Account", "Credit", "Debit", "Remaining"]],
    body: rows.map((r, i) => [
      String(i + 1),
      r.date,
      r.category,
      r.notes,
      r.account,
      r.credit > 0 ? formatINR(r.credit) : "",
      r.debit > 0 ? formatINR(r.debit) : "",
      formatINR(r.remaining),
    ]),
    foot: [["", "", "", "", "TOTAL", formatINR(totalCredit), formatINR(totalDebit), ""]],
    // Simple table: plain white rows, minimal borders
    styles: {
      fontSize: 7.5,
      cellPadding: 2.5,
      textColor: [0, 0, 0],
      fillColor: [255, 255, 255],
      lineColor: [210, 210, 210],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [60, 60, 60],
      fontStyle: "bold",
      lineColor: [160, 160, 160],
      lineWidth: 0.3,
    },
    footStyles: {
      fillColor: [245, 245, 245],
      textColor: [0, 0, 0],
      fontStyle: "bold",
      lineColor: [160, 160, 160],
      lineWidth: 0.3,
    },
    alternateRowStyles: { fillColor: [255, 255, 255] }, // no alternate shading
    columnStyles: {
      0: { cellWidth: 10 },
      5: { halign: "right" },
      6: { halign: "right" },
      7: { halign: "right" },
    },
    didParseCell: (cellData) => {
      if (cellData.section === "body") {
        if (cellData.column.index === 5 && cellData.cell.raw) {
          cellData.cell.styles.textColor = [22, 163, 74];   // green
          cellData.cell.styles.fontStyle = "bold";
        }
        if (cellData.column.index === 6 && cellData.cell.raw) {
          cellData.cell.styles.textColor = [220, 38, 38];   // red
          cellData.cell.styles.fontStyle = "bold";
        }
      }
    },
  });

  addWatermark();
  doc.save(`statement-${range.start}-to-${range.end}.pdf`);
}

export function downloadExcel(rows: StatementRow[], range: DateRange, totalCredit: number, totalDebit: number) {
  const data = rows.map((r, i) => ({
    "#": i + 1,
    Date: r.date,
    Category: r.category,
    Notes: r.notes,
    Account: r.account,
    Credit: r.credit > 0 ? r.credit : "",
    Debit: r.debit > 0 ? r.debit : "",
    Remaining: r.remaining,
  }));

  data.push({
    "#": "" as any,
    Date: "",
    Category: "",
    Notes: "TOTAL",
    Account: "",
    Credit: totalCredit,
    Debit: totalDebit,
    Remaining: "" as any,
  });

  const ws = XLSX.utils.json_to_sheet(data);
  ws["!cols"] = [
    { wch: 5 },
    { wch: 12 },
    { wch: 18 },
    { wch: 30 },
    { wch: 18 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Statement");
  XLSX.writeFile(wb, `statement-${range.start}-to-${range.end}.xlsx`);
}
