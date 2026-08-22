"use client";

// Central SQLite (sql.js) — single persisted DB in IndexedDB
// LocalStorage is ONLY for theme/mode/lastDbName per spec. All domain data lives here.

let SQL: any = null;
let db: any = null;
let initPromise: Promise<any> | null = null;
let fileHandle: any = null;


const IDB_NAME = "HisaabKitaab";
const IDB_STORE = "sqlite";
const IDB_KEY = "main";
const LAST_DB_KEY = "hk_last_db_name";

function getIDBKey(): string {
  try {
    return localStorage.getItem(LAST_DB_KEY) || IDB_KEY;
  } catch {
    return IDB_KEY;
  }
}

// ---------- IndexedDB helpers ----------
function openIDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const d = req.result;
      if (!d.objectStoreNames.contains(IDB_STORE)) d.createObjectStore(IDB_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(): Promise<Uint8Array | null> {
  if (typeof indexedDB === "undefined") return null;
  const idb = await openIDB();
  const key = getIDBKey();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(IDB_STORE, "readonly");
    const store = tx.objectStore(IDB_STORE);
    const req = store.get(key);
    req.onsuccess = () => {
      const v = req.result as Uint8Array | ArrayBuffer | null;
      if (!v) return resolve(null);
      if (v instanceof Uint8Array) return resolve(v);
      if (v instanceof ArrayBuffer) return resolve(new Uint8Array(v));
      // if stored as plain array
      try {
        resolve(new Uint8Array(v as any));
      } catch {
        resolve(null);
      }
    };
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(bytes: Uint8Array): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  const idb = await openIDB();
  const key = getIDBKey();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(IDB_STORE, "readwrite");
    const store = tx.objectStore(IDB_STORE);
    const req = store.put(bytes, key);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

async function idbGetHandle(): Promise<any> {
  if (typeof indexedDB === "undefined") return null;
  const idb = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(IDB_STORE, "readonly");
    const store = tx.objectStore(IDB_STORE);
    const req = store.get("file_handle");
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

async function idbPutHandle(handle: any): Promise<void> {
  if (typeof indexedDB === "undefined") return;
  const idb = await openIDB();
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(IDB_STORE, "readwrite");
    const store = tx.objectStore(IDB_STORE);
    if (handle) {
      const req = store.put(handle, "file_handle");
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    } else {
      const req = store.delete("file_handle");
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    }
  });
}


// ---------- SQL.js loader ----------
async function loadSQL() {
  if (SQL) return SQL;
  // sql.js v1.14.2 ships ESM + wasm; locateFile must point to our public copy
  const initSqlJs = (await import("sql.js")).default as any;
  SQL = await initSqlJs({ locateFile: (f: string) => `/${f}` });
  return SQL;
}

function ensureSchema(database: any) {
  database.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      nameKey TEXT NOT NULL UNIQUE COLLATE NOCASE,
      type TEXT NOT NULL CHECK(type IN ('income','expense')),
      color TEXT NOT NULL,
      createdAt INTEGER NOT NULL
    );
  `);
  database.run(`
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      nameKey TEXT NOT NULL UNIQUE COLLATE NOCASE,
      openingBalance REAL NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      date TEXT NOT NULL,
      createdAt INTEGER NOT NULL
    );
  `);
  // migrate: add accountNumber column if missing
  try { database.run(`ALTER TABLE accounts ADD COLUMN accountNumber TEXT NOT NULL DEFAULT ''`); } catch {}
  // migrate legacy rows to lowercase (spec: everything saved lowercase)
  try {
    database.run(`UPDATE categories SET name = lower(name), nameKey = lower(nameKey), type = lower(type), color = lower(color) WHERE lower(name) != name OR lower(nameKey) != nameKey OR lower(type) != type OR lower(color) != color`);
  } catch {}
  try {
    database.run(`UPDATE accounts SET name = lower(name), nameKey = lower(nameKey), description = lower(description) WHERE lower(name) != name OR lower(nameKey) != nameKey OR lower(description) != description`);
  } catch {}
  database.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK(type IN ('income','expense')),
      amount REAL NOT NULL,
      accountId TEXT NOT NULL,
      categoryId TEXT NOT NULL,
      reason TEXT NOT NULL,
      notes TEXT NOT NULL,
      date TEXT NOT NULL,
      createdAt INTEGER NOT NULL
    );
  `);
  // migrate: add paymentMediumId column if missing
  try { database.run(`ALTER TABLE transactions ADD COLUMN paymentMediumId TEXT NOT NULL DEFAULT ''`); } catch {}

  // --- payment mediums ---
  database.run(`
    CREATE TABLE IF NOT EXISTS payment_mediums (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      grp TEXT NOT NULL CHECK(grp IN ('online','offline')),
      createdAt INTEGER NOT NULL
    );
  `);
  // seed defaults if empty
  try {
    const cnt = database.exec("SELECT COUNT(*) FROM payment_mediums");
    if (!cnt.length || cnt[0].values[0][0] === 0) {
      const now = Date.now();
      const seeds: [string, string, string, number][] = [
        ["pm_upi", "upi", "online", now],
        ["pm_netbanking", "net banking", "online", now + 1],
        ["pm_cc", "credit card", "online", now + 2],
        ["pm_dc", "debit card", "online", now + 3],
        ["pm_wallet", "wallet", "online", now + 4],
        ["pm_cash", "cash", "offline", now + 5],
        ["pm_cheque", "cheque", "offline", now + 6],
        ["pm_dd", "demand draft", "offline", now + 7],
      ];
      for (const [id, name, grp, ts] of seeds) {
        database.run("INSERT OR IGNORE INTO payment_mediums (id, name, grp, createdAt) VALUES (?, ?, ?, ?)", [id, name, grp, ts]);
      }
    }
  } catch {}

  // --- profile (single row) ---
  database.run(`
    CREATE TABLE IF NOT EXISTS profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      name TEXT NOT NULL DEFAULT '',
      address TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL DEFAULT '',
      contact TEXT NOT NULL DEFAULT '',
      watermark TEXT NOT NULL DEFAULT '',
      currencyName TEXT NOT NULL DEFAULT '',
      currencySymbol TEXT NOT NULL DEFAULT ''
    );
  `);
  // migrate: add currency columns if missing
  try { database.run(`ALTER TABLE profile ADD COLUMN currencyName TEXT NOT NULL DEFAULT ''`); } catch {}
  try { database.run(`ALTER TABLE profile ADD COLUMN currencySymbol TEXT NOT NULL DEFAULT ''`); } catch {}
}

