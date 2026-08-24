"use client";
import { useEffect, useMemo, useState } from "react";
import { FileSpreadsheet, FileText, ChevronLeft, ChevronRight, CalendarRange } from "lucide-react";
import { dbGetTransactions, dbGetAccounts, dbGetCategories, dbGetPaymentMediums, Transaction, ComputedAccount, Category, PaymentMedium } from "@/lib/db";
import { displayName } from "@/lib/stringUtils";
import { Select } from "@/components/ui/Select";
import { DatePicker } from "@/components/ui/DatePicker";
import { PeriodPreset, PERIOD_OPTIONS, getRange } from "@/lib/periods";
import { StatementRow, AccountSummary, downloadExcel, downloadPDF } from "@/lib/exports";
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

  const handleExcel = () => downloadExcel(rows, range, totalCredit, totalDebit);
  const handlePDF = async (useWatermark: boolean) => downloadPDF(
    { rows, range, totalCredit, totalDebit, accounts: accountsSummary, watermark: useWatermark ? getProfile().watermark : undefined },
    getProfile()
  );

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
      <div className="mt-6 shrink-0 rounded-[12px] bg-[var(--color-surface-card-dark)] border border-[var(--color-hairline-on-dark)] p-4 flex flex-col gap-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3">
          {/* Period */}
          <div className="w-full sm:w-[170px]">
            <Select
              value={period}
              onChange={(v) => { setPeriod(v as PeriodPreset); setPage(0); }}
              options={PERIOD_OPTIONS}
              ariaLabel="Statement period"
            />
          </div>

          {/* Account filter */}
          <div className="w-full sm:w-[180px]">
            <Select
              value={selectedAccount}
              onChange={(v) => { setSelectedAccount(v); setPage(0); }}
              options={accountOptions}
              ariaLabel="Filter by account"
            />
          </div>

          {/* Custom range */}
          {period === "custom" && (
            <div className="w-full sm:w-auto flex items-center gap-2">
              <div className="flex-1 sm:w-[150px]">
                <DatePicker label="" value={customFrom} onChange={(v) => { setCustomFrom(v); setPage(0); }} placeholder="From" min={minDate} max={todayIso()} />
              </div>
              <span className="text-[11px] font-bold text-[var(--color-muted)] shrink-0">→</span>
              <div className="flex-1 sm:w-[150px]">
                <DatePicker label="" value={customTo} onChange={(v) => { setCustomTo(v); setPage(0); }} placeholder="To" min={minDate} max={todayIso()} />
              </div>
            </div>
          )}
        </div>

        {/* Exports & Info */}
        <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-[var(--color-hairline-on-dark)]">
          {/* Range + count info */}
          <div className="flex items-center justify-between sm:justify-start w-full sm:w-auto gap-3 text-[11px] text-[var(--color-muted)]">
            <div className="flex items-center gap-2">
              <CalendarRange size={12} className="shrink-0" />
              <span className="truncate">Showing <span className="font-num text-white">{range.start}</span> → <span className="font-num text-white">{range.end}</span></span>
            </div>
            <span className="shrink-0">{rows.length} transaction{rows.length === 1 ? "" : "s"}</span>
          </div>

          {/* Export buttons */}
          <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => handlePDF(false)}
              disabled={rows.length === 0}
              className="w-full sm:w-auto justify-center h-8 px-3 rounded-[6px] bg-[var(--color-surface-elevated-dark)] border border-[var(--color-hairline-on-dark)] text-[11px] font-bold text-[var(--color-muted-strong)] hover:text-white hover:border-[var(--color-primary)]/30 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <FileText size={13} className="shrink-0" /> <span className="truncate">PDF</span>
            </button>
            <button
              onClick={handleExcel}
              disabled={rows.length === 0}
              className="w-full sm:w-auto justify-center h-8 px-3 rounded-[6px] bg-[var(--color-surface-elevated-dark)] border border-[var(--color-hairline-on-dark)] text-[11px] font-bold text-[var(--color-muted-strong)] hover:text-white hover:border-[var(--color-primary)]/30 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <FileSpreadsheet size={13} className="shrink-0" /> <span className="truncate">Excel</span>
            </button>
            <button
              onClick={() => handlePDF(true)}
              disabled={rows.length === 0 || !getProfile().watermark}
              title={!getProfile().watermark ? "Set watermark text in Profile first" : "Download PDF with watermark"}
              className="col-span-2 sm:col-span-1 w-full sm:w-auto justify-center h-8 px-3 rounded-[6px] bg-[var(--color-surface-elevated-dark)] border border-[var(--color-hairline-on-dark)] text-[11px] font-bold text-[var(--color-muted-strong)] hover:text-white hover:border-[var(--color-primary)]/30 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <FileText size={13} className="shrink-0" /> <span className="truncate">PDF + Watermark</span>
            </button>
          </div>
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
              <div className="hidden md:block">
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
              <div className="md:hidden flex flex-col gap-3 p-4 bg-[var(--color-canvas-dark)]">
                {pageRows.map((r, i) => {
                  const idx = page * PAGE_SIZE + i;
                  const isNegative = r.debit > 0;
                  const amt = isNegative ? r.debit : r.credit;

                  return (
                    <div key={idx} className="bg-[var(--color-surface-card-dark)] p-4 rounded-lg shadow-md w-full font-sans border border-[var(--color-hairline-on-dark)]">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[var(--color-surface-elevated-dark)] text-white font-bold text-sm shrink-0 border border-[var(--color-hairline-on-dark)]">
                            {r.category.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="flex flex-col">
                            <h3 className="text-white font-semibold text-[14px] leading-tight max-w-[140px] truncate">
                              {r.category}
                            </h3>
                            <span className="text-[var(--color-muted)] text-[11px] mt-0.5 tracking-wide truncate max-w-[140px]">
                              {r.notes || "No notes"}
                            </span>
                          </div>
                        </div>
                        
                        <div className="text-right shrink-0 ml-2">
                          <span className={`font-num font-bold text-[14px] ${isNegative ? 'text-[var(--color-trading-down)]' : 'text-[var(--color-trading-up)]'}`}>
                            {isNegative ? '-' : '+'}{symbol}{Math.abs(amt).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-[11px] text-[var(--color-muted-strong)] mb-4 bg-[var(--color-surface-elevated-dark)] px-3 py-2 rounded-[6px]">
                         <span className="truncate max-w-[140px]">{r.account}</span>
                         <span className="font-num shrink-0">{r.date}</span>
                      </div>

                      <div className="flex justify-between items-center mt-2 border-t border-[var(--color-hairline-on-dark)] pt-3">
                        <div className="flex flex-col min-w-0 mr-4">
                          <span className="text-[var(--color-muted)] text-[11px] truncate uppercase">Payment</span>
                          <span className="text-white font-medium text-[12px] truncate">{r.paymentMode || "—"}</span>
                        </div>
                        
                        <div className="flex flex-col items-end shrink-0">
                          <span className="text-[var(--color-muted)] text-[11px] truncate uppercase">Remaining</span>
                          <span className="text-white font-medium font-num text-[12px] truncate">{symbol}{r.remaining.toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
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
