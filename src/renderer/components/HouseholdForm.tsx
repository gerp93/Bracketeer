import type { HouseholdInput } from '../../engine/projectionTypes';

interface Props {
  household: HouseholdInput;
  onChange: (household: HouseholdInput) => void;
}

/** Household, account, and assumption inputs. Every field here is a direct, editable assumption — nothing about the projection happens without something on this form driving it. */
export default function HouseholdForm({ household, onChange }: Props) {
  const set = <K extends keyof HouseholdInput>(key: K, value: HouseholdInput[K]) =>
    onChange({ ...household, [key]: value });

  const setSpouse = (index: 0 | 1, patch: Partial<HouseholdInput['spouses'][0]>) => {
    const spouses = [...household.spouses] as HouseholdInput['spouses'];
    spouses[index] = { ...spouses[index], ...patch };
    onChange({ ...household, spouses });
  };

  const setBalance = (key: keyof HouseholdInput['startingBalances'], value: number) =>
    onChange({ ...household, startingBalances: { ...household.startingBalances, [key]: value } });

  return (
    <div className="panel">
      <h2>Household</h2>
      <div className="form-grid">
        {([0, 1] as const).map((i) => (
          <fieldset key={i}>
            <legend>Spouse {i + 1}</legend>
            <label>
              Birth year
              <input
                type="number"
                value={household.spouses[i].birthYear}
                onChange={(e) => setSpouse(i, { birthYear: Number(e.target.value) })}
              />
            </label>
            <label>
              Assumed death year (optional — drives the widow&rsquo;s-penalty modeling)
              <input
                type="number"
                placeholder="alive through horizon"
                value={household.spouses[i].assumedDeathYear ?? ''}
                onChange={(e) =>
                  setSpouse(i, { assumedDeathYear: e.target.value === '' ? undefined : Number(e.target.value) })
                }
              />
            </label>
            <label>
              SS benefit at full retirement age (annual, today&rsquo;s $)
              <input
                type="number"
                value={household.spouses[i].ssBenefitAtFRA}
                onChange={(e) => setSpouse(i, { ssBenefitAtFRA: Number(e.target.value) })}
              />
            </label>
            <label>
              SS claiming age
              <input
                type="number"
                value={household.spouses[i].ssClaimingAge}
                onChange={(e) => setSpouse(i, { ssClaimingAge: Number(e.target.value) })}
              />
            </label>
          </fieldset>
        ))}

        <fieldset>
          <legend>State &amp; assumptions</legend>
          <label>
            State
            <select value={household.stateCode} onChange={(e) => set('stateCode', e.target.value)}>
              <option value="MN">Minnesota (modeled)</option>
              <option value="OTHER">Other (flat-rate approximation)</option>
            </select>
          </label>
          {household.stateCode !== 'MN' && (
            <label>
              Flat state rate approximation
              <input
                type="number"
                step="0.001"
                value={household.flatRateStateFallbackRate}
                onChange={(e) => set('flatRateStateFallbackRate', Number(e.target.value))}
              />
            </label>
          )}
          <label>
            Start year
            <input
              type="number"
              value={household.startYear}
              onChange={(e) => set('startYear', Number(e.target.value))}
            />
          </label>
          <label>
            Horizon (years)
            <input
              type="number"
              value={household.horizonYears}
              onChange={(e) => set('horizonYears', Number(e.target.value))}
            />
          </label>
          <label>
            General inflation assumption
            <input
              type="number"
              step="0.001"
              value={household.generalInflationAssumption}
              onChange={(e) => set('generalInflationAssumption', Number(e.target.value))}
            />
          </label>
          <label>
            Assumed heir marginal rate
            <input
              type="number"
              step="0.01"
              value={household.assumedHeirMarginalRate}
              onChange={(e) => set('assumedHeirMarginalRate', Number(e.target.value))}
            />
          </label>
        </fieldset>

        <fieldset>
          <legend>Starting balances</legend>
          <label>
            Traditional
            <input
              type="number"
              value={household.startingBalances.traditional}
              onChange={(e) => setBalance('traditional', Number(e.target.value))}
            />
          </label>
          <label>
            Traditional nondeductible basis
            <input
              type="number"
              value={household.startingBalances.traditionalBasis}
              onChange={(e) => setBalance('traditionalBasis', Number(e.target.value))}
            />
          </label>
          <label>
            Roth
            <input
              type="number"
              value={household.startingBalances.roth}
              onChange={(e) => setBalance('roth', Number(e.target.value))}
            />
          </label>
          <label>
            Taxable
            <input
              type="number"
              value={household.startingBalances.taxable}
              onChange={(e) => setBalance('taxable', Number(e.target.value))}
            />
          </label>
          <label>
            Taxable cost basis
            <input
              type="number"
              value={household.startingBalances.taxableCostBasis}
              onChange={(e) => setBalance('taxableCostBasis', Number(e.target.value))}
            />
          </label>
        </fieldset>
      </div>
    </div>
  );
}
