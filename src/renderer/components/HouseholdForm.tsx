import { useState } from 'react';
import type { HouseholdInput } from '../../engine/projectionTypes';
import InfoTooltip from './InfoTooltip';
import Modal from './Modal';
import CurrencyInput from './CurrencyInput';
import PercentInput from './PercentInput';

interface Props {
  household: HouseholdInput;
  onChange: (household: HouseholdInput) => void;
  /** One blended annual return applied to every account's balance, every year — the engine actually stores this per-year, but the UI exposes a single value that fans out to all years at once. */
  returnAssumption: number;
  onReturnAssumptionChange: (rate: number) => void;
}

/** Household, account, and assumption inputs. Every field here is a direct, editable assumption — nothing about the projection happens without something on this form driving it. */
export default function HouseholdForm({ household, onChange, returnAssumption, onReturnAssumptionChange }: Props) {
  const [editingSpouse, setEditingSpouse] = useState<0 | 1 | null>(null);
  const [draftName, setDraftName] = useState('');

  const set = <K extends keyof HouseholdInput>(key: K, value: HouseholdInput[K]) =>
    onChange({ ...household, [key]: value });

  const setSpouse = (index: 0 | 1, patch: Partial<HouseholdInput['spouses'][0]>) => {
    const spouses = [...household.spouses] as HouseholdInput['spouses'];
    spouses[index] = { ...spouses[index], ...patch };
    onChange({ ...household, spouses });
  };

  const setBalance = (key: keyof HouseholdInput['startingBalances'], value: number) =>
    onChange({ ...household, startingBalances: { ...household.startingBalances, [key]: value } });

  const openNameEditor = (index: 0 | 1) => {
    setDraftName(household.spouses[index].name);
    setEditingSpouse(index);
  };

  const saveName = () => {
    if (editingSpouse !== null) setSpouse(editingSpouse, { name: draftName.trim() });
    setEditingSpouse(null);
  };

  return (
    <div className="panel">
      <h2>Household</h2>
      <div className="form-grid">
        {(household.householdType === 'single' ? ([0] as const) : ([0, 1] as const)).map((i) => (
          <fieldset key={i}>
            <legend>
              {household.spouses[i].name || (household.householdType === 'single' ? 'You' : `Spouse ${i + 1}`)}
              <button type="button" className="legend-edit-button" title="Edit name" onClick={() => openNameEditor(i)}>
                ✎
              </button>
            </legend>
            <label>
              <span className="field-label-row">
                Birth year
                <InfoTooltip text="This spouse's birth year — drives their age in every projected year, which in turn drives when RMDs start, Medicare/IRMAA eligibility, and Social Security claiming eligibility." />
              </span>
              <input
                type="number"
                value={household.spouses[i].birthYear}
                onChange={(e) => setSpouse(i, { birthYear: Number(e.target.value) })}
              />
            </label>
            <label>
              <span className="field-label-row">
                {household.householdType === 'single'
                  ? 'Assumed death year (optional — ends the projection)'
                  : "Assumed death year (optional — drives the widow's-penalty modeling)"}
                <InfoTooltip
                  text={
                    household.householdType === 'single'
                      ? 'Optional. Leave blank to project through the full horizon. If set, the projection simply stops the following year — nothing left to plan for.'
                      : "Optional. Leave blank to assume this spouse survives the whole projection. If set, the household switches to single filing status the following year, and the survivor inherits this spouse's Social Security benefit if it's larger than their own — the 'widow's penalty' this tool is built to model."
                  }
                />
              </span>
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
              <span className="field-label-row">
                SS benefit at full retirement age (annual, today&rsquo;s $)
                <InfoTooltip text="Their Social Security benefit if claimed at full retirement age (67) — often called their 'PIA'. This isn't a number Bracketeer can look up or calculate: it depends on this spouse's own lifetime earnings record, not a government table. Find it on their Social Security Statement at ssa.gov/myaccount (or the paper statement SSA mails). Enter it in today's dollars — the app inflates it forward for you." />
              </span>
              <CurrencyInput
                value={household.spouses[i].ssBenefitAtFRA}
                onChange={(v) => setSpouse(i, { ssBenefitAtFRA: v })}
              />
            </label>
            <label>
              <span className="field-label-row">
                SS claiming age
                <InfoTooltip text="The age this spouse starts (or started) collecting Social Security. Claiming before 67 permanently reduces the benefit; claiming after 67 (up to 70) permanently increases it. This is the one SS input that IS a fixed government formula — Bracketeer applies the adjustment automatically." />
              </span>
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
            <span className="field-label-row">
              Household type
              <InfoTooltip text="How the household files. Married Filing Jointly (MFJ): one combined return, the common case. Married Filing Separately (MFS): two spouses, but taxed on separate returns — narrower brackets, and Social Security becomes taxable almost immediately since MFS has no income-free threshold. Single: one person, no spouse at all — different from a widow(er), which this tool reaches automatically when a spouse's assumed death year passes." />
            </span>
            <select
              value={household.householdType}
              onChange={(e) => set('householdType', e.target.value as HouseholdInput['householdType'])}
            >
              <option value="mfj">Married Filing Jointly</option>
              <option value="mfs">Married Filing Separately</option>
              <option value="single">Single (no spouse)</option>
            </select>
          </label>
          <label>
            <span className="field-label-row">
              State
              <InfoTooltip text="Which state's income tax rules apply. Minnesota has its own modeled tax module (brackets, Social Security subtraction, standard deduction phase-out); any other state falls back to a single flat rate you supply below." />
            </span>
            <select value={household.stateCode} onChange={(e) => set('stateCode', e.target.value)}>
              <option value="MN">Minnesota (modeled)</option>
              <option value="OTHER">Other (flat-rate approximation)</option>
            </select>
          </label>
          {household.stateCode !== 'MN' && (
            <label>
              <span className="field-label-row">
                Flat state rate approximation
                <InfoTooltip text="A single flat percentage applied to taxable income as a rough stand-in for a state that doesn't have its own dedicated tax module yet. Not a substitute for that state's real brackets and deductions." />
              </span>
              <PercentInput
                value={household.flatRateStateFallbackRate}
                onChange={(v) => set('flatRateStateFallbackRate', v)}
              />
            </label>
          )}
          <label>
            <span className="field-label-row">
              Start year
              <InfoTooltip text="The first calendar year of the projection — row one of the grid. Every other year-based input (ages, inflation compounding, the IRMAA lookback years below) is measured relative to this." />
            </span>
            <input
              type="number"
              value={household.startYear}
              onChange={(e) => set('startYear', Number(e.target.value))}
            />
          </label>
          <label>
            <span className="field-label-row">
              Horizon (years)
              <InfoTooltip text="How many years the projection runs, starting from Start year. Determines how many rows appear in the grid below." />
            </span>
            <input
              type="number"
              value={household.horizonYears}
              onChange={(e) => set('horizonYears', Number(e.target.value))}
            />
          </label>
          <label>
            <span className="field-label-row">
              General inflation assumption
              <InfoTooltip text="The general annual inflation rate used to grow Social Security benefits, tax bracket thresholds, and other today's-dollars inputs forward into future years' nominal dollars." />
            </span>
            <PercentInput
              value={household.generalInflationAssumption}
              onChange={(v) => set('generalInflationAssumption', v)}
            />
          </label>
          <label>
            <span className="field-label-row">
              Assumed annual investment return
              <InfoTooltip text="Yes — growth is already modeled. This is the blended annual return applied every year to whatever's left in Traditional, Roth, and Brokerage after that year's RMD, conversion, withdrawals, and spending are subtracted — one rate across all three accounts, not broken out by asset allocation. Changing this updates every year in the grid below at once." />
            </span>
            <PercentInput value={returnAssumption} onChange={onReturnAssumptionChange} />
          </label>
          <label>
            <span className="field-label-row">
              Assumed heir marginal rate
              <InfoTooltip text="The tax rate assumed for whoever inherits the remaining Traditional balance after both spouses pass away. Traditional money isn't fully theirs until they pay ordinary income tax on it (typically within the SECURE Act's 10-year window), so this haircut is applied only to the Traditional portion of the 'terminal after-tax wealth' metric — Roth and taxable balances count at face value since they aren't taxed again." />
            </span>
            <PercentInput
              value={household.assumedHeirMarginalRate}
              onChange={(v) => set('assumedHeirMarginalRate', v)}
            />
          </label>
        </fieldset>

        <fieldset>
          <legend>IRMAA lookback</legend>
          <p className="muted" style={{ marginTop: 0 }}>
            Medicare's IRMAA surcharge looks at your income from two years earlier. For the projection's first two
            years, that means real history from before this plan starts — enter your actual MAGI (Modified Adjusted
            Gross Income, from line 11 of Form 1040 plus any tax-exempt interest) for those two years so the surcharge
            shows up accurately instead of assuming $0.
          </p>
          <label>
            <span className="field-label-row">
              {`MAGI in ${household.startYear - 2}`}
              <InfoTooltip
                text={`Actual MAGI for ${household.startYear - 2} — this drives whether IRMAA applies in ${household.startYear} (the first projected year).`}
              />
            </span>
            <CurrencyInput
              value={household.priorMagiHistory.twoYearsBefore}
              onChange={(v) => set('priorMagiHistory', { ...household.priorMagiHistory, twoYearsBefore: v })}
            />
          </label>
          <label>
            <span className="field-label-row">
              {`MAGI in ${household.startYear - 1}`}
              <InfoTooltip
                text={`Actual MAGI for ${household.startYear - 1} — this drives whether IRMAA applies in ${household.startYear + 1} (the second projected year).`}
              />
            </span>
            <CurrencyInput
              value={household.priorMagiHistory.oneYearBefore}
              onChange={(v) => set('priorMagiHistory', { ...household.priorMagiHistory, oneYearBefore: v })}
            />
          </label>
        </fieldset>

        <fieldset>
          <legend>Starting balances</legend>
          <label>
            <span className="field-label-row">
              Traditional
              <InfoTooltip text="Today's balance in tax-deferred retirement accounts (Traditional IRA/401(k)/403(b) etc.) — money that hasn't been taxed yet. RMDs are forced out of this, and Roth conversions move money out of this into Roth." />
            </span>
            <CurrencyInput
              value={household.startingBalances.traditional}
              onChange={(v) => setBalance('traditional', v)}
            />
          </label>
          <label>
            <span className="field-label-row">
              Traditional nondeductible basis
              <InfoTooltip text="The portion of the Traditional balance that's already after-tax — nondeductible contributions you made yourself (not the typical case; leave at 0 if every dollar in Traditional was pre-tax). This shrinks the taxable share of every future RMD and conversion, pro-rata, under the IRS's pro-rata rule." />
            </span>
            <CurrencyInput
              value={household.startingBalances.traditionalBasis}
              onChange={(v) => setBalance('traditionalBasis', v)}
            />
          </label>
          <label>
            <span className="field-label-row">
              Roth
              <InfoTooltip text="Today's balance already inside a Roth IRA — already taxed, and never taxed again. Grows here every year by the return assumption; conversions add to it." />
            </span>
            <CurrencyInput value={household.startingBalances.roth} onChange={(v) => setBalance('roth', v)} />
          </label>
          <label>
            <span className="field-label-row">
              Brokerage (taxable account)
              <InfoTooltip text="Today's balance in a regular (non-retirement) brokerage or savings account — engine and tax documents call this the 'taxable' account, meaning its gains are taxable each time you sell, not that this number itself is a tax figure. The plan draws from this account first to cover any spending or tax bill that wages, pension, RMDs, and Social Security don't fully cover." />
            </span>
            <CurrencyInput value={household.startingBalances.taxable} onChange={(v) => setBalance('taxable', v)} />
          </label>
          <label>
            <span className="field-label-row">
              Brokerage cost basis
              <InfoTooltip text="How much of the brokerage balance is original cost basis (what you paid for it) rather than investment gains. Withdrawals from this account are split proportionally between basis (not taxed again) and gains (taxed as capital gains) based on this ratio." />
            </span>
            <CurrencyInput
              value={household.startingBalances.taxableCostBasis}
              onChange={(v) => setBalance('taxableCostBasis', v)}
            />
          </label>
        </fieldset>
      </div>

      {editingSpouse !== null && (
        <Modal title="Edit name" onClose={() => setEditingSpouse(null)}>
          <input
            type="text"
            autoFocus
            placeholder={`Spouse ${editingSpouse + 1}`}
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveName();
              if (e.key === 'Escape') setEditingSpouse(null);
            }}
          />
          <div className="modal__actions">
            <button type="button" onClick={() => setEditingSpouse(null)}>
              Cancel
            </button>
            <button type="button" onClick={saveName}>
              Save
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
