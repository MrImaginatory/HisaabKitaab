import * as React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string | null;
}

export function Input({ label, error, className = "", id, ...props }: InputProps) {
  const autoId = React.useId();
  const inputId = id ?? autoId;
  return (
    <label htmlFor={inputId} className="flex flex-col gap-1.5">
      {label && <span className="text-[11px] font-bold tracking-wide text-[var(--color-muted)] uppercase">{label}</span>}
      <input
        id={inputId}
        className={`h-[40px] rounded-[8px] bg-[var(--color-canvas-dark)] border px-3 text-[13px] text-white placeholder:text-[var(--color-muted)] focus:outline-none transition
          ${error ? "border-[var(--color-trading-down)] focus:border-[var(--color-trading-down)]" : "border-[var(--color-hairline-on-dark)] focus:border-[var(--color-primary)]/50"} ${className}`}
        {...props}
      />
      {error && <span className="text-[11px] font-semibold text-[var(--color-trading-down)]">{error}</span>}
    </label>
  );
}

export function Textarea({ label, error, className = "", id, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; error?: string | null }) {
  const autoId = React.useId();
  const tid = id ?? autoId;
  return (
    <label htmlFor={tid} className="flex flex-col gap-1.5">
      {label && <span className="text-[11px] font-bold tracking-wide text-[var(--color-muted)] uppercase">{label}</span>}
      <textarea
        id={tid}
        className={`min-h-[72px] rounded-[8px] bg-[var(--color-canvas-dark)] border p-3 text-[13px] text-white placeholder:text-[var(--color-muted)] focus:outline-none resize-y transition
          ${error ? "border-[var(--color-trading-down)]" : "border-[var(--color-hairline-on-dark)] focus:border-[var(--color-primary)]/50"} ${className}`}
        {...props}
      />
      {error && <span className="text-[11px] font-semibold text-[var(--color-trading-down)]">{error}</span>}
    </label>
  );
}
