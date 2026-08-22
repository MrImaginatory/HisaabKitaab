import { dbGetProfile, dbSetProfile, UserProfile } from "./db";

export type { UserProfile };

const PROFILE_KEY = "hk_profile";

const DEFAULT: UserProfile = {
  name: "",
  address: "",
  email: "",
  contact: "",
  watermark: "",
};

/** Sync read from localStorage cache. Used by exports.ts and StatementPage. */
export function getProfile(): UserProfile {
  if (typeof window === "undefined") return DEFAULT;
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (!raw) return DEFAULT;
    return { ...DEFAULT, ...JSON.parse(raw) };
  } catch {
    return DEFAULT;
  }
}

/** Write to both localStorage cache and DB. */
export async function setProfile(p: Partial<UserProfile>): Promise<{ ok: boolean; error?: string }> {
  // Update localStorage cache immediately for sync callers
  const current = getProfile();
  const merged = { ...current, ...p };
  localStorage.setItem(PROFILE_KEY, JSON.stringify(merged));
  // Persist to DB
  return dbSetProfile(merged);
}

/** Hydrate localStorage cache from DB. Call once on app startup. */
export async function loadProfileFromDB(): Promise<void> {
  try {
    const profile = await dbGetProfile();
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // DB not ready yet — localStorage cache stays as-is
  }
}
