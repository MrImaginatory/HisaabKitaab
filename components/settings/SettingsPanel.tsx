"use client";
import { useState, useEffect } from "react";
import { Moon, Sun, Palette, Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ACCENT_PRESETS, DEFAULT_ACCENT, ThemeMode, applyTheme, getStoredAccent, getStoredMode, setStoredAccent, setStoredMode } from "@/lib/theme";

export function SettingsPanel() {
  const [mode, setMode] = useState<ThemeMode>(() => getStoredMode());
  const [accent, setAccent] = useState<string>(() => getStoredAccent());
  const [custom, setCustom] = useState<string>(() => getStoredAccent());

  useEffect(() => {
    applyTheme(mode, accent);
    // only on mount — theme is controlled via handlers afterwards
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleMode = (m: ThemeMode) => {
    setMode(m);
    setStoredMode(m);
  };
  const handleAccent = (c: string) => {
    setAccent(c);
    setCustom(c);
    setStoredAccent(c);
  };
  const handleCustom = (v: string) => {
    setCustom(v);
    if (/^#[0-9a-fA-F]{6}$/.test(v)) {
      setAccent(v.toLowerCase());
      setStoredAccent(v.toLowerCase());
    }
  };
  const handleReset = () => {
    setMode("dark");
    setAccent(DEFAULT_ACCENT);
    setCustom(DEFAULT_ACCENT);
    setStoredMode("dark");
    setStoredAccent(DEFAULT_ACCENT);
  };

  return (
    <div className="max-w-[760px] mx-auto px-6 py-6">
      <h1 className="text-[20px] font-bold tracking-tight text-white">Settings</h1>
      <p className="text-[12px] leading-relaxed text-[var(--color-muted-strong)] mt-1 max-w-[60ch]">Manage appearance. Your choice is saved locally and never leaves the device. Binance-dark precision with your accent.</p>

      {/* Theme mode */}
      <div className="mt-6 rounded-[12px] bg-[var(--color-surface-card-dark)] border border-[var(--color-hairline-on-dark)] overflow-hidden">
        <div className="px-5 py-4 border-b border-[var(--color-hairline-on-dark)] flex items-center justify-between">
          <h2 className="text-[13px] font-bold text-white flex items-center gap-2">
            <span className="w-1 h-4 rounded-full bg-[var(--color-primary)]" /> Appearance
          </h2>
          <span className="text-[11px] font-medium text-[var(--color-muted)] capitalize">{mode} • {accent}</span>
        </div>
        <div className="p-5 space-y-5">
          <div>
            <div className="text-[11px] font-bold tracking-wide text-[var(--color-muted)] uppercase">Theme</div>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {[
                { v: "dark" as ThemeMode, label: "Dark", desc: "Near-black canvas #0b0e11", icon: Moon },
                { v: "light" as ThemeMode, label: "Light", desc: "White canvas — transactional", icon: Sun },
              ].map((opt) => {
                const active = mode === opt.v;
                return (
                  <button
                    key={opt.v}
                    onClick={() => handleMode(opt.v)}
                    className={`rounded-[8px] border p-3 flex items-center gap-3 text-left transition ${active ? "bg-[var(--color-primary)] border-[var(--color-primary)] text-[var(--color-on-primary)]" : "bg-[var(--color-canvas-dark)] border-[var(--color-hairline-on-dark)] hover:border-[var(--color-primary)]/20 text-white"}`}
                  >
                    <span className={`w-9 h-9 rounded-[8px] flex items-center justify-center border shrink-0 ${active ? "bg-black/10 border-black/10" : "bg-[var(--color-surface-elevated-dark)] border-[var(--color-hairline-on-dark)]"}`}>
                      <opt.icon size={16} />
                    </span>
                    <span className="min-w-0">
                      <span className={`block text-[13px] font-bold leading-none ${active ? "text-[var(--color-on-primary)]" : "text-white"}`}>{opt.label}</span>
                      <span className={`block text-[11px] mt-1 truncate ${active ? "text-[var(--color-on-primary)]/70" : "text-[var(--color-muted)]"}`}>{opt.desc}</span>
                    </span>
                    {active && <Check size={14} className="ml-auto shrink-0" strokeWidth={2.5} />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="h-px bg-[var(--color-hairline-on-dark)]" />

          <div>
            <div className="flex items-center justify-between">
              <div className="text-[11px] font-bold tracking-wide text-[var(--color-muted)] uppercase flex items-center gap-1.5"><Palette size={12} /> Accent color</div>
              <Button variant="ghost" size="sm" onClick={handleReset}><RotateCcw size={12} /> Reset</Button>
            </div>
            <div className="mt-3 grid grid-cols-8 gap-2">
              {ACCENT_PRESETS.map((c) => {
                const active = c.toLowerCase() === accent.toLowerCase();
                return (
                  <button
                    key={c}
                    onClick={() => handleAccent(c)}
                    aria-label={`Accent ${c}`}
                    className={`w-full aspect-square rounded-full border-2 flex items-center justify-center transition ${active ? "border-white shadow-[0_0_0_2px_var(--color-primary)]" : "border-white/10 hover:border-white/30"}`}
                    style={{ background: c }}
                  >
                    {active && <Check size={14} className="text-white drop-shadow" strokeWidth={3} />}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 h-[40px] rounded-[8px] bg-[var(--color-canvas-dark)] border border-[var(--color-hairline-on-dark)] flex items-center gap-2 px-2">
                <input type="color" value={custom} onChange={(e) => handleCustom(e.target.value)} className="color-round w-8 h-8 shrink-0" aria-label="Custom accent" />
                <input value={custom} onChange={(e) => handleCustom(e.target.value)} placeholder="#fcd535" className="flex-1 bg-transparent text-[12px] font-num text-white focus:outline-none" />
                <span className="text-[11px] font-bold text-[var(--color-muted)] hidden sm:inline">Custom hex</span>
              </div>
              <div className="w-[40px] h-[40px] rounded-[8px] border border-white/10 shrink-0" style={{ background: accent }} title="Preview" />
            </div>
            <p className="text-[11px] text-[var(--color-muted)] mt-2">Accent powers every primary CTA, selection, and focus ring — Binance single-yellow philosophy, your color.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
