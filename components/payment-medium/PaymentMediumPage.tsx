"use client";
import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Pencil, Wifi, Banknote } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { DataTable, ColumnDef } from "@/components/ui/DataTable";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { PaymentMedium, PaymentMediumGroup, dbGetPaymentMediums, dbAddPaymentMedium, dbUpdatePaymentMedium, dbDeletePaymentMedium } from "@/lib/db";
import { displayName } from "@/lib/stringUtils";

export function PaymentMediumPage() {
  const [mediums, setMediums] = useState<PaymentMedium[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [name, setName] = useState("");
  const [group, setGroup] = useState<PaymentMediumGroup>("online");
  const [formErr, setFormErr] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [query, setQuery] = useState("");

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
    await dbDeletePaymentMedium(m.id);
    showToast("Payment medium deleted");
    await refresh();
  };

  const filtered = useMemo(() => {
    if (!query.trim()) return mediums;
    const q = query.toLowerCase();
    return mediums.filter(m => m.name.includes(q) || m.group.includes(q));
  }, [mediums, query]);

  const onlineMediums = useMemo(() => filtered.filter(m => m.group === "online"), [filtered]);
  const offlineMediums = useMemo(() => filtered.filter(m => m.group === "offline"), [filtered]);

  const columns: ColumnDef<PaymentMedium>[] = [
    {
      header: "Name",
      accessorKey: "name",
      cell: (m) => (
        <div className="flex items-center gap-2">
          {m.group === "online" ? <Wifi className="w-3.5 h-3.5 text-[var(--color-accent)]" /> : <Banknote className="w-3.5 h-3.5 text-[var(--color-trading-up)]" />}
          <span className="font-medium text-[13px]">{displayName(m.name)}</span>
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
    <div className="h-full min-h-0 flex flex-col xl:max-w-[80%] max-w-[1000px] mx-auto px-6 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div>
          <h1 className="text-[20px] font-extrabold tracking-tight">Payment Mediums</h1>
          <p className="text-[12px] text-[var(--color-muted)] mt-0.5">Manage how you pay — online and offline mediums</p>
        </div>
        <Button onClick={openAdd} size="sm" className="self-start"><Plus className="w-3.5 h-3.5 mr-1.5" />Add Medium</Button>
      </div>

      {/* Online Section */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-2">
          <Wifi className="w-4 h-4 text-[var(--color-accent)]" />
          <h2 className="text-[13px] font-bold uppercase tracking-wider text-[var(--color-accent)]">Online</h2>
          <span className="text-[11px] text-[var(--color-muted)]">({onlineMediums.length})</span>
        </div>
        <div className="rounded-[12px] bg-[var(--color-surface-card-dark)] border border-[var(--color-hairline-on-dark)] overflow-hidden">
          {onlineMediums.length === 0 ? (
            <p className="text-[12px] text-[var(--color-muted)] p-4 italic">No online payment mediums</p>
          ) : (
            <DataTable columns={columns} data={onlineMediums} keyExtractor={(m) => m.id} />
          )}
        </div>
      </div>

      {/* Offline Section */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-2">
          <Banknote className="w-4 h-4 text-[var(--color-trading-up)]" />
          <h2 className="text-[13px] font-bold uppercase tracking-wider text-[var(--color-trading-up)]">Offline</h2>
          <span className="text-[11px] text-[var(--color-muted)]">({offlineMediums.length})</span>
        </div>
        <div className="rounded-[12px] bg-[var(--color-surface-card-dark)] border border-[var(--color-hairline-on-dark)] overflow-hidden">
          {offlineMediums.length === 0 ? (
            <p className="text-[12px] text-[var(--color-muted)] p-4 italic">No offline payment mediums</p>
          ) : (
            <DataTable columns={columns} data={offlineMediums} keyExtractor={(m) => m.id} />
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

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[var(--color-surface-card-dark)] border border-[var(--color-hairline-on-dark)] text-[var(--color-text)] text-[12px] font-semibold px-4 py-2.5 rounded-[10px] shadow-lg z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
          {toast}
        </div>
      )}
    </div>
  );
}
