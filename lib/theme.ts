export type ThemeMode = "dark" | "light";
export type FontSize = "small" | "medium" | "large";

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
const FONT_SIZE_KEY = "hk_font_size";
const FONT_FAMILY_KEY = "hk_font_family";

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
export function getStoredFontSize(): FontSize {
  if (typeof window === "undefined") return "medium";
  const v = localStorage.getItem(FONT_SIZE_KEY);
  return (v as FontSize) || "medium";
}
export function getStoredFontFamily(): string {
  if (typeof window === "undefined") return "Inter";
  return localStorage.getItem(FONT_FAMILY_KEY) || "Inter";
}

export function applyTheme(mode: ThemeMode, accent: string, fontSize: FontSize = getStoredFontSize(), fontFamily: string = getStoredFontFamily()) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  // light class toggle — Binance philosophy: marketing dark, transactional light
  root.classList.toggle("light", mode === "light");
  // accent variables — overrides @theme
  const active = darken(accent, 18);
  void `${accent}22`; // keep reference for future disabled tint
  // Compute disabled as accent mixed with canvas
  root.style.setProperty("--color-primary", accent);
  // keep disabled as desaturated dark yellowish for now if Binance yellow; else use accent with low alpha fallback
  // Also update selection etc via CSS vars automatically
  
  root.classList.remove("font-scale-small", "font-scale-large");
  if (fontSize === "small") root.classList.add("font-scale-small");
  if (fontSize === "large") root.classList.add("font-scale-large");
  root.style.removeProperty("zoom");

  // Google Font injection
  let link = document.getElementById("google-font-stylesheet") as HTMLLinkElement;
  if (!link) {
    link = document.createElement("link");
    link.id = "google-font-stylesheet";
    link.rel = "stylesheet";
    document.head.appendChild(link);
  }

  if (fontFamily && fontFamily.toLowerCase() !== "inter") {
    const formattedName = fontFamily.trim().replace(/\s+/g, '+');
    // Using a generic weight list that works for most standard variable and static Google Fonts
    link.href = `https://fonts.googleapis.com/css2?family=${formattedName}:ital,wght@0,300..800;1,300..800&family=${formattedName}:ital,wght@0,400;0,500;0,600;0,700;1,400;1,700&display=swap`;
  } else {
    link.href = "";
  }
  
  root.style.setProperty("--font-sans", `"${fontFamily}", Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`);
}

export function setStoredMode(mode: ThemeMode) {
  localStorage.setItem(MODE_KEY, mode);
  applyTheme(mode, getStoredAccent(), getStoredFontSize(), getStoredFontFamily());
}
export function setStoredAccent(accent: string) {
  const hex = accent.toLowerCase();
  if (!/^#[0-9a-fA-F]{6}$/.test(hex)) return;
  localStorage.setItem(ACCENT_KEY, hex);
  applyTheme(getStoredMode(), hex, getStoredFontSize(), getStoredFontFamily());
}
export function setStoredFontSize(size: FontSize) {
  localStorage.setItem(FONT_SIZE_KEY, size);
  applyTheme(getStoredMode(), getStoredAccent(), size, getStoredFontFamily());
}
export function setStoredFontFamily(family: string) {
  localStorage.setItem(FONT_FAMILY_KEY, family);
  applyTheme(getStoredMode(), getStoredAccent(), getStoredFontSize(), family);
}
