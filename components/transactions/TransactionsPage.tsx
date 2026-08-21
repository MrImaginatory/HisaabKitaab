"use client";
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Pencil, Wallet, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input, Textarea } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { DatePicker } from "@/components/ui/DatePicker";
import { DataTable, ColumnDef } from "@/components/ui/DataTable";
import { Transaction, dbGetTransactions, dbAddTransaction, dbUpdateTransaction, dbDeleteTransaction, ComputedAccount, dbGetAccounts, Category, dbGetCategories, CategoryType } from "@/lib/db";
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
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(todayISO());

  const refresh = async () => {
    const [txns, accs, cats] = await Promise.all([
      dbGetTransactions(),
      dbGetAccounts(),
      dbGetCategories()
    ]);
    setTransactions(txns);
    setAccounts(accs);
    setCategories(cats);
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

  const filteredTxns = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return transactions;
    return transactions.filter(t => 
      t.reason.toLowerCase().includes(q) || 
      t.notes.toLowerCase().includes(q) ||
      t.amount.toString().includes(q)
    );
  }, [transactions, query]);

  const accountMap = useMemo(() => new Map(accounts.map(a => [a.id, a])), [accounts]);
  const categoryMap = useMemo(() => new Map(categories.map(c => [c.id, c])), [categories]);

  const columns: ColumnDef<Transaction>[] = useMemo(() => [
    {
      header: "Reason",
      accessorKey: "reason",
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
      header: "Account",
      accessorKey: "accountId",
      cell: (t) => {
        const a = accountMap.get(t.accountId);
        return <span className="text-[12px] text-[var(--color-muted-strong)]">{a ? displayName(a.name) : "Unknown"}</span>;
      }
    },
    {
      header: "Date",
      accessorKey: "date",
      cell: (t) => <span className="text-[12px] font-num text-[var(--color-muted)]">{t.date}</span>,
    },
    {
      header: "Amount",
      accessorKey: "amount",
      className: "text-right",
      cell: (t) => (
        <div className={`text-[13px] font-bold font-num ${t.type === "income" ? "text-[var(--color-trading-up)]" : "text-[var(--color-trading-down)]"}`}>
          {t.type === "income" ? "+" : "-"}₹{t.amount.toLocaleString("en-IN")}
        </div>
      ),
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
  ], [accountMap, categoryMap]);

  return (
    <div className="h-full min-h-0 flex flex-col max-w-[80%] w-full mx-auto px-6 py-6">
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
            <DataTable columns={columns} data={filteredTxns} keyExtractor={(t) => t.id} />
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

          <Input label="Reason / Title" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Bought groceries" maxLength={50} />
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
