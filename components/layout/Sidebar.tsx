"use client";
import { LayoutDashboard, Receipt, Wallet, Tag, Settings, PanelLeftClose, PanelLeftOpen } from "lucide-react";

export type PageKey = "dashboard" | "transactions" | "accounts" | "category" | "settings";

const NAV = [
  { key: "dashboard" as PageKey, label: "Dashboard", icon: LayoutDashboard },
  { key: "transactions" as PageKey, label: "Transactions", icon: Receipt },
  { key: "accounts" as PageKey, label: "Accounts", icon: Wallet },
  { key: "category" as PageKey, label: "Category", icon: Tag },
];

const BOTTOM_NAV: { key: PageKey; label: string; icon: typeof Settings }[] = [
  { key: "settings", label: "Settings", icon: Settings },
];

export function Sidebar({
  active,
  onChange,
  collapsed,
  onToggle,
}: {
  active: PageKey;
  onChange: (k: PageKey) => void;
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <aside
      className={`shrink-0 h-screen sticky top-0 bg-[var(--color-canvas-dark)] border-r border-[var(--color-hairline-on-dark)] flex flex-col transition-[width] duration-200 ${collapsed ? "w-[64px]" : "w-[240px]"}`}
    >
      {/* Brand row */}
      <div className={`h-[56px] flex items-center border-b border-[var(--color-hairline-on-dark)] px-3 gap-2 ${collapsed ? "justify-center" : "justify-between"}`}>
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-[6px] bg-[var(--color-primary)] flex items-center justify-center text-[13px] font-black text-[var(--color-on-primary)] shrink-0">HK</div>
          {!collapsed && (
            <div className="min-w-0 leading-none">
              <div className="text-[13px] font-bold tracking-tight text-white truncate">HISAAB<span className="text-[var(--color-primary)]">KITAAB</span></div>
              <div className="text-[10px] font-medium text-[var(--color-muted)] truncate">Local-first</div>
            </div>
          )}
        </div>
        {!collapsed && (
          <button
            onClick={onToggle}
            className="w-7 h-7 rounded-[6px] bg-[var(--color-surface-card-dark)] border border-[var(--color-hairline-on-dark)] text-[var(--color-muted)] hover:text-white flex items-center justify-center shrink-0"
            aria-label="Collapse"
          >
            <PanelLeftClose size={14} />
          </button>
        )}
      </div>
      {collapsed && (
        <div className="flex justify-center py-2 border-b border-[var(--color-hairline-on-dark)]">
          <button onClick={onToggle} className="w-7 h-7 rounded-[6px] bg-[var(--color-surface-card-dark)] border border-[var(--color-hairline-on-dark)] text-[var(--color-muted)] hover:text-white flex items-center justify-center" aria-label="Expand">
            <PanelLeftOpen size={14} />
          </button>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 p-2 flex flex-col gap-1">
        {NAV.map((item) => {
          const isActive = item.key === active;
          return (
            <button
              key={item.key}
              onClick={() => onChange(item.key)}
              className={`w-full flex items-center gap-2.5 rounded-[8px] px-2.5 py-2.5 text-[13px] font-semibold transition border
                ${isActive ? "bg-[var(--color-primary)] text-[var(--color-on-primary)] border-[var(--color-primary)]" : "bg-transparent text-[var(--color-muted-strong)] border-transparent hover:bg-[var(--color-surface-card-dark)] hover:text-white hover:border-[var(--color-hairline-on-dark)]"}
                ${collapsed ? "justify-center px-2" : ""} `}
              title={collapsed ? item.label : undefined}
            >
              <item.icon size={16} strokeWidth={isActive ? 2.2 : 1.8} className="shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
              {!collapsed && isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-black/20 shrink-0" />}
            </button>
          );
        })}
      </nav>

      {/* Bottom nav — Settings */}
      <div className="p-2 flex flex-col gap-1 border-t border-[var(--color-hairline-on-dark)]">
        {BOTTOM_NAV.map((item) => {
          const isActive = item.key === active;
          return (
            <button
              key={item.key}
              onClick={() => onChange(item.key)}
              className={`w-full flex items-center gap-2.5 rounded-[8px] px-2.5 py-2.5 text-[13px] font-semibold transition border
                ${isActive ? "bg-[var(--color-primary)] text-[var(--color-on-primary)] border-[var(--color-primary)]" : "bg-transparent text-[var(--color-muted-strong)] border-transparent hover:bg-[var(--color-surface-card-dark)] hover:text-white hover:border-[var(--color-hairline-on-dark)]"}
                ${collapsed ? "justify-center px-2" : ""} `}
              title={collapsed ? item.label : undefined}
            >
              <item.icon size={16} strokeWidth={isActive ? 2.2 : 1.8} className="shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </button>
          );
        })}
      </div>
      {/* Footer — collapsed hint */}
      <div className="p-2 border-t border-[var(--color-hairline-on-dark)]">
        <div className={`rounded-[8px] bg-[var(--color-surface-card-dark)] border border-[var(--color-hairline-on-dark)] px-2.5 py-2 ${collapsed ? "flex justify-center" : ""}`}>
          {collapsed ? (
            <span className="w-2 h-2 rounded-full bg-[var(--color-trading-up)] animate-pulse" />
          ) : (
            <div className="flex items-center gap-2 text-[11px] font-medium text-[var(--color-muted)]">
              <span className="w-2 h-2 rounded-full bg-[var(--color-trading-up)] animate-pulse shrink-0" />
              <span className="truncate">SQLite • OPFS • Offline</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
