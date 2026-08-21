export type ThemeMode = "dark" | "light";

export const DEFAULT_ACCENT = "#fcd535";
export const ACCENT_PRESETS = [
  "#fcd535", // Binance yellow (default)
  "#0ecb81", // trading up / income
  "#f6465d", // trading down
  "#3b82f6", // info blue
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#f97316", // orange
  "#14b8a6", // teal
] as const;

const MODE_KEY = "hk_theme_mode";
const ACCENT_KEY = "hk_accent_color";

function darken(hex: string, amt = 14): string {
  const c = hex.replace("#", "");
  const r = Math.max(0, parseInt(c.slice(0, 2), 16) - amt);
  const g = Math.max(0, parseInt(c.slice(2, 4), 16) - amt);
  const b = Math.max(0, parseInt(c.slice(4, 6), 16) - amt);
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

export function getStoredMode(): ThemeMode {
  if (typeof window === "undefined") return "dark";
  const v = localStorage.getItem(MODE_KEY);
  return v === "light" ? "light" : "dark";
}
export function getStoredAccent(): string {
  if (typeof window === "undefined") return DEFAULT_ACCENT;
  const v = localStorage.getItem(ACCENT_KEY);
  return v && /^#[0-9a-fA-F]{6}$/.test(v) ? v.toLowerCase() : DEFAULT_ACCENT;
}

export function applyTheme(mode: ThemeMode, accent: string) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  // light class toggle — Binance philosophy: marketing dark, transactional light
  root.classList.toggle("light", mode === "light");
  // accent variables — overrides @theme
  const active = darken(accent, 18);
  void `${accent}22`; // keep reference for future disabled tint
  // Compute disabled as accent mixed with canvas
  root.style.setProperty("--color-primary", accent);
  root.style.setProperty("--color-primary-active", active);
  root.style.setProperty("--color-primary-disabled", "#3a3a1f");
  // keep disabled as desaturated dark yellowish for now if Binance yellow; else use accent with low alpha fallback
  // Also update selection etc via CSS vars automatically
}

export function setStoredMode(mode: ThemeMode) {
  localStorage.setItem(MODE_KEY, mode);
  applyTheme(mode, getStoredAccent());
}
export function setStoredAccent(accent: string) {
  const hex = accent.toLowerCase();
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return;
  localStorage.setItem(ACCENT_KEY, hex);
  applyTheme(getStoredMode(), hex);
}
