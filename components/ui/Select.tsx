"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  placeholder?: string;
  ariaLabel?: string;
}

export function Select({ value, onChange, options, placeholder, ariaLabel }: SelectProps) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const selected = options.find((o) => o.value === value);

  const updateRect = () => {
    if (btnRef.current) setRect(btnRef.current.getBoundingClientRect());
  };

  useLayoutEffect(() => {
    if (open) updateRect();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node;
      const btn = btnRef.current;
      const portal = document.getElementById("hk-select-portal");
      if (btn?.contains(target)) return;
      if (portal?.contains(target)) return;
      setOpen(false);
    };
    const onResize = () => updateRect();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onDoc);
    window.addEventListener("scroll", onResize, true);
    window.addEventListener("resize", onResize);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDoc);
      window.removeEventListener("scroll", onResize, true);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`w-full h-[40px] rounded-[8px] bg-[var(--color-canvas-dark)] border px-3 flex items-center justify-between gap-2 text-[13px] font-medium text-left transition
          ${open ? "border-[var(--color-primary)]/50 ring-2 ring-[var(--color-primary)]/15" : "border-[var(--color-hairline-on-dark)] hover:border-[var(--color-primary)]/20"}
          focus:outline-none`}
      >
        <span className={selected ? "text-white" : "text-[var(--color-muted)]"}>{selected?.label ?? placeholder ?? "Select"}</span>
        <ChevronDown size={14} className={`text-[var(--color-muted)] shrink-0 transition-transform ${open ? "rotate-180 text-white" : ""}`} />
      </button>

      {open && rect && typeof document !== "undefined"
        ? createPortal(
            <div
              id="hk-select-portal"
              role="listbox"
              style={{
                position: "fixed",
                top: rect.bottom + 6,
                left: rect.left,
                width: rect.width,
                zIndex: 60,
              }}
              className="rounded-[8px] bg-[var(--color-surface-card-dark)] border border-[var(--color-hairline-on-dark)] shadow-[0_12px_32px_rgba(0,0,0,0.55)] overflow-hidden p-1"
            >
              {options.map((opt) => {
                const isActive = opt.value === value;
                return (
                  <button
                    key={opt.value}
                    role="option"
                    aria-selected={isActive}
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    className={`w-full flex items-center justify-between rounded-[6px] px-3 py-2 text-[13px] font-medium transition text-left
                      ${isActive ? "bg-[var(--color-primary)] text-[var(--color-on-primary)]" : "text-[var(--color-muted-strong)] hover:text-white hover:bg-[var(--color-surface-elevated-dark)]"}`}
                  >
                    <span>{opt.label}</span>
                    {isActive && <Check size={14} strokeWidth={2.5} />}
                  </button>
                );
              })}
            </div>,
            document.body
          )
        : null}
    </>
  );
}
