"use client";

import { useEffect, useRef, useState } from "react";
import { Clock, FolderOpen, Download, Settings, X, Share2 } from "lucide-react";
import { Sidebar, BottomNav, PageKey } from "@/components/layout/Sidebar";
import { CategoryPage } from "@/components/category/CategoryPage";
import { AccountsPage } from "@/components/accounts/AccountsPage";
import { TransactionsPage } from "@/components/transactions/TransactionsPage";
import { DashboardPage } from "@/components/dashboard/DashboardPage";
import { StatementPage } from "@/components/statement/StatementPage";
import { ProfilePage } from "@/components/profile/ProfilePage";
import { PaymentMediumPage } from "@/components/payment-medium/PaymentMediumPage";
import { SettingsPanel } from "@/components/settings/SettingsPanel";
import { applyTheme, getStoredAccent, getStoredMode } from "@/lib/theme";
import { loadProfileFromDB } from "@/lib/profile";
import { createBlankDBBytes, downloadCurrentDB, openDBFromFile, getDB, setDBFromBytes, reconnectDB } from "@/lib/db";

import { SplashScreen } from "@/components/layout/SplashScreen";

const LAST_DB_KEY = "hk_last_db_name";

const SocialIcon = ({ platform }: { platform: string }) => {
  switch (platform) {
    case "github": return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>;
    case "instagram": return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" x2="17.51" y1="6.5" y2="6.5"/></svg>;
    case "reddit": return <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.56 12 8 12.56 8 13.25c0 .69.56 1.25 1.25 1.25.69 0 1.25-.56 1.25-1.25 0-.69-.56-1.25-1.25-1.25zm5.5 0c-.69 0-1.25.56-1.25 1.25 0 .69.56 1.25 1.25 1.25.69 0 1.25-.56 1.25-1.25 0-.69-.56-1.25-1.25-1.25zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .466c.843.84 2.484.91 2.961.91.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 0-.466.336.336 0 0 0-.466 0c-.32.318-1.592.716-2.495.716-.903 0-2.175-.398-2.495-.716a.327.327 0 0 0-.235-.091z"/></svg>;
    case "x": return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4l11.733 16h4.267l-11.733-16z"/><path d="M4 20l6.768-6.768m2.46-2.46L20 4"/></svg>;
    case "linkedin": return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg>;
    default: return null;
  }
};

