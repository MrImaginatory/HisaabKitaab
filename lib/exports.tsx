import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  Font,
  pdf,
} from "@react-pdf/renderer";
import * as XLSX from "xlsx";
import { DateRange } from "./periods";
import { getProfile } from "./profile";
import { NOTO_SANS_URI } from "./fonts/noto-sans";

// ─── Register Noto Sans via inline data URI (no network fetch needed) ─────────
Font.register({
  family: "NotoSans",
  fonts: [{ src: NOTO_SANS_URI, fontWeight: "normal" }],
});

// ─── Interfaces ───────────────────────────────────────────────────────────────
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(n: number): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(Math.round(n));
  return `${sign}${abs.toLocaleString("en-IN")} \u20B9`;
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const C = {
  black: "#000000",
  gray800: "#1f2937",
  gray500: "#6b7280",
  gray300: "#d1d5db",
  gray100: "#f3f4f6",
  green: "#16a34a",
  red: "#dc2626",
  white: "#ffffff",
};

const S = StyleSheet.create({
  page: {
    fontFamily: "NotoSans",
    fontSize: 8,
    color: C.black,
    paddingTop: 28,
    paddingBottom: 28,
    paddingHorizontal: 28,
  },
  watermark: {
    position: "absolute",
    top: "35%",
    left: "10%",
    right: "10%",
    textAlign: "center",
    fontSize: 64,
    color: "#cccccc",
    opacity: 0.12,
    transform: "rotate(-40deg)",
  },
  title: { fontSize: 16, fontWeight: "bold", textAlign: "center", marginBottom: 6 },
  rule: { borderBottomWidth: 0.8, borderBottomColor: C.black, marginBottom: 12 },
  sectionHeading: { fontSize: 10, fontWeight: "bold", marginBottom: 6, marginTop: 10 },
  table: { width: "100%" },
  row: { flexDirection: "row" },
  cell: {
    paddingVertical: 4,
    paddingHorizontal: 5,
    fontSize: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: C.gray300,
    flexGrow: 1,
  },
  cellRight: { textAlign: "right" },
  cellGreen: { color: C.green, fontWeight: "bold" },
  cellRed: { color: C.red, fontWeight: "bold" },
  thead: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: C.gray500 },
  th: { paddingVertical: 5, paddingHorizontal: 5, fontSize: 8, fontWeight: "bold", flexGrow: 1 },
  tfoot: { flexDirection: "row", borderTopWidth: 1, borderTopColor: C.gray500, backgroundColor: C.gray100 },
  tf: { paddingVertical: 5, paddingHorizontal: 5, fontSize: 8, fontWeight: "bold", flexGrow: 1 },
  kvRow: { flexDirection: "row", borderBottomWidth: 0.3, borderBottomColor: C.gray300, paddingVertical: 4 },
  kvKey: { width: 90, fontWeight: "bold", fontSize: 8.5, color: C.gray800 },
  kvVal: { flex: 1, fontSize: 8.5, color: C.gray800 },
  footer: {
    position: "absolute",
    bottom: 14,
    left: 28,
    right: 28,
    borderTopWidth: 0.4,
    borderTopColor: C.gray300,
    paddingTop: 4,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: { fontSize: 7, color: C.gray500 },
  subtitle: { fontSize: 8, color: C.gray500, marginBottom: 8 },
});

