"use client";
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Pencil, Wifi, Banknote, LayoutList, LayoutGrid, Check, X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { DataTable, ColumnDef } from "@/components/ui/DataTable";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { PaymentMedium, PaymentMediumGroup, dbGetPaymentMediums, dbAddPaymentMedium, dbUpdatePaymentMedium, dbDeletePaymentMediums } from "@/lib/db";
import { displayName } from "@/lib/stringUtils";

export function PaymentMediumPage() {
  const [mediums, setMediums] = useState<PaymentMedium[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "card">("list");
  const [name, setName] = useState("");
  const [group, setGroup] = useState<PaymentMediumGroup>("online");
  const [formErr, setFormErr] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [bulkConfirmText, setBulkConfirmText] = useState("");

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleBulkDelete = async () => {
    if (bulkConfirmText !== "confirm") {
      showToast("You must type 'confirm' exactly.");
      return;
    }
    await dbDeletePaymentMediums(Array.from(selectedIds));
    setBulkConfirmOpen(false);
    setBulkConfirmText("");
    setSelectedIds(new Set());
    await refresh();
    showToast(`Deleted selected payment mediums.`);
  };


  const refresh = async () => {
    const meds = await dbGetPaymentMediums();
    setMediums(meds);
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
    if (editId) {
      const res = await dbUpdatePaymentMedium(editId, name, group);
      if (!res.ok) { setFormErr(res.error ?? "Failed"); return; }
      showToast("Payment medium updated");
    } else {
      const res = await dbAddPaymentMedium(name, group);
      if (!res.ok) { setFormErr(res.error ?? "Failed"); return; }
      showToast("Payment medium added");
    }
    setIsAddOpen(false);
    await refresh();
  };

  const openAdd = () => {
    setEditId(null);
    setName("");
    setGroup("online");
    setFormErr(null);
    setIsAddOpen(true);
  };

  const openEdit = (m: PaymentMedium) => {
    setEditId(m.id);
    setName(m.name);
    setGroup(m.group);
    setFormErr(null);
    setIsAddOpen(true);
  };

  const handleDelete = async (m: PaymentMedium) => {
    if (!confirm(`Delete payment medium "${displayName(m.name)}"?`)) return;
    await dbDeletePaymentMediums([m.id]);
    showToast("Payment medium deleted");
    await refresh();
  };

  const filtered = useMemo(() => {
    if (!query.trim()) return mediums;
    const q = query.toLowerCase();
    return mediums.filter(m => m.name.toLowerCase().includes(q) || m.group.toLowerCase().includes(q));
  }, [mediums, query]);

  const columns: ColumnDef<PaymentMedium>[] = [
    {
      header: "",
      cell: (m) => (
        <button onClick={(e) => { e.stopPropagation(); toggleSelect(m.id); }} className="w-5 h-5 rounded flex items-center justify-center border border-[var(--color-hairline-on-dark)] hover:border-white transition shrink-0" style={{ background: selectedIds.has(m.id) ? "var(--color-primary)" : "transparent", color: selectedIds.has(m.id) ? "black" : "transparent" }}>
          {selectedIds.has(m.id) ? <Check size={14} strokeWidth={3} /> : null}
        </button>
      ),
      className: "w-[50px] pr-0",
      sortable: false
    },
    {
      header: "Name",
      accessorKey: "name",
      cell: (m) => (
        <div className="flex items-center gap-2">
          {m.group === "online" ? <Wifi className="w-3.5 h-3.5 text-[var(--color-accent)]" /> : <Banknote className="w-3.5 h-3.5 text-[var(--color-trading-up)]" />}
          <span className={`font-medium text-[13px] ${m.isDeleted ? "text-[var(--color-muted)] line-through" : "text-white"}`}>{displayName(m.name)}</span>
        </div>
      ),
    },
    {
      header: "Type",
      accessorKey: "group",
      cell: (m) => (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${m.group === "online" ? "bg-[var(--color-accent)]/15 text-[var(--color-accent)]" : "bg-[var(--color-trading-up)]/15 text-[var(--color-trading-up)]"}`}>
          {m.group}
        </span>
      ),
    },
    {
      header: "",
      cell: (m) => (
        <div className="flex items-center gap-1 justify-end">
          <button onClick={() => openEdit(m)} className="p-1.5 rounded-[6px] text-[var(--color-muted)] hover:text-[var(--color-accent)] hover:bg-white/5 transition"><Pencil className="w-3.5 h-3.5" /></button>
          <button onClick={() => handleDelete(m)} className="p-1.5 rounded-[6px] text-[var(--color-muted)] hover:text-[var(--color-trading-down)] hover:bg-white/5 transition"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      ),
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin" />
          <p className="text-[13px] font-medium text-[var(--color-muted)]">Loading SQLite...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 flex flex-col xl:max-w-[80%] max-w-[1000px] mx-auto px-6 py-6 overflow-y-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <h1 className="text-[20px] font-extrabold tracking-tight">Payment Mediums</h1>
          <p className="text-[12px] text-[var(--color-muted)] mt-0.5">Manage how you pay — online and offline mediums</p>
        </div>
        <Button onClick={openAdd} size="sm" className="w-full sm:w-auto"><Plus className="w-3.5 h-3.5 mr-1.5" />Add Medium</Button>
      </div>

      <div className="mt-4 flex-1 min-h-0 rounded-[12px] bg-[var(--color-surface-card-dark)] border border-[var(--color-hairline-on-dark)] overflow-hidden flex flex-col">
        <div className="p-4 border-b border-[var(--color-hairline-on-dark)] flex flex-col sm:flex-row sm:items-center gap-3 bg-[var(--color-canvas-dark)] shrink-0">
          <div className="flex items-center gap-3">
            <h3 className="text-[13px] font-bold text-white">All mediums</h3>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--color-surface-elevated-dark)] border border-[var(--color-hairline-on-dark)] text-[var(--color-muted-strong)] font-bold">{filtered.length}</span>
          </div>
          <div className="flex items-center gap-2 sm:ml-auto w-full sm:w-auto">
            <div className="flex bg-[var(--color-surface-elevated-dark)] p-0.5 rounded-[8px] border border-[var(--color-hairline-on-dark)] shrink-0">
              <button onClick={() => setViewMode("list")} className={`p-1.5 rounded-[6px] transition ${viewMode === "list" ? "bg-[var(--color-surface-card-dark)] text-white shadow-sm" : "text-[var(--color-muted)] hover:text-white"}`}><LayoutList size={14}/></button>
              <button onClick={() => setViewMode("card")} className={`p-1.5 rounded-[6px] transition ${viewMode === "card" ? "bg-[var(--color-surface-card-dark)] text-white shadow-sm" : "text-[var(--color-muted)] hover:text-white"}`}><LayoutGrid size={14}/></button>
            </div>
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter by name or type…" className="h-8 w-full sm:w-[220px] rounded-[8px] bg-[var(--color-canvas-dark)] border border-[var(--color-hairline-on-dark)] text-white placeholder:text-[var(--color-muted)] text-[12px] px-3 focus:outline-none focus:border-[var(--color-primary)]/40" />
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-auto">
          {loading ? (
            <div className="p-8 text-center text-[11px] text-[var(--color-muted)]">Loading SQLite…</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-[12px] font-bold text-white">No payment mediums yet</div>
              <div className="text-[11px] text-[var(--color-muted)] mt-1">Add one above.</div>
            </div>
          ) : viewMode === "list" ? (
            <div className="h-full">
              <div className="hidden md:block h-full">
                <DataTable columns={columns} data={filtered} keyExtractor={(m) => m.id} />
              </div>
              <div className="md:hidden flex flex-col gap-3 p-4">
                {filtered.map((m) => (
                  <div key={m.id} className="bg-[var(--color-surface-card-dark)] p-4 rounded-lg shadow-md w-full font-sans border border-[var(--color-hairline-on-dark)]">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-3">
                        <button onClick={() => toggleSelect(m.id)} className="w-10 h-10 rounded-full flex items-center justify-center border shrink-0 relative overflow-hidden transition-all" style={{ background: selectedIds.has(m.id) ? "var(--color-primary)" : "var(--color-surface-elevated-dark)", color: selectedIds.has(m.id) ? "black" : (m.group === "online" ? "var(--color-accent)" : "var(--color-trading-up)"), borderColor: selectedIds.has(m.id) ? "var(--color-primary)" : "var(--color-hairline-on-dark)" }}>
                          {selectedIds.has(m.id) ? <Check size={20} strokeWidth={3} /> : (m.group === "online" ? <Wifi className="w-4 h-4" /> : <Banknote className="w-4 h-4" />)}
                        </button>
                        <h3 className="text-white font-semibold text-[14px] leading-tight max-w-[160px] truncate">
                          {displayName(m.name)}
                        </h3>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${m.group === "online" ? "bg-[var(--color-accent)]/15 text-[var(--color-accent)] border-[var(--color-accent)]/20" : "bg-[var(--color-trading-up)]/15 text-[var(--color-trading-up)] border-[var(--color-trading-up)]/20"}`}>
                          {m.group.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex justify-end items-center mt-2 border-t border-[var(--color-hairline-on-dark)] pt-3">
                      <div className="flex gap-1 text-[var(--color-muted)] shrink-0">
                        <button onClick={() => openEdit(m)} className="w-8 h-8 rounded-[6px] hover:text-[#fcd535] hover:bg-[#fcd535]/10 flex items-center justify-center transition-colors" aria-label="Edit">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => handleDelete(m)} className="w-8 h-8 rounded-[6px] hover:text-[var(--color-trading-down)] hover:bg-[var(--color-trading-down)]/10 flex items-center justify-center transition-colors" aria-label="Delete">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {filtered.map((m) => (
                <div key={m.id} className="rounded-[12px] p-4 bg-[var(--color-canvas-dark)] border border-[var(--color-hairline-on-dark)] hover:border-[var(--color-primary)]/20 transition flex flex-col gap-3 group relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1" style={{ background: m.group === "online" ? "var(--color-accent)" : "var(--color-trading-up)" }} />
                  <div className="flex items-start justify-between gap-3 mt-1">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center bg-[var(--color-surface-elevated-dark)] border border-white/10 shrink-0">
                        {m.group === "online" ? <Wifi size={12} className="text-[var(--color-accent)]" /> : <Banknote size={12} className="text-[var(--color-trading-up)]" />}
                      </div>
                      <span className="text-[13px] font-bold text-white truncate">{displayName(m.name)}</span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0 -mr-2 -mt-1.5">
                      <button onClick={() => openEdit(m)} className="w-7 h-7 rounded-[6px] bg-transparent border border-transparent hover:bg-[#fcd535]/10 hover:border-[#fcd535]/20 text-[var(--color-muted)] hover:text-[#fcd535] flex items-center justify-center transition" aria-label="Edit">
                        <Pencil size={14} />
                      </button>
                      <button onClick={() => handleDelete(m)} className="w-7 h-7 rounded-[6px] bg-transparent border border-transparent hover:bg-[var(--color-trading-down)]/10 hover:border-[var(--color-trading-down)]/20 text-[var(--color-muted)] hover:text-[var(--color-trading-down)] flex items-center justify-center transition" aria-label="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${m.group === "online" ? "bg-[var(--color-accent)]/15 text-[var(--color-accent)] border-[var(--color-accent)]/20" : "bg-[var(--color-trading-up)]/15 text-[var(--color-trading-up)] border-[var(--color-trading-up)]/20"}`}>
                      {m.group.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={isAddOpen} onClose={() => setIsAddOpen(false)} title={editId ? "Edit Payment Medium" : "Add Payment Medium"} showClose maxWidth="max-w-[400px]">
        <div className="flex flex-col gap-4">
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. UPI, Cash, Cheque" autoFocus />
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold tracking-wide text-[var(--color-muted)] uppercase">Type</span>
            <Select
              value={group}
              onChange={(v) => setGroup(v as PaymentMediumGroup)}
              options={[
                { value: "online", label: "Online" },
                { value: "offline", label: "Offline" },
              ]}
              ariaLabel="Payment medium type"
            />
          </label>
          {formErr && <div className="text-[11px] font-semibold text-[var(--color-trading-down)]">{formErr}</div>}
          <div className="pt-2 flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setIsAddOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editId ? "Save changes" : "Add Medium"}</Button>
          </div>
        </div>
      </Dialog>

      {selectedIds.size > 0 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-[var(--color-surface-card-dark)] border border-[var(--color-primary)]/40 shadow-[0_4px_24px_rgba(0,0,0,0.6)] px-4 py-3 rounded-full flex items-center gap-4 z-50">
          <span className="text-[13px] font-bold text-white px-2">{selectedIds.size} selected</span>
          <div className="w-px h-4 bg-[var(--color-hairline-on-dark)]"></div>
          <Button variant="tradingDown" size="sm" onClick={() => setBulkConfirmOpen(true)}>
            <Trash2 size={14} /> Delete Selected
          </Button>
          <button onClick={() => setSelectedIds(new Set())} className="p-1.5 rounded-full hover:bg-[var(--color-surface-elevated-dark)] text-[var(--color-muted)] hover:text-white transition">
            <X size={16} />
          </button>
        </div>
      )}
      
      <Dialog open={bulkConfirmOpen} onClose={() => { setBulkConfirmOpen(false); setBulkConfirmText(""); }} title="Confirm Deletion" showClose maxWidth="max-w-[400px]">
        <div className="flex flex-col gap-4">
          <div className="text-[13px] text-[var(--color-muted-strong)] leading-relaxed">
            You are about to delete <b>{selectedIds.size}</b> payment mediums. Mediums linked to existing transactions will be soft-deleted (hidden from dropdowns but kept for history). Unlinked mediums will be permanently erased.
          </div>
          <div className="bg-[var(--color-trading-down)]/10 border border-[var(--color-trading-down)]/20 p-3 rounded-[8px] flex items-start gap-3">
            <AlertTriangle className="text-[var(--color-trading-down)] shrink-0 mt-0.5" size={16} />
            <div className="text-[12px] text-[var(--color-trading-down)]/90 leading-relaxed font-medium">
              Please type <span className="font-mono bg-[var(--color-trading-down)]/20 px-1.5 py-0.5 rounded text-[var(--color-trading-down)]">confirm</span> below to proceed.
            </div>
          </div>
          <Input 
            label="Confirmation" 
            placeholder="Type 'confirm'..." 
            value={bulkConfirmText} 
            onChange={(e) => setBulkConfirmText(e.target.value)} 
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => { setBulkConfirmOpen(false); setBulkConfirmText(""); }}>Cancel</Button>
            <Button variant="tradingDown" onClick={handleBulkDelete} disabled={bulkConfirmText !== "confirm"}>Delete</Button>
          </div>
        </div>
      </Dialog>


      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[var(--color-surface-card-dark)] border border-[var(--color-hairline-on-dark)] text-[var(--color-text)] text-[12px] font-semibold px-4 py-2.5 rounded-[10px] shadow-lg z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
          {toast}
        </div>
      )}
    </div>
  );
}
