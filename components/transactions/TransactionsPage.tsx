"use client";
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Pencil, Wallet, Search, TrendingUp, TrendingDown, PiggyBank } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { DatePicker } from "@/components/ui/DatePicker";
import { DataTable, ColumnDef } from "@/components/ui/DataTable";
import { Transaction, dbGetTransactions, dbAddTransaction, dbUpdateTransaction, dbDeleteTransaction, ComputedAccount, dbGetAccounts, Category, dbGetCategories, CategoryType, PaymentMedium, PaymentMediumGroup, dbGetPaymentMediums } from "@/lib/db";
import { displayName } from "@/lib/stringUtils";

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<ComputedAccount[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [paymentMediums, setPaymentMediums] = useState<PaymentMedium[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formErr, setFormErr] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  // Form State
  const [type, setType] = useState<CategoryType>("expense");
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [paymentGroup, setPaymentGroup] = useState<PaymentMediumGroup>("online");
  const [paymentMediumId, setPaymentMediumId] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(todayISO());

  const refresh = async () => {
    const [txns, accs, cats, meds] = await Promise.all([
      dbGetTransactions(),
      dbGetAccounts(),
      dbGetCategories(),
      dbGetPaymentMediums()
    ]);
    setTransactions(txns);
    setAccounts(accs);
    setCategories(cats);
    setPaymentMediums(meds);
  };

  useEffect(() => {
    (async () => {
      setLoading(true);
      await refresh();
      setLoading(false);
    })();
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  };

  const openAdd = () => {
    setEditId(null);
    setType("expense");
    setAmount("");
    setAccountId(accounts.length > 0 ? accounts[0].id : "");
    setCategoryId("");
    setPaymentGroup("online");
    setPaymentMediumId("");
    setReason("");
    setNotes("");
    setDate(todayISO());
    setFormErr(null);
    setIsAddOpen(true);
  };

  const openEdit = (t: Transaction) => {
    setEditId(t.id);
    setType(t.type);
    setAmount(String(t.amount));
    setAccountId(t.accountId);
    setCategoryId(t.categoryId);
    // derive group from the medium
    const med = paymentMediums.find(m => m.id === t.paymentMediumId);
    setPaymentGroup(med?.group ?? "online");
    setPaymentMediumId(t.paymentMediumId ?? "");
    setReason(t.reason);
    setNotes(t.notes);
    setDate(t.date);
    setFormErr(null);
    setIsAddOpen(true);
  };

  const handleSave = async () => {
    setFormErr(null);
    const payload = {
      type,
      amount: Number(amount),
      accountId,
      categoryId,
      paymentMediumId,
      reason,
      notes,
      date,
    };
    if (editId) {
      const res = await dbUpdateTransaction(editId, payload);
      if (!res.ok) { setFormErr(res.error ?? "Failed"); return; }
      showToast("Transaction updated");
    } else {
      const res = await dbAddTransaction(payload);
      if (!res.ok) { setFormErr(res.error ?? "Failed"); return; }
      showToast("Transaction added");
    }
    setIsAddOpen(false);
    await refresh();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this transaction?")) return;
    await dbDeleteTransaction(id);
    await refresh();
    showToast("Transaction deleted");
  };

  const filteredCategories = useMemo(() => categories.filter(c => c.type === type), [categories, type]);

  // Auto-select category and account if they are empty
  useEffect(() => {
    if (isAddOpen && filteredCategories.length > 0 && (!categoryId || !filteredCategories.find(c => c.id === categoryId))) {
      setCategoryId(filteredCategories[0].id);
    }
  }, [type, filteredCategories, isAddOpen, categoryId]);

  useEffect(() => {
    if (isAddOpen && accounts.length > 0 && (!accountId || !accounts.find(a => a.id === accountId))) {
      setAccountId(accounts[0].id);
    }
  }, [accounts, isAddOpen, accountId]);

  const accountMap = useMemo(() => new Map(accounts.map(a => [a.id, a])), [accounts]);
  const categoryMap = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);
  const paymentMediumMap = useMemo(() => new Map(paymentMediums.map(m => [m.id, m])), [paymentMediums]);

  const filteredTxns = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return transactions;
    return transactions.filter(t => {
      const med = paymentMediumMap.get(t.paymentMediumId);
      return (
        t.reason.toLowerCase().includes(q) ||
        t.notes.toLowerCase().includes(q) ||
        t.amount.toString().includes(q) ||
        (med && (med.name.includes(q) || med.group.includes(q)))
      );
    });
  }, [transactions, query, paymentMediumMap]);

  const columns: ColumnDef<Transaction>[] = useMemo(() => [
    {
      header: "Reason",
      accessorKey: "reason",
      className: "w-[40%] min-w-[200px]",
      cell: (t) => {
        const c = categoryMap.get(t.categoryId);
        return (
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-full border border-white/10 shrink-0 flex items-center justify-center text-[10px] font-bold" style={{ background: c ? c.color : "var(--color-surface-elevated-dark)", color: "black" }}>
              {c ? c.name.slice(0, 2).toUpperCase() : "?"}
            </span>
            <div className="min-w-0">
              <div className="text-[13px] font-semibold text-white truncate">{t.reason}</div>
              <div className="text-[11px] text-[var(--color-muted)] truncate">{c ? displayName(c.name) : "Unknown Category"}</div>
            </div>
          </div>
        );
      },
    },
    {
      header: "Amount",
      accessorKey: "amount",
      className: "w-[20%] min-w-[120px]",
      cell: (t) => (
        <div className={`text-[13px] font-bold font-num ${t.type === "income" ? "text-[var(--color-trading-up)]" : "text-[var(--color-trading-down)]"}`}>
          {t.type === "income" ? "+" : "-"}₹{t.amount.toLocaleString("en-IN")}
        </div>
      ),
    },
    {
      header: "Account",
      accessorKey: "accountId",
      className: "w-[15%] min-w-[100px]",
      cell: (t) => {
        const a = accountMap.get(t.accountId);
        return <span className="text-[12px] text-[var(--color-muted-strong)]">{a ? displayName(a.name) : "Unknown"}</span>;
      }
    },
    {
      header: "Payment",
      accessorKey: "paymentMediumId",
      className: "w-[15%] min-w-[110px]",
      cell: (t) => {
        const m = paymentMediumMap.get(t.paymentMediumId);
        if (!m) return <span className="text-[11px] text-[var(--color-muted)]">—</span>;
        return (
          <div className="flex flex-col">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${m.group === "online" ? "text-[var(--color-accent)]" : "text-[var(--color-trading-up)]"}`}>{m.group}</span>
            <span className="text-[12px] text-[var(--color-muted-strong)]">{displayName(m.name)}</span>
          </div>
        );
      }
    },
    {
      header: "Date",
      accessorKey: "date",
      className: "w-[15%] min-w-[100px]",
      cell: (t) => <span className="text-[12px] font-num text-[var(--color-muted)]">{t.date}</span>,
    },
    {
      header: "",
      sortable: false,
      className: "w-[80px]",
      cell: (t) => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={(e) => { e.stopPropagation(); openEdit(t); }} className="w-7 h-7 rounded-[6px] bg-transparent border border-transparent hover:bg-[#fcd535]/10 hover:border-[#fcd535]/20 text-[var(--color-muted)] hover:text-[#fcd535] flex items-center justify-center transition shrink-0" aria-label="Edit">
            <Pencil size={14} />
          </button>
          <button onClick={(e) => { e.stopPropagation(); handleDelete(t.id); }} className="w-7 h-7 rounded-[6px] bg-transparent border border-transparent hover:bg-[var(--color-trading-down)]/10 hover:border-[var(--color-trading-down)]/20 text-[var(--color-muted)] hover:text-[var(--color-trading-down)] flex items-center justify-center transition shrink-0" aria-label="Delete">
            <Trash2 size={14} />
          </button>
        </div>
      ),
    }
  ], [accountMap, categoryMap, paymentMediumMap]);

  return (
    <div className="h-full min-h-0 flex flex-col w-full xl:max-w-[80%] max-w-[1000px] mx-auto px-6 py-6">
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-bold tracking-tight text-white">Transactions</h1>
          <p className="text-[12px] leading-relaxed text-[var(--color-muted-strong)] mt-1 max-w-[60ch]">
            Record your income and expenses here. All transactions automatically update your account balances.
          </p>
        </div>
        <Button onClick={openAdd} size="sm" className="w-full sm:w-auto whitespace-nowrap">
          <Plus size={14} /> Add Transaction
        </Button>
      </div>

      <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-4 shrink-0">
        <div className="flex flex-col p-5 rounded-[12px] bg-[var(--color-surface-card-dark)] border border-[var(--color-hairline-on-dark)] hover:border-[var(--color-primary)]/30 transition shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-[8px] flex items-center justify-center bg-[var(--color-trading-up)]/10 text-[var(--color-trading-up)]">
              <TrendingUp size={20} />
            </div>
            <div className="text-[clamp(10px,1.5vw,12px)] font-bold tracking-wide text-[var(--color-muted)] uppercase truncate" title="Total Income">Total Income</div>
          </div>
          <div className="text-[clamp(18px,2.5vw,32px)] font-bold font-num leading-none truncate text-[var(--color-trading-up)]" title={`₹${filteredTxns.filter(t => t.type === 'income').reduce((a, b) => a + b.amount, 0).toLocaleString("en-IN")}`}>
            ₹{filteredTxns.filter(t => t.type === 'income').reduce((a, b) => a + b.amount, 0).toLocaleString("en-IN")}
          </div>
        </div>

        <div className="flex flex-col p-5 rounded-[12px] bg-[var(--color-surface-card-dark)] border border-[var(--color-hairline-on-dark)] hover:border-[var(--color-primary)]/30 transition shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-[8px] flex items-center justify-center bg-[var(--color-trading-down)]/10 text-[var(--color-trading-down)]">
              <TrendingDown size={20} />
            </div>
            <div className="text-[clamp(10px,1.5vw,12px)] font-bold tracking-wide text-[var(--color-muted)] uppercase truncate" title="Total Expenses">Total Expenses</div>
          </div>
          <div className="text-[clamp(18px,2.5vw,32px)] font-bold font-num leading-none truncate text-[var(--color-trading-down)]" title={`₹${filteredTxns.filter(t => t.type === 'expense').reduce((a, b) => a + b.amount, 0).toLocaleString("en-IN")}`}>
            ₹{filteredTxns.filter(t => t.type === 'expense').reduce((a, b) => a + b.amount, 0).toLocaleString("en-IN")}
          </div>
        </div>

        <div className="flex flex-col p-5 rounded-[12px] bg-[var(--color-surface-card-dark)] border border-[var(--color-hairline-on-dark)] hover:border-[var(--color-primary)]/30 transition shadow-sm hidden md:flex">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-[8px] flex items-center justify-center bg-[var(--color-primary)]/10 text-[var(--color-primary)]">
              <PiggyBank size={20} />
            </div>
            <div className="text-[clamp(10px,1.5vw,12px)] font-bold tracking-wide text-[var(--color-muted)] uppercase truncate" title="Net Balance">Net Balance</div>
          </div>
          <div className="text-[clamp(18px,2.5vw,32px)] font-bold font-num leading-none truncate text-white" style={{ color: "var(--color-on-dark)" }} title={`₹${(filteredTxns.filter(t => t.type === 'income').reduce((a, b) => a + b.amount, 0) - filteredTxns.filter(t => t.type === 'expense').reduce((a, b) => a + b.amount, 0)).toLocaleString("en-IN")}`}>
            ₹{(filteredTxns.filter(t => t.type === 'income').reduce((a, b) => a + b.amount, 0) - filteredTxns.filter(t => t.type === 'expense').reduce((a, b) => a + b.amount, 0)).toLocaleString("en-IN")}
          </div>
        </div>
      </div>

      <div className="mt-4 flex-1 min-h-0 rounded-[12px] bg-[var(--color-surface-card-dark)] border border-[var(--color-hairline-on-dark)] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-[var(--color-hairline-on-dark)] flex flex-col sm:flex-row sm:items-center gap-3 bg-[var(--color-canvas-dark)] shrink-0 justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-[13px] font-bold text-white">All Transactions</h3>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--color-surface-elevated-dark)] border border-[var(--color-hairline-on-dark)] text-[var(--color-muted-strong)] font-bold">{filteredTxns.length}</span>
          </div>
          <div className="w-full sm:w-[220px] relative">
            <Search size={14} className="absolute left-2.5 top-2 text-[var(--color-muted)]" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search reason or notes…" className="w-full h-8 rounded-[8px] bg-[var(--color-surface-elevated-dark)] border border-[var(--color-hairline-on-dark)] text-white placeholder:text-[var(--color-muted)] text-[12px] pl-8 pr-3 focus:outline-none focus:border-[var(--color-primary)]/40" />
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-auto">
          {loading ? (
            <div className="p-8 text-center text-[11px] text-[var(--color-muted)]">Loading Transactions…</div>
          ) : accounts.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-[12px] font-bold text-white">No accounts found</div>
              <div className="text-[11px] text-[var(--color-muted)] mt-1">Please create an account before adding transactions.</div>
            </div>
          ) : transactions.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-[12px] font-bold text-white">No transactions yet</div>
              <div className="text-[11px] text-[var(--color-muted)] mt-1">Click the add button above to record your first transaction.</div>
            </div>
          ) : filteredTxns.length === 0 ? (
            <div className="p-8 text-center text-[11px] text-[var(--color-muted)]">No transactions match your search.</div>
          ) : (
            <div className="h-full">
              {/* Desktop Table */}
              <div className="hidden md:block h-full">
                <DataTable columns={columns} data={filteredTxns} keyExtractor={(t) => t.id} />
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden flex flex-col gap-3 p-4">
                {filteredTxns.map((t) => {
                  const isNegative = t.type === 'expense';
                  const c = categoryMap.get(t.categoryId);
                  const m = paymentMediumMap.get(t.paymentMediumId);
                  const a = accountMap.get(t.accountId);
                  const avatarText = c ? c.name.slice(0, 2).toUpperCase() : "?";

                  return (
                    <div key={t.id} className="bg-[var(--color-surface-card-dark)] p-4 rounded-lg shadow-md w-full font-sans border border-[var(--color-hairline-on-dark)]">
                      {/* Top Row: Avatar, Title/Type, Amount */}
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center text-[var(--color-canvas-dark)] font-bold text-sm shrink-0" style={{ background: c ? c.color : "var(--color-surface-elevated-dark)" }}>
                            {avatarText}
                          </div>
                          <div className="flex flex-col">
                            <h3 className="text-white font-semibold text-[14px] leading-tight max-w-[160px] truncate">
                              {t.reason}
                            </h3>
                            <span className="text-[var(--color-muted)] text-[11px] mt-0.5 uppercase tracking-wide">
                              {t.type}
                            </span>
                          </div>
                        </div>
                        
                        <div className="text-right shrink-0 ml-2">
                          <span className={`font-num font-bold text-[14px] ${isNegative ? 'text-[var(--color-trading-down)]' : 'text-[var(--color-trading-up)]'}`}>
                            {isNegative ? '-' : '+'}₹{Math.abs(t.amount).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>

                      {/* Middle Row: Bank and Date */}
                      <div className="flex justify-between items-center text-[11px] text-[var(--color-muted-strong)] mb-4 bg-[var(--color-surface-elevated-dark)] px-3 py-2 rounded-[6px]">
                         <span className="truncate max-w-[150px]">{a ? displayName(a.name) : "Unknown Account"}</span>
                         <span className="font-num shrink-0">{t.date}</span>
                      </div>

                      {/* Bottom Row: Method/Category and Actions */}
                      <div className="flex justify-between items-center mt-2 border-t border-[var(--color-hairline-on-dark)] pt-3">
                        <div className="flex flex-col min-w-0 mr-4">
                          <span className="text-white font-medium text-[12px] uppercase tracking-wide">{m ? m.group : "—"}</span>
                          <span className="text-[var(--color-muted)] text-[11px] truncate">{m ? displayName(m.name) : "—"} • {c ? displayName(c.name) : "—"}</span>
                        </div>
                        
                        <div className="flex gap-1 text-[var(--color-muted)] shrink-0">
                          <button onClick={() => openEdit(t)} className="w-8 h-8 rounded-[6px] hover:text-[#fcd535] hover:bg-[#fcd535]/10 flex items-center justify-center transition-colors" aria-label="Edit">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => handleDelete(t.id)} className="w-8 h-8 rounded-[6px] hover:text-[var(--color-trading-down)] hover:bg-[var(--color-trading-down)]/10 flex items-center justify-center transition-colors" aria-label="Delete">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <Dialog open={isAddOpen} onClose={() => setIsAddOpen(false)} title={editId ? "Edit Transaction" : "New Transaction"} showClose maxWidth="max-w-[460px]">
        <div className="flex flex-col gap-4">
          <div className="flex items-center p-1 rounded-[8px] bg-[var(--color-surface-elevated-dark)] border border-[var(--color-hairline-on-dark)]">
            <button onClick={() => setType("expense")} className={`flex-1 py-1.5 text-[12px] font-bold rounded-[6px] transition ${type === "expense" ? "bg-[var(--color-trading-down)]/20 text-[var(--color-trading-down)] shadow-sm" : "text-[var(--color-muted)] hover:text-white"}`}>Expense</button>
            <button onClick={() => setType("income")} className={`flex-1 py-1.5 text-[12px] font-bold rounded-[6px] transition ${type === "income" ? "bg-[var(--color-trading-up)]/20 text-[var(--color-trading-up)] shadow-sm" : "text-[var(--color-muted)] hover:text-white"}`}>Income</button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input label="Amount (₹)" type="number" min="0" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
            <DatePicker label="Date" value={date} onChange={setDate} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold tracking-wide text-[var(--color-muted)] uppercase">Account</span>
              <Select 
                value={accountId} 
                onChange={setAccountId} 
                options={accounts.map(a => ({ value: a.id, label: displayName(a.name) }))} 
                ariaLabel="Select Account" 
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold tracking-wide text-[var(--color-muted)] uppercase">Category</span>
              <Select 
                value={categoryId} 
                onChange={setCategoryId} 
                options={filteredCategories.map(c => ({ value: c.id, label: displayName(c.name) }))} 
                ariaLabel="Select Category" 
              />
            </label>
          </div>

          {/* Payment Medium: two-level selector */}
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold tracking-wide text-[var(--color-muted)] uppercase">Payment Type</span>
              <div className="flex items-center p-1 rounded-[8px] bg-[var(--color-surface-elevated-dark)] border border-[var(--color-hairline-on-dark)]">
                <button onClick={() => { setPaymentGroup("online"); setPaymentMediumId(""); }} className={`flex-1 py-1.5 text-[11px] font-bold rounded-[6px] transition ${paymentGroup === "online" ? "bg-[var(--color-accent)]/20 text-[var(--color-accent)] shadow-sm" : "text-[var(--color-muted)] hover:text-white"}`}>Online</button>
                <button onClick={() => { setPaymentGroup("offline"); setPaymentMediumId(""); }} className={`flex-1 py-1.5 text-[11px] font-bold rounded-[6px] transition ${paymentGroup === "offline" ? "bg-[var(--color-trading-up)]/20 text-[var(--color-trading-up)] shadow-sm" : "text-[var(--color-muted)] hover:text-white"}`}>Offline</button>
              </div>
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold tracking-wide text-[var(--color-muted)] uppercase">Payment Medium</span>
              <Select
                value={paymentMediumId}
                onChange={setPaymentMediumId}
                options={paymentMediums.filter(m => m.group === paymentGroup).map(m => ({ value: m.id, label: displayName(m.name) }))}
                ariaLabel="Select Payment Medium"
              />
            </label>
          </div>

          <Input label="Reason / Title" value={reason} onChange={(e) => setReason(e.target.value)}               placeholder="e.g. Lunch, Transport, Utilities" maxLength={50} />
          <Textarea label="Notes (Optional)" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Additional details..." rows={3} maxLength={1000} />

          {formErr && <div className="text-[11px] font-semibold text-[var(--color-trading-down)]">{formErr}</div>}
          <div className="pt-2 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={accounts.length === 0 || categories.length === 0}>{editId ? "Save changes" : "Add Transaction"}</Button>
          </div>
        </div>
      </Dialog>

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 max-w-[90vw] bg-[var(--color-surface-card-dark)] text-white border border-[var(--color-primary)]/30 px-4 py-2 rounded-[8px] text-[12px] font-semibold shadow-xl flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] shrink-0" />
          <span className="truncate">{toast}</span>
        </div>
      )}
    </div>
  );
}
