// Central string utilities — DB stores everything lowercase, UI displays capitalized.
export function toLowerTrim(s: string): string {
  return s.trim().toLowerCase();
}

export function capitalize(s: string): string {
  const t = s.trim();
  if (!t) return "";
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}

export function titleCase(s: string): string {
  return s
    .trim()
    .split(/\s+/)
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : ""))
    .join(" ");
}

// Alias for category/account/display names — each word capitalized
export const displayName = titleCase;

// For sentence-like descriptions
export function sentenceCase(s: string): string {
  const t = s.trim();
  if (!t) return "";
  return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
}