export async function setDBFromBytes(bytes: Uint8Array): Promise<void> {
  const S = await loadSQL();
  const newDb = new S.Database(bytes);
  ensureSchema(newDb);
  if (db?.close) try { db.close(); } catch {}
  db = newDb;
  
  fileHandle = null;
  await idbPutHandle(null);
  
  initPromise = Promise.resolve(db);
  await saveDB();
}

// ---------- Public API ----------

export async function getDB(): Promise<any> {
  if (db) return db;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    const S = await loadSQL();
    const stored = await idbGet();
    if (stored && stored.length > 16 && stored[0] === 0x53) {
      // looks like SQLite header "SQLite format 3"
      try {
        db = new S.Database(stored);
        ensureSchema(db);
        return db;
      } catch {
        // corrupted — recreate
      }
    }
    // blank
    db = new S.Database();
    ensureSchema(db);
    await saveDB();
    return db;
  })();
  return initPromise;
}

export async function saveDB(): Promise<void> {
  if (!db) return;
  const data = db.export() as Uint8Array;
  await idbPut(data);

  if (fileHandle) {
    try {
      const writable = await fileHandle.createWritable();
      await writable.write(data);
      await writable.close();
    } catch (e) {
      console.error("Failed to write to file handle:", e);
    }
  }
}

export async function createBlankDBBytes(): Promise<Uint8Array> {
  const S = await loadSQL();
  const tmp = new S.Database();
  ensureSchema(tmp);
  const out = tmp.export() as Uint8Array;
  tmp.close?.();
  return out;
}

export async function openDBFromFile(file: File, handle?: any): Promise<void> {
  const buf = new Uint8Array(await file.arrayBuffer());
  const S = await loadSQL();
  // validate header quickly
  if (buf.length < 16 || String.fromCharCode(...buf.slice(0, 16)) !== "SQLite format 3\u0000") {
    // still try — maybe file is valid but header check fails due to encoding
    if (buf.length < 100) throw new Error("File too small to be SQLite");
  }
  const newDb = new S.Database(buf);
  ensureSchema(newDb);
  // replace singleton
  if (db?.close) try { db.close(); } catch {}
  db = newDb;

  fileHandle = handle || null;
  await idbPutHandle(fileHandle);

  initPromise = Promise.resolve(db);
  await saveDB();
}