function Placeholder({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="h-full overflow-auto">
      <div className="max-w-[980px] mx-auto px-6 py-6">
        <h1 className="text-[20px] font-bold tracking-tight text-white">{title}</h1>
        <p className="text-[12px] leading-relaxed text-[var(--color-muted-strong)] mt-1 max-w-[60ch]">{desc}</p>
        <div className="mt-6 rounded-[12px] bg-[var(--color-surface-card-dark)] border border-[var(--color-hairline-on-dark)] border-dashed p-10 text-center">
          <div className="text-[12px] font-bold text-white">Coming next</div>
          <div className="text-[11px] text-[var(--color-muted)] mt-1">This page is scaffolded — Category is fully SQLite-backed.</div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [showSplash, setShowSplash] = useState(true);
  // Keep server and initial client render identical to avoid hydration mismatch.
  // Server always renders the "choose DB" state; client upgrades after mount if needed.
  const [lastDb, setLastDb] = useState<string | null>(null);
  const [dbReady, setDbReady] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [active, setActive] = useState<PageKey>("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [socialsOpen, setSocialsOpen] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(LAST_DB_KEY);
    if (stored) {
      setLastDb(stored);
      setDbReady(true);
    }
    setHydrated(true);
    applyTheme(getStoredMode(), getStoredAccent());
    loadProfileFromDB().catch(() => {});
    getDB().catch(() => {});
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2800);
  };

  const enterDashboard = (name: string) => {
    localStorage.setItem(LAST_DB_KEY, name);
    setLastDb(name);
    setDbReady(true);
  };

  const handleReconnect = async () => {
    if (!lastDb) return;
    try {
      await reconnectDB();
      showToast(`Reconnected to "${lastDb}"`);
      setDbReady(true);
    } catch (err: any) {
      showToast(err.message || "Failed to reconnect");
    }
  };

  const handleOpenClick = async () => {
    if ('showOpenFilePicker' in window) {
      try {
        const [handle] = await (window as any).showOpenFilePicker({
          types: [{ description: 'SQLite Database', accept: { 'application/x-sqlite3': ['.db', '.sqlite', '.sqlite3'] } }],
          multiple: false
        });
        const file = await handle.getFile();
        localStorage.setItem(LAST_DB_KEY, file.name);
        setLastDb(file.name);
        await openDBFromFile(file, handle);
        setDbReady(true);
        showToast(`Opened "${file.name}" — SQLite verified (edits write directly to this file)`);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          showToast("Failed to open SQLite file");
        }
      }
    } else {
      fileRef.current?.click();
    }
  };

  const handleFilePicked: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/\.(db|sqlite|sqlite3)$/i.test(file.name)) {
      showToast("Please select a .db / .sqlite file");
      return;
    }
    try {
      // set key first so IndexedDB save goes to the opened file's entry
      localStorage.setItem(LAST_DB_KEY, file.name);
      setLastDb(file.name);
      await openDBFromFile(file);
      setDbReady(true);
      showToast(`Opened "${file.name}" — SQLite verified (edits save to browser storage; use Download or picker to update the .db file on disk)`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to open SQLite file";
      showToast(msg);
    }
    e.target.value = "";
  };

  const handleDownloadBlank = async () => {
    const blankName = `hisaab-kitaab-blank-${new Date().toISOString().slice(0, 10)}.db`;
    try {
      const bytes = await createBlankDBBytes();
      if ('showSaveFilePicker' in window) {
        try {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: blankName,
            types: [{ description: 'SQLite Database', accept: { 'application/x-sqlite3': ['.db', '.sqlite', '.sqlite3'] } }],
          });
          const writable = await handle.createWritable();
          await writable.write(bytes);
          await writable.close();
          localStorage.setItem(LAST_DB_KEY, blankName);
          setLastDb(blankName);
          await openDBFromFile(new File([bytes as any], blankName, { type: 'application/x-sqlite3' }), handle);
          setDbReady(true);
          showToast(`Blank SQLite saved via picker — "${blankName}" (edits write directly to this file)`);
          return;
        } catch (err: any) {
          if (err?.name === 'AbortError') return;
        }
      }
      // Fallback anchor: set key first so IndexedDB entry is per-file
      localStorage.setItem(LAST_DB_KEY, blankName);
      setLastDb(blankName);
      setDbReady(true);
      await setDBFromBytes(bytes);
      const blob = new Blob([bytes as unknown as BlobPart], { type: "application/x-sqlite3" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = blankName;
      a.click();
      URL.revokeObjectURL(url);
      showToast(`Blank SQLite downloaded — "${blankName}" (re-open via picker for direct file writes; otherwise re-download after edits)`);
    } catch {
      showToast("Failed to create blank SQLite");
    }
  };

  const handleDownloadCurrent = async () => {
    const name = lastDb ?? `hisaab-kitaab-${new Date().toISOString().slice(0, 10)}.db`;
    await downloadCurrentDB(name);
  };
  void handleDownloadCurrent;

  // Until hydration finishes, render the same tree the server did (choose-DB card)
  // to prevent "server rendered HTML didn't match the client" (branch on localStorage, Date, etc.)
  if (!hydrated) {
    return (
      <div className="h-screen max-h-[100vh] overflow-hidden bg-[var(--color-canvas-dark)] flex items-center justify-center p-6">
        <div className="w-full max-w-[520px] rounded-[12px] bg-[var(--color-surface-card-dark)] border border-[var(--color-hairline-on-dark)] overflow-hidden opacity-0" aria-hidden>
          <div className="px-6 pt-6 pb-5">
            <h1 className="text-[16px] font-bold tracking-tight text-white leading-none">Choose your Hisaab database</h1>
          </div>
        </div>
      </div>
    );
  }

  if (!dbReady) {
    return (
      <div className="h-screen max-h-[100vh] overflow-hidden bg-[var(--color-canvas-dark)] flex items-center justify-center p-6">
        <input ref={fileRef} type="file" accept=".db,.sqlite,.sqlite3,application/x-sqlite3" className="hidden" onChange={handleFilePicked} />
        <div className="w-full max-w-[520px] rounded-[12px] bg-[var(--color-surface-card-dark)] border border-[var(--color-hairline-on-dark)] overflow-hidden">
          <div className="px-6 pt-6 pb-5">
            <h1 className="text-[16px] font-bold tracking-tight text-white leading-none">Choose your Hisaab database</h1>
            <p className="text-[12px] leading-relaxed text-[var(--color-muted-strong)] mt-2">100% local SQLite. No server, no sync — your data never leaves this device.</p>
          </div>
          <div className="h-px bg-[var(--color-hairline-on-dark)]" />
          <div className="p-3 flex flex-col gap-2">
            <button
              onClick={handleReconnect}
              disabled={!lastDb}
              className={`group w-full flex items-center gap-3 rounded-[8px] border px-4 py-3 text-left transition ${!lastDb ? "bg-[var(--color-surface-card-dark)] border-[var(--color-hairline-on-dark)] opacity-40 cursor-not-allowed" : "bg-[var(--color-canvas-dark)] border-[var(--color-hairline-on-dark)] hover:border-[var(--color-primary)]/30 hover:bg-[#11161c]"}`}
            >
              <span className={`w-9 h-9 rounded-[8px] flex items-center justify-center shrink-0 border ${!lastDb ? "bg-[var(--color-surface-elevated-dark)] border-[var(--color-hairline-on-dark)] text-[var(--color-muted)]" : "bg-[var(--color-surface-elevated-dark)] border-[var(--color-hairline-on-dark)] text-white group-hover:border-[var(--color-primary)]/20"}`}>
                <Clock size={16} strokeWidth={2} />
              </span>
              <span className="min-w-0 flex-1">
                <span className={`block text-[13px] font-bold leading-none ${!lastDb ? "text-[var(--color-muted)]" : "text-white"}`}>Reconnect last database</span>
                <span className="block text-[11px] font-medium text-[var(--color-muted)] truncate mt-1">{lastDb ? lastDb : "No previous database"}</span>
              </span>
              <span className={`text-[11px] font-bold shrink-0 ${!lastDb ? "text-[var(--color-muted)]" : "text-[var(--color-muted-strong)] group-hover:text-white"}`}>↗</span>
            </button>
            <button onClick={handleOpenClick} className="group w-full flex items-center gap-3 rounded-[8px] bg-[var(--color-primary)] border border-[var(--color-primary)] hover:bg-[var(--color-primary-active)] px-4 py-3 text-left transition">
              <span className="w-9 h-9 rounded-[8px] bg-black/10 border border-black/10 text-[var(--color-on-primary)] flex items-center justify-center shrink-0"><FolderOpen size={16} strokeWidth={2} /></span>
              <span className="min-w-0 flex-1"><span className="block text-[13px] font-bold leading-none text-[var(--color-on-primary)]">Open Database</span><span className="block text-[11px] font-medium text-[var(--color-on-primary)]/70 truncate mt-1">Choose .db / .sqlite file from your device</span></span>
              <span className="text-[11px] font-bold text-[var(--color-on-primary)] shrink-0 group-hover:translate-x-0.5 transition-transform">→</span>
            </button>
            <button onClick={handleDownloadBlank} className="group w-full flex items-center gap-3 rounded-[8px] bg-[var(--color-canvas-dark)] border border-[var(--color-hairline-on-dark)] hover:border-[var(--color-primary)]/30 hover:bg-[#11161c] px-4 py-3 text-left transition">
              <span className="w-9 h-9 rounded-[8px] bg-[var(--color-surface-elevated-dark)] border border-[var(--color-hairline-on-dark)] text-white group-hover:border-[var(--color-primary)]/20 flex items-center justify-center shrink-0"><Download size={16} strokeWidth={2} /></span>
              <span className="min-w-0 flex-1"><span className="block text-[13px] font-bold leading-none text-white">Download a blank database</span><span className="block text-[11px] font-medium text-[var(--color-muted)] truncate mt-1">Real SQLite file — openable in DB Browser, sqlite3, etc.</span></span>
              <span className="text-[11px] font-bold text-[var(--color-muted-strong)] group-hover:text-white shrink-0 transition-colors">↓</span>
            </button>
          </div>
          <div className="h-px bg-[var(--color-hairline-on-dark)]" />
          <p className="px-6 py-3 text-[11px] leading-relaxed text-[var(--color-muted)]">Your <span className="text-white font-semibold">.db file</span> stays on disk · Move it via USB, open anywhere · Still offline.</p>
        </div>
        {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-[90vw] bg-[var(--color-surface-card-dark)] text-white border border-[var(--color-primary)]/40 px-4 py-2 rounded-[8px] text-[12px] font-semibold shadow-xl flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] shrink-0" /><span className="truncate">{toast}</span></div>}
      </div>
    );
  }

  return (
    <>
      {showSplash && <SplashScreen onComplete={() => setShowSplash(false)} />}
      <div className="h-screen max-h-[100vh] overflow-hidden bg-[var(--color-canvas-dark)] text-[var(--color-body)] flex">
        <Sidebar 
        active={active} 
        onChange={setActive} 
        collapsed={collapsed} 
        onToggle={() => setCollapsed((v) => !v)}
        onSwitchDb={() => setDbReady(false)}
        onCloseDb={() => {
          localStorage.removeItem(LAST_DB_KEY);
          setLastDb(null);
          setDbReady(false);
          window.location.reload();
        }}
      />
      <div className="flex-1 min-w-0 flex flex-col h-screen max-h-[100vh] overflow-hidden pb-[64px] sm:pb-0">
        <main className="flex-1 min-h-0 overflow-hidden bg-[var(--color-canvas-dark)] flex flex-col">
          {active === "dashboard" && <DashboardPage />}
          {active === "transactions" && <TransactionsPage />}
          {active === "accounts" && <AccountsPage />}
          {active === "category" && <CategoryPage />}
          {active === "paymentMedium" && <PaymentMediumPage />}
          {active === "statement" && <StatementPage />}
          {active === "profile" && <ProfilePage />}
        </main>
      </div>

      <button
        onClick={() => setSettingsOpen(true)}
        aria-label="Open settings"
        className="fixed bottom-[84px] sm:bottom-5 right-5 z-40 w-12 h-12 rounded-full bg-[var(--color-primary)] text-[var(--color-on-primary)] shadow-[0_8px_24px_rgba(0,0,0,0.35)] border border-black/10 flex items-center justify-center hover:bg-[var(--color-primary-active)] active:scale-95 transition"
      >
        <Settings size={20} />
      </button>

      <button
        onClick={() => setSocialsOpen(true)}
        aria-label="Open social links"
        className="fixed bottom-[140px] sm:bottom-[76px] right-5 z-40 w-12 h-12 rounded-full bg-[var(--color-surface-card-dark)] text-[var(--color-muted)] shadow-[0_8px_24px_rgba(0,0,0,0.35)] border border-[var(--color-hairline-on-dark)] flex items-center justify-center hover:text-white hover:border-[var(--color-primary)]/30 active:scale-95 transition"
      >
        <Share2 size={20} />
      </button>

      <BottomNav 
        active={active} 
        onChange={setActive} 
        onSwitchDb={() => setDbReady(false)}
        onCloseDb={() => {
          localStorage.removeItem(LAST_DB_KEY);
          setLastDb(null);
          setDbReady(false);
          window.location.reload();
        }}
      />

      {settingsOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" onClick={() => setSettingsOpen(false)} aria-hidden />
          <div className="relative w-[420px] max-w-[92vw] h-screen max-h-[100vh] overflow-hidden bg-[var(--color-surface-card-dark)] border-l border-[var(--color-hairline-on-dark)] shadow-[-12px_0_48px_rgba(0,0,0,0.45)] flex flex-col">
            <div className="h-[44px] shrink-0 flex items-center justify-between px-4 border-b border-[var(--color-hairline-on-dark)]">
              <span className="text-[11px] font-bold tracking-wide text-[var(--color-muted)] uppercase">Settings</span>
              <button onClick={() => setSettingsOpen(false)} className="w-7 h-7 rounded-[6px] bg-[var(--color-surface-elevated-dark)] border border-[var(--color-hairline-on-dark)] text-[var(--color-muted)] hover:text-white flex items-center justify-center" aria-label="Close settings">
                <X size={14} />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-auto">
              <SettingsPanel />
            </div>
          </div>
        </div>
      )}

      {socialsOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[1px]" onClick={() => setSocialsOpen(false)} aria-hidden />
          <div className="relative w-[320px] max-w-[92vw] h-screen max-h-[100vh] overflow-hidden bg-[var(--color-surface-card-dark)] border-l border-[var(--color-hairline-on-dark)] shadow-[-12px_0_48px_rgba(0,0,0,0.45)] flex flex-col">
            <div className="h-[44px] shrink-0 flex items-center justify-between px-4 border-b border-[var(--color-hairline-on-dark)]">
              <span className="text-[11px] font-bold tracking-wide text-[var(--color-muted)] uppercase">Connect</span>
              <button onClick={() => setSocialsOpen(false)} className="w-7 h-7 rounded-[6px] bg-[var(--color-surface-elevated-dark)] border border-[var(--color-hairline-on-dark)] text-[var(--color-muted)] hover:text-white flex items-center justify-center" aria-label="Close socials">
                <X size={14} />
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-auto p-5">
              <div className="text-[14px] font-bold text-white mb-4">Connect with Developer</div>
              <div className="flex flex-col gap-3">
                {[
                  { platform: "github", label: "GitHub", url: "https://github.com/MrImaginatory/HisaabKitaab" },
                  { platform: "instagram", label: "Instagram", url: "https://www.instagram.com/mr.imaginatory" },
                  { platform: "reddit", label: "Reddit", url: "https://www.reddit.com/user/Mr_Imaginatory/" },
                  { platform: "x", label: "X", url: "https://x.com/mr_imaginatory" },
                  { platform: "linkedin", label: "LinkedIn", url: "https://www.linkedin.com/in/prabhat-sharma-501ab12a9/" }
                ].map(s => (
                  <a key={s.platform} href={s.url} target="_blank" rel="noopener noreferrer" className="group h-12 px-4 flex items-center gap-3 rounded-[8px] bg-[var(--color-canvas-dark)] border border-[var(--color-hairline-on-dark)] text-[13px] font-bold text-[var(--color-muted-strong)] hover:text-[var(--color-primary)] hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-surface-elevated-dark)] transition">
                    <span className="text-[var(--color-muted)] group-hover:text-[var(--color-primary)] transition-colors">
                      <SocialIcon platform={s.platform} />
                    </span>
                    {s.label}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
}
