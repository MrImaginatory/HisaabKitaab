import * as React from "react";
import { X } from "lucide-react";

interface DialogProps {
  open: boolean;
  onClose?: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: string; // tailwind max-w class
  showClose?: boolean;
}

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  maxWidth = "max-w-[80%]",
  showClose = false,
}: DialogProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop — Binance near-black canvas at 70% */}
      <div
        className="absolute inset-0 bg-[#0b0e11]/70 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />
      {/* Panel — markets-table-card style */}
      <div
        role="dialog"
        aria-modal="true"
        className={`relative w-full ${maxWidth} rounded-[12px] bg-[var(--color-surface-card-dark)] border border-[var(--color-hairline-on-dark)] shadow-[0_20px_60px_rgba(0,0,0,0.55)] overflow-hidden animate-in fade-in zoom-in-95 duration-200`}
      >
        {/* Header like top-nav-dark hairline */}
        {(title || description) && (
          <div className="px-6 pt-6 pb-4 border-b border-[var(--color-hairline-on-dark)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                {title && (
                  <h2 className="text-[18px] font-bold tracking-tight text-white leading-none">
                    {title}
                  </h2>
                )}
                {description && (
                  <p className="text-[12px] leading-relaxed text-[var(--color-muted-strong)] mt-2 max-w-[60ch]">
                    {description}
                  </p>
                )}
              </div>
              {showClose && onClose && (
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-[6px] bg-[var(--color-surface-elevated-dark)] border border-[var(--color-hairline-on-dark)] text-[var(--color-muted)] hover:text-white flex items-center justify-center transition shrink-0"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
