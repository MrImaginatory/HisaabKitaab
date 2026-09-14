"use client";
import { useEffect, useState } from "react";
import { Database, Save, AlertTriangle, CheckCircle, RefreshCcw } from "lucide-react";
import { getFileHandleStatus, linkDBFile, saveDB, reconnectDB } from "@/lib/db";

export function FloatingSaveButton() {
  const [dbStatus, setDbStatus] = useState<{ hasFileHandle: boolean; hasPermission: boolean } | null>(null);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const checkStatus = async () => {
    const status = await getFileHandleStatus();
    setDbStatus(status);
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const handleClick = async () => {
    setSaving(true);
    try {
      if (dbStatus?.hasFileHandle && dbStatus.hasPermission) {
        // Just flush current memory to disk
        await saveDB();
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 2000);
      } else if (dbStatus?.hasFileHandle && !dbStatus.hasPermission) {
        // Try to reconnect
        try {
          await reconnectDB(); // This will prompt for permission
          await saveDB();
          setJustSaved(true);
          setTimeout(() => setJustSaved(false), 2000);
          showToast("Reconnected and saved!");
        } catch (e: any) {
          showToast(e.message || "Failed to reconnect");
          await promptForNewFile();
        }
      } else {
        // No file handle at all, ask to create/select one
        await promptForNewFile();
      }
    } catch (e: any) {
      if (e.name !== "AbortError") {
        showToast("Save failed. Try exporting to Excel instead.");
      }
    } finally {
      setSaving(false);
      checkStatus();
    }
  };

  const promptForNewFile = async () => {
    if (!('showSaveFilePicker' in window)) {
      showToast("File System API not supported. Please use Excel Export.");
      return;
    }
    const handle = await (window as any).showSaveFilePicker({
      suggestedName: 'hisaab_kitaab.sqlite',
      types: [{ description: 'SQLite Database', accept: { 'application/x-sqlite3': ['.db', '.sqlite', '.sqlite3'] } }],
    });
    await linkDBFile(handle);
    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
    showToast("Database linked and saved!");
  };

  if (!dbStatus) return null;

  const isDisconnected = dbStatus.hasFileHandle && !dbStatus.hasPermission;
  const isUnlinked = !dbStatus.hasFileHandle;

  return (
    <>
      <button
        onClick={handleClick}
        disabled={saving}
        className={`fixed bottom-[196px] sm:bottom-[132px] right-5 z-40 flex items-center justify-center gap-2 h-12 px-4 rounded-full shadow-[0_8px_24px_rgba(0,0,0,0.35)] border transition-all transform hover:scale-105 active:scale-95 disabled:opacity-70 disabled:hover:scale-100 ${
          isDisconnected
            ? "bg-[var(--color-trading-down)] border-[var(--color-trading-down)] text-white"
            : isUnlinked
            ? "bg-[var(--color-surface-elevated-dark)] border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary)]/10"
            : justSaved
            ? "bg-[var(--color-trading-up)] border-[var(--color-trading-up)] text-[var(--color-canvas-dark)]"
            : "bg-[var(--color-surface-card-dark)] border-[var(--color-hairline-on-dark)] text-white hover:border-[var(--color-primary)]/50"
        }`}
        title={isDisconnected ? "DB Save Permission Lost" : "Save DB"}
      >
        <span className="relative flex items-center justify-center">
          {saving ? (
            <RefreshCcw size={18} className="animate-spin" />
          ) : justSaved ? (
            <CheckCircle size={18} strokeWidth={2.5} />
          ) : isDisconnected ? (
            <AlertTriangle size={18} strokeWidth={2.5} />
          ) : isUnlinked ? (
            <Database size={18} strokeWidth={2.5} />
          ) : (
            <Save size={18} strokeWidth={2.5} />
          )}
          {/* Indicator Dot */}
          {(!saving && !justSaved) && (
            <span
              className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border border-[var(--color-surface-card-dark)] animate-pulse ${
                isDisconnected ? "bg-white" : isUnlinked ? "bg-[var(--color-primary)]" : "bg-[var(--color-trading-up)]"
              }`}
            />
          )}
        </span>

        <span className="text-[13px] font-bold tracking-wide pr-1">
          {saving ? "Saving..." : justSaved ? "Saved!" : isDisconnected ? "Reconnect DB" : isUnlinked ? "Link DB File" : "Save DB"}
        </span>
      </button>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-24 right-6 z-50 max-w-[90vw] bg-[var(--color-surface-card-dark)] text-white border border-[var(--color-primary)]/40 px-4 py-3 rounded-[8px] text-[13px] font-semibold shadow-xl flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] shrink-0 animate-pulse" />
          <span>{toast}</span>
        </div>
      )}
    </>
  );
}
