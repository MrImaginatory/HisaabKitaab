# HisaabKitaab

A **100% local-first, offline personal finance manager** built as a Progressive Web App. It runs entirely in the browser — no server, no cloud sync, no network calls for data. Your financial records are stored in a real [SQLite](https://sql.js.org/) database (via [sql.js](https://www.sqlite.org/wasm/) WASM) persisted in [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API), with first-class support for reading/writing a `.db` file directly on disk through the [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_Access_API).

> **Hisaab** (حساب) meaning *"account"* in Urdu/Hindi, and **Kitaab** (کتاب) meaning *"book"* — i.e., your personal account book / ledger.

---

## Table of Contents

1. [Overview](#overview)
2. [Key Features](#key-features)
3. [Architecture](#architecture)
4. [Project Structure](#project-structure)
5. [Data Model (SQLite Schema)](#data-model-sqlite-schema)
6. [Pages & Navigation](#pages--navigation)
7. [Persistence & File Handling](#persistence--file-handling)
8. [Design System](#design-system)
9. [Dependencies](#dependencies)
10. [Getting Started](#getting-started)
11. [Configuration](#configuration)
12. [Development](#development)
13. [Design Decisions](#design-decisions)

---

## Overview

HisaabKitaab is a browser-based accounting / ledger application inspired by the Binance design system (deep near-black canvas, single yellow accent, flat color blocks). It lets users track income, expenses, accounts, categories, and payment mediums — all stored locally in SQLite with no backend.

On launch, the user is prompted to either **open an existing `.db` file**, **reconnect to the last-used database**, or **download a blank SQLite database**. Once a database is active, the full spreadsheet-like UI becomes available with navigation via a responsive sidebar (desktop) or bottom tab bar (mobile).

---

## Key Features

| Area | Feature |
|---|---|
| **Data** | Real SQLite database (sql.js) in the browser; IndexedDB persistence; `.db` file export/import; optional direct file read/write via File System Access API |
| **Dashboard** | KPI summary (total balance, income, expenses, counts), spend analytics with donut charts (by category & payment medium), daily spend line chart, recent transactions list |
| **Transactions** | Create / edit / delete income & expense entries; assign to accounts, categories, and payment mediums; tabular + mobile card views; searchable |
| **Accounts** | Create / edit / delete accounts (bank, cash, UPI, etc.); opening balances; auto-computed current balances from transactions |
| **Categories** | Create / edit / delete income & expense categories with custom colors; CSV import with live preview & validation (case-insensitive dedup); sample CSV download |
| **Payment Mediums** | Online & offline payment methods (UPI, credit card, cash, cheque, etc.); seeded defaults; user-addable |
| **Statement** | Date-range-paginated transaction ledger with running per-account balances; export to **PDF** (with optional diagonal watermark + logo) or **Excel** |
| **Profile** | Store name, address, email, contact, currency symbol/name, and watermark text — used in PDF/Excel exports |
| **Settings** | Dark / light theme toggle; accent color picker (8 presets + custom hex); font family selector (Google Fonts); 6-step font size slider; PWA service-worker unregister |
| **Performance** | PWA with service worker (Serwist) for offline caching; splash screen on load; `prefetch`/`font` optimizations via `next/font` |

---

## Architecture

```
Browser
  │
  │  ┌─────────────────────────────────────────────────────────┐
  │  │  Next.js App Router (pages/page.tsx — SPA shell)         │
  │  │  ─ Sidebar / BottomNav navigation                        │
  │  │  ─ All routes rendered conditionally in one file         │
  │  └─────────────────────────────────────────────────────────┘
  │
  │  ┌─────────────────────────────────────────────────────────┐
  │  │  IndexedDB ("HisaabKitaab" store "sqlite")              │
  │  │  — persists the raw SQLite .db file bytes               │
  │  │  — keyed by last DB filename (localStorage hk_last_db)  │
  │  └─────────────────────────────────────────────────────────┘
  │
  │  ┌─────────────────────────────────────────────────────────┐
  │  │  sql.js (SQLite compiled to WASM)                        │
  │  │  — in-memory Database instance loaded from IndexedDB     │
  │  │  — all CRUD operations run live SQL queries              │
  │  │  — db.export() → bytes → written back to IndexedDB       │
  │  └─────────────────────────────────────────────────────────┘
  │
  └─> Optional: File System Access API (Chromium only)
       — direct read/write to a .db file on the user's disk
```

### Key Principles

- **Zero backend**: Everything is client-side. No API routes, no fetch of remote endpoints.
- **SQLite is the source of truth**: All domain data (categories, accounts, transactions, payment mediums, profile) lives in SQLite tables. `localStorage` is used *only* for UI preferences (theme, accent, font) and a profile cache.
- **Migration-friendly schema**: The `ensureSchema()` function uses `CREATE TABLE IF NOT EXISTS` and `ALTER TABLE ADD COLUMN` (with try/catch for existing columns) so existing `.db` files upgrade gracefully.
- **Hydration-safe**: The initial render matches the server to avoid hydration mismatches; `localStorage` reads happen only inside `useEffect`.

---

## Project Structure

```
HisaabKitaab/
├── app/                          # Next.js App Router entry points
│   ├── layout.tsx                # Root layout (fonts, metadata, viewport, global CSS)
│   ├── page.tsx                  # Main shell — DB onboarding, splash, routing, settings modal
│   ├── globals.css               # Tailwind CSS + custom design-token utilities
│   ├── sw.ts                     # Serwist service worker (PWA caching)
│   ├── manifest.ts               # PWA web app manifest
│   └── apple-icon.tsx            # Apple touch icon (SVG → PNG via ImageResponse)
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx           # Desktop sidebar + mobile bottom nav + manage modal
│   │   └── SplashScreen.tsx      # Animated splash with SVG logo
│   ├── dashboard/
│   │   └── DashboardPage.tsx     # KPIs, charts, recent transactions
│   ├── transactions/
│   │   └── TransactionsPage.tsx  # Transaction CRUD with form
│   ├── accounts/
│   │   └── AccountsPage.tsx      # Account CRUD (list/card views)
│   ├── category/
│   │   └── CategoryPage.tsx      # Category CRUD + CSV import (preview & analysis)
│   ├── payment-medium/
│   │   └── PaymentMediumPage.tsx # Online/offline payment medium management
│   ├── statement/
│   │   └── StatementPage.tsx     # Paginated transaction ledger + PDF/Excel export
│   ├── profile/
│   │   └── ProfilePage.tsx       # Personal details + currency + watermark
│   ├── settings/
│   │   └── SettingsPanel.tsx     # Theme / accent / typography / PWA controls
│   └── ui/                       # Reusable primitives
│       ├── Button.tsx            # Multi-variant button (primary/secondary/ghost/trading)
│       ├── Card.tsx              # Card + header + content layout
│       ├── Input.tsx             # Input + Textarea with label/error
│       ├── Select.tsx            # Custom dropdown (portal-based)
│       ├── Dialog.tsx            # Modal dialog
│       ├── DatePicker.tsx        # Calendar grid picker (portal-based)
│       ├── DataTable.tsx         # Sortable data table
│       ├── OptionCard.tsx        # Option/select card for choosing
│       └── charts/
│           ├── DonutChart.tsx    # SVG donut chart + legend
│           └── LineChart.tsx     # SVG line chart with gridlines
├── lib/
│   ├── db.ts                     # Core: sql.js loader, schema, IndexedDB IO, domain CRUD
│   ├── profile.ts                # Profile sync between IndexedDB cache + SQLite
│   ├── theme.ts                  # Theme mode, accent, font size/family management
│   ├── categoryStore.ts          # CSV parsing + preview analysis helpers (pure)
│   ├── periods.ts                # Date range calculations (presets + custom)
│   ├── stringUtils.ts            # Case conversion (DB stores lowercase, UI displays title case)
│   ├── exports.ts                # PDF + Excel generation (pdfkit + xlsx)
│   └── statementPdf.ts           # PDF layout engine (draws logo watermark, tables, footers)
├── public/
│   ├── Logo.svg                  # App logo (also used in manifest/icons)
│   ├── SplashLogo.svg            # Splash screen logo
│   ├── fonts/NotoSans-Regular.ttf
│   └── sql-wasm*.wasm            # sql.js WebAssembly binary
├── types/
│   └── pdfkit-standalone.d.ts    # Type declaration for pdfkit standalone build
├── scripts/                      # (empty)
├── .env                          # Environment variables
├── next.config.ts                # Next.js config (Turbopack, Serwist, dev origins)
├── postcss.config.mjs            # PostCSS pipeline
├── eslint.config.mjs             # ESLint (Next.js core-web-vitals + TypeScript)
├── tsconfig.json                 # TypeScript config (strict, path alias @/)
├── pnpm-lock.yaml                # pnpm lockfile
└── DESIGN-binance.md             # Binance design system reference (alpha)
```

---

## Data Model (SQLite Schema)

All schema management lives in `lib/db.ts:ensureSchema()`. The schema auto-migrates: `ALTER TABLE ... ADD COLUMN` is wrapped in try/catch so existing databases gain new columns without dropping data.

### Tables

**1. `categories`** — Income/expense categories
| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | TEXT | PK | `cat_<timestamp>_<random>` |
| `name` | TEXT | NOT NULL | Lowercase |
| `nameKey` | TEXT | NOT NULL, UNIQUE (NOCASE) | Lowercased name for dedup |
| `type` | TEXT | NOT NULL, CHECK (`income`/`expense`) | Lowercase |
| `color` | TEXT | NOT NULL | Hex `#rrggbb`, lowercase |
| `createdAt` | INTEGER | NOT NULL | Unix timestamp |

**2. `accounts`** — Main accounts (bank, cash, UPI, etc.)
| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | TEXT | PK | `acc_<timestamp>_<random>` |
| `name` | TEXT | NOT NULL | Lowercase |
| `nameKey` | TEXT | NOT NULL, UNIQUE (NOCASE) | Lowercased |
| `openingBalance` | REAL | NOT NULL | Initial balance |
| `description` | TEXT | NOT NULL DEFAULT `''` | Lowercase |
| `accountNumber` | TEXT | NOT NULL DEFAULT `''` | Last 6 digits |
| `date` | TEXT | NOT NULL | ISO `YYYY-MM-DD` |
| `createdAt` | INTEGER | NOT NULL | Timestamp |

**3. `transactions`** — Income & expense entries
| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | TEXT | PK | `txn_<timestamp>_<random>` |
| `type` | TEXT | NOT NULL, CHECK (`income`/`expense`) | Transaction direction |
| `amount` | REAL | NOT NULL | Positive number |
| `accountId` | TEXT | NOT NULL | FK → accounts.id |
| `categoryId` | TEXT | NOT NULL | FK → categories.id |
| `paymentMediumId` | TEXT | NOT NULL DEFAULT `''` | FK → payment_mediums.id |
| `reason` | TEXT | NOT NULL | Max 50 chars |
| `notes` | TEXT | NOT NULL | Max 1000 chars |
| `date` | TEXT | NOT NULL | ISO `YYYY-MM-DD` |
| `createdAt` | INTEGER | NOT NULL | Timestamp |

**4. `payment_mediums`** — Payment methods
| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | TEXT | PK | `pm_<timestamp>_<random>` |
| `name` | TEXT | NOT NULL | Lowercase |
| `grp` | TEXT | NOT NULL, CHECK (`online`/`offline`) | Note: column is `grp` (GROUP is reserved) |
| `createdAt` | INTEGER | NOT NULL | Timestamp |

Seeded on first init: *upi*, *net banking*, *credit card*, *debit card*, *wallet* (online); *cash*, *cheque*, *demand draft* (offline).

**5. `profile`** — Single-row profile (`id = 1`)
| Column | Type | Default |
|---|---|---|
| `id` | INTEGER | PK CHECK (id = 1) |
| `name` | TEXT | `''` |
| `address` | TEXT | `''` |
| `email` | TEXT | `''` |
| `contact` | TEXT | `''` |
| `watermark` | TEXT | `''` |
| `currencyName` | TEXT | `''` |
| `currencySymbol` | TEXT | `''` |

### Computed Values

- **Account current balance** (in `dbGetAccounts`): `openingBalance + SUM(income txns) - SUM(expense txns)` — computed via a SQL subquery at read time.
- **Statement running balance**: Each transaction's `remaining` is computed as a running sum per account, starting from the account's opening balance plus any pre-period transactions.

### Naming Conventions

- All data is stored **lowercase** in SQLite. Display names are capitalized via `displayName()` (`lib/stringUtils.ts`).
- IDs follow pattern `<type-prefix>_<timestamp>_<random>` (e.g., `cat_1724501234567_ab3f`).
- Duplicate detection is case-insensitive (via `nameKey` with `COLLATE NOCASE` and the `UNIQUE` constraint).

---

## Pages & Navigation

Navigation is a single-page shell in `app/page.tsx`. The active page is tracked in React state (`useState<PageKey>`), and pages are conditionally rendered. No client-side routing or URL bar changes occur.

### Desktop (sidebar, ≥ 768px)

A collapsible sidebar (`Sidebar.tsx`) with 7 nav items:

| Icon | Page | Route |
|---|---|---|
| Dashboard | Dashboard | `dashboard` |
| Transactions | Transactions | `transactions` |
| Accounts | Accounts | `accounts` |
| Category | Category | `category` |
| Payment Medium | Payment Medium | `paymentMedium` |
| Statement | Statement | `statement` |
| Profile | Profile | `profile` |

The sidebar also includes a **Switch DB** button, a **Close DB** button (resets state + reloads), a collapse toggle, and a status badge ("SQLite • Offline • Local").

### Mobile / Tablet (< 768px)

A bottom tab bar (`BottomNav.tsx`) shows 4 main tabs: Dashboard, Transactions, Accounts, Statement. A "Manage" grid button opens a modal overlay with Category, Payment Medium, and Profile pages plus DB controls.

### Page Summaries

#### Dashboard (`dashboard`)
Overviews and analytics for the current period.

- **6 KPI cards**: Total Balance, Total Income, Total Expenses, Total Transactions, Total Categories, Total Accounts.
- **Spend Analytics panel**:
  - Period filter: This Month / Last Month / Last 30 Days / Last 7 Days / This Year / Custom range.
  - Account filter: All accounts or a specific account.
  - Donut chart: expenses by category (top 8 + "Others").
  - Donut chart: expenses by payment medium (top 6 + "Others").
  - Line chart: daily expense totals over the period.
- **Recent transactions**: Last 15 days, split into Recent Income and Recent Transactions lists (max 10 each).

#### Transactions (`transactions`)
The full transaction ledger with add/edit form.

- 3 summary cards: Total Income, Total Expenses, Net Balance (computed from filtered transactions).
- Search bar (filters reason, notes, amount, payment medium).
- Desktop: sortable table (DataTable) with columns: Reason, Amount, Account, Payment, Date.
- Mobile: card layout with avatar, amount, account/date, payment/category, edit/delete.
- Add/Edit dialog: expense/income toggle, amount, date picker, account select, category select (auto-filtered by type), payment type group (online/offline) + medium select, reason (max 50 chars), notes (max 1000 chars).

#### Accounts (`accounts`)
- Total balance displayed above the list.
- Desktop: table view (Account, Date, Balance, actions).
- Mobile + card view: account name, description, current balance, date.
- Add/Edit dialog: name, account number (digits only, max 6), opening balance, description, date picker.

#### Category (`category`)
The most feature-rich management page.

- Import (CSV), Download sample CSV, Add buttons in the header.
- List & card view toggle. Search by name or type.
- CSV import flow:
  1. File selected → parsed client-side (`lib/categoryStore.ts`).
  2. Live preview dialog showing every row with validation status (Ready / Invalid / Skip—exists in DB / Skip—duplicate in CSV).
  3. User confirms → valid rows imported; skipped rows listed in a follow-up dialog.
- Add/Edit dialog: name, type (expense/income select), color picker + hex input.
- Duplicate names are **always skipped** (case-insensitive, via `nameKey`).

#### Payment Medium (`paymentMedium`)
- Split into **Online** and **Offline** sections.
- Add/Edit dialog: name, type (online/offline select).
- Desktop table and mobile card views.

#### Statement (`statement`)
A spreadsheet-like ledger for export.

- Period + account filters (same presets as Dashboard).
- Computes a **running balance** per account from the period's start.
- Desktop: full-width table with 9 columns (#, Date, Category, Notes, Payment Mode, Account, Credit, Debit, Remaining) + totals row.
- Mobile: compact card layout.
- Pagination: 25 rows per page.
- Export buttons: **PDF**, **Excel**, **PDF with Watermark** (disabled until watermark is set in Profile).

#### Profile (`profile`)
- Full name, address (multiline), email, contact number (digits/+/parentheses/dash/whitespace only), currency name, currency symbol (max 3 chars, symbol-only input), watermark text.
- Live preview card showing how the profile appears in exports.
- Save button with confirmation toast.

#### Settings (`/settings`) (modal from any page)
Three tabs:

- **Colors**: Dark/Light theme toggle; 8 accent presets (yellow, green, red, blue, violet, pink, orange, teal) + custom hex color picker.
- **Typography**: Font family (Inter, Poppins, Raleway, Noto Sans, Josefin Sans, Ubuntu Mono, Shantell Sans, Comic Neue, Klee One, Playwrite US Moderna, or any custom Google Font); font size slider (xs to xxl).
- **System**: Unregister Offline Service (PWA) button — removes all service worker registrations (use for cache troubleshooting).

---

## Persistence & File Handling

The app supports multiple persistence strategies depending on browser capabilities.

### Strategy 1: File System Access API (Chromium-based browsers)

When a user opens a `.db` file via the **Open Database** button using `showOpenFilePicker`, the returned `FileSystemFileHandle` is stored in IndexedDB. Subsequent saves write directly to the file on disk (`fileHandle.createWritable()` -> `write()` -> `close()`). This means edits persist immediately to the actual `.db` file.

**Reconnect flow**: On app reload, if a file handle was previously stored, the app can reconnect to it. The user may need to re-grant permission (the API prompts for this).

### Strategy 2: IndexedDB Fallback (non-Chromium browsers)

When using the file picker (`<input type="file">`) or downloading a blank database, the SQLite bytes are stored in IndexedDB (`objectStore("sqlite")`). The actual file on disk is **not** updated — the user must re-download via the **Download** button to get an updated `.db` file.

### Onboarding Flow (`app/page.tsx`)

1. **Splash screen** — 2.4s animated SVG logo, then fades out.
2. **DB check** — On mount, checks `localStorage["hk_last_db_name"]`:
   - If set → attempts `reconnectDB()` (reconnects to the last file or IndexedDB entry).
   - If not set → shows the "Choose your Hisaab database" screen.
3. **Choose DB screen** (when no DB is ready):
   - **Reconnect last database** — if a previous DB name exists.
   - **Open Database** — uses `showOpenFilePicker` if available, else falls back to `<input type="file">`.
   - **Download a blank database** — generates a fresh SQLite file with the schema pre-applied.
4. **Main app** — Renders the sidebar + active page + floating settings button + bottom nav.

---

## Design System

HisaabKitaab's UI is adapted from the **Binance design system** (`DESIGN-binance.md`).

### Color Palette

| Token | Hex | Usage |
|---|---|---|
| `--color-primary` | `#fcd535` | Primary CTAs, accent (configurable) |
| `--color-primary-active` | `#f0b90b` | Primary hover state |
| `--color-canvas-dark` | `#0b0e11` | Main dark canvas |
| `--color-surface-card-dark` | `#1e2329` | Card backgrounds |
| `--color-surface-elevated-dark` | `#2b3139` | Nested cards, hover surfaces |
| `--color-hairline-on-dark` | `#2b3139` | 1px borders |
| `--color-body` | `#eaecef` | Body text on dark |
| `--color-ink` | `#181a20` | Text on light |
| `--color-muted` | `#707a8a` | Muted text |
| `--color-trading-up` | `#0ecb81` | Income / positive |
| `--color-trading-down` | `#f6465d` | Expense / negative |
| `--color-info` | `#3b82f6` | Info badges, focus ring |

### Theme

- **Dark mode** (default): near-black canvas with white/yellow text.
- **Light mode**: toggled via Settings → all `*-dark` tokens swap to light equivalents (e.g., `--color-canvas-dark` → `--color-canvas-light`). Hardcoded `text-white` classes are overridden via `html.light [class*="text-white"]` CSS rules.
- **Accent color**: fully customizable via Settings. The accent powers all primary CTAs, focus rings, and selection highlighting.
- **Font size**: 6 scales (xs, s, m default, l, xl, xxl) → applied via `html.font-scale-*` classes that globally rescale all `text-[Npx]` utilities.
- **Font family**: Inter (default, BinanceNova substitute) or any Google Font (loaded via `<link>` injection). Numbers always use `font-num` (JetBrains Mono / IBM Plex).

### Typography

| Utility | Font | Size | Weight | Usage |
|---|---|---|---|---|
| `text-hero` | BinanceNova | 64px | 700 | Hero headlines |
| `text-display-lg` | — | 48px | 700 | Section titles |
| `text-display-sm` | — | 32px | 600 | Sub-sections |
| `text-title-lg` | — | 24px | 600 | Page headings |
| `text-number-display` | BinancePlex | 40px | 700 | KPI values |
| `text-number-md` | BinancePlex | 16px | 500 | Table numbers |
| `font-num` | BinancePlex | — | — | All tabular numbers (class utility) |
| `text-caption` | BinanceNova | 12px | 500 | Captions |

### Responsive Behavior

| Breakpoint | Behavior |
|---|---|
| Desktop (≥ 1024px) | Full sidebar, list tables, max-width 80% |
| Tablet (768–1024px) | Collapsible sidebar, list tables |
| Mobile (< 768px) | Bottom tab bar replaces sidebar; "Manage" grid modal for secondary pages; tables become stacked cards |

---

## Dependencies

| Package | Version | Purpose |
|---|---|---|
| `next` | 16.3.1 | React framework (App Router, Turbopack) |
| `react` / `react-dom` | 19.2.8 | UI library |
| `typescript` | 5.x | Type checking |
| `@tailwindcss/postcss` / `tailwindcss` | 4.x | Utility-first CSS |
| `sql.js` | 1.14.2 | SQLite compiled to WASM — in-browser database |
| `serwist` / `@serwist/next` | 9.5.12 | Service worker / PWA |
| `pdfkit` | 0.19.1 | PDF generation (standalone browser build) |
| `xlsx` | 0.18.5 | Excel export |
| `lucide-react` | 1.33.0 | Icons |
| `eslint` + `eslint-config-next` | 9 / 16.3.1 | Linting (core-web-vitals + TypeScript rules) |

> **Note on "THIS IS NOT THE NEXT.js YOU KNOW"**: This environment uses a modified Next.js with breaking changes. The `AGENTS.md` file contains a guardrail block reminding developers to check `node_modules/next/dist/docs/` before writing code.

---

## Getting Started

### Prerequisites

- **Node.js** 18+ or 20+
- **pnpm** 11.17+ (specified in `package.json` via `packageManager`)

### Installation

```bash
pnpm install
```

### Development

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
pnpm build
pnpm start
```

### Linting

```bash
pnpm lint
```

ESLint is configured with Next.js's `core-web-vitals` and TypeScript configs. The `lib/db.ts` file disables `@typescript-eslint/no-explicit-any` (due to heavy `sql.js` use), and `app/page.tsx` / `components/ui/DatePicker.tsx` disable `react-hooks/exhaustive-deps`.

---

## Configuration

### Environment Variables (`.env`)

```env
NEXT_PUBLIC_APP_NAME="HisaabKitaab"
NEXT_PUBLIC_APP_LOGO="/Logo.svg"
NEXT_PUBLIC_APP_DESCRIPTION="Your personal offline Khata and finance manager."
```

These are consumed in `app/layout.tsx` (metadata), `app/manifest.ts` (PWA manifest), and `components/layout/Sidebar.tsx` (brand name/logo).

### Tailwind Config (`globals.css`)

All design tokens are defined as CSS custom properties in the `@theme` block at the top of `globals.css`. This includes:

- Color tokens (primary, surfaces, text, semantic trading colors)
- Border radius tokens (xs through pill)
- Font family variables (`--font-sans`, `--font-num`)
- Custom utility classes (`text-hero`, `text-display-lg`, `font-num`, etc.)
- Font-scale utilities (`html.font-scale-xs` through `html.font-scale-xxl`)
- Light-mode CSS overrides (`html.light`)
- Custom scrollbar hiding (`.no-scrollbar`)
- Focus ring styles (`:focus-visible`)

---

## Development

### Key Patterns

1. **Domain CRUD functions** (`lib/db.ts`): Every create, read, update, and delete is an `async` function that calls `getDB()` → runs SQL → `saveDB()`. Returns `{ ok: boolean; error?: string; entity?: ... }` for mutations.

2. **Singleton DB**: `lib/db.ts` maintains a module-level `db` singleton. `getDB()` resolves or creates it lazily. `setDBFromBytes()` and `openDBFromFile()` replace the singleton and reset the init promise.

3. **IndexedDB persistence**: `saveDB()` exports the SQLite database to bytes and writes them to IndexedDB. When a `fileHandle` (File System Access) is active, it also writes to the actual file simultaneously.

4. **CSV import pipeline**: `CategoryPage` → `parseCategoryCsv()` (pure parser, in `lib/categoryStore.ts`) → `analyzeForPreview()` (cross-checks against existing DB entries) → preview dialog → `handleConfirmImport()` → loops through `dbAddCategory()`.

5. **PDF generation**: `StatementPage` → `exports.ts:generateStatementPDF()` → dynamically imports `pdfkit/js/pdfkit.standalone.js` (browser build) + fetches NotoSans font from `/fonts/NotoSans-Regular.ttf` → `statementPdf.ts:buildStatementPDF()` draws the layout using pdfkit primitives (paths, text, rects, transforms).

6. **String normalization**: DB stores everything lowercase (`toLowerTrim` in `lib/stringUtils.ts`); UI displays via `displayName()` (title-case) or `capitalize()` (first letter only).

### Code Conventions

- **No comments** in source files (per project convention).
- `"use client"` directive at the top of all React components.
- Path alias `@/` maps to the project root (see `tsconfig.json`).
- `lucide-react` for all icons.
- Tailwind v4 JIT utility classes (no external CSS files beyond `globals.css`).
- `lucide-react` size props use numeric values (e.g., `size={14}`).
- CSS variables referenced directly in Tailwind class strings (e.g., `bg-[var(--color-surface-card-dark)]`).

---

## Design Decisions

### 1. SPA-shell Architecture
All pages render from `app/page.tsx` via conditional rendering. This avoids the complexity of managing SQLite state across multiple Next.js route modules and ensures a single database connection lifecycle.

### 2. SQLite in WASM vs. a traditional client-side store
Using `sql.js` (SQLite compiled to WebAssembly) provides full SQL query support, ACID transactions, and the ability to export/import real `.db` files. This means:

- Users can open their data in DB Browser for SQLite, sqlite3 CLI, or any SQLite tooling.
- Complex queries (joins, aggregations, running balances) are trivial in SQL vs. messy in JS.
- The schema can evolve via migrations.

### 3. File System Access API as primary, IndexedDB as fallback
On Chromium browsers (Chrome, Edge, Opera), the app can write directly to a `.db` file on disk. On Firefox/Safari, it falls back to IndexedDB — the user must manually download after edits. This was a deliberate choice to provide a "real file" experience where possible.

### 4. Binance Design System Adaptation
The `DESIGN-binance.md` file is an alpha-stage analysis of Binance's UI tokens. HisaabKitaab adapts it by:

- Replacing `BinanceNova` with `Inter` and `BinancePlex` with `JetBrains Mono` + `IBM Plex Sans` (see `app/layout.tsx` comments).
- Mapping all color tokens to CSS variables in `globals.css`.
- Repurposing trading semantics: green = income/up, red = expense/down.

### 5. No Server, No Auth, No Sync
This is a consciously offline tool. There is no backend to deploy, no authentication, no multi-device sync. Data portability is achieved through `.db` file exports.

### 6. Toast Notifications
Multiple pages implement their own local toast state (`useState<string | null>` + `setTimeout` dismissal). These are lightweight and page-scoped rather than using a global toast system.

### 7. Hydration Safety
`app/page.tsx` renders a placeholder during the initial (pre-hydration) render to avoid mismatches from `localStorage` reads and `Date.now()` calls during SSR.
