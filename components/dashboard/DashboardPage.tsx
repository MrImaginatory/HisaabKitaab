"use client";
import { useEffect, useState } from "react";
import { Wallet, TrendingUp, TrendingDown, LayoutList, ListOrdered, PiggyBank, Activity } from "lucide-react";
import { dbGetTransactions, dbGetAccounts, dbGetCategories, Transaction, ComputedAccount, Category } from "@/lib/db";
import { displayName } from "@/lib/stringUtils";

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
  const [accounts, setAccounts] = useState<ComputedAccount[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [txns, accs, cats] = await Promise.all([
        dbGetTransactions(),
        dbGetAccounts(),
        dbGetCategories()
      ]);
      
      let income = 0;
      let expenses = 0;
      txns.forEach(t => {
        if (t.type === "income") income += t.amount;
        if (t.type === "expense") expenses += t.amount;
      });

      let totalBalance = 0;
      accs.forEach(a => {
        totalBalance += (a.currentBalance ?? 0);
      });

      setStats({
        income,
        expenses,
        txCount: txns.length,
        catCount: cats.length,
        accCount: accs.length,
        totalBalance
      });
      setAccounts(accs);
      setCategories(cats);

      // Filter recent transactions (last 15 days, max 10)
      const fifteenDaysAgo = new Date();
      fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
      const recent = txns
        .filter(t => new Date(t.date) >= fifteenDaysAgo)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setRecentTxns(recent.slice(0, 10));
      setRecentIncome(recent.filter(t => t.type === "income").slice(0, 10));

      setLoading(false);
    })();
  }, []);

  const categoryMap = new Map(categories.map(c => [c.id, c]));

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
