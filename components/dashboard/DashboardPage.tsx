"use client";
import { useEffect, useState } from "react";
import { Wallet, TrendingUp, TrendingDown, LayoutList, ListOrdered, PiggyBank, Activity } from "lucide-react";
import { dbGetTransactions, dbGetAccounts, dbGetCategories, Transaction, ComputedAccount, Category } from "@/lib/db";

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
      setLoading(false);
    })();
  }, []);

  const kpis = [
    { label: "Total Balance", value: `₹${stats.totalBalance.toLocaleString("en-IN")}`, icon: PiggyBank, color: "var(--color-primary)", bg: "bg-[var(--color-primary)]/10 text-[var(--color-primary)]" },
    { label: "Total Income", value: `₹${stats.income.toLocaleString("en-IN")}`, icon: TrendingUp, color: "var(--color-trading-up)", bg: "bg-[var(--color-trading-up)]/10 text-[var(--color-trading-up)]" },
    { label: "Total Expenses", value: `₹${stats.expenses.toLocaleString("en-IN")}`, icon: TrendingDown, color: "var(--color-trading-down)", bg: "bg-[var(--color-trading-down)]/10 text-[var(--color-trading-down)]" },
    { label: "Total Transactions", value: stats.txCount.toLocaleString(), icon: Activity, color: "var(--color-info)", bg: "bg-[var(--color-info)]/10 text-[var(--color-info)]" },
    { label: "Total Categories", value: stats.catCount.toLocaleString(), icon: LayoutList, color: "var(--color-accent-turquoise)", bg: "bg-[var(--color-accent-turquoise)]/10 text-[var(--color-accent-turquoise)]" },
    { label: "Total Accounts", value: stats.accCount.toLocaleString(), icon: Wallet, color: "var(--color-muted)", bg: "bg-white/10 text-white" },
  ];

  return (
    <div className="h-full min-h-0 flex flex-col max-w-[80%] w-full mx-auto px-6 py-6 overflow-y-auto">
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-bold tracking-tight text-white">Dashboard</h1>
          <p className="text-[12px] leading-relaxed text-[var(--color-muted-strong)] mt-1 max-w-[60ch]">
            Overview of your balances, income, expenses, and overall Khata health.
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map((kpi, i) => (
          <div key={i} className="flex flex-col p-5 rounded-[12px] bg-[var(--color-surface-card-dark)] border border-[var(--color-hairline-on-dark)] hover:border-[var(--color-primary)]/30 transition shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-10 h-10 rounded-[8px] flex items-center justify-center ${kpi.bg}`}>
                <kpi.icon size={20} />
              </div>
              <div className="text-[12px] font-bold tracking-wide text-[var(--color-muted)] uppercase">
                {kpi.label}
              </div>
            </div>
            {loading ? (
              <div className="h-9 w-24 bg-[var(--color-surface-elevated-dark)] animate-pulse rounded-[4px]"></div>
            ) : (
              <div className="text-[32px] font-bold font-num leading-none" style={{ color: kpi.label === "Total Balance" ? "white" : kpi.color }}>
                {kpi.value}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
