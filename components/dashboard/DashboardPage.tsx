"use client";
import { useEffect, useMemo, useState } from "react";
import { Wallet, TrendingUp, TrendingDown, LayoutList, PiggyBank, Activity, PieChart as PieIcon, LineChart as LineIcon, CalendarRange } from "lucide-react";
import { dbGetTransactions, dbGetAccounts, dbGetCategories, Transaction, ComputedAccount, Category } from "@/lib/db";
import { displayName } from "@/lib/stringUtils";
import { Select } from "@/components/ui/Select";
import { DatePicker } from "@/components/ui/DatePicker";
import { DonutChart, DonutLegend, DonutDatum } from "@/components/ui/charts/DonutChart";
import { LineChart, LinePoint } from "@/components/ui/charts/LineChart";
import { PeriodPreset, PERIOD_OPTIONS, getRange, eachDay, FALLBACK_PALETTE } from "@/lib/periods";

export function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    income: 0,
    expenses: 0,
    txCount: 0,
    catCount: 0,
    accCount: 0,
    totalBalance: 0,
  });
  const [recentTxns, setRecentTxns] = useState<Transaction[]>([]);
  const [recentIncome, setRecentIncome] = useState<Transaction[]>([]);
  const [, setAccounts] = useState<ComputedAccount[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [txns, setTxns] = useState<Transaction[]>([]);

  // ---- Spend analytics period filter (default: this month) ----
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
      const [txnsData, accsData, catsData] = await Promise.all([
        dbGetTransactions(),
        dbGetAccounts(),
        dbGetCategories()
      ]);

      let income = 0;
      let expenses = 0;
      txnsData.forEach(t => {
        if (t.type === "income") income += t.amount;
        if (t.type === "expense") expenses += t.amount;
      });

      let totalBalance = 0;
      accsData.forEach(a => {
        totalBalance += (a.currentBalance ?? 0);
      });

      setStats({
        income,
        expenses,
        txCount: txnsData.length,
        catCount: catsData.length,
        accCount: accsData.length,
        totalBalance
      });
      setAccounts(accsData);
      setCategories(catsData);
      setTxns(txnsData);

      // Filter recent transactions (last 15 days, max 10)
      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
      const recent = txnsData
        .filter(t => new Date(t.date) >= fifteenDaysAgo)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setRecentTxns(recent.slice(0, 10));
      setRecentIncome(recent.filter(t => t.type === "income").slice(0, 10));

      setLoading(false);
    })();
  }, []);

  const categoryMap = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);

  // ---- Analytics computations (expense-only, within selected range) ----
  const expensesInRange = useMemo(
    () => txns.filter(t => t.type === "expense" && t.date >= range.start && t.date <= range.end),
    [txns, range]
  );

  const totalSpent = useMemo(() => expensesInRange.reduce((s, t) => s + t.amount, 0), [expensesInRange]);
  const daysCount = useMemo(() => Math.max(eachDay(range.start, range.end).length, 1), [range]);
  const avgPerDay = totalSpent / daysCount;

  const pieData: DonutDatum[] = useMemo(() => {
    const sums = new Map<string, number>();
    expensesInRange.forEach(t => {
      sums.set(t.categoryId, (sums.get(t.categoryId) ?? 0) + t.amount);
    });
    const sorted = [...sums.entries()]
      .map(([id, value]) => {
        const c = categoryMap.get(id);
        return {
          label: displayName(c?.name ?? "Unknown"),
          value,
          catId: id,
        };
      })
      .sort((a, b) => b.value - a.value);

    const CHART_PALETTE = ["#fcd535", "#0ecb81", "#f6465d", "#3b82f6", "#8b5cf6", "#ec4899", "#f97316", "#14b8a6", "#a3e635", "#06b6d4", "#e879f9", "#facc15"];

    const TOP = 8;
    const topItems = sorted.slice(0, TOP);
    const top = topItems.map((d, i) => ({
      label: d.label,
      value: d.value,
      color: CHART_PALETTE[i % CHART_PALETTE.length],
    }));
    if (sorted.length <= TOP) return top;
    const restValue = sorted.slice(TOP).reduce((s, d) => s + d.value, 0);
    return [...top, { label: "Others", value: restValue, color: "#707a8a" }];
  }, [expensesInRange, categoryMap]);

  const linePoints: LinePoint[] = useMemo(() => {
    const daySums = new Map<string, number>();
    expensesInRange.forEach(t => {
      daySums.set(t.date, (daySums.get(t.date) ?? 0) + t.amount);
    });
    return eachDay(range.start, range.end).map(date => ({
      date,
      value: daySums.get(date) ?? 0,
    }));
  }, [expensesInRange, range]);

  const kpis = [
    { label: "Total Balance", value: `₹${stats.totalBalance.toLocaleString("en-IN")}`, icon: PiggyBank, color: "var(--color-on-dark)", bg: "bg-[var(--color-primary)]/10 text-[var(--color-primary)]" },
    { label: "Total Income", value: `₹${stats.income.toLocaleString("en-IN")}`, icon: TrendingUp, color: "var(--color-trading-up)", bg: "bg-[var(--color-trading-up)]/10 text-[var(--color-trading-up)]" },
    { label: "Total Expenses", value: `₹${stats.expenses.toLocaleString("en-IN")}`, icon: TrendingDown, color: "var(--color-trading-down)", bg: "bg-[var(--color-trading-down)]/10 text-[var(--color-trading-down)]" },
    { label: "Total Transactions", value: stats.txCount.toLocaleString(), icon: Activity, color: "var(--color-info)", bg: "bg-[var(--color-info)]/10 text-[var(--color-info)]" },
    { label: "Total Categories", value: stats.catCount.toLocaleString(), icon: LayoutList, color: "var(--color-accent-turquoise)", bg: "bg-[var(--color-accent-turquoise)]/10 text-[var(--color-accent-turquoise)]" },
    { label: "Total Accounts", value: stats.accCount.toLocaleString(), icon: Wallet, color: "var(--color-muted)", bg: "bg-white/10 text-white" },
  ];

  const renderList = (data: Transaction[], emptyMsg: string) => {
    if (loading) return <div className="p-8 text-center text-[11px] text-[var(--color-muted)]">Loading…</div>;
    if (data.length === 0) return <div className="p-8 text-center text-[11px] text-[var(--color-muted)]">{emptyMsg}</div>;
    return (
      <div className="flex flex-col">
        {data.map(t => {
          const c = categoryMap.get(t.categoryId);
          return (
            <div key={t.id} className="flex items-center justify-between p-3 border-b border-[var(--color-hairline-on-dark)] last:border-0 hover:bg-[var(--color-surface-elevated-dark)] transition">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold" style={{ background: c ? c.color : "var(--color-surface-elevated-dark)", color: "black" }}>
                  {c ? c.name.slice(0, 2).toUpperCase() : "?"}
                </span>
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold text-white truncate">{t.reason}</div>
                  <div className="text-[11px] text-[var(--color-muted)] truncate">{t.date} • {c ? displayName(c.name) : "Unknown"}</div>
                </div>
              </div>
              <div className={`text-[13px] font-bold font-num ${t.type === "income" ? "text-[var(--color-trading-up)]" : "text-[var(--color-trading-down)]"}`}>
                {t.type === "income" ? "+" : "-"}₹{t.amount.toLocaleString("en-IN")}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="h-full min-h-0 flex flex-col w-full xl:max-w-[80%] max-w-[1000px] mx-auto px-6 py-6 overflow-y-auto">
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-bold tracking-tight text-white">Dashboard</h1>
          <p className="text-[12px] leading-relaxed text-[var(--color-muted-strong)] mt-1 max-w-[60ch]">
            Overview of your balances, income, expenses, and overall Khata health.
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map((kpi, i) => (
          <div key={i} className="flex flex-col p-5 rounded-[12px] bg-[var(--color-surface-card-dark)] border border-[var(--color-hairline-on-dark)] hover:border-[var(--color-primary)]/30 transition shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-[8px] flex items-center justify-center ${kpi.bg}`}>
                <kpi.icon size={20} />
              </div>
              <div className="text-[clamp(10px,1.5vw,12px)] font-bold tracking-wide text-[var(--color-muted)] uppercase truncate" title={kpi.label}>
                {kpi.label}
              </div>
            </div>
            {loading ? (
              <div className="h-9 w-24 bg-[var(--color-surface-elevated-dark)] animate-pulse rounded-[4px]"></div>
            ) : (
              <div className="text-[clamp(18px,2.5vw,32px)] font-bold font-num leading-none truncate" style={{ color: kpi.color }} title={kpi.value}>
                {kpi.value}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ===== Spend Analytics ===== */}
      <div className="mt-8 shrink-0 rounded-[12px] bg-[var(--color-surface-card-dark)] border border-[var(--color-hairline-on-dark)] overflow-hidden">
        {/* Card header + period filter */}
        <div className="p-4 border-b border-[var(--color-hairline-on-dark)] flex flex-wrap items-center gap-3">
          <h3 className="text-[13px] font-bold text-white flex items-center gap-2 mr-auto">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)]" />
            Spend Analytics
          </h3>

          {/* Summary chips */}
          {!loading && (
            <div className="flex items-center gap-2 mr-2">
              <span className="h-7 px-2.5 inline-flex items-center gap-1.5 rounded-full bg-[var(--color-trading-down)]/12 border border-[var(--color-trading-down)]/20 text-[11px] font-bold text-[var(--color-trading-down)]">
                Spent <span className="font-num">₹{Math.round(totalSpent).toLocaleString("en-IN")}</span>
              </span>
              <span className="hidden md:inline-flex h-7 px-2.5 items-center gap-1.5 rounded-full bg-[var(--color-surface-elevated-dark)] border border-[var(--color-hairline-on-dark)] text-[11px] font-semibold text-[var(--color-muted-strong)]">
                Avg/day <span className="font-num text-white">₹{Math.round(avgPerDay).toLocaleString("en-IN")}</span>
              </span>
            </div>
          )}

          {/* Period preset */}
          <div className="w-[170px]">
            <Select
              value={period}
              onChange={(v) => setPeriod(v as PeriodPreset)}
              options={PERIOD_OPTIONS}
              ariaLabel="Analytics period"
            />
          </div>

          {/* Custom range pickers */}
          {period === "custom" && (
            <>
              <div className="w-[150px]">
                <DatePicker label="" value={customFrom} onChange={(v) => { setCustomFrom(v); }} placeholder="From" />
              </div>
              <span className="text-[11px] font-bold text-[var(--color-muted)]">→</span>
              <div className="w-[150px]">
                <DatePicker label="" value={customTo} onChange={(v) => { setCustomTo(v); }} placeholder="To" />
              </div>
            </>
          )}
        </div>

        {/* Charts grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-[var(--color-hairline-on-dark)]">
          {/* Pie — spend by category */}
          <div className="p-4 flex flex-col min-w-0">
            <h4 className="text-[12px] font-bold tracking-wide text-[var(--color-muted-strong)] uppercase flex items-center gap-2 mb-4">
              <PieIcon size={14} className="text-[var(--color-muted)]" /> Spent on what · by category
            </h4>
            {loading ? (
              <div className="h-[190px] flex items-center justify-center text-[11px] text-[var(--color-muted)]">Loading SQLite…</div>
            ) : (
              <div className="flex flex-wrap sm:flex-nowrap items-center gap-5">
                <DonutChart data={pieData} size={180} thickness={26} centerLabel="Spent" />
                <div className="max-h-[190px] overflow-auto no-scrollbar pr-1" style={{ minWidth: 200 }}>
                  <DonutLegend data={pieData} total={totalSpent} />
                </div>
              </div>
            )}
          </div>

          {/* Line — daily spend */}
          <div className="p-4 flex flex-col min-w-0">
            <h4 className="text-[12px] font-bold tracking-wide text-[var(--color-muted-strong)] uppercase flex items-center gap-2 mb-4">
              <LineIcon size={14} className="text-[var(--color-muted)]" /> Spent when · by day
            </h4>
            {loading ? (
              <div className="h-[230px] flex items-center justify-center text-[11px] text-[var(--color-muted)]">Loading SQLite…</div>
            ) : (
              <div className="rounded-[8px] bg-[var(--color-canvas-dark)] border border-[var(--color-hairline-on-dark)] p-2">
                <LineChart points={linePoints} height={220} strokeColor="var(--color-trading-down)" />
              </div>
            )}
          </div>
        </div>

        {/* Range footer */}
        <div className="px-4 py-2.5 border-t border-[var(--color-hairline-on-dark)] flex items-center gap-2 text-[11px] text-[var(--color-muted)]">
          <CalendarRange size={12} />
          Showing <span className="font-num text-white">{range.start}</span> → <span className="font-num text-white">{range.end}</span>
          <span className="ml-auto">{expensesInRange.length} expense txn{expensesInRange.length === 1 ? "" : "s"} in range</span>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="flex-1 min-h-0 flex flex-col rounded-[12px] bg-[var(--color-surface-card-dark)] border border-[var(--color-hairline-on-dark)] overflow-hidden">
          <div className="p-4 border-b border-[var(--color-hairline-on-dark)] bg-[var(--color-canvas-dark)] shrink-0">
            <h3 className="text-[13px] font-bold text-white flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-trading-up)]" />
              Recent Income (Last 15 Days)
            </h3>
          </div>
          <div className="flex-1 min-h-0 overflow-auto">
            {renderList(recentIncome, "No income in the last 15 days.")}
          </div>
        </div>

        <div className="flex-1 min-h-0 flex flex-col rounded-[12px] bg-[var(--color-surface-card-dark)] border border-[var(--color-hairline-on-dark)] overflow-hidden">
          <div className="p-4 border-b border-[var(--color-hairline-on-dark)] bg-[var(--color-canvas-dark)] shrink-0">
            <h3 className="text-[13px] font-bold text-white flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-info)]" />
              Recent Transactions (Last 15 Days)
            </h3>
          </div>
          <div className="flex-1 min-h-0 overflow-auto">
            {renderList(recentTxns, "No transactions in the last 15 days.")}
          </div>
        </div>
      </div>
    </div>
  );
}
