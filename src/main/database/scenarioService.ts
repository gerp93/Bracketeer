import { v4 as uuidv4 } from 'uuid';
import type { Database } from 'sql.js';
import { saveDatabase } from './schema';
import type { CreateScenarioInput, Scenario, UpdateScenarioInput } from '../../shared/types/scenario';

export class ScenarioService {
  constructor(private db: Database) {}

  getAll(): Scenario[] {
    const results: Scenario[] = [];
    const stmt = this.db.prepare('SELECT id, name, data_json, created_at, updated_at FROM scenarios ORDER BY updated_at DESC');
    while (stmt.step()) {
      results.push(this.rowToScenario(stmt.getAsObject()));
    }
    stmt.free();
    return results;
  }

  getById(id: string): Scenario | null {
    const stmt = this.db.prepare('SELECT id, name, data_json, created_at, updated_at FROM scenarios WHERE id = :id');
    stmt.bind({ ':id': id });
    const found = stmt.step() ? this.rowToScenario(stmt.getAsObject()) : null;
    stmt.free();
    return found;
  }

  create(input: CreateScenarioInput): Scenario {
    const now = new Date().toISOString();
    const scenario: Scenario = {
      id: uuidv4(),
      name: input.name,
      household: input.household,
      yearPlans: input.yearPlans,
      createdAt: now,
      updatedAt: now,
    };
    this.db.run('INSERT INTO scenarios (id, name, data_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?)', [
      scenario.id,
      scenario.name,
      JSON.stringify({ household: scenario.household, yearPlans: scenario.yearPlans }),
      scenario.createdAt,
      scenario.updatedAt,
    ]);
    saveDatabase(this.db);
    return scenario;
  }

  update(id: string, input: UpdateScenarioInput): Scenario | null {
    const existing = this.getById(id);
    if (!existing) return null;

    const updated: Scenario = {
      ...existing,
      name: input.name ?? existing.name,
      household: input.household ?? existing.household,
      yearPlans: input.yearPlans ?? existing.yearPlans,
      updatedAt: new Date().toISOString(),
    };
    this.db.run('UPDATE scenarios SET name = ?, data_json = ?, updated_at = ? WHERE id = ?', [
      updated.name,
      JSON.stringify({ household: updated.household, yearPlans: updated.yearPlans }),
      updated.updatedAt,
      id,
    ]);
    saveDatabase(this.db);
    return updated;
  }

  duplicate(id: string, newName: string): Scenario | null {
    const existing = this.getById(id);
    if (!existing) return null;
    return this.create({ name: newName, household: existing.household, yearPlans: existing.yearPlans });
  }

  delete(id: string): void {
    this.db.run('DELETE FROM scenarios WHERE id = ?', [id]);
    saveDatabase(this.db);
  }

  private rowToScenario(row: Record<string, unknown>): Scenario {
    const data = JSON.parse(row.data_json as string);
    return {
      id: row.id as string,
      name: row.name as string,
      household: data.household,
      yearPlans: data.yearPlans,
      createdAt: row.created_at as string,
      updatedAt: row.updated_at as string,
    };
  }
}