// ─── Column widths (transactions table) ──────────────────────────────────────
const TXN_COLS = [
  { label: "#",            w: 20,  align: "left"  as const },
  { label: "Date",         w: 58,  align: "left"  as const },
  { label: "Category",     w: 65,  align: "left"  as const },
  { label: "Notes",        w: 90,  align: "left"  as const },
  { label: "Payment Mode", w: 65,  align: "left"  as const },
  { label: "Account",      w: 70,  align: "left"  as const },
  { label: "Credit",       w: 60,  align: "right" as const },
  { label: "Debit",        w: 60,  align: "right" as const },
  { label: "Remaining",    w: 65,  align: "right" as const },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function Watermark({ text }: { text?: string }) {
  if (!text?.trim()) return null;
  return <Text style={S.watermark}>{text.trim().toUpperCase()}</Text>;
}

function Footer({ profileName, range }: { profileName: string; range: DateRange }) {
  return (
    <View style={S.footer} fixed>
      <Text style={S.footerText}>HisaabKitaab  |  {profileName}</Text>
      <Text style={S.footerText}>Period: {range.start} to {range.end}</Text>
      <Text
        style={S.footerText}
        render={({ pageNumber, totalPages }: { pageNumber: number; totalPages: number }) =>
          `Page ${pageNumber} / ${totalPages}`
        }
      />
    </View>
  );
}

function ProfileTable({
  profile,
  range,
}: {
  profile: ReturnType<typeof getProfile>;
  range: DateRange;
}) {
  const rows: [string, string][] = [
    ["Name",      profile.name      || "\u2014"],
    ["Address",   profile.address   || "\u2014"],
    ["Email",     profile.email     || "\u2014"],
    ["Contact",   profile.contact   || "\u2014"],
    ["Period",    `${range.start} to ${range.end}`],
    ["Generated", new Date().toLocaleDateString("en-IN")],
  ];
  return (
    <View style={S.table}>
      {rows.map(([k, v]) => (
        <View key={k} style={S.kvRow}>
          <Text style={S.kvKey}>{k}</Text>
          <Text style={S.kvVal}>{v}</Text>
        </View>
      ))}
    </View>
  );
}

function AccountsTable({ accounts }: { accounts: AccountSummary[] }) {
  const totalOpen = accounts.reduce((s, a) => s + a.openingBalance, 0);
  const totalCurr = accounts.reduce((s, a) => s + a.currentBalance, 0);
  const W = [200, 80, 90, 90];
  return (
    <View style={S.table}>
      <View style={S.thead}>
        {["Account", "A/C (Last 6)", "Opening Balance", "Current Balance"].map((h, i) => (
          <Text key={h} style={[S.th, { width: W[i], flexGrow: 0, textAlign: i >= 2 ? "right" : "left" }]}>
            {h}
          </Text>
        ))}
      </View>
      {accounts.map((a) => (
        <View key={a.name} style={S.row}>
          <Text style={[S.cell, { width: W[0], flexGrow: 0 }]}>{a.name}</Text>
          <Text style={[S.cell, { width: W[1], flexGrow: 0 }]}>
            {a.accountNumber ? a.accountNumber.slice(-6) : "\u2014"}
          </Text>
          <Text style={[S.cell, S.cellRight, { width: W[2], flexGrow: 0 }]}>{fmt(a.openingBalance)}</Text>
          <Text style={[S.cell, S.cellRight, { width: W[3], flexGrow: 0 }]}>{fmt(a.currentBalance)}</Text>
        </View>
      ))}
      <View style={S.tfoot}>
        <Text style={[S.tf, { width: W[0], flexGrow: 0 }]}>Total</Text>
        <Text style={[S.tf, { width: W[1], flexGrow: 0 }]} />
        <Text style={[S.tf, S.cellRight, { width: W[2], flexGrow: 0 }]}>{fmt(totalOpen)}</Text>
        <Text style={[S.tf, S.cellRight, { width: W[3], flexGrow: 0 }]}>{fmt(totalCurr)}</Text>
      </View>
    </View>
  );
}

function TransactionsTable({
  rows,
  totalCredit,
  totalDebit,
}: {
  rows: StatementRow[];
  totalCredit: number;
  totalDebit: number;
}) {
  return (
    <View style={S.table}>
      <View style={S.thead}>
        {TXN_COLS.map((c) => (
          <Text key={c.label} style={[S.th, { width: c.w, flexGrow: 0, textAlign: c.align }]}>
            {c.label}
          </Text>
        ))}
      </View>
      {rows.map((r, i) => (
        <View key={i} style={S.row} wrap={false}>
          <Text style={[S.cell, { width: TXN_COLS[0].w, flexGrow: 0 }]}>{i + 1}</Text>
          <Text style={[S.cell, { width: TXN_COLS[1].w, flexGrow: 0 }]}>{r.date}</Text>
          <Text style={[S.cell, { width: TXN_COLS[2].w, flexGrow: 0 }]}>{r.category}</Text>
          <Text style={[S.cell, { width: TXN_COLS[3].w, flexGrow: 0 }]}>{r.notes}</Text>
          <Text style={[S.cell, { width: TXN_COLS[4].w, flexGrow: 0 }]}>{r.paymentMode || "\u2014"}</Text>
          <Text style={[S.cell, { width: TXN_COLS[5].w, flexGrow: 0 }]}>{r.account}</Text>
          <Text style={[S.cell, S.cellGreen, { width: TXN_COLS[6].w, flexGrow: 0, textAlign: "right" }]}>
            {r.credit > 0 ? fmt(r.credit) : ""}
          </Text>
          <Text style={[S.cell, S.cellRed, { width: TXN_COLS[7].w, flexGrow: 0, textAlign: "right" }]}>
            {r.debit > 0 ? fmt(r.debit) : ""}
          </Text>
          <Text style={[S.cell, S.cellRight, { width: TXN_COLS[8].w, flexGrow: 0 }]}>
            {fmt(r.remaining)}
          </Text>
        </View>
      ))}
      <View style={S.tfoot}>
        {TXN_COLS.map((c, i) => {
          const val =
            i === 5 ? "TOTAL" :
            i === 6 ? fmt(totalCredit) :
            i === 7 ? fmt(totalDebit) :
            "";
          return (
            <Text
              key={i}
              style={[
                S.tf,
                { width: c.w, flexGrow: 0, textAlign: c.align },
                i === 6 ? { color: C.green } : {},
                i === 7 ? { color: C.red } : {},
              ]}
            >
              {val}
            </Text>
          );
        })}
      </View>
    </View>
  );
}

// ─── Main Document ────────────────────────────────────────────────────────────
function StatementDocument({ data }: { data: PDFExportData }) {
  const { rows, range, totalCredit, totalDebit, accounts, watermark } = data;
  const profile = getProfile();
  return (
    <Document
      title="HisaabKitaab Statement"
      author={profile.name || "HisaabKitaab"}
      creator="HisaabKitaab"
    >
      {/* Page 1: Profile + Accounts */}
      <Page size="A4" orientation="landscape" style={S.page}>
        <Watermark text={watermark} />
        <Text style={S.title}>Financial Statement</Text>
        <View style={S.rule} />
        <Text style={S.sectionHeading}>Profile Information</Text>
        <ProfileTable profile={profile} range={range} />
        <Text style={S.sectionHeading}>Accounts Summary</Text>
        {accounts.length > 0 ? (
          <AccountsTable accounts={accounts} />
        ) : (
          <Text style={S.subtitle}>No accounts found.</Text>
        )}
        <Footer profileName={profile.name || "User"} range={range} />
      </Page>

      {/* Page 2+: Transactions (auto-paginating) */}
      <Page size="A4" orientation="landscape" style={S.page}>
        <Watermark text={watermark} />
        <Text style={[S.sectionHeading, { marginTop: 0 }]}>Transactions Details</Text>
        <Text style={S.subtitle}>
          {rows.length} transactions  |  Total Credit: {fmt(totalCredit)}  |  Total Debit: {fmt(totalDebit)}
        </Text>
        <TransactionsTable rows={rows} totalCredit={totalCredit} totalDebit={totalDebit} />
        <Footer profileName={profile.name || "User"} range={range} />
      </Page>
    </Document>
  );
}

// ─── Export functions ─────────────────────────────────────────────────────────

export async function downloadPDF(data: PDFExportData) {
  const blob = await pdf(<StatementDocument data={data} />).toBlob();
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
  const data = rows.map((r, i) => ({
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
    "#": "" as any,
    Date: "",
    Category: "",
    Notes: "",
    "Payment Mode": "TOTAL",
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
    { wch: 18 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Statement");
  XLSX.writeFile(wb, `statement-${range.start}-to-${range.end}.xlsx`);
}
