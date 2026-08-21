"use client";
import { useState, useEffect } from "react";
import { Moon, Sun, Palette, Check, RotateCcw, Type } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { ACCENT_PRESETS, DEFAULT_ACCENT, ThemeMode, FontSize, applyTheme, getStoredAccent, getStoredMode, getStoredFontSize, getStoredFontFamily, setStoredAccent, setStoredMode, setStoredFontSize, setStoredFontFamily } from "@/lib/theme";

const FONT_OPTIONS = [
  { value: "Inter", label: "Inter" },
  { value: "Poppins", label: "Poppins" },
  { value: "Raleway", label: "Raleway" },
  { value: "Noto Sans", label: "Noto Sans" },
  { value: "Josefin Sans", label: "Josefin Sans" },
  { value: "Ubuntu Mono", label: "Ubuntu Mono" },
  { value: "Shantell Sans", label: "Shantell Sans" },
  { value: "Comic Neue", label: "Comic Sans (Neue)" },
  { value: "Klee One", label: "Klee One" },
  { value: "Playwrite US Moderna", label: "Playwrite US Moderna" },
];

export function SettingsPanel() {
  const [activeTab, setActiveTab] = useState<"colors" | "typography">("colors");
  const [mode, setMode] = useState<ThemeMode>(() => getStoredMode());
  const [accent, setAccent] = useState<string>(() => getStoredAccent());
  const [custom, setCustom] = useState<string>(() => getStoredAccent());
  const [fontSize, setFontSize] = useState<FontSize>(() => getStoredFontSize());
  const [fontFamily, setFontFamily] = useState<string>(() => getStoredFontFamily());
  const [customFont, setCustomFont] = useState<string>("");

  const SIZES: FontSize[] = ["xs", "s", "m", "l", "xl", "xxl"];

  useEffect(() => {
    applyTheme(mode, accent, fontSize, fontFamily);
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
  const handleFontSize = (s: FontSize) => {
    setFontSize(s);
    setStoredFontSize(s);
  };
  const handleFontFamily = (f: string) => {
    setFontFamily(f);
    setStoredFontFamily(f);
  };
  const handleCustomFontSubmit = () => {
    if (customFont.trim()) {
      handleFontFamily(customFont.trim());
      setCustomFont("");
    }
  };
  const handleReset = () => {
    setMode("dark");
    setAccent(DEFAULT_ACCENT);
    setCustom(DEFAULT_ACCENT);
    setFontSize("m");
    setFontFamily("Inter");
    setStoredMode("dark");
    setStoredAccent(DEFAULT_ACCENT);
    setStoredFontSize("m");
    setStoredFontFamily("Inter");
  };

  return (
    <div className="w-full xl:max-w-[80%] max-w-[1000px] mx-auto px-6 py-6">
      <h1 className="text-[20px] font-bold tracking-tight text-white">Settings</h1>
      <p className="text-[12px] leading-relaxed text-[var(--color-muted-strong)] mt-1 max-w-[60ch]">Manage appearance. Your choice is saved locally and never leaves the device. Binance-dark precision with your accent.</p>

      {/* Tabs */}
      <div className="mt-6 flex gap-1 border-b border-[var(--color-hairline-on-dark)]">
        <button onClick={() => setActiveTab("colors")} className={`px-4 py-2.5 text-[13px] font-bold border-b-2 transition-colors ${activeTab === "colors" ? "border-[var(--color-primary)] text-white" : "border-transparent text-[var(--color-muted)] hover:text-white"}`}>Colors</button>
        <button onClick={() => setActiveTab("typography")} className={`px-4 py-2.5 text-[13px] font-bold border-b-2 transition-colors ${activeTab === "typography" ? "border-[var(--color-primary)] text-white" : "border-transparent text-[var(--color-muted)] hover:text-white"}`}>Typography</button>
      </div>

      <div className="mt-4 rounded-[12px] bg-[var(--color-surface-card-dark)] border border-[var(--color-hairline-on-dark)] overflow-hidden">
        {activeTab === "colors" && (
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
                  {/* <span className="text-[11px] font-bold text-[var(--color-muted)] hidden sm:inline">Custom hex</span> */}
                </div>
                {/* <div className="w-[40px] h-[40px] rounded-[8px] border border-white/10 shrink-0" style={{ background: accent }} title="Preview" /> */}
              </div>
              <p className="text-[11px] text-[var(--color-muted)] mt-2">Accent powers every primary CTA, selection, and focus ring — Binance single-yellow philosophy, your color.</p>
            </div>
          </div>
        )}

        {activeTab === "typography" && (
          <div className="p-5 space-y-5">
            <div>
              <div className="text-[11px] font-bold tracking-wide text-[var(--color-muted)] uppercase flex items-center gap-1.5"><Type size={12} /> Font Family</div>
              <div className="mt-3 flex flex-col gap-3">
                <Select value={FONT_OPTIONS.some(o => o.value === fontFamily) ? fontFamily : "custom"} onChange={(v) => {
                  if (v !== "custom") handleFontFamily(v);
                }} options={[...FONT_OPTIONS, { value: "custom", label: FONT_OPTIONS.some(o => o.value === fontFamily) ? "Custom..." : `Custom: ${fontFamily}` }]} ariaLabel="Select Font Family" />
                
                <div className="flex items-center gap-2">
                  <input value={customFont} onChange={(e) => setCustomFont(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleCustomFontSubmit()} placeholder="Or type a Google Font name..." className="flex-1 h-9 rounded-[8px] bg-[var(--color-canvas-dark)] border border-[var(--color-hairline-on-dark)] text-[12px] px-3 focus:outline-none focus:border-[var(--color-primary)]/40 text-white placeholder:text-[var(--color-muted)]" />
                  <Button size="sm" onClick={handleCustomFontSubmit}>Apply</Button>
                </div>
              </div>
              <p className="text-[11px] text-[var(--color-muted)] mt-2">Choose a font from the list, or type any exact Google Font name and click Apply.</p>
            </div>

            <div className="h-px bg-[var(--color-hairline-on-dark)]" />

            <div>
              <div className="text-[11px] font-bold tracking-wide text-[var(--color-muted)] uppercase flex items-center gap-1.5"><Type size={12} /> Font size</div>
              <div className="mt-6 mb-2 px-1">
                <input 
                  type="range" 
                  min="0" 
                  max="5" 
                  step="1" 
                  value={SIZES.indexOf(fontSize)} 
                  onChange={(e) => handleFontSize(SIZES[parseInt(e.target.value, 10)])}
                  className="w-full accent-[var(--color-primary)]"
                />
                <div className="flex justify-between mt-2 text-[10px] font-bold text-[var(--color-muted)] uppercase">
                  {SIZES.map(s => (
                    <span key={s} className={fontSize === s ? "text-white" : ""}>{s}</span>
                  ))}
                </div>
              </div>
              <p className="text-[11px] text-[var(--color-muted)] mt-2">Use the slider to scale the overall UI size up or down.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
