"use client";
import { useEffect, useState } from "react";
import { User, Save } from "lucide-react";
import { getProfile, setProfile, loadProfileFromDB, UserProfile } from "@/lib/profile";

export function ProfilePage() {
  const [profile, setLocalProfile] = useState<UserProfile>({
    name: "",
    address: "",
    email: "",
    contact: "",
    watermark: "",
    currencyName: "",
    currencySymbol: "",
  });
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      await loadProfileFromDB();
      setLocalProfile(getProfile());
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const res = await setProfile(profile);
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const update = (field: keyof UserProfile, value: string) => {
    setLocalProfile(prev => ({ ...prev, [field]: value }));
    setSaved(false);
  };

  const inputCls = "w-full h-10 rounded-[8px] bg-[var(--color-canvas-dark)] border border-[var(--color-hairline-on-dark)] text-[13px] text-white px-3 focus:outline-none focus:border-[var(--color-primary)]/40 placeholder:text-[var(--color-muted)] transition";
  const labelCls = "text-[11px] font-bold tracking-wide text-[var(--color-muted)] uppercase";

  return (
    <div className="h-full min-h-0 flex flex-col w-full xl:max-w-[80%] max-w-[1000px] mx-auto px-6 py-6 overflow-y-auto">
      <div className="shrink-0 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-[20px] font-bold tracking-tight text-white">Profile</h1>
          <p className="text-[12px] leading-relaxed text-[var(--color-muted-strong)] mt-1 max-w-[60ch]">
            Your details are used in PDF exports and watermarks. Stored locally only.
          </p>
        </div>
      </div>

      <div className="mt-6 rounded-[12px] bg-[var(--color-surface-card-dark)] border border-[var(--color-hairline-on-dark)] overflow-hidden">
        <div className="p-5 space-y-5">
          {/* Name */}
          <div>
            <label className={labelCls}>Full Name</label>
            <input
              type="text"
              value={profile.name}
              onChange={e => update("name", e.target.value)}
              placeholder="e.g. John Doe"
              className={`${inputCls} mt-1.5`}
            />
          </div>

          {/* Address */}
          <div>
            <label className={labelCls}>Address</label>
            <textarea
              value={profile.address}
              onChange={e => update("address", e.target.value)}
              placeholder="e.g. 123 Main St, City, Country"
              rows={3}
              className={`${inputCls} mt-1.5 py-2 resize-none`}
            />
          </div>

          {/* Email + Contact */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className={labelCls}>Email</label>
              <input
                type="email"
                value={profile.email}
                onChange={e => update("email", e.target.value)}
                placeholder="e.g. name@example.com"
                className={`${inputCls} mt-1.5`}
              />
            </div>
            <div>
              <label className={labelCls}>Contact Number</label>
              <input
                type="tel"
                value={profile.contact}
                onChange={e => {
                  const filtered = e.target.value.replace(/[^0-9+()\s-]/g, "");
                  update("contact", filtered);
                }}
                onKeyDown={e => {
                  if (/^[a-zA-Z]$/.test(e.key) && !e.ctrlKey && !e.metaKey) e.preventDefault();
                }}
                placeholder="e.g. +1 555 123 4567"
                className={`${inputCls} mt-1.5`}
              />
            </div>
          </div>

          {/* Currency */}
          <div className="h-px bg-[var(--color-hairline-on-dark)]" />
          <div>
            <label className={labelCls}>Currency Format</label>
            <p className="text-[11px] text-[var(--color-muted)] mt-1 mb-1.5">
              Used in statements and PDF exports for formatting amounts.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold text-[var(--color-muted)] uppercase">Currency Name</label>
                <input
                  type="text"
                  value={profile.currencyName}
                  onChange={e => update("currencyName", e.target.value)}
                  placeholder="e.g. Indian Rupee, US Dollar"
                  className={`${inputCls} mt-1.5`}
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-[var(--color-muted)] uppercase">Currency Symbol</label>
                <input
                  type="text"
                  value={profile.currencySymbol}
                  onChange={e => {
                    const val = e.target.value;
                    update("currencySymbol", val);
                  }}
                  onKeyDown={e => {
                    if (e.key.length === 1 && !/^\p{Sc}$/u.test(e.key) && !e.ctrlKey && !e.metaKey) e.preventDefault();
                  }}
                  placeholder="e.g. ₹, $, €"
                  className={`${inputCls} mt-1.5`}
                  maxLength={3}
                />
              </div>
            </div>
          </div>

          {/* Watermark */}
          <div className="h-px bg-[var(--color-hairline-on-dark)]" />
          <div>
            <label className={labelCls}>Watermark Text</label>
            <p className="text-[11px] text-[var(--color-muted)] mt-1 mb-1.5">
              Text displayed diagonally across each page when watermark is enabled in PDF export.
            </p>
            <input
              type="text"
              value={profile.watermark}
              onChange={e => update("watermark", e.target.value)}
              placeholder="e.g. CONFIDENTIAL"
              className={`${inputCls} mt-1.5`}
            />
          </div>
        </div>

        {/* Save */}
        <div className="px-5 py-3 border-t border-[var(--color-hairline-on-dark)] flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="h-9 px-4 rounded-[8px] bg-[var(--color-primary)] text-[var(--color-on-primary)] text-[12px] font-bold flex items-center gap-2 hover:opacity-90 active:scale-[0.98] transition disabled:opacity-50"
          >
            <Save size={14} /> {saving ? "Saving..." : "Save Profile"}
          </button>
          {saved && (
            <span className="text-[11px] font-bold text-[var(--color-trading-up)] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-trading-up)]" /> Saved
            </span>
          )}
        </div>
      </div>

      {/* Preview card */}
      {(profile.name || profile.email || profile.contact) && (
        <div className="mt-6 rounded-[12px] bg-[var(--color-surface-card-dark)] border border-[var(--color-hairline-on-dark)] p-5">
          <div className="text-[11px] font-bold tracking-wide text-[var(--color-muted)] uppercase mb-3">Preview — as it appears in exports</div>
          <div className="flex items-start gap-3">
            <span className="w-10 h-10 rounded-full bg-[var(--color-surface-elevated-dark)] border border-[var(--color-hairline-on-dark)] flex items-center justify-center shrink-0">
              <User size={18} className="text-[var(--color-muted)]" />
            </span>
            <div className="min-w-0">
              {profile.name && <div className="text-[14px] font-bold text-white">{profile.name}</div>}
              {profile.address && <div className="text-[12px] text-[var(--color-muted-strong)] mt-0.5 whitespace-pre-line">{profile.address}</div>}
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-[11px] text-[var(--color-muted)]">
                {profile.email && <span>{profile.email}</span>}
                {profile.contact && <span>{profile.contact}</span>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
