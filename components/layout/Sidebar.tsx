"use client";
import { LayoutDashboard, Receipt, Wallet, Tag, FileText, User, CreditCard, ChevronLeft, ChevronRight } from "lucide-react";

export type PageKey = "dashboard" | "transactions" | "accounts" | "category" | "paymentMedium" | "statement" | "profile";

export const NAV = [
  { key: "dashboard" as PageKey, label: "Dashboard", icon: LayoutDashboard },
  { key: "transactions" as PageKey, label: "Transactions", icon: Receipt },
  { key: "accounts" as PageKey, label: "Accounts", icon: Wallet },
  { key: "category" as PageKey, label: "Category", icon: Tag },
  { key: "paymentMedium" as PageKey, label: "Payment Medium", icon: CreditCard },
  { key: "statement" as PageKey, label: "Statement", icon: FileText },
  { key: "profile" as PageKey, label: "Profile", icon: User },
];

export function Sidebar({
  active,
  onChange,
  collapsed,
  onToggle,
  onSwitchDb,
  onCloseDb,
}: {
  active: PageKey;
  onChange: (k: PageKey) => void;
  collapsed: boolean;
  onToggle: () => void;
  onSwitchDb: () => void;
  onCloseDb: () => void;
}) {
  return (
    <aside
      className={`hidden sm:flex shrink-0 h-screen sticky top-0 bg-[var(--color-canvas-dark)] border-r border-[var(--color-hairline-on-dark)] flex-col transition-[width] duration-200 ease-out relative ${collapsed ? "w-[64px]" : "w-[252px]"}`}
    >
      {/* Brand — top-nav-dark 64px spec, Binance wordmark yellow */}
      <div className="h-[64px] shrink-0 flex items-center px-3 gap-2.5 border-b border-[var(--color-hairline-on-dark)]">
        <img
          src={process.env.NEXT_PUBLIC_APP_LOGO || "/Logo.svg"}
          alt="Logo"
          className="w-8 h-8 shrink-0 object-contain"
        />
        {!collapsed && (
          <div className="min-w-0 leading-none flex-1">
            <div className="text-[14px] font-bold tracking-tight text-white truncate">
              {process.env.NEXT_PUBLIC_APP_NAME || "HISAABKITAAB"}
            </div>
            <div className="text-[11px] font-medium text-[var(--color-muted)] truncate tracking-wide">Local-first ledger</div>
          </div>
        )}
      </div>

      {/* Nav — Binance nav-link 14/500, button-secondary-on-dark hover */}
      <nav className="flex-1 py-3 px-2 flex flex-col gap-1 overflow-y-auto no-scrollbar">
        {!collapsed && <div className="px-2.5 pb-1.5 text-[11px] font-bold tracking-[0.08em] text-[var(--color-muted)] uppercase">Menu</div>}
        {NAV.map((item) => {
          const isActive = item.key === active;
          return (
            <button
              key={item.key}
              onClick={() => onChange(item.key)}
              className={`group w-full flex items-center rounded-[6px] text-[14px] font-medium transition-colors border
                ${collapsed ? "justify-center px-2 py-2.5" : "gap-2.5 px-3 py-2.5 justify-start"}
                ${isActive
                  ? "bg-[var(--color-primary)] text-[var(--color-on-primary)] border-[var(--color-primary)] shadow-[0_1px_0_rgba(0,0,0,0.08)]"
                  : "bg-transparent text-[var(--color-muted-strong)] border-transparent hover:bg-[var(--color-surface-card-dark)] hover:text-white hover:border-[var(--color-hairline-on-dark)]"}`}
              title={collapsed ? item.label : undefined}
            >
              {/* Active left accent — Binance primary voltage */}
              {isActive && !collapsed && <span className="w-0.5 self-stretch rounded-full bg-black/20 mr-0.5 shrink-0" />}
              <item.icon size={18} strokeWidth={isActive ? 2.2 : 1.8} className="shrink-0" />
              {!collapsed && <span className="truncate tracking-tight">{item.label}</span>}
              {!collapsed && isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-black/25 shrink-0" />}
            </button>
          );
        })}
      </nav>

      {/* Bottom — DB controls + collapse + status, clean flat blocks */}
      <div className="shrink-0 p-2 flex flex-col gap-2 border-t border-[var(--color-hairline-on-dark)] bg-[var(--color-surface-card-dark)]/40">
        {/* DB switch/close — only when expanded, keep minimal */}
        {!collapsed && (
          <div className="grid grid-cols-2 gap-1.5">
            <button onClick={onSwitchDb} className="h-8 rounded-[6px] bg-[var(--color-surface-card-dark)] border border-[var(--color-hairline-on-dark)] text-[11px] font-bold text-[var(--color-muted-strong)] hover:text-white hover:border-[var(--color-hairline-on-dark)] transition">Switch DB</button>
            <button onClick={onCloseDb} className="h-8 rounded-[6px] bg-transparent border border-[var(--color-hairline-on-dark)] text-[11px] font-bold text-[var(--color-trading-down)] hover:bg-[var(--color-trading-down)]/10 hover:border-[var(--color-trading-down)]/20 transition">Close</button>
          </div>
        )}

        {/* Collapsible button — at bottom, full width when expanded, icon when collapsed (Binance secondary-on-dark) */}
        <button
          onClick={onToggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className={`w-full flex items-center justify-center rounded-[6px] border text-[12px] font-semibold transition
            ${collapsed
              ? "py-2.5 bg-[var(--color-surface-card-dark)] border-[var(--color-hairline-on-dark)] text-[var(--color-muted)] hover:text-white hover:border-[var(--color-primary)]/20"
              : "py-2.5 bg-[var(--color-surface-card-dark)] border-[var(--color-hairline-on-dark)] text-[var(--color-muted-strong)] hover:text-white hover:bg-[var(--color-surface-elevated-dark)]"}`}
        >
          {collapsed ? <ChevronRight size={14} /> : <><ChevronLeft size={14} className="mr-1.5" /> Collapse</>}
        </button>

        {/* Status — trust-badge style */}
        <div className={`rounded-[8px] bg-[var(--color-surface-card-dark)] border border-[var(--color-hairline-on-dark)] ${collapsed ? "p-2 flex justify-center" : "px-2.5 py-2"}`}>
          {collapsed ? (
            <span className="w-2 h-2 rounded-full bg-[var(--color-trading-up)] animate-pulse" title="SQLite • Offline" />
          ) : (
            <div className="flex items-center gap-2 text-[11px] font-medium text-[var(--color-muted)]">
              <span className="w-2 h-2 rounded-full bg-[var(--color-trading-up)] animate-pulse shrink-0" />
              <span className="truncate tracking-wide">SQLite • Offline • Local</span>
            </div>
          )}
        </div>
      </div>

      {/* Floating edge toggle — modern clean, Binance hairline + surface-card */}
      {/* <button
        onClick={onToggle}
        aria-label={collapsed ? "Expand" : "Collapse"}
        className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-[var(--color-surface-card-dark)] border border-[var(--color-hairline-on-dark)] shadow-[0_2px_8px_rgba(0,0,0,0.35)] text-[var(--color-muted)] hover:text-white hover:border-[var(--color-primary)]/30 hover:bg-[var(--color-surface-elevated-dark)] flex items-center justify-center transition z-10"
      >
        {collapsed ? <ChevronRight size={12} strokeWidth={2.5} /> : <ChevronLeft size={12} strokeWidth={2.5} />}
      </button> */}
    </aside>
  );
}

export function BottomNav({ active, onChange }: { active: PageKey; onChange: (k: PageKey) => void }) {
  return (
    <nav className="sm:hidden fixed bottom-0 left-0 right-0 h-[64px] bg-[var(--color-surface-card-dark)] border-t border-[var(--color-hairline-on-dark)] flex items-center justify-around px-2 z-40">
      {NAV.map((item) => {
        const isActive = item.key === active;
        return (
          <button
            key={item.key}
            onClick={() => onChange(item.key)}
            className={`flex flex-col items-center justify-center w-full h-full gap-1 transition ${isActive ? "text-[var(--color-primary)]" : "text-[var(--color-muted-strong)] hover:text-white"}`}
          >
            <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
            <span className="text-[10px] font-bold tracking-wide">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
