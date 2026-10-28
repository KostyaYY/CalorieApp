import type { SQLiteDatabase } from 'expo-sqlite';

import { CUSTOM_CATEGORY, SEED_FOODS } from '@/data/foods';
import type { Macros, Meal, Profile } from '@/lib/nutrition';

export const DB_NAME = 'calorieapp.db';

const DB_VERSION = 1;

/** Creates the schema and seeds the food list. Runs once per app start via SQLiteProvider. */
export async function migrate(db: SQLiteDatabase) {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;
  if (version >= DB_VERSION) return;

  if (version === 0) {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE profile (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        sex TEXT NOT NULL,
        age INTEGER NOT NULL,
        height REAL NOT NULL,
        weight REAL NOT NULL,
        activity TEXT NOT NULL,
        goal TEXT NOT NULL
      );
      CREATE TABLE foods (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        kcal REAL NOT NULL,
        protein REAL NOT NULL,
        fat REAL NOT NULL,
        carbs REAL NOT NULL,
        is_custom INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        meal TEXT NOT NULL,
        food_id INTEGER REFERENCES foods(id) ON DELETE SET NULL,
        name TEXT NOT NULL,
        grams REAL NOT NULL,
        kcal REAL NOT NULL,
        protein REAL NOT NULL,
        fat REAL NOT NULL,
        carbs REAL NOT NULL,
        created_at INTEGER NOT NULL
      );
      CREATE INDEX entries_date ON entries(date);
      CREATE TABLE water (
        date TEXT PRIMARY KEY,
        ml INTEGER NOT NULL
      );
    `);
    await db.withTransactionAsync(async () => {
      const stmt = await db.prepareAsync(
        'INSERT INTO foods (name, category, kcal, protein, fat, carbs) VALUES (?, ?, ?, ?, ?, ?)'
      );
      try {
        for (const f of SEED_FOODS) {
          await stmt.executeAsync(f.name, f.category, f.kcal, f.protein, f.fat, f.carbs);
        }
      } finally {
        await stmt.finalizeAsync();
      }
    });
    version = 1;
  }

  await db.execAsync(`PRAGMA user_version = ${DB_VERSION}`);
}

// Profile

export async function getProfile(db: SQLiteDatabase) {
  return db.getFirstAsync<Profile>(
    'SELECT sex, age, height, weight, activity, goal FROM profile WHERE id = 1'
  );
}

export async function saveProfile(db: SQLiteDatabase, p: Profile) {
  await db.runAsync(
    `INSERT INTO profile (id, sex, age, height, weight, activity, goal) VALUES (1, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET sex = excluded.sex, age = excluded.age, height = excluded.height,
       weight = excluded.weight, activity = excluded.activity, goal = excluded.goal`,
    p.sex, p.age, p.height, p.weight, p.activity, p.goal
  );
}

// Foods

export type Food = Macros & { id: number; name: string; category: string; is_custom: number };

export async function getFoods(db: SQLiteDatabase) {
  return db.getAllAsync<Food>('SELECT * FROM foods ORDER BY is_custom DESC, name COLLATE NOCASE');
}

/** Foods most recently logged, newest first. */
export async function getRecentFoods(db: SQLiteDatabase, limit = 8) {
  return db.getAllAsync<Food>(
    `SELECT f.* FROM foods f
     JOIN (SELECT food_id, MAX(created_at) AS last FROM entries WHERE food_id IS NOT NULL GROUP BY food_id) r
       ON r.food_id = f.id
     ORDER BY r.last DESC LIMIT ?`,
    limit
  );
}

export async function addCustomFood(db: SQLiteDatabase, f: Macros & { name: string }) {
  const res = await db.runAsync(
    'INSERT INTO foods (name, category, kcal, protein, fat, carbs, is_custom) VALUES (?, ?, ?, ?, ?, ?, 1)',
    f.name, CUSTOM_CATEGORY, f.kcal, f.protein, f.fat, f.carbs
  );
  return res.lastInsertRowId;
}

export async function deleteCustomFood(db: SQLiteDatabase, id: number) {
  await db.runAsync('DELETE FROM foods WHERE id = ? AND is_custom = 1', id);
}

// Diary entries

export type Entry = Macros & {
  id: number;
  date: string;
  meal: Meal;
  food_id: number | null;
  name: string;
  grams: number;
};

export async function getEntries(db: SQLiteDatabase, date: string) {
  return db.getAllAsync<Entry>('SELECT * FROM entries WHERE date = ? ORDER BY created_at', date);
}

/** Stores a snapshot of the nutrients so later edits to a food don't rewrite history. */
export async function addEntry(
  db: SQLiteDatabase,
  e: { date: string; meal: Meal; food: Food; grams: number }
) {
  const k = e.grams / 100;
  await db.runAsync(
    `INSERT INTO entries (date, meal, food_id, name, grams, kcal, protein, fat, carbs, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    e.date, e.meal, e.food.id, e.food.name, e.grams,
    e.food.kcal * k, e.food.protein * k, e.food.fat * k, e.food.carbs * k,
    Date.now()
  );
}

export async function deleteEntry(db: SQLiteDatabase, id: number) {
  await db.runAsync('DELETE FROM entries WHERE id = ?', id);
}

export type DayTotal = Macros & { date: string; count: number };

/** Daily totals for dates in [from, to], only days with entries. */
export async function getDayTotals(db: SQLiteDatabase, from: string, to: string) {
  return db.getAllAsync<DayTotal>(
    `SELECT date, SUM(kcal) AS kcal, SUM(protein) AS protein, SUM(fat) AS fat, SUM(carbs) AS carbs,
       COUNT(*) AS count
     FROM entries WHERE date BETWEEN ? AND ? GROUP BY date ORDER BY date DESC`,
    from, to
  );
}

// Water

export async function getWater(db: SQLiteDatabase, date: string) {
  const row = await db.getFirstAsync<{ ml: number }>('SELECT ml FROM water WHERE date = ?', date);
  return row?.ml ?? 0;
}

export async function setWater(db: SQLiteDatabase, date: string, ml: number) {
  await db.runAsync(
    'INSERT INTO water (date, ml) VALUES (?, ?) ON CONFLICT(date) DO UPDATE SET ml = excluded.ml',
    date, Math.max(0, ml)
  );
}
