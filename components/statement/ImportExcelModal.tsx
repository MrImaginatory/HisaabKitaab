"use client";
import { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { X, CheckCircle, AlertCircle } from "lucide-react";
import { Transaction, ComputedAccount, Category, PaymentMedium, dbAddTransactions } from "@/lib/db";

interface ImportExcelModalProps {
  file: File;
  accounts: ComputedAccount[];
  categories: Category[];
  paymentMediums: PaymentMedium[];
  existingTxns: Transaction[];
  onClose: () => void;
  onSuccess: () => void;
}

interface ParsedRow {
  date: string;
  categoryName: string;
  notes: string;
  paymentModeName: string;
  accountName: string;
  credit: number;
  debit: number;
}

export function ImportExcelModal({
  file,
  accounts,
  categories,
  paymentMediums,
  existingTxns,
  onClose,
  onSuccess,
}: ImportExcelModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newTxns, setNewTxns] = useState<Omit<Transaction, "id" | "createdAt">[]>([]);
  const [ignoredCount, setIgnoredCount] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const parse = async () => {
      try {
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: "array" });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        const parsed: ParsedRow[] = data
          .filter((row) => row["Date"] && row["Date"] !== "") // Skip empty or total rows
          .map((row) => ({
            date: String(row["Date"] || ""),
            categoryName: String(row["Category"] || "").toLowerCase(),
            notes: String(row["Notes"] || ""),
            paymentModeName: String(row["Payment Mode"] || "").toLowerCase(),
            accountName: String(row["Account"] || "").toLowerCase(),
            credit: Number(row["Credit"]) || 0,
            debit: Number(row["Debit"]) || 0,
          }));

        const toAdd: Omit<Transaction, "id" | "createdAt">[] = [];
        let ignored = 0;

        for (const row of parsed) {
          // find account
          const acc = accounts.find((a) => a.name.toLowerCase() === row.accountName);
          if (!acc) {
            ignored++;
            continue; // Cannot import without a valid account
          }

          // find category
          let catId = "";
          let type: "income" | "expense" | "transfer" = row.credit > 0 ? "income" : "expense";
          if (row.categoryName === "self transfer") {
            type = "transfer";
          } else {
            const cat = categories.find((c) => c.name.toLowerCase() === row.categoryName);
            if (cat) catId = cat.id;
          }

          // find payment medium
          let pmId = "";
          if (row.paymentModeName !== "—" && row.paymentModeName !== "") {
            const pmClean = row.paymentModeName.split("·").pop()?.trim() || "";
            const pm = paymentMediums.find((m) => m.name.toLowerCase() === pmClean);
            if (pm) pmId = pm.id;
          }

          const amount = row.credit > 0 ? row.credit : row.debit;
          if (amount <= 0) {
            ignored++;
            continue;
          }

          // Check if already exists in DB
          const exists = existingTxns.find(
            (t) =>
              t.date === row.date &&
              t.amount === amount &&
              (t.type === type || (t.type === "transfer" && type === "transfer")) &&
              (t.categoryId === catId || t.type === "transfer") &&
              t.reason === row.notes &&
              (t.accountId === acc.id || t.toAccountId === acc.id)
          );

          if (exists) {
            ignored++;
          } else {
            toAdd.push({
              type,
              amount,
              accountId: acc.id,
              toAccountId: "", // We can't perfectly reconstruct both sides of a transfer from a single row export
              categoryId: catId,
              paymentMediumId: pmId,
              reason: row.notes,
              notes: "",
              date: row.date,
            });
          }
        }

        setNewTxns(toAdd);
        setIgnoredCount(ignored);
        setLoading(false);
      } catch (err: any) {
        console.error(err);
        setError("Failed to parse the Excel file. Make sure it was exported from this app.");
        setLoading(false);
      }
    };
    parse();
  }, [file, accounts, categories, paymentMediums, existingTxns]);

  const handleSave = async () => {
    setSaving(true);
    const res = await dbAddTransactions(newTxns);
    if (res.ok) {
      onSuccess();
    } else {
      setError(res.error || "Failed to save transactions");
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--color-canvas-dark)]/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-[600px] bg-[var(--color-surface-card-dark)] border border-[var(--color-hairline-on-dark)] rounded-[12px] shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--color-hairline-on-dark)]">
          <div>
            <h2 className="text-[16px] font-bold text-white tracking-tight leading-none">Import Excel</h2>
            <p className="text-[12px] text-[var(--color-muted)] mt-1.5 leading-none">Preview and confirm new transactions</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-[var(--color-surface-elevated-dark)] flex items-center justify-center text-[var(--color-muted)] hover:text-white transition">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex-1 min-h-0 overflow-y-auto">
          {loading ? (
            <div className="flex justify-center items-center py-10 text-[12px] text-[var(--color-muted)]">Parsing file...</div>
          ) : error ? (
            <div className="bg-[var(--color-trading-down)]/10 border border-[var(--color-trading-down)]/20 p-4 rounded-[8px] flex items-start gap-3">
              <AlertCircle size={16} className="text-[var(--color-trading-down)] mt-0.5" />
              <div className="text-[12px] text-[var(--color-trading-down)] leading-relaxed">{error}</div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-[var(--color-surface-elevated-dark)] border border-[var(--color-hairline-on-dark)] rounded-[8px]">
                  <div className="text-[20px] font-bold text-white leading-none">{newTxns.length}</div>
                  <div className="text-[11px] text-[var(--color-muted)] mt-1.5 font-medium">New records found</div>
                </div>
                <div className="p-3 bg-[var(--color-surface-elevated-dark)] border border-[var(--color-hairline-on-dark)] rounded-[8px]">
                  <div className="text-[20px] font-bold text-white leading-none">{ignoredCount}</div>
                  <div className="text-[11px] text-[var(--color-muted)] mt-1.5 font-medium">Ignored (duplicate/invalid)</div>
                </div>
              </div>

              {newTxns.length > 0 && (
                <div className="border border-[var(--color-hairline-on-dark)] rounded-[8px] overflow-hidden">
                  <div className="max-h-[300px] overflow-y-auto no-scrollbar">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-[var(--color-surface-elevated-dark)] sticky top-0 border-b border-[var(--color-hairline-on-dark)] z-10">
                        <tr>
                          <th className="px-3 py-2 text-[10px] font-bold tracking-widest text-[var(--color-muted-strong)] uppercase">Date</th>
                          <th className="px-3 py-2 text-[10px] font-bold tracking-widest text-[var(--color-muted-strong)] uppercase">Details</th>
                          <th className="px-3 py-2 text-[10px] font-bold tracking-widest text-[var(--color-muted-strong)] uppercase text-right">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--color-hairline-on-dark)]">
                        {newTxns.slice(0, 50).map((t, i) => (
                          <tr key={i} className="hover:bg-[var(--color-surface-elevated-dark)] transition-colors">
                            <td className="px-3 py-2.5 text-[12px] font-num text-[var(--color-muted)] whitespace-nowrap">{t.date}</td>
                            <td className="px-3 py-2.5 min-w-0">
                              <div className="text-[13px] font-medium text-white truncate max-w-[200px]">{t.reason}</div>
                            </td>
                            <td className="px-3 py-2.5 text-right whitespace-nowrap">
                              <span className={`text-[13px] font-num font-bold ${t.type === "income" ? "text-[var(--color-trading-up)]" : "text-[var(--color-trading-down)]"}`}>
                                {t.type === "income" ? "+" : "-"}{t.amount}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {newTxns.length > 50 && (
                    <div className="px-3 py-2 text-center text-[11px] text-[var(--color-muted)] bg-[var(--color-surface-elevated-dark)] border-t border-[var(--color-hairline-on-dark)]">
                      + {newTxns.length - 50} more records
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-[var(--color-hairline-on-dark)] flex items-center justify-end gap-3 bg-[var(--color-surface-card-dark)] shrink-0">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 rounded-[6px] border border-[var(--color-hairline-on-dark)] text-[13px] font-bold text-[var(--color-muted-strong)] hover:text-white hover:bg-[var(--color-surface-elevated-dark)] transition disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={newTxns.length === 0 || saving || !!error || loading}
            className="px-5 py-2 rounded-[6px] bg-[var(--color-primary)] text-[var(--color-on-primary)] text-[13px] font-bold hover:bg-[var(--color-primary-active)] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving ? (
              <>Saving...</>
            ) : (
              <>
                <CheckCircle size={14} strokeWidth={2.5} />
                Confirm Import
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
