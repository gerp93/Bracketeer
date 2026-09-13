import type { HouseholdInput, YearPlanInput } from '../../engine/projectionTypes';

/** A saved, named scenario — a household + its per-year plan, persisted so it can be reloaded, duplicated, and compared against others. */
export interface Scenario {
  id: string;
  name: string;
  household: HouseholdInput;
  yearPlans: YearPlanInput[];
  createdAt: string;
  updatedAt: string;
}

export type CreateScenarioInput = Pick<Scenario, 'name' | 'household' | 'yearPlans'>;
export type UpdateScenarioInput = Partial<Pick<Scenario, 'name' | 'household' | 'yearPlans'>>;