export async function reconnectDB(): Promise<void> {
  fileHandle = await idbGetHandle();
  if (fileHandle) {
    const opts = { mode: 'readwrite' };
    if ((await fileHandle.queryPermission(opts)) !== 'granted') {
      const req = await fileHandle.requestPermission(opts);
      if (req !== 'granted') {
        throw new Error("Permission to modify the file was denied. Please open it again.");
      }
    }
    const file = await fileHandle.getFile();
    const buf = new Uint8Array(await file.arrayBuffer());
    const S = await loadSQL();
    const newDb = new S.Database(buf);
    ensureSchema(newDb);
    if (db?.close) try { db.close(); } catch {}
    db = newDb;
    initPromise = Promise.resolve(db);
    return;
  }
  await getDB();
}

export async function downloadCurrentDB(filename: string) {
  const d = await getDB();
  const data = d.export() as Uint8Array;
  const blob = new Blob([data as any], { type: "application/x-sqlite3" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------- Category helpers (domain lives in DB, not localStorage) ----------
export type CategoryType = "income" | "expense";
export interface Category {
  id: string;
  name: string;
  nameKey: string;
  type: CategoryType;
  color: string;
  createdAt: number;
}

export async function dbGetCategories(): Promise<Category[]> {
  const d = await getDB();
  const res = d.exec("SELECT id, name, nameKey, type, color, createdAt FROM categories ORDER BY createdAt ASC");
  if (!res.length) return [];
  const cols = res[0].columns as string[];
  const vals = res[0].values as any[][];
  return vals.map((row) => {
    const o: any = {};
    cols.forEach((c, i) => (o[c] = row[i]));
    return o as Category;
  });
}

export async function dbAddCategory(c: Omit<Category, "id" | "nameKey" | "createdAt">): Promise<{ ok: boolean; error?: string; category?: Category }> {
  const rawName = c.name.trim();
  if (!rawName) return { ok: false, error: "Category name is required" };
  // spec: everything saved lowercase in SQLite
  const name = rawName.toLowerCase();
  if (!/^#[0-9a-fA-F]{6}$/.test(c.color)) return { ok: false, error: "Color must be hex #rrggbb" };
  const type = c.type.trim().toLowerCase() as CategoryType;
  if (type !== "income" && type !== "expense") return { ok: false, error: "Type must be income or expense" };
  const key = name; // already lower
  const color = c.color.toLowerCase();
  const d = await getDB();
  const dup = d.exec(`SELECT 1 FROM categories WHERE nameKey = '${key.replace(/'/g, "''")}' LIMIT 1`);
  if (dup.length && dup[0].values.length) return { ok: false, error: `Category "${rawName}" already exists` };
  const cat: Category = {
    id: `cat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name,
    nameKey: key,
    type,
    color,
    createdAt: Date.now(),
  };
  try {
    d.run("INSERT INTO categories (id, name, nameKey, type, color, createdAt) VALUES (?, ?, ?, ?, ?, ?)", [cat.id, cat.name, cat.nameKey, cat.type, cat.color, cat.createdAt]);
    await saveDB();
    return { ok: true, category: cat };
  } catch (e: any) {
    const msg = e?.message ?? String(e);
    if (/UNIQUE/i.test(msg)) return { ok: false, error: `Category "${rawName}" already exists` };
    return { ok: false, error: msg };
  }
}

export async function dbDeleteCategory(id: string): Promise<void> {
  const d = await getDB();
  d.run("DELETE FROM categories WHERE id = ?", [id]);
  await saveDB();
}

export async function dbUpdateCategory(id: string, c: Omit<Category, "id" | "nameKey" | "createdAt">): Promise<{ ok: boolean; error?: string; category?: Category }> {
  const rawName = c.name.trim();
  if (!rawName) return { ok: false, error: "Category name is required" };
  const name = rawName.toLowerCase();
  if (!/^#[0-9a-fA-F]{6}$/.test(c.color)) return { ok: false, error: "Color must be hex #rrggbb" };
  const type = c.type.trim().toLowerCase() as CategoryType;
  if (type !== "income" && type !== "expense") return { ok: false, error: "Type must be income or expense" };
  const key = name;
  const color = c.color.toLowerCase();
  
  const d = await getDB();
  const dup = d.exec(`SELECT 1 FROM categories WHERE nameKey = '${key.replace(/'/g, "''")}' AND id != '${id}' LIMIT 1`);
  if (dup.length && dup[0].values.length) return { ok: false, error: `Category "${rawName}" already exists` };

  try {
    d.run("UPDATE categories SET name = ?, nameKey = ?, type = ?, color = ? WHERE id = ?", [name, key, type, color, id]);
    await saveDB();
    return { ok: true, category: { id, name, nameKey: key, type, color, createdAt: 0 } };
  } catch (e: any) {
    const msg = e?.message ?? String(e);
    return { ok: false, error: msg };
  }
}

// utility for CategoryPage CSV preview analysis — needs existing keys
export async function dbGetCategoryKeys(): Promise<Set<string>> {
  const cats = await dbGetCategories();
  return new Set(cats.map((c) => c.nameKey));
}

// ---------- Main Accounts helpers ----------
export interface MainAccount {
  id: string;
  name: string;
  nameKey: string;
  openingBalance: number;
  description: string;
  accountNumber: string;
  date: string; // ISO YYYY-MM-DD
  createdAt: number;
}

export type ComputedAccount = MainAccount & { currentBalance: number };

export async function dbGetAccounts(): Promise<ComputedAccount[]> {
  const d = await getDB();
  const res = d.exec(`
    SELECT a.id, a.name, a.nameKey, a.openingBalance, a.description, a.accountNumber, a.date, a.createdAt,
      (a.openingBalance + 
       COALESCE((SELECT SUM(amount) FROM transactions WHERE accountId = a.id AND type = 'income'), 0) - 
       COALESCE((SELECT SUM(amount) FROM transactions WHERE accountId = a.id AND type = 'expense'), 0)
      ) as currentBalance
    FROM accounts a ORDER BY a.createdAt DESC
  `);
  if (!res.length) return [];
  const cols = res[0].columns as string[];
  const vals = res[0].values as any[][];
  return vals.map((row) => {
    const o: any = {};
    cols.forEach((c, i) => (o[c] = row[i]));
    return o as ComputedAccount;
  });
}

export async function dbAddAccount(a: Omit<MainAccount, "id" | "nameKey" | "createdAt">): Promise<{ ok: boolean; error?: string; account?: MainAccount }> {
  const rawName = a.name.trim();
  if (!rawName) return { ok: false, error: "Account name is required" };
  if (!Number.isFinite(a.openingBalance)) return { ok: false, error: "Opening balance must be a number" };
  if (!a.date || !/^\d{4}-\d{2}-\d{2}$/.test(a.date)) return { ok: false, error: "Date is required (YYYY-MM-DD)" };
  // save everything lowercase per spec
  const name = rawName.toLowerCase();
  const key = name;
  const description = (a.description ?? "").trim().toLowerCase();
  const d = await getDB();
  const dup = d.exec(`SELECT 1 FROM accounts WHERE nameKey = '${key.replace(/'/g, "''")}' LIMIT 1`);
  if (dup.length && dup[0].values.length) return { ok: false, error: `Account "${rawName}" already exists` };
  const acc: MainAccount = {
    id: `acc_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name,
    nameKey: key,
    openingBalance: Number(a.openingBalance),
    description,
    accountNumber: (a.accountNumber ?? "").trim(),
    date: a.date,
    createdAt: Date.now(),
  };
  try {
    d.run("INSERT INTO accounts (id, name, nameKey, openingBalance, description, accountNumber, date, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [
      acc.id,
      acc.name,
      acc.nameKey,
      acc.openingBalance,
      acc.description,
      acc.accountNumber,
      acc.date,
      acc.createdAt,
    ]);
    await saveDB();
    return { ok: true, account: acc };
  } catch (e: any) {
    const msg = e?.message ?? String(e);
    if (/UNIQUE/i.test(msg)) return { ok: false, error: `Account "${rawName}" already exists` };
    return { ok: false, error: msg };
  }
}

export async function dbDeleteAccount(id: string): Promise<void> {
  const d = await getDB();
  d.run("DELETE FROM accounts WHERE id = ?", [id]);
  await saveDB();
}

export async function dbUpdateAccount(id: string, a: Omit<MainAccount, "id" | "nameKey" | "createdAt">): Promise<{ ok: boolean; error?: string; account?: MainAccount }> {
  const rawName = a.name.trim();
  if (!rawName) return { ok: false, error: "Account name is required" };
  if (!Number.isFinite(a.openingBalance)) return { ok: false, error: "Opening balance must be a number" };
  if (!a.date || !/^\d{4}-\d{2}-\d{2}$/.test(a.date)) return { ok: false, error: "Date is required (YYYY-MM-DD)" };
  
  const name = rawName.toLowerCase();
  const key = name;
  const description = (a.description ?? "").trim().toLowerCase();
  
  const d = await getDB();
  const dup = d.exec(`SELECT 1 FROM accounts WHERE nameKey = '${key.replace(/'/g, "''")}' AND id != '${id}' LIMIT 1`);
  if (dup.length && dup[0].values.length) return { ok: false, error: `Account "${rawName}" already exists` };

  try {
    d.run("UPDATE accounts SET name = ?, nameKey = ?, openingBalance = ?, description = ?, accountNumber = ?, date = ? WHERE id = ?", [
      name, key, a.openingBalance, description, (a.accountNumber ?? "").trim(), a.date, id
    ]);
    await saveDB();
    return { ok: true, account: { id, name, nameKey: key, openingBalance: a.openingBalance, description, accountNumber: (a.accountNumber ?? "").trim(), date: a.date, createdAt: 0 } };
  } catch (e: any) {
    const msg = e?.message ?? String(e);
    return { ok: false, error: msg };
  }
}

// ---------- Profile helpers ----------
export interface UserProfile {
  name: string;
  address: string;
  email: string;
  contact: string;
  watermark: string;
  currencyName: string;
  currencySymbol: string;
}

const PROFILE_DEFAULT: UserProfile = { name: "", address: "", email: "", contact: "", watermark: "", currencyName: "", currencySymbol: "" };

export async function dbGetProfile(): Promise<UserProfile> {
  const d = await getDB();
  const res = d.exec("SELECT name, address, email, contact, watermark, currencyName, currencySymbol FROM profile WHERE id = 1");
  if (!res.length || !res[0].values.length) return PROFILE_DEFAULT;
  const row = res[0].values[0];
  return {
    name: String(row[0] ?? ""),
    address: String(row[1] ?? ""),
    email: String(row[2] ?? ""),
    contact: String(row[3] ?? ""),
    watermark: String(row[4] ?? ""),
    currencyName: String(row[5] ?? ""),
    currencySymbol: String(row[6] ?? ""),
  };
}

export async function dbSetProfile(p: Partial<UserProfile>): Promise<{ ok: boolean; error?: string }> {
  const current = await dbGetProfile();
  const merged = { ...current, ...p };
  const d = await getDB();
  try {
    d.run("INSERT OR REPLACE INTO profile (id, name, address, email, contact, watermark, currencyName, currencySymbol) VALUES (1, ?, ?, ?, ?, ?, ?, ?)", [
      merged.name, merged.address, merged.email, merged.contact, merged.watermark, merged.currencyName, merged.currencySymbol
    ]);
    await saveDB();
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? String(e) };
  }
}

// ---------- Payment Mediums helpers ----------
export type PaymentMediumGroup = "online" | "offline";

export interface PaymentMedium {
  id: string;
  name: string;
  group: PaymentMediumGroup;
  createdAt: number;
}

export async function dbGetPaymentMediums(): Promise<PaymentMedium[]> {
  const d = await getDB();
  const res = d.exec("SELECT id, name, grp, createdAt FROM payment_mediums ORDER BY grp, createdAt");
  if (!res.length) return [];
  const cols = res[0].columns as string[];
  const vals = res[0].values as any[][];
  return vals.map((row) => {
    const o: any = {};
    cols.forEach((c, i) => (o[c] = row[i]));
    if ("grp" in o) { o.group = o.grp; delete o.grp; }
    return o as PaymentMedium;
  });
}

export async function dbAddPaymentMedium(name: string, group: PaymentMediumGroup): Promise<{ ok: boolean; error?: string; medium?: PaymentMedium }> {
  const trimmed = name.trim().toLowerCase();
  if (!trimmed) return { ok: false, error: "Name is required" };
  const id = `pm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const med: PaymentMedium = { id, name: trimmed, group, createdAt: Date.now() };
  const d = await getDB();
  try {
    d.run("INSERT INTO payment_mediums (id, name, grp, createdAt) VALUES (?, ?, ?, ?)", [med.id, med.name, med.group, med.createdAt]);
    await saveDB();
    return { ok: true, medium: med };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? String(e) };
  }
}

export async function dbUpdatePaymentMedium(id: string, name: string, group: PaymentMediumGroup): Promise<{ ok: boolean; error?: string }> {
  const trimmed = name.trim().toLowerCase();
  if (!trimmed) return { ok: false, error: "Name is required" };
  const d = await getDB();
  try {
    d.run("UPDATE payment_mediums SET name = ?, grp = ? WHERE id = ?", [trimmed, group, id]);
    await saveDB();
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? String(e) };
  }
}

export async function dbDeletePaymentMedium(id: string): Promise<{ ok: boolean; error?: string }> {
  const d = await getDB();
  try {
    d.run("DELETE FROM payment_mediums WHERE id = ?", [id]);
    await saveDB();
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? String(e) };
  }
}

// ---------- Transactions helpers ----------
export interface Transaction {
  id: string;
  type: CategoryType; // "income" or "expense"
  amount: number;
  accountId: string;
  categoryId: string;
  paymentMediumId: string;
  reason: string;
  notes: string;
  date: string;
  createdAt: number;
}

export async function dbGetTransactions(): Promise<Transaction[]> {
  const d = await getDB();
  const res = d.exec("SELECT id, type, amount, accountId, categoryId, paymentMediumId, reason, notes, date, createdAt FROM transactions ORDER BY date DESC, createdAt DESC");
  if (!res.length) return [];
  const cols = res[0].columns as string[];
  const vals = res[0].values as any[][];
  return vals.map((row) => {
    const o: any = {};
    cols.forEach((c, i) => (o[c] = row[i]));
    return o as Transaction;
  });
}

export async function dbAddTransaction(t: Omit<Transaction, "id" | "createdAt">): Promise<{ ok: boolean; error?: string; transaction?: Transaction }> {
  if (!Number.isFinite(t.amount) || t.amount <= 0) return { ok: false, error: "Amount must be a positive number" };
  if (!t.accountId) return { ok: false, error: "Account is required" };
  if (!t.categoryId) return { ok: false, error: "Category is required" };
  if (!t.reason.trim()) return { ok: false, error: "Reason is required" };
  if (!t.date || !/^\d{4}-\d{2}-\d{2}$/.test(t.date)) return { ok: false, error: "Date is required (YYYY-MM-DD)" };

  const trans: Transaction = {
    id: `txn_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type: t.type,
    amount: Number(t.amount),
    accountId: t.accountId,
    categoryId: t.categoryId,
    paymentMediumId: t.paymentMediumId ?? "",
    reason: t.reason.trim().slice(0, 50),
    notes: t.notes.trim().slice(0, 1000),
    date: t.date,
    createdAt: Date.now(),
  };

  const d = await getDB();
  try {
    d.run("INSERT INTO transactions (id, type, amount, accountId, categoryId, paymentMediumId, reason, notes, date, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [
      trans.id, trans.type, trans.amount, trans.accountId, trans.categoryId, trans.paymentMediumId, trans.reason, trans.notes, trans.date, trans.createdAt
    ]);
    await saveDB();
    return { ok: true, transaction: trans };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? String(e) };
  }
}

