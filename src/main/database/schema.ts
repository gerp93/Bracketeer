import * as fs from 'fs';
import initSqlJs, { type Database } from 'sql.js';
import { getEffectiveDbPath } from '../dbLocation';

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS scenarios (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  data_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`;

/**
 * scenarios stores each scenario as a single JSON blob (data_json) rather
 * than a normalized household/year-plan schema. This is a deliberate v1
 * shortcut: a scenario is exactly the shape of the engine's own
 * HouseholdInput + YearPlanInput[] types, which are still evolving; a
 * normalized schema would need a migration on every engine shape change.
 * Revisit once those types stabilize.
 */
export async function initDatabase(): Promise<Database> {
  const SQL = await initSqlJs();
  const dbPath = getEffectiveDbPath();

  const db = fs.existsSync(dbPath) ? new SQL.Database(fs.readFileSync(dbPath)) : new SQL.Database();
  db.run(SCHEMA_SQL);
  if (!fs.existsSync(dbPath)) {
    saveDatabase(db);
  }
  return db;
}

/** sql.js keeps the whole database in memory; this writes it wholesale to disk. Call after every mutation. */
export function saveDatabase(db: Database): void {
  const data = db.export();
  fs.writeFileSync(getEffectiveDbPath(), Buffer.from(data));
}
