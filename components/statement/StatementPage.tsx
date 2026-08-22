"use client";
import { useEffect, useMemo, useState } from "react";
import { FileDown, ChevronLeft, ChevronRight, FileSpreadsheet, FileText, CalendarRange } from "lucide-react";
import { dbGetTransactions, dbGetAccounts, dbGetCategories, dbGetPaymentMediums, Transaction, ComputedAccount, Category, PaymentMedium } from "@/lib/db";
import { displayName } from "@/lib/stringUtils";
import { Select } from "@/components/ui/Select";
import { DatePicker } from "@/components/ui/DatePicker";
import { PeriodPreset, PERIOD_OPTIONS, getRange, eachDay } from "@/lib/periods";
import { StatementRow, AccountSummary, CategorySpend, DailySpend, downloadPDF, downloadExcel } from "@/lib/exports";
import { getProfile } from "@/lib/profile";

const PAGE_SIZE = 25;

export function StatementPage() {
  const [loading, setLoading] = useState(true);
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<ComputedAccount[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [paymentMediums, setPaymentMediums] = useState<PaymentMedium[]>([]);
  const [page, setPage] = useState(0);
  const [selectedAccount, setSelectedAccount] = useState("all");

  const [period, setPeriod] = useState<PeriodPreset>("thisMonth");
  const todayIso = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  const monthStartIso = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  };
  const [customFrom, setCustomFrom] = useState<string>(() => monthStartIso());
  const [customTo, setCustomTo] = useState<string>(() => todayIso());

  const range = useMemo(
    () => getRange(period, { start: customFrom, end: customTo }),
    [period, customFrom, customTo]
  );

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [txnsData, accsData, catsData, medsData] = await Promise.all([
        dbGetTransactions(),
        dbGetAccounts(),
        dbGetCategories(),
        dbGetPaymentMediums(),
      ]);
      setTxns(txnsData);
      setAccounts(accsData);
      setCategories(catsData);
      setPaymentMediums(medsData);
      setLoading(false);
    })();
  }, []);

  // Reset page when filters change
  useEffect(() => { setPage(0); }, [period, customFrom, customTo, selectedAccount]);

  const categoryMap = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);
  const accountMap = useMemo(() => new Map(accounts.map(a => [a.id, a])), [accounts]);
  const paymentMediumMap = useMemo(() => new Map(paymentMediums.map(m => [m.id, m])), [paymentMediums]);

  // Earliest transaction date for min-date constraint
  const minDate = useMemo(() => {
    if (txns.length === 0) return undefined;
    return txns.reduce((min, t) => t.date < min ? t.date : min, txns[0].date);
  }, [txns]);

  // Account filter options
  const accountOptions = useMemo(() => [
    { value: "all", label: "All Accounts" },
    ...accounts.map(a => ({ value: a.id, label: displayName(a.name) })),
  ], [accounts]);

  // Compute rows with running balance per account
  const rows: StatementRow[] = useMemo(() => {
    const filtered = txns
      .filter(t => {
        if (t.date < range.start || t.date > range.end) return false;
        if (selectedAccount !== "all" && t.accountId !== selectedAccount) return false;
        return true;
      })
      .sort((a, b) => a.date.localeCompare(b.date) || a.createdAt - b.createdAt);

    // Compute opening balance per account at period start
    const openingBalances = new Map<string, number>();
    for (const a of accounts) {
      let bal = a.openingBalance;
      for (const t of txns) {
        if (t.accountId === a.id && t.date < range.start) {
          bal += t.type === "income" ? t.amount : -t.amount;
        }
      }
      openingBalances.set(a.id, bal);
    }

    // Track running balances per account
    const running = new Map<string, number>();
    for (const a of accounts) {
      running.set(a.id, openingBalances.get(a.id) ?? a.openingBalance);
    }

    return filtered.map(t => {
      const prev = running.get(t.accountId) ?? 0;
      const after = prev + (t.type === "income" ? t.amount : -t.amount);
      running.set(t.accountId, after);

      const cat = categoryMap.get(t.categoryId);
      const acc = accountMap.get(t.accountId);
      const med = paymentMediumMap.get(t.paymentMediumId);

      return {
        date: t.date,
        category: displayName(cat?.name ?? "Unknown"),
        notes: t.reason,
        paymentMode: med ? `${med.group === "online" ? "Online" : "Offline"} · ${displayName(med.name)}` : "",
        account: displayName(acc?.name ?? "Unknown"),
        credit: t.type === "income" ? t.amount : 0,
        debit: t.type === "expense" ? t.amount : 0,
        remaining: after,
      };
    });
  }, [txns, accounts, range, categoryMap, accountMap, paymentMediumMap, selectedAccount]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageRows = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const totalCredit = rows.reduce((s, r) => s + r.credit, 0);
  const totalDebit = rows.reduce((s, r) => s + r.debit, 0);
  const symbol = getProfile().currencySymbol || "\u20B9";

  // Accounts summary for PDF
  const accountsSummary: AccountSummary[] = useMemo(() => {
    if (selectedAccount === "all") {
      return accounts.map(a => ({ name: displayName(a.name), openingBalance: a.openingBalance, currentBalance: a.currentBalance, accountNumber: a.accountNumber ?? "" }));
    }
    const a = accounts.find(acc => acc.id === selectedAccount);
    return a ? [{ name: displayName(a.name), openingBalance: a.openingBalance, currentBalance: a.currentBalance, accountNumber: a.accountNumber ?? "" }] : [];
  }, [accounts, selectedAccount]);

  // Category spend for PDF donut
  const categorySpend: CategorySpend[] = useMemo(() => {
    const sums = new Map<string, number>();
    const expenseRows = rows.filter(r => r.debit > 0);
    // We need original category data — re-derive from txns
    const filteredTxns = txns.filter(t => {
      if (t.type !== "expense") return false;
      if (t.date < range.start || t.date > range.end) return false;
      if (selectedAccount !== "all" && t.accountId !== selectedAccount) return false;
      return true;
    });
    filteredTxns.forEach(t => {
      const cat = categoryMap.get(t.categoryId);
      const label = displayName(cat?.name ?? "Unknown");
      sums.set(label, (sums.get(label) ?? 0) + t.amount);
    });
    const sorted = [...sums.entries()].sort((a, b) => b[1] - a[1]);
    const PALETTE = ["#fcd535", "#0ecb81", "#f6465d", "#3b82f6", "#8b5cf6", "#ec4899", "#f97316", "#14b8a6", "#a3e635", "#06b6d4", "#e879f9", "#facc15"];
    return sorted.map(([label, value], i) => ({ label, value, color: PALETTE[i % PALETTE.length] }));
  }, [txns, range, selectedAccount, categoryMap]);

  // Daily spend for PDF line chart
  const dailySpend: DailySpend[] = useMemo(() => {
    const daySums = new Map<string, number>();
    const filteredTxns = txns.filter(t => {
      if (t.type !== "expense") return false;
      if (t.date < range.start || t.date > range.end) return false;
      if (selectedAccount !== "all" && t.accountId !== selectedAccount) return false;
      return true;
    });
    filteredTxns.forEach(t => {
      daySums.set(t.date, (daySums.get(t.date) ?? 0) + t.amount);
    });
    return eachDay(range.start, range.end).map(date => ({ date, value: daySums.get(date) ?? 0 }));
  }, [txns, range, selectedAccount]);

  const totalSpent = categorySpend.reduce((s, c) => s + c.value, 0);

  const handlePDF = async (useWatermark: boolean) => downloadPDF({
    rows, range, totalCredit, totalDebit,
    accounts: accountsSummary,
    categorySpend, dailySpend, totalSpent,
    watermark: useWatermark ? getProfile().watermark : undefined,
  });
  const handleExcel = () => downloadExcel(rows, range, totalCredit, totalDebit);

  return (
    <div className="h-full min-h-0 flex flex-col w-full xl:max-w-[80%] max-w-[1000px] mx-auto px-6 py-6 overflow-y-auto">
      {/* Header */}
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-bold tracking-tight text-white">Statement</h1>
          <p className="text-[12px] leading-relaxed text-[var(--color-muted-strong)] mt-1 max-w-[60ch]">
            View transactions with running balances, and export to PDF or Excel.
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="mt-6 shrink-0 rounded-[12px] bg-[var(--color-surface-card-dark)] border border-[var(--color-hairline-on-dark)] p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Period */}
          <div className="w-[170px]">
            <Select
              value={period}
              onChange={(v) => setPeriod(v as PeriodPreset)}
              options={PERIOD_OPTIONS}
              ariaLabel="Statement period"
            />
          </div>

          {/* Account filter */}
          <div className="w-[180px]">
            <Select
              value={selectedAccount}
              onChange={setSelectedAccount}
              options={accountOptions}
              ariaLabel="Filter by account"
            />
          </div>

          {/* Custom range */}
          {period === "custom" && (
            <>
              <div className="w-[150px]">
                <DatePicker label="" value={customFrom} onChange={setCustomFrom} placeholder="From" min={minDate} />
              </div>
              <span className="text-[11px] font-bold text-[var(--color-muted)]">→</span>
              <div className="w-[150px]">
                <DatePicker label="" value={customTo} onChange={setCustomTo} placeholder="To" min={minDate} />
              </div>
            </>
          )}

          <span className="ml-auto" />

          {/* Export buttons */}
          <button
            onClick={() => handlePDF(false)}
            disabled={rows.length === 0}
            className="h-8 px-3 rounded-[6px] bg-[var(--color-surface-elevated-dark)] border border-[var(--color-hairline-on-dark)] text-[11px] font-bold text-[var(--color-muted-strong)] hover:text-white hover:border-[var(--color-primary)]/30 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <FileText size={13} /> PDF
          </button>
          <button
            onClick={() => handlePDF(true)}
            disabled={rows.length === 0 || !getProfile().watermark}
            title={!getProfile().watermark ? "Set watermark text in Profile first" : "Download PDF with watermark"}
            className="h-8 px-3 rounded-[6px] bg-[var(--color-surface-elevated-dark)] border border-[var(--color-hairline-on-dark)] text-[11px] font-bold text-[var(--color-muted-strong)] hover:text-white hover:border-[var(--color-primary)]/30 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <FileText size={13} /> PDF + Watermark
          </button>
          <button
            onClick={handleExcel}
            disabled={rows.length === 0}
            className="h-8 px-3 rounded-[6px] bg-[var(--color-surface-elevated-dark)] border border-[var(--color-hairline-on-dark)] text-[11px] font-bold text-[var(--color-muted-strong)] hover:text-white hover:border-[var(--color-primary)]/30 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            <FileSpreadsheet size={13} /> Excel
          </button>
        </div>

        {/* Range + count info */}
        <div className="mt-3 flex items-center gap-2 text-[11px] text-[var(--color-muted)]">
          <CalendarRange size={12} />
          Showing <span className="font-num text-white">{range.start}</span> → <span className="font-num text-white">{range.end}</span>
          <span className="ml-auto">{rows.length} transaction{rows.length === 1 ? "" : "s"}</span>
        </div>
      </div>

      {/* Table */}
      <div className="mt-4 flex-1 min-h-0 flex flex-col rounded-[12px] bg-[var(--color-surface-card-dark)] border border-[var(--color-hairline-on-dark)] overflow-hidden">
        {loading ? (
          <div className="flex-1 flex items-center justify-center text-[11px] text-[var(--color-muted)]">Loading SQLite…</div>
        ) : rows.length === 0 ? (
          <div className="flex-1 flex items-center justify-center text-[12px] text-[var(--color-muted)]">No transactions found for this period.</div>
        ) : (
          <>
            <div className="flex-1 min-h-0 overflow-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead className="sticky top-0 bg-[var(--color-surface-elevated-dark)] border-b border-[var(--color-hairline-on-dark)] text-[11px] font-bold tracking-wide text-[var(--color-muted)] uppercase z-10">
                  <tr>
                    <th className="px-4 py-3 w-[40px]">#</th>
                    <th className="px-4 py-3 w-[100px]">Date</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Notes</th>
                    <th className="px-4 py-3">Payment</th>
                    <th className="px-4 py-3">Account</th>
                    <th className="px-4 py-3 text-right">Credit</th>
                    <th className="px-4 py-3 text-right">Debit</th>
                    <th className="px-4 py-3 text-right">Remaining</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-hairline-on-dark)]">
                  {pageRows.map((r, i) => {
                    const idx = page * PAGE_SIZE + i;
                    return (
                      <tr key={idx} className="transition hover:bg-[var(--color-surface-elevated-dark)]/30">
                        <td className="px-4 py-3 text-[11px] text-[var(--color-muted)] font-num">{idx + 1}</td>
                        <td className="px-4 py-3 text-[12px] font-num text-white">{r.date}</td>
                        <td className="px-4 py-3 text-[12px] text-[var(--color-muted-strong)]">{r.category}</td>
                        <td className="px-4 py-3 text-[12px] text-[var(--color-muted-strong)] truncate max-w-[200px]" title={r.notes}>{r.notes}</td>
                        <td className="px-4 py-3 text-[11px] text-[var(--color-muted-strong)]">{r.paymentMode || "—"}</td>
                        <td className="px-4 py-3 text-[12px] text-[var(--color-muted-strong)]">{r.account}</td>
                        <td className="px-4 py-3 text-[12px] font-num text-right font-semibold text-[var(--color-trading-up)]">
                          {r.credit > 0 ? `${symbol}${r.credit.toLocaleString("en-IN")}` : "—"}
                        </td>
                        <td className="px-4 py-3 text-[12px] font-num text-right font-semibold text-[var(--color-trading-down)]">
                          {r.debit > 0 ? `${symbol}${r.debit.toLocaleString("en-IN")}` : "—"}
                        </td>
                        <td className="px-4 py-3 text-[12px] font-num text-right font-bold text-white">
                          {symbol}{r.remaining.toLocaleString("en-IN")}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-[var(--color-surface-elevated-dark)] border-t border-[var(--color-hairline-on-dark)]">
                  <tr>
                    <td colSpan={6} className="px-4 py-3 text-[11px] font-bold text-[var(--color-muted)] uppercase">Total</td>
                    <td className="px-4 py-3 text-[12px] font-num text-right font-bold text-[var(--color-trading-up)]">
                      {symbol}{totalCredit.toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3 text-[12px] font-num text-right font-bold text-[var(--color-trading-down)]">
                      {symbol}{totalDebit.toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3" />
                  </tr>
                </tfoot>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="shrink-0 px-4 py-2.5 border-t border-[var(--color-hairline-on-dark)] flex items-center gap-3 text-[11px] text-[var(--color-muted)]">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="h-7 px-2 rounded-[6px] bg-[var(--color-surface-elevated-dark)] border border-[var(--color-hairline-on-dark)] text-[var(--color-muted-strong)] hover:text-white hover:border-[var(--color-primary)]/30 transition disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  <ChevronLeft size={12} /> Prev
                </button>
                <span className="font-num text-white">
                  {page + 1} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="h-7 px-2 rounded-[6px] bg-[var(--color-surface-elevated-dark)] border border-[var(--color-hairline-on-dark)] text-[var(--color-muted-strong)] hover:text-white hover:border-[var(--color-primary)]/30 transition disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  Next <ChevronRight size={12} />
                </button>
                <span className="ml-auto">{rows.length} rows total</span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
