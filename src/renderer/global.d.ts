import type { CreateScenarioInput, Scenario, UpdateScenarioInput } from '../shared/types/scenario';

export interface BracketeerBridge {
  scenarios: {
    getAll: () => Promise<Scenario[]>;
    getById: (id: string) => Promise<Scenario | null>;
    create: (input: CreateScenarioInput) => Promise<Scenario>;
    update: (id: string, input: UpdateScenarioInput) => Promise<Scenario | null>;
    duplicate: (id: string, newName: string) => Promise<Scenario | null>;
    delete: (id: string) => Promise<{ success: true }>;
  };
  dbLocation: {
    get: () => Promise<{ path: string; isDefault: boolean; defaultPath: string }>;
    browseExisting: () => Promise<string | null>;
    browseNew: () => Promise<string | null>;
    set: (newPath: string) => Promise<{ success: true }>;
    resetToDefault: () => Promise<{ success: true }>;
  };
  app: {
    getVersion: () => Promise<string>;
  };
  updates: {
    check: () => Promise<{ status: string; version?: string; message?: string }>;
  };
}

declare global {
  interface Window {
    bracketeer: BracketeerBridge;
  }
}
