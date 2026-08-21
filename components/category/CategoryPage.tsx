"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Upload, Download, Trash2, AlertTriangle, Check, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Select } from "@/components/ui/Select";
import { Category, CategoryType, ParsedCsvRow, analyzeForPreview, parseCategoryCsv, sampleCsv } from "@/lib/categoryStore";
import { dbGetCategories, dbAddCategory, dbDeleteCategory } from "@/lib/db";

export function CategoryPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [type, setType] = useState<CategoryType>("expense");
  const [color, setColor] = useState("#fcd535");
  const [formErr, setFormErr] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const [previewOpen, setPreviewOpen] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedCsvRow[]>([]);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const refresh = async () => {
    const cats = await dbGetCategories();
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

  const handleAdd = async () => {
    setFormErr(null);
    const res = await dbAddCategory({ name, type, color });
    if (!res.ok) {
      setFormErr(res.error ?? "Failed");
      return;
    }
    setName("");
    await refresh();
    showToast(`Added "${res.category?.name}"`);
  };

  const handleDelete = async (id: string, n: string) => {
    if (!confirm(`Delete category "${n}"?`)) return;
    await dbDeleteCategory(id);
    await refresh();
    showToast(`Deleted "${n}"`);
  };

  const handleCsvPick: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const rows = parseCategoryCsv(text);
    if (rows.length === 0) {
      showToast("CSV is empty or unreadable");
      e.target.value = "";
      return;
    }
    setParsedRows(rows);
    setPreviewOpen(true);
    e.target.value = "";
  };

  const analysis = useMemo(() => analyzeForPreview(parsedRows, categories), [parsedRows, categories]);
  const importableCount = parsedRows.length - analysis.duplicatesAgainstDb.size - analysis.duplicatesInsideCsv.size - analysis.invalid.size;

  const handleConfirmImport = async () => {
    const skipped: string[] = [];
    const toAdd: { name: string; type: CategoryType; color: string }[] = [];
    parsedRows.forEach((r, i) => {
      if (analysis.invalid.has(i)) {
        skipped.push(`${r.name || `(row ${r.rowIndex})`} — invalid: ${r.error}`);
        return;
      }
      if (analysis.duplicatesAgainstDb.has(i)) {
        skipped.push(`${r.normalizedName} — already exists in database`);
        return;
      }
      if (analysis.duplicatesInsideCsv.has(i)) {
        skipped.push(`${r.normalizedName} — duplicate inside CSV`);
        return;
      }
      toAdd.push({ name: r.normalizedName!, type: r.normalizedType!, color: r.normalizedColor! });
    });

    let added = 0;
    const trulySkipped: string[] = [...skipped];
    for (const c of toAdd) {
      const res = await dbAddCategory(c);
      if (res.ok) added++;
      else trulySkipped.push(`${c.name} — ${res.error}`);
    }

    await refresh();
    setPreviewOpen(false);

    if (trulySkipped.length > 0) {
      showToast(`Imported ${added}, skipped ${trulySkipped.length}`);
      setSkippedList(trulySkipped);
      setSkippedOpen(true);
    } else {
      showToast(`Imported ${added} categories`);
    }
  };

  const [skippedOpen, setSkippedOpen] = useState(false);
  const [skippedList, setSkippedList] = useState<string[]>([]);

  const filteredCats = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => c.name.toLowerCase().includes(q) || c.type.includes(q));
  }, [categories, query]);

  const downloadSample = () => {
    const blob = new Blob([sampleCsv()], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "hisaab-categories-sample.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-[980px] mx-auto px-6 py-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-bold tracking-tight text-white">Category</h1>
          <p className="text-[12px] leading-relaxed text-[var(--color-muted-strong)] mt-1 max-w-[60ch]">Organize expenses and income. Create categories manually or bulk-import via CSV. Duplicate names are always skipped.</p>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={downloadSample}>
            <Download size={14} /> Sample CSV
          </Button>
        </div>
      </div>

      <div className="mt-5 rounded-[12px] bg-[var(--color-surface-card-dark)] border border-[var(--color-hairline-on-dark)] overflow-visible">
        <div className="px-5 py-4 border-b border-[var(--color-hairline-on-dark)] flex items-center justify-between">
          <h2 className="text-[13px] font-bold text-white flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-[var(--color-primary)]" /> Add category
          </h2>
          <span className="text-[11px] font-medium text-[var(--color-muted)]">{loading ? "…" : `${categories.length} total`}</span>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-[1.4fr_0.9fr_0.7fr_auto] gap-3 items-end">
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold tracking-wide text-[var(--color-muted)] uppercase">Category name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Groceries, Salary, Rent" className="h-[40px] rounded-[8px] bg-[var(--color-canvas-dark)] border border-[var(--color-hairline-on-dark)] text-white placeholder:text-[var(--color-muted)] text-[13px] px-3 focus:outline-none focus:border-[var(--color-primary)]/50" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold tracking-wide text-[var(--color-muted)] uppercase">Type</span>
            <Select value={type} onChange={(v) => setType(v as CategoryType)} options={[{ value: "expense", label: "Expense" }, { value: "income", label: "Income" }]} ariaLabel="Category type" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold tracking-wide text-[var(--color-muted)] uppercase">Color</span>
            <div className="h-[40px] rounded-[8px] bg-[var(--color-canvas-dark)] border border-[var(--color-hairline-on-dark)] flex items-center gap-2 px-2">
              <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="color-round w-8 h-8 shrink-0" aria-label="Pick color" />
              <input value={color} onChange={(e) => setColor(e.target.value)} className="flex-1 bg-transparent text-[12px] font-num text-white focus:outline-none" placeholder="#fcd535" />
            </div>
          </label>
          <Button onClick={handleAdd} size="md" className="h-[40px] shrink-0">
            <Plus size={14} /> Add
          </Button>
        </div>
        {formErr && <div className="px-4 pb-3 text-[11px] font-semibold text-[var(--color-trading-down)] flex items-center gap-1.5"><AlertTriangle size={12} /> {formErr}</div>}
        <div className="px-4 pb-4 flex flex-wrap gap-2">
          <input ref={csvInputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleCsvPick} />
          <Button variant="secondary" size="sm" onClick={() => csvInputRef.current?.click()}>
            <Upload size={14} /> Import via CSV
          </Button>
          <Button variant="ghost" size="sm" onClick={downloadSample} className="md:hidden">
            <Download size={14} /> Sample CSV
          </Button>
          <span className="text-[11px] text-[var(--color-muted)] self-center">CSV columns: <span className="font-num text-white">categoryname, category type, color</span></span>
        </div>
      </div>

      <div className="mt-4 rounded-[12px] bg-[var(--color-surface-card-dark)] border border-[var(--color-hairline-on-dark)] overflow-hidden">
        <div className="px-5 py-3 flex items-center gap-3 border-b border-[var(--color-hairline-on-dark)]">
          <h3 className="text-[13px] font-bold text-white">All categories</h3>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-[var(--color-surface-elevated-dark)] border border-[var(--color-hairline-on-dark)] text-[var(--color-muted-strong)] font-bold">{filteredCats.length}</span>
          <div className="ml-auto flex items-center gap-2">
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter by name or type…" className="h-8 w-[220px] rounded-[8px] bg-[var(--color-canvas-dark)] border border-[var(--color-hairline-on-dark)] text-white placeholder:text-[var(--color-muted)] text-[12px] px-3 focus:outline-none focus:border-[var(--color-primary)]/40" />
          </div>
        </div>
        <div className="divide-y divide-[var(--color-hairline-on-dark)]">
          {loading ? (
            <div className="p-8 text-center text-[11px] text-[var(--color-muted)]">Loading SQLite…</div>
          ) : filteredCats.length === 0 ? (
            <div className="p-8 text-center">
              <div className="text-[12px] font-bold text-white">No categories yet</div>
              <div className="text-[11px] text-[var(--color-muted)] mt-1">Add one above or import a CSV. Duplicates are auto-skipped.</div>
            </div>
          ) : (
            filteredCats.map((c) => (
              <div key={c.id} className="flex items-center gap-3 px-5 py-3 hover:bg-[#11161c]/60 transition">
                <span className="w-3 h-3 rounded-full shrink-0 border border-white/15" style={{ background: c.color }} />
                <span className="text-[13px] font-semibold text-white truncate min-w-0 flex-1">{c.name}</span>
                <span className={`text-[11px] font-bold px-2 py-1 rounded-full border shrink-0 ${c.type === "income" ? "bg-[var(--color-trading-up)]/12 text-[var(--color-trading-up)] border-[var(--color-trading-up)]/20" : "bg-[var(--color-trading-down)]/12 text-[var(--color-trading-down)] border-[var(--color-trading-down)]/20"}`}>{c.type}</span>
                <span className="hidden sm:inline font-num text-[11px] text-[var(--color-muted)] shrink-0">{c.color}</span>
                <button onClick={() => handleDelete(c.id, c.name)} className="w-7 h-7 rounded-[6px] bg-transparent border border-transparent hover:bg-[var(--color-trading-down)]/10 hover:border-[var(--color-trading-down)]/20 text-[var(--color-muted)] hover:text-[var(--color-trading-down)] flex items-center justify-center transition shrink-0" aria-label="Delete">
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} title="Preview categories found" description={`Found ${parsedRows.length} rows in CSV. Review before importing — duplicates and invalid rows will be skipped.`} maxWidth="max-w-[720px]" showClose>
        <div className="rounded-[8px] border border-[var(--color-hairline-on-dark)] overflow-hidden">
          <div className="max-h-[360px] overflow-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-[var(--color-surface-elevated-dark)] border-b border-[var(--color-hairline-on-dark)] text-[11px] font-bold tracking-wide text-[var(--color-muted)] uppercase">
                <tr>
                  <th className="px-3 py-2 font-bold">#</th>
                  <th className="px-3 py-2 font-bold">Category</th>
                  <th className="px-3 py-2 font-bold">Type</th>
                  <th className="px-3 py-2 font-bold">Color</th>
                  <th className="px-3 py-2 font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-hairline-on-dark)]">
                {parsedRows.map((r, i) => {
                  const isDupDb = analysis.duplicatesAgainstDb.has(i);
                  const isDupCsv = analysis.duplicatesInsideCsv.has(i);
                  const isInvalid = analysis.invalid.has(i);
                  let status: { label: string; cls: string; icon: React.ReactNode } = { label: "Ready", cls: "text-[var(--color-trading-up)] bg-[var(--color-trading-up)]/10 border-[var(--color-trading-up)]/20", icon: <Check size={12} /> };
                  if (isInvalid) status = { label: r.error ?? "Invalid", cls: "text-[var(--color-trading-down)] bg-[var(--color-trading-down)]/10 border-[var(--color-trading-down)]/20", icon: <X size={12} /> };
                  else if (isDupDb) status = { label: "Skip — exists in DB", cls: "text-[#f0b90b] bg-[#f0b90b]/12 border-[#f0b90b]/20", icon: <AlertTriangle size={12} /> };
                  else if (isDupCsv) status = { label: "Skip — duplicate in CSV", cls: "text-[#f0b90b] bg-[#f0b90b]/12 border-[#f0b90b]/20", icon: <AlertTriangle size={12} /> };
                  return (
                    <tr key={i} className={isInvalid || isDupDb || isDupCsv ? "bg-[#f6465d]/[0.04]" : ""}>
                      <td className="px-3 py-2 text-[11px] font-num text-[var(--color-muted)]">{r.rowIndex}</td>
                      <td className="px-3 py-2 text-[12px] font-semibold text-white truncate max-w-[180px]">{r.normalizedName || <span className="text-[var(--color-muted)]">—</span>}</td>
                      <td className="px-3 py-2 text-[11px] font-bold capitalize text-[var(--color-muted-strong)]">{r.normalizedType ?? r.type ?? "—"}</td>
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-num text-[var(--color-muted)]">
                          {r.normalizedColor && <span className="w-3 h-3 rounded-full border border-white/15 shrink-0" style={{ background: r.normalizedColor }} />}{r.normalizedColor ?? r.color ?? "—"}
                        </span>
                      </td>
                      <td className="px-3 py-2"><span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border ${status.cls}`}>{status.icon}{status.label}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3 text-[11px]">
          <span className="text-[var(--color-muted)]">
            <span className="text-white font-bold">{importableCount}</span> will be imported · <span className="text-[#f0b90b] font-bold">{analysis.duplicatesAgainstDb.size + analysis.duplicatesInsideCsv.size}</span> duplicates · <span className="text-[var(--color-trading-down)] font-bold">{analysis.invalid.size}</span> invalid
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setPreviewOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleConfirmImport} disabled={importableCount === 0}>Import {importableCount} →</Button>
          </div>
        </div>
      </Dialog>

      <Dialog open={skippedOpen} onClose={() => setSkippedOpen(false)} title={`Skipped ${skippedList.length} categories`} description="These rows were not imported because they already existed or were invalid. Duplicate detection is case-insensitive." maxWidth="max-w-[560px]" showClose>
        <div className="rounded-[8px] border border-[var(--color-hairline-on-dark)] bg-[var(--color-canvas-dark)] p-3 max-h-[260px] overflow-auto">
          <ul className="space-y-1.5">
            {skippedList.map((s, i) => (
              <li key={i} className="text-[12px] leading-relaxed text-[var(--color-muted-strong)] flex gap-2">
                <span className="text-[#f0b90b] shrink-0">•</span>
                <span className="truncate">{s}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-4 flex justify-end">
          <Button size="sm" onClick={() => setSkippedOpen(false)}>Got it</Button>
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
