"use client";

// Central SQLite (sql.js) — single persisted DB in IndexedDB
// LocalStorage is ONLY for theme/mode/lastDbName per spec. All domain data lives here.

let SQL: any = null;
let db: any = null;
let initPromise: Promise<any> | null = null;

const IDB_NAME = "HisaabKitaab";
const IDB_STORE = "sqlite";
const IDB_KEY = "main";

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
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(IDB_STORE, "readonly");
    const store = tx.objectStore(IDB_STORE);
    const req = store.get(IDB_KEY);
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
  return new Promise((resolve, reject) => {
    const tx = idb.transaction(IDB_STORE, "readwrite");
    const store = tx.objectStore(IDB_STORE);
    const req = store.put(bytes, IDB_KEY);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
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
  // Future tables can be added here without wiping user data
  // CREATE TABLE IF NOT EXISTS accounts (...)
  // CREATE TABLE IF NOT EXISTS transactions (...)
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
}

export async function createBlankDBBytes(): Promise<Uint8Array> {
  const S = await loadSQL();
  const tmp = new S.Database();
  ensureSchema(tmp);
  const out = tmp.export() as Uint8Array;
  tmp.close?.();
  return out;
}

export async function openDBFromFile(file: File): Promise<void> {
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
  initPromise = Promise.resolve(db);
  await saveDB();
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
  const name = c.name.trim();
  if (!name) return { ok: false, error: "Category name is required" };
  if (!/^#[0-9a-fA-F]{6}$/.test(c.color)) return { ok: false, error: "Color must be hex #rrggbb" };
  if (c.type !== "income" && c.type !== "expense") return { ok: false, error: "Type must be income or expense" };
  const key = name.toLowerCase();
  const d = await getDB();
  // dup check
  const dup = d.exec(`SELECT 1 FROM categories WHERE nameKey = '${key.replace(/'/g, "''")}' LIMIT 1`);
  if (dup.length && dup[0].values.length) return { ok: false, error: `Category "${name}" already exists` };
  const cat: Category = {
    id: `cat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name,
    nameKey: key,
    type: c.type,
    color: c.color.toLowerCase(),
    createdAt: Date.now(),
  };
  try {
    d.run("INSERT INTO categories (id, name, nameKey, type, color, createdAt) VALUES (?, ?, ?, ?, ?, ?)", [cat.id, cat.name, cat.nameKey, cat.type, cat.color, cat.createdAt]);
    await saveDB();
    return { ok: true, category: cat };
  } catch (e: any) {
    const msg = e?.message ?? String(e);
    if (/UNIQUE/i.test(msg)) return { ok: false, error: `Category "${name}" already exists` };
    return { ok: false, error: msg };
  }
}

export async function dbDeleteCategory(id: string): Promise<void> {
  const d = await getDB();
  d.run("DELETE FROM categories WHERE id = ?", [id]);
  await saveDB();
}

// utility for CategoryPage CSV preview analysis — needs existing keys
export async function dbGetCategoryKeys(): Promise<Set<string>> {
  const cats = await dbGetCategories();
  return new Set(cats.map((c) => c.nameKey));
}
