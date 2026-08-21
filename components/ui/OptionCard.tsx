import * as React from "react";
import { LucideIcon } from "lucide-react";

interface OptionCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  meta?: string;
  cta: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: "primary" | "default";
  badge?: string;
}

export function OptionCard({
  icon: Icon,
  title,
  description,
  meta,
  cta,
  onClick,
  disabled,
  variant = "default",
  badge,
}: OptionCardProps) {
  const isPrimary = variant === "primary";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`group text-left w-full rounded-[12px] border p-4 flex flex-col gap-3 transition text-wrap
        ${
          disabled
            ? "bg-[var(--color-surface-card-dark)]/60 border-[var(--color-hairline-on-dark)] opacity-50 cursor-not-allowed"
            : isPrimary
              ? "bg-[var(--color-primary)] border-[var(--color-primary)] hover:bg-[var(--color-primary-active)]"
              : "bg-[var(--color-canvas-dark)] border-[var(--color-hairline-on-dark)] hover:border-[var(--color-primary)]/30 hover:bg-[#11161c]"
        } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-info-ring)]/40`}
    >
      <div className="flex items-start justify-between gap-3">
        <span
          className={`w-10 h-10 rounded-[8px] flex items-center justify-center shrink-0 border
            ${isPrimary ? "bg-black/10 border-black/10 text-[var(--color-on-primary)]" : disabled ? "bg-[var(--color-surface-elevated-dark)] border-[var(--color-hairline-on-dark)] text-[var(--color-muted)]" : "bg-[var(--color-surface-elevated-dark)] border-[var(--color-hairline-on-dark)] text-white group-hover:border-[var(--color-primary)]/20"}`}
        >
          <Icon size={18} strokeWidth={2} />
        </span>
        {badge && (
          <span
            className={`text-[10px] font-black tracking-widest px-2 py-1 rounded-full border shrink-0
              ${isPrimary ? "bg-black text-[var(--color-primary)] border-black/20" : "bg-[var(--color-primary)]/15 text-[var(--color-primary)] border-[var(--color-primary)]/20"}`}
          >
            {badge}
          </span>
        )}
      </div>

      <div className="space-y-1">
        <h3 className={`text-[14px] font-bold leading-tight ${isPrimary ? "text-[var(--color-on-primary)]" : "text-white"}`}>{title}</h3>
        <p className={`text-[12px] leading-[1.5] ${isPrimary ? "text-[var(--color-on-primary)]/80" : "text-[var(--color-muted-strong)]"}`}>{description}</p>
        {meta && (
          <p className={`text-[11px] font-num font-medium truncate ${isPrimary ? "text-[var(--color-on-primary)]/60" : "text-[var(--color-muted)]"}`}>{meta}</p>
        )}
      </div>

      <span
        className={`mt-auto inline-flex items-center gap-1.5 text-[12px] font-bold tracking-wide
          ${isPrimary ? "text-[var(--color-on-primary)]" : disabled ? "text-[var(--color-muted)]" : "text-[var(--color-primary)] group-hover:gap-2"}`}
      >
        {cta} <span className="transition-transform group-hover:translate-x-0.5">→</span>
      </span>
    </button>
  );
}