export async function dbDeleteTransaction(id: string): Promise<void> {
  const d = await getDB();
  d.run("DELETE FROM transactions WHERE id = ?", [id]);
  await saveDB();
}

export async function dbUpdateTransaction(id: string, t: Omit<Transaction, "id" | "createdAt">): Promise<{ ok: boolean; error?: string; transaction?: Transaction }> {
  if (!Number.isFinite(t.amount) || t.amount <= 0) return { ok: false, error: "Amount must be a positive number" };
  if (!t.accountId) return { ok: false, error: "Account is required" };
  if (!t.categoryId) return { ok: false, error: "Category is required" };
  if (!t.reason.trim()) return { ok: false, error: "Reason is required" };
  if (!t.date || !/^\d{4}-\d{2}-\d{2}$/.test(t.date)) return { ok: false, error: "Date is required (YYYY-MM-DD)" };

  const d = await getDB();
  try {
    d.run("UPDATE transactions SET type = ?, amount = ?, accountId = ?, categoryId = ?, paymentMediumId = ?, reason = ?, notes = ?, date = ? WHERE id = ?", [
      t.type, t.amount, t.accountId, t.categoryId, t.paymentMediumId ?? "", t.reason.trim().slice(0, 50), t.notes.trim().slice(0, 1000), t.date, id
    ]);
    await saveDB();
    return { ok: true, transaction: { id, type: t.type, amount: t.amount, accountId: t.accountId, categoryId: t.categoryId, paymentMediumId: t.paymentMediumId ?? "", reason: t.reason.trim().slice(0, 50), notes: t.notes.trim().slice(0, 1000), date: t.date, createdAt: 0 } };
  } catch (e: any) {
    return { ok: false, error: e?.message ?? String(e) };
  }
}
