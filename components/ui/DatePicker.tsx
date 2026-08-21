"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

interface DatePickerProps {
  label?: string;
  value: string; // YYYY-MM-DD
  onChange: (iso: string) => void;
  placeholder?: string;
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DOW = ["Mo","Tu","We","Th","Fr","Sa","Su"];

function toISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function parseISO(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y,m,day] = s.split("-").map(Number);
  const d = new Date(y, m - 1, day);
  if (d.getFullYear() !== y || d.getMonth() !== m - 1 || d.getDate() !== day) return null;
  return d;
}
function fmtDisplay(iso: string) {
  const d = parseISO(iso);
  if (!d) return "";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function DatePicker({ label, value, onChange, placeholder = "Pick a date" }: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const cur = parseISO(value);
  const [viewYear, setViewYear] = useState(() => cur?.getFullYear() ?? new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => cur ? cur.getMonth() : new Date().getMonth());

  useEffect(() => {
    const p = parseISO(value);
    if (p) { setViewYear(p.getFullYear()); setViewMonth(p.getMonth()); }
  }, [value]);

  const updateRect = () => { if (btnRef.current) setRect(btnRef.current.getBoundingClientRect()); };
  useLayoutEffect(() => { if (open) updateRect(); }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const btn = btnRef.current;
      const portal = document.getElementById("hk-datepicker-portal");
      if (btn?.contains(e.target as Node)) return;
      if (portal?.contains(e.target as Node)) return;
      setOpen(false);
    };
    const onResize = () => updateRect();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
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

  // calendar grid
  const firstDowMon0 = (() => {
    const first = new Date(viewYear, viewMonth, 1);
    // getDay 0=Sun -> 6, 1=Mon->0 etc for Mon-start
    return (first.getDay() + 6) % 7;
  })();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrev = new Date(viewYear, viewMonth, 0).getDate();
  const todayISO = toISO(new Date());

  const cells: { day: number; iso: string; muted: boolean }[] = [];
  for (let i = firstDowMon0 - 1; i >= 0; i--) {
    const d = daysInPrev - i;
    const dt = new Date(viewYear, viewMonth - 1, d);
    cells.push({ day: d, iso: toISO(dt), muted: true });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, iso: toISO(new Date(viewYear, viewMonth, d)), muted: false });
  }
  while (cells.length % 7 !== 0 || cells.length < 35) {
    const extra = cells.length - (firstDowMon0 + daysInMonth);
    const d = extra + 1;
    const dt = new Date(viewYear, viewMonth + 1, d);
    cells.push({ day: d, iso: toISO(dt), muted: true });
    if (cells.length >= 42) break;
  }
  // trim to exactly 35 if we have 6 weeks unnecessary
  const trimmed = cells.length === 42 && firstDowMon0 + daysInMonth <= 35 ? cells.slice(0, 35) : cells;

  return (
    <label className="flex flex-col gap-1.5">
      {label && <span className="text-[11px] font-bold tracking-wide text-[var(--color-muted)] uppercase">{label}</span>}
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`h-[40px] rounded-[8px] bg-[var(--color-canvas-dark)] border px-3 flex items-center justify-between gap-2 text-left transition
          ${open ? "border-[var(--color-primary)]/50 ring-2 ring-[var(--color-primary)]/15" : "border-[var(--color-hairline-on-dark)] hover:border-[var(--color-primary)]/20"} focus:outline-none`}
      >
        <span className={`text-[13px] truncate ${value ? "text-white font-medium" : "text-[var(--color-muted)]"}`}>{value ? fmtDisplay(value) : placeholder}</span>
        <span className={`w-7 h-7 rounded-[6px] bg-[var(--color-surface-elevated-dark)] border border-[var(--color-hairline-on-dark)] flex items-center justify-center shrink-0 ${open ? "text-white" : "text-[var(--color-muted)]"}`}>
          <Calendar size={14} />
        </span>
      </button>

      {open && rect && typeof document !== "undefined"
        ? createPortal(
            <div
              id="hk-datepicker-portal"
              style={{ position: "fixed", top: rect.bottom + 6, left: rect.left, width: Math.max(rect.width, 300), zIndex: 60 }}
              className="rounded-[12px] bg-[var(--color-surface-card-dark)] border border-[var(--color-hairline-on-dark)] shadow-[0_12px_32px_rgba(0,0,0,0.55)] overflow-hidden p-3"
            >
              <div className="flex items-center justify-between">
                <button type="button" onClick={() => {
                  const d = new Date(viewYear, viewMonth - 1, 1);
                  setViewYear(d.getFullYear()); setViewMonth(d.getMonth());
                }} className="w-7 h-7 rounded-[6px] bg-[var(--color-surface-elevated-dark)] border border-[var(--color-hairline-on-dark)] text-[var(--color-muted)] hover:text-white flex items-center justify-center"><ChevronLeft size={14} /></button>
                <div className="text-[13px] font-bold text-white">{MONTHS[viewMonth]} <span className="font-num text-[var(--color-muted-strong)]">{viewYear}</span></div>
                <button type="button" onClick={() => {
                  const d = new Date(viewYear, viewMonth + 1, 1);
                  setViewYear(d.getFullYear()); setViewMonth(d.getMonth());
                }} className="w-7 h-7 rounded-[6px] bg-[var(--color-surface-elevated-dark)] border border-[var(--color-hairline-on-dark)] text-[var(--color-muted)] hover:text-white flex items-center justify-center"><ChevronRight size={14} /></button>
              </div>

              <div className="mt-3 grid grid-cols-7 gap-1 text-[11px] font-bold tracking-wide text-[var(--color-muted)] uppercase text-center">
                {DOW.map((d) => <div key={d} className="py-1">{d}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-1 mt-1">
                {trimmed.map((c) => {
                  const isToday = c.iso === todayISO;
                  const isSelected = c.iso === value;
                  return (
                    <button
                      key={c.iso}
                      type="button"
                      onClick={() => { onChange(c.iso); setOpen(false); }}
                      className={`h-8 rounded-[8px] text-[12px] font-medium flex items-center justify-center border transition
                        ${isSelected ? "bg-[var(--color-primary)] text-[var(--color-on-primary)] border-[var(--color-primary)] font-bold" : isToday ? "bg-[var(--color-surface-elevated-dark)] text-white border-[var(--color-primary)]/30" : c.muted ? "text-[var(--color-muted)]/50 border-transparent hover:bg-[var(--color-surface-elevated-dark)] hover:text-white" : "text-white border-transparent hover:bg-[var(--color-surface-elevated-dark)]"}`}
                    >
                      {c.day}
                    </button>
                  );
                })}
              </div>

              <div className="mt-3 flex items-center justify-between gap-2 border-t border-[var(--color-hairline-on-dark)] pt-2">
                <button type="button" onClick={() => { const t = toISO(new Date()); onChange(t); setViewYear(new Date().getFullYear()); setViewMonth(new Date().getMonth()); setOpen(false); }} className="text-[11px] font-bold text-[var(--color-primary)] hover:underline">Today</button>
                <button type="button" onClick={() => setOpen(false)} className="text-[11px] font-bold text-[var(--color-muted-strong)] hover:text-white border border-[var(--color-hairline-on-dark)] rounded-full px-3 py-1">Close</button>
              </div>
            </div>,
            document.body
          )
        : null}
    </label>
  );
}
