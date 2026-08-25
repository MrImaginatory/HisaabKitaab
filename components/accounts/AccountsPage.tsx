"use client";
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, AlertTriangle, Wallet, LayoutList, LayoutGrid, Pencil } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { DatePicker } from "@/components/ui/DatePicker";
import { Dialog } from "@/components/ui/Dialog";
import { DataTable, ColumnDef } from "@/components/ui/DataTable";
import { MainAccount, ComputedAccount, dbGetAccounts, dbAddAccount, dbDeleteAccount, dbUpdateAccount } from "@/lib/db";
import { displayName } from "@/lib/stringUtils";

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function AccountsPage() {
  const [accounts, setAccounts] = useState<ComputedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "card">("list");
  const [name, setName] = useState("");
  const [balance, setBalance] = useState("");
  const [desc, setDesc] = useState("");
  const [accNum, setAccNum] = useState("");
  const [allowNegative, setAllowNegative] = useState(false);
  const [date, setDate] = useState<string>(() => todayISO());
  const [formErr, setFormErr] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [deleteAccountState, setDeleteAccountState] = useState<{ id: string, name: string } | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleteCaptchaInput, setDeleteCaptchaInput] = useState("");
  const [deleteCaptcha, setDeleteCaptcha] = useState("");

  const refresh = async () => {
    const list = await dbGetAccounts();
    setAccounts(list);
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

  const handleSave = async () => {
    setFormErr(null);
    const opening = balance.trim() === "" ? NaN : Number(balance);
    const cleanedAccNum = accNum.replace(/\D/g, "").slice(0, 6);
    if (editId) {
      const res = await dbUpdateAccount(editId, { name, openingBalance: opening, description: desc, accountNumber: cleanedAccNum, allowNegativeBalance: allowNegative, date });
      if (!res.ok) { setFormErr(res.error ?? "Failed"); return; }
      showToast(`Updated account "${displayName(res.account?.name ?? name)}"`);
    } else {
      const res = await dbAddAccount({ name, openingBalance: opening, description: desc, accountNumber: cleanedAccNum, allowNegativeBalance: allowNegative, date });
      if (!res.ok) { setFormErr(res.error ?? "Failed"); return; }
      showToast(`Added account "${displayName(res.account?.name ?? name)}"`);
    }
    setIsAddOpen(false);
    await refresh();
  };

  const openAdd = () => {
    setEditId(null);
    setName("");
    setBalance("");
    setDesc("");
    setAccNum("");
    setAllowNegative(false);
    setDate(todayISO());
    setFormErr(null);
    setIsAddOpen(true);
  };

  const openEdit = (a: ComputedAccount) => {
    setEditId(a.id);
    setName(displayName(a.name));
    setBalance(String(a.openingBalance));
    setDesc(displayName(a.description));
    setAccNum(a.accountNumber ?? "");
    setAllowNegative(a.allowNegativeBalance);
    setDate(a.date);
    setFormErr(null);
    setIsAddOpen(true);
  };

  const openDeleteDialog = (id: string, name: string) => {
    setDeleteAccountState({ id, name });
    setDeleteConfirmText("");
    setDeleteCaptchaInput("");
    setDeleteCaptcha(Math.random().toString(36).substring(2, 8).toUpperCase());
  };

  const executeDelete = async () => {
    if (!deleteAccountState) return;
    if (deleteConfirmText.toLowerCase() !== "confirm") {
      alert("Please type 'confirm' to proceed.");
      return;
    }
    if (deleteCaptchaInput !== deleteCaptcha) {
      alert("CAPTCHA does not match.");
      return;
    }
    
    const { id, name } = deleteAccountState;
    const res = await dbDeleteAccount(id);
    if (!res.ok) {
      alert(res.error);
      setDeleteAccountState(null);
      return;
    }
    await refresh();
    showToast(res.softDeleted ? `Account "${displayName(name)}" closed (soft delete)` : `Deleted "${displayName(name)}"`);
    setDeleteAccountState(null);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = [...accounts].sort((a, b) => Number(a.isClosed) - Number(b.isClosed)); // Open first
    if (!q) return sorted;
    return sorted.filter((a) => a.name.toLowerCase().includes(q) || a.description.toLowerCase().includes(q));
  }, [accounts, query]);

  const columns: ColumnDef<ComputedAccount>[] = useMemo(() => [
    {
      header: "Account",
      accessorKey: "name",
      cell: (a) => (
        <div className={`flex items-center gap-3 ${a.isClosed ? 'opacity-50 grayscale' : ''}`}>
          <span className="w-9 h-9 rounded-[8px] bg-[var(--color-surface-elevated-dark)] border border-[var(--color-hairline-on-dark)] flex items-center justify-center text-white shrink-0">
            <Wallet size={14} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold text-white flex items-center gap-2 truncate">
              {displayName(a.name)}
              {a.isClosed && <span className="text-[10px] bg-[var(--color-surface-elevated-dark)] border border-[var(--color-hairline-on-dark)] px-1.5 py-0.5 rounded text-[var(--color-muted)] font-normal tracking-wide">Closed</span>}
            </div>
            <div className="text-[11px] text-[var(--color-muted)] truncate">{a.description ? displayName(a.description) : "—"}</div>
          </div>
        </div>
      ),
    },
    {
      header: "Date",
      accessorKey: "date",
      cell: (a) => <span className="text-[12px] font-num text-[var(--color-muted)]">{a.date}</span>,
    },
    {
      header: "Balance",
      accessorKey: "currentBalance",
      className: "text-right",
      cell: (a) => (
        <div className="text-[13px] font-bold font-num text-white">₹{Number(a.currentBalance).toLocaleString("en-IN")}</div>
      ),
    },
    {
      header: "",
      sortable: false,
      className: "w-[80px]",
      cell: (a) => (
        <div className="flex items-center justify-end gap-1">
          {!a.isClosed && (
            <>
              <button onClick={(e) => { e.stopPropagation(); openEdit(a); }} className="w-7 h-7 rounded-[6px] bg-transparent border border-transparent hover:bg-[#fcd535]/10 hover:border-[#fcd535]/20 text-[var(--color-muted)] hover:text-[#fcd535] flex items-center justify-center transition shrink-0" aria-label="Edit">
                <Pencil size={14} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); openDeleteDialog(a.id, a.name); }} className="w-7 h-7 rounded-[6px] bg-transparent border border-transparent hover:bg-[var(--color-trading-down)]/10 hover:border-[var(--color-trading-down)]/20 text-[var(--color-muted)] hover:text-[var(--color-trading-down)] flex items-center justify-center transition shrink-0" aria-label="Delete">
                <Trash2 size={14} />
              </button>
            </>
          )}
        </div>
      ),
    }
  ], []);

  const totalBalance = useMemo(() => accounts.reduce((s, a) => s + (Number(a.currentBalance) || 0), 0), [accounts]);

  return (
    <div className="h-full min-h-0 flex flex-col w-full xl:max-w-[80%] max-w-[1000px] mx-auto px-6 py-6">
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-bold tracking-tight text-white">Accounts</h1>
          <p className="text-[12px] leading-relaxed text-[var(--color-muted-strong)] mt-1 max-w-[60ch]">
            Main accounts are like bank accounts — add multiple. Opening balance + date are stored in SQLite locally.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between shrink-0 mb-4 gap-3">
          <span className="px-3 py-1.5 rounded-full bg-[var(--color-surface-elevated-dark)] border border-[var(--color-hairline-on-dark)] text-[11px] font-bold text-[var(--color-muted-strong)] w-fit self-start sm:self-auto">
            Total balance: <span className="font-num text-white">₹{totalBalance.toLocaleString("en-IN")}</span>
          </span>
          <Button onClick={openAdd} size="sm" className="w-full sm:w-auto whitespace-nowrap">
            <Plus size={14} /> Add
          </Button>
        </div>
      </div>

      <Dialog open={isAddOpen} onClose={() => setIsAddOpen(false)} title={editId ? "Edit main account" : "Add main account"} showClose maxWidth="max-w-[480px]">
        <div className="flex flex-col gap-4">
          <Input label="Account name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Savings, Cash, Wallet" />
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold tracking-wide text-[var(--color-muted)] uppercase">Account Number</span>
            <input
              type="text"
              inputMode="numeric"
              value={accNum}
              onChange={(e) => {
                const filtered = e.target.value.replace(/\D/g, "").slice(0, 6);
                setAccNum(filtered);
              }}
              onKeyDown={(e) => {
                if (/^[a-zA-Z]$/.test(e.key) && !e.ctrlKey && !e.metaKey) e.preventDefault();
              }}
              placeholder="Last 6 digits"
              maxLength={6}
              className="w-full h-10 rounded-[8px] bg-[var(--color-canvas-dark)] border border-[var(--color-hairline-on-dark)] text-[13px] text-white px-3 font-num focus:outline-none focus:border-[var(--color-primary)]/40 placeholder:text-[var(--color-muted)] transition"
            />
          </label>
          <Input label="Opening balance" value={balance} onChange={(e) => setBalance(e.target.value)} placeholder="e.g. 1000" inputMode="decimal" type="text" />
          <Textarea label="Description" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Optional note — e.g. Primary account, daily expenses" rows={2} />
          <DatePicker label="Date" value={date} onChange={setDate} placeholder="Pick date" max={todayISO()} />
          <label className="flex items-center gap-2 cursor-pointer mt-1">
            <input 
              type="checkbox" 
              checked={allowNegative}
              onChange={(e) => setAllowNegative(e.target.checked)}
              className="w-4 h-4 rounded-[4px] bg-[var(--color-canvas-dark)] border border-[var(--color-hairline-on-dark)] accent-[var(--color-primary)]"
            />
            <span className="text-[12px] font-medium text-[var(--color-muted-strong)]">Allow Negative Balance (spend beyond 0)</span>
          </label>
          {formErr && <div className="text-[11px] font-semibold text-[var(--color-trading-down)] flex items-center gap-1.5"><AlertTriangle size={12} /> {formErr}</div>}
          <div className="pt-2 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editId ? "Save changes" : "Add account"}</Button>
          </div>
        </div>
      </Dialog>

      {/* List — scrollable */}
      <div className="mt-4 flex-1 min-h-0 rounded-[12px] bg-[var(--color-surface-card-dark)] border border-[var(--color-hairline-on-dark)] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-[var(--color-hairline-on-dark)] flex flex-col sm:flex-row sm:items-center gap-3 bg-[var(--color-canvas-dark)] shrink-0">
          <div className="flex items-center gap-3">
            <h3 className="text-[13px] font-bold text-white flex items-center gap-2"><Wallet size={14} className="text-[var(--color-muted)]" /> All accounts</h3>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--color-surface-elevated-dark)] border border-[var(--color-hairline-on-dark)] text-[var(--color-muted-strong)] font-bold">{filtered.length}</span>
          </div>
          <div className="flex items-center gap-2 sm:ml-auto w-full sm:w-auto">
            <div className="flex bg-[var(--color-surface-elevated-dark)] p-0.5 rounded-[8px] border border-[var(--color-hairline-on-dark)] shrink-0">
              <button onClick={() => setViewMode("list")} className={`p-1.5 rounded-[6px] transition ${viewMode === "list" ? "bg-[var(--color-surface-card-dark)] text-white shadow-sm" : "text-[var(--color-muted)] hover:text-white"}`}><LayoutList size={14}/></button>
              <button onClick={() => setViewMode("card")} className={`p-1.5 rounded-[6px] transition ${viewMode === "card" ? "bg-[var(--color-surface-card-dark)] text-white shadow-sm" : "text-[var(--color-muted)] hover:text-white"}`}><LayoutGrid size={14}/></button>
            </div>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter by name…" className="h-8 w-full sm:w-[220px] rounded-[8px] bg-[var(--color-canvas-dark)] border border-[var(--color-hairline-on-dark)] text-white placeholder:text-[var(--color-muted)] text-[12px] px-3 focus:outline-none focus:border-[var(--color-primary)]/40" />
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-auto">
          {loading ? (
            <div className="p-8 text-center text-[11px] text-[var(--color-muted)]">Loading SQLite…</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-[12px] font-bold text-white">No accounts yet</div>
              <div className="text-[11px] text-[var(--color-muted)] mt-1">Add your first main account above — e.g. bank, cash, UPI.</div>
            </div>
          ) : viewMode === "list" ? (
            <div className="h-full">
              <div className="hidden md:block h-full">
                <DataTable columns={columns} data={filtered} keyExtractor={(a) => a.id} />
              </div>
              <div className="md:hidden flex flex-col gap-3 p-4">
                {filtered.map((a) => (
                  <div key={a.id} className={`bg-[var(--color-surface-card-dark)] p-4 rounded-lg shadow-md w-full font-sans border border-[var(--color-hairline-on-dark)] ${a.isClosed ? 'opacity-60 grayscale' : ''}`}>
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[var(--color-surface-elevated-dark)] border border-[var(--color-hairline-on-dark)] text-white shrink-0">
                          <Wallet size={16} />
                        </div>
                        <div className="flex flex-col">
                          <h3 className="text-white font-semibold text-[14px] leading-tight max-w-[160px] flex items-center gap-2 truncate">
                            {displayName(a.name)}
                            {a.isClosed && <span className="text-[10px] bg-[var(--color-surface-elevated-dark)] border border-[var(--color-hairline-on-dark)] px-1.5 py-0.5 rounded text-[var(--color-muted)] font-normal tracking-wide">Closed</span>}
                          </h3>
                          <span className="text-[var(--color-muted)] text-[11px] mt-0.5 tracking-wide truncate max-w-[160px]">
                            {a.description ? displayName(a.description) : "No description"}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <span className="font-num font-bold text-[14px] text-white">
                          ₹{Number(a.currentBalance).toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center text-[11px] text-[var(--color-muted-strong)] mt-2 bg-[var(--color-surface-elevated-dark)] px-3 py-2 rounded-[6px]">
                      <span className="font-num shrink-0">{a.date}</span>
                    </div>

                    <div className="flex justify-end items-center mt-2 border-t border-[var(--color-hairline-on-dark)] pt-3">
                      {!a.isClosed && (
                        <div className="flex gap-1 text-[var(--color-muted)] shrink-0">
                          <button onClick={() => openEdit(a)} className="w-8 h-8 rounded-[6px] hover:text-[#fcd535] hover:bg-[#fcd535]/10 flex items-center justify-center transition-colors" aria-label="Edit">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => openDeleteDialog(a.id, a.name)} className="w-8 h-8 rounded-[6px] hover:text-[var(--color-trading-down)] hover:bg-[var(--color-trading-down)]/10 flex items-center justify-center transition-colors" aria-label="Delete">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((a) => (
                <div key={a.id} className={`rounded-[12px] p-4 bg-[var(--color-canvas-dark)] border border-[var(--color-hairline-on-dark)] hover:border-[var(--color-primary)]/20 transition flex flex-col gap-3 group ${a.isClosed ? 'opacity-60 grayscale' : ''}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="w-10 h-10 rounded-[8px] bg-[var(--color-surface-elevated-dark)] border border-[var(--color-hairline-on-dark)] flex items-center justify-center text-white shrink-0">
                      <Wallet size={16} />
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0 -mr-1 -mt-1">
                      {!a.isClosed && (
                        <>
                          <button onClick={() => openEdit(a)} className="w-7 h-7 rounded-[6px] bg-transparent border border-transparent hover:bg-[#fcd535]/10 hover:border-[#fcd535]/20 text-[var(--color-muted)] hover:text-[#fcd535] flex items-center justify-center transition" aria-label="Edit">
                            <Pencil size={14} />
                          </button>
                          <button onClick={() => openDeleteDialog(a.id, a.name)} className="w-7 h-7 rounded-[6px] bg-transparent border border-transparent hover:bg-[var(--color-trading-down)]/10 hover:border-[var(--color-trading-down)]/20 text-[var(--color-muted)] hover:text-[var(--color-trading-down)] flex items-center justify-center transition" aria-label="Delete">
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="text-[14px] font-bold text-white flex items-center gap-2 truncate">
                      {displayName(a.name)}
                      {a.isClosed && <span className="text-[10px] bg-[var(--color-surface-elevated-dark)] border border-[var(--color-hairline-on-dark)] px-1.5 py-0.5 rounded text-[var(--color-muted)] font-normal tracking-wide">Closed</span>}
                    </div>
                    <div className="text-[12px] text-[var(--color-muted)] mt-1 truncate">{a.description ? displayName(a.description) : "No description"}</div>
                  </div>
                  <div className="mt-auto pt-3 border-t border-[var(--color-hairline-on-dark)] flex items-end justify-between">
                    <div>
                      <div className="text-[11px] font-medium text-[var(--color-muted)]">Current Balance</div>
                      <div className="text-[14px] font-bold font-num text-white mt-0.5">₹{Number(a.currentBalance).toLocaleString("en-IN")}</div>
                    </div>
                    <div className="text-[11px] font-num text-[var(--color-muted-strong)]">{a.date}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 max-w-[90vw] bg-[var(--color-surface-card-dark)] text-white border border-[var(--color-primary)]/30 px-4 py-2 rounded-[8px] text-[12px] font-semibold shadow-xl flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] shrink-0" />
          <span className="truncate">{toast}</span>
        </div>
      )}
      <Dialog open={!!deleteAccountState} onClose={() => setDeleteAccountState(null)} title="Delete Account" showClose maxWidth="max-w-[400px]">
        {deleteAccountState && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-[var(--color-muted-strong)]">
              Are you sure you want to delete or close the account <strong>{displayName(deleteAccountState.name)}</strong>?
            </p>
            <Input 
              label="Type 'confirm' to proceed" 
              value={deleteConfirmText} 
              onChange={(e) => setDeleteConfirmText(e.target.value)} 
              placeholder="confirm" 
            />
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold tracking-wide text-[var(--color-muted)] uppercase">CAPTCHA Verification</span>
              <div className="flex gap-3">
                <div className="w-24 h-10 bg-[var(--color-surface-card-dark)] border border-[var(--color-hairline-on-dark)] rounded-[8px] flex items-center justify-center font-mono font-bold text-white tracking-widest select-none">
                  {deleteCaptcha}
                </div>
                <input 
                  type="text" 
                  value={deleteCaptchaInput} 
                  onChange={(e) => setDeleteCaptchaInput(e.target.value)} 
                  className="flex-1 h-10 rounded-[8px] bg-[var(--color-canvas-dark)] border border-[var(--color-hairline-on-dark)] text-[13px] text-white px-3 font-mono focus:outline-none focus:border-[var(--color-primary)]/40 placeholder:text-[var(--color-muted)] transition"
                  placeholder="Enter CAPTCHA"
                />
              </div>
            </div>
            <div className="pt-2 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setDeleteAccountState(null)}>Cancel</Button>
              <Button onClick={executeDelete} disabled={deleteConfirmText.toLowerCase() !== "confirm" || deleteCaptchaInput !== deleteCaptcha} className="bg-[var(--color-trading-down)] hover:bg-[var(--color-trading-down)]/90 text-white border-transparent">
                Delete
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}
