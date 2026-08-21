import * as React from "react";

type Variant = "primary" | "secondary" | "ghost" | "tradingUp" | "tradingDown";
type Size = "sm" | "md" | "lg" | "pill";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
}

const base =
  "inline-flex items-center justify-center gap-2 font-semibold tracking-wide transition active:scale-[0.98] disabled:opacity-40 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-info-ring)]/50";

const variants: Record<Variant, string> = {
  primary:
    "bg-[var(--color-primary)] text-[var(--color-on-primary)] hover:bg-[var(--color-primary-active)] border border-transparent",
  secondary:
    "bg-[var(--color-surface-card-dark)] text-white border border-[var(--color-hairline-on-dark)] hover:bg-[var(--color-surface-elevated-dark)] hover:border-[var(--color-primary)]/20",
  ghost:
    "bg-transparent text-[var(--color-muted-strong)] hover:text-white hover:bg-[var(--color-surface-card-dark)] border border-transparent",
  tradingUp:
    "bg-[var(--color-trading-up)]/10 text-[var(--color-trading-up)] border border-[var(--color-trading-up)]/30 hover:bg-[var(--color-trading-up)] hover:text-white",
  tradingDown:
    "bg-[var(--color-trading-down)]/10 text-[var(--color-trading-down)] border border-[var(--color-trading-down)]/30 hover:bg-[var(--color-trading-down)] hover:text-white",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[12px] rounded-[6px]",
  md: "h-10 px-5 text-[13px] rounded-[6px]",
  lg: "h-11 px-6 text-[14px] rounded-[8px]",
  pill: "h-11 px-8 text-[14px] rounded-full",
};

export function Button({
  variant = "primary",
  size = "md",
  fullWidth,
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${fullWidth ? "w-full" : ""} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
