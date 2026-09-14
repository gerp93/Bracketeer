# MFS, solo households, and a data-sources reference tab

**Status: implemented.** Both features below are built, tested (80 engine
tests passing, including a new `src/engine/mfsAndSolo.test.ts`), and live
in the app (Plan tab's Household type selector; new Data Sources tab).
This doc is kept as the design record — see it for *why* things are
shaped the way they are, not as a backlog anymore.

## Feature 1: MFS and true-single (no spouse) filing statuses

### Context

Bracketeer's engine currently supports two filing statuses: `mfj` and
`single`, but `single` is only ever *reached* — it's the widow's-penalty
transition when one spouse of an MFJ household dies (see
`ROTH_PLANNER_V1_REQUIREMENTS.md` section 3.1: "MFJ only as a user
selection; single implemented [for the transition] but not user-selectable
as a starting status. MFS and HoH are out of scope.").

This plan adds two new **user-selectable starting statuses**:
1. **MFS** (Married Filing Separately) — two real, both-alive spouses who
   file separately instead of jointly.
2. **Single, no spouse** — a genuinely solo household, not a widow(er).

Explicit constraint: **keep this new logic separate from what's already
built** — don't heavily touch the existing, tested MFJ ⇄ widow's-penalty-
single transition logic in `projection.ts`. The design below is built
around that constraint throughout.

### Decisions already made

- **MFS tax data**: real, researched 2025 figures, not an approximation
  reusing Single's tables. MFS has genuinely different bracket widths and
  a notoriously narrow 2-tier IRMAA cliff — worth doing properly.
- **Solo household UI**: hide Spouse 2's fields entirely when "Single" is
  chosen; RMD/Social Security genuinely run on one person, not a
  2-person function fed a dummy/zeroed second spouse.
- **When it's chosen**: a "Household type" dropdown in the household form
  (MFJ / MFS / Single), freely editable at any time — same pattern as the
  existing State selector, not a locked-in setup-time choice.

### Key finding: MFS and Solo are structurally different problems

- **MFS** only changes *which tax tables apply* — household composition is
  unchanged (still 2 living spouses, 1 combined account pot). This is a
  narrow, additive change.
- **Solo** changes *household composition itself* — the engine's
  `HouseholdInput.spouses: [SpouseInput, SpouseInput]` and every function
  that assumes exactly two people (RMD's "older living spouse", Social
  Security's survivor-benefit step-up) needs a genuinely new code path for
  the one-person case.

### Engine changes

**1. Extend the `FilingStatus` union (additive, not a rewrite)**

`src/engine/types.ts:8` — `export type FilingStatus = 'mfj' | 'single' | 'mfs';`

Every `Record<FilingStatus, X>` in `TaxYearTables` (`ordinaryBrackets`,
`standardDeduction`, `ltcgBrackets`, `socialSecurity.firstThreshold`,
`socialSecurity.secondThreshold`, `niitThreshold`) will then force a
compile error until an `mfs` entry exists — TypeScript itself guarantees
nothing gets silently missed. Existing `mfj`/`single` values are never
modified, only new sibling entries added.

**2. Federal tax data — `src/engine/data/federalTaxTables.ts`**

- Add `mfs` entries to every `Record<FilingStatus, ...>` in
  `FEDERAL_TAX_TABLES_2025` (real 2025 figures — see Research below).
- IRMAA is a special case: `tables.irmaa.partB/partD` is actually the MFJ
  table, and Single already has its own hardcoded sibling constants
  (`irmaaPartBSingle2025`/`irmaaPartDSingle2025`) with a branch in
  `irmaaTiersByFilingStatus()` (`federalTaxTables.ts:116-123`). Follow the
  same pattern: add `irmaaPartBMfs2025`/`irmaaPartDMfs2025` (2-tier
  structure — MFS has no gradual steps, it jumps straight from standard to
  the top surcharge tier at one threshold) and extend that branch.
- Verify `projectTaxYearTables()` iterates filing statuses generically
  (not a hardcoded `mfj`/`single` list) before assuming `mfs` inflates
  forward automatically — check during implementation, not assumed here.

**3. Minnesota tax data — `src/engine/data/minnesotaTaxTables.ts` + `src/engine/states/minnesotaTax.ts`**

- Add `mfs` entries to `MN_BRACKETS_2025`, `MN_STANDARD_DEDUCTION_BASE_2025`,
  `MN_STANDARD_DEDUCTION_PHASEOUT_START_2025`, `MN_SS_SUBTRACTION_MAX_2025`,
  `MN_SS_SUBTRACTION_PHASEOUT_START_2025` (real MN 2025 MFS figures).
- `minnesotaTax.ts`'s two helper functions currently narrow-type their
  `filingStatus` param as `'mfj' | 'single'` explicitly
  (`computeMnStandardDeduction`, `computeMnSsSubtraction`, lines 66/79) —
  widen both to `FilingStatus`. Mechanical, TypeScript-guided, no behavior
  change for the two existing statuses.

**4. Household composition — new explicit branches, existing code untouched**

`src/engine/projectionTypes.ts` — add `householdType: 'mfj' | 'mfs' | 'single'`
to `HouseholdInput`. The `spouses: [SpouseInput, SpouseInput]` tuple type
itself **does not change** — avoids cascading a type-shape change through
every consumer (RMD, Social Security, the UI). For a `single` household,
`spouses[1]` still technically exists in the data but is never read by any
solo-specific code path (see below) and never rendered in the UI.

`src/engine/projection.ts`'s year loop — today (unchanged parts stay
exactly like this):
```ts
const filingStatus: FilingStatus = aliveA && aliveB ? 'mfj' : 'single';
```
becomes one small parameterization plus one new early branch:
```ts
const filingStatus: FilingStatus =
  household.householdType === 'single'
    ? 'single'
    : aliveA && aliveB
      ? household.householdType // 'mfj' | 'mfs'
      : 'single'; // existing widow's-penalty path, untouched
```
Similarly, Social Security and RMD's "older living spouse" logic get a new
`household.householdType === 'single'` branch that calls a **new**,
solo-only code path (spouse[0] only, no survivor step-up, no min-birth-year
comparison) — the existing married-household functions
(`householdSocialSecurityBenefit`, the RMD age-selection logic) are called
exactly as today for MFJ/MFS, completely unmodified.

This is the concrete shape of "keep the logic separate": new `if`
branches at the handful of spots where spouse-pair logic runs, each
routing to dedicated new solo implementations; the married path is reused
verbatim, only its filing-status label is now a variable instead of a
hardcoded `'mfj'` literal.

### UI changes — `src/renderer/components/HouseholdForm.tsx`

- New "Household type" dropdown (MFJ / MFS / Single) near the State
  selector, each option's tooltip explaining what it means.
- `mfj`/`mfs`: no other UI change — both spouse fieldsets stay exactly as
  today.
- `single`: Spouse 2's fieldset is not rendered at all; Spouse 1's
  fieldset drops "Spouse 1" numbering (just their name, or "You").
- `src/renderer/defaultScenario.ts` — add `householdType: 'mfj'` to the
  default household; `normalizeHousehold()` backfills `mfj` for any
  scenario saved before this field existed (same pattern already used for
  `priorMagiHistory`/spouse `name`).
- `src/renderer/components/ProjectionGrid.tsx`'s `formatFilingStatus()`
  helper — add `mfs` → `"MFS"` (currently a two-way ternary, becomes a
  three-way switch).

### Explicitly NOT touched

- The existing MFJ ⇄ widow's-penalty-single transition logic and its
  tests — reused as-is, not modified.
- `HouseholdInput.spouses`'s tuple type shape.
- Any existing bracket/threshold **values** already in the data files —
  only new sibling entries added.
- The combined-account-pot simplification (RMD/balances stay one shared
  pot regardless of filing status) — MFS does not get separate per-spouse
  accounts in this model. Worth a docstring note as a stated v1
  simplification, same tone as the existing "combined traditional balance"
  note in `projection.ts`.

### Testing

New tests, proposed as a **new file**, `src/engine/mfsAndSolo.test.ts`,
rather than folding into `projection.test.ts` — keeps the new coverage
physically separate too, mirroring the "separate logic" constraint:
- MFS computes using MFS brackets — produces a different tax than both MFJ
  and Single for the same income.
- MFS IRMAA reflects the 2-tier cliff (no gradual steps).
- Solo household: only spouse[0] drives RMD/age; `filingStatus` is
  `single` for the whole horizon; `isWidowPenaltyYear` never fires
  (nothing to lose).
- Full existing suite (73 tests as of this plan) still passes unchanged —
  the regression proof that the existing MFJ/widow's-penalty path was
  genuinely untouched.

### Research required before implementation

- Federal 2025 MFS: ordinary brackets, LTCG brackets, standard deduction,
  Social Security provisional-income thresholds, NIIT threshold.
- Federal 2025 IRMAA MFS tiers (2-tier cliff) — exact CMS.gov dollar
  thresholds for whatever base year the engine models.
- Minnesota 2025 MFS: brackets, standard deduction base + phaseout start,
  SS subtraction max + phaseout start — confirm MN Dept. of Revenue
  actually publishes a distinct MFS schedule (vs. deferring to federal).

---

## Feature 2: a "Data Sources" reference tab

### Context

While researching Feature 1, it became clear that Bracketeer's hardcoded
tax figures (`federalTaxTables.ts`, `minnesotaTaxTables.ts`) currently have
*structural* doc comments (what each number means, how it's used) but
**no per-value citation** to the actual IRS Revenue Procedure, CMS.gov
IRMAA table, or Minnesota Department of Revenue publication it came from —
only a general "these need to be spot-checked... before this app is relied
on for a real decision" disclaimer (both files' headers), which is also
called out as an open item in `TODO.md`.

This adds a new, read-only tab listing **every** externally-sourced figure
the app uses — not just new MFS numbers, everything already in the app too
— each with its value and exactly where it came from, so someone can
independently verify any of it. Explicitly **not editable** from this tab;
this is a trust/transparency surface, not a settings page.

### What needs to be listed

Everything currently hardcoded in `src/engine/data/federalTaxTables.ts`
and `src/engine/data/minnesotaTaxTables.ts`, plus the RMD table and the
Social Security claiming-adjustment formula:
- Federal ordinary brackets (MFJ/Single, + MFS once Feature 1 lands)
- Federal LTCG brackets (same statuses)
- Federal standard deduction + the 65+ additional amount
- Social Security taxability provisional-income thresholds (50%/85%)
- NIIT threshold + rate
- IRMAA Part B / Part D tiers, per filing status (the MFJ/Single split
  already in code, + MFS once Feature 1 lands)
- RMD Uniform Lifetime Table (already cited: IRS Pub. 590-B)
- Minnesota brackets, standard deduction base/phaseout, SS subtraction
  max/phaseout
- Social Security early/delayed claiming adjustment formula
  (`socialSecurityBenefit.ts`'s `claimingAdjustmentFactor` — SSA's
  official -5/9%, -5/12%, +2/3% per month rules)

### Design principle: read live values, don't duplicate them

To avoid the exact "hand-copied palette drifts from source of truth"
anti-pattern this codebase already avoids elsewhere (theming — see
`CLAUDE.md`), the Reference tab must **read the real table constants
directly** (import `FEDERAL_TAX_TABLES_2025`, `MN_BRACKETS_2025`, etc. and
format them for display) rather than re-typing numbers into new
display-only data. Only the **citation metadata** (source name,
section/table reference, URL) is new, hand-maintained content — kept in a
separate file so it's additive, not a modification of the actual tax
tables: `src/engine/data/sources.ts` (or similar), something like:
```ts
export interface Citation {
  source: string;       // "IRS Revenue Procedure 2024-40"
  locator?: string;      // "§2.01, Table 1" / "Table III"
  url?: string;
}
```
keyed to each figure/table by name, consumed by a new renderer component
that pulls the live value from the real table and the citation from this
file side by side.

### UI

New top-level tab (alongside Plan / Compare / Settings) — read-only,
grouped sections matching the list above, each row showing: what it is,
its current value(s), and its source citation (with a link where the
source has one, e.g. CMS.gov, IRS.gov, MN DOR). No inputs, no edit
affordance anywhere on this tab.

### Research required before implementation

This is the actual bulk of the work — sourcing a real, checkable citation
for every figure listed above:
- IRS Revenue Procedure 2024-40 (2025 inflation adjustments) for federal
  brackets, LTCG brackets, standard deduction, NIIT threshold (confirm
  NIIT is statutory/unindexed, not from the Rev. Proc.).
- CMS.gov's published 2025 Medicare Part B/D IRMAA tables.
- IRS Pub. 590-B Table III for the RMD Uniform Lifetime Table (likely
  already correct, needs the exact citation format only).
- SSA.gov's early/delayed retirement credit rules for the claiming
  adjustment formula.
- Minnesota Department of Revenue's 2025 individual income tax brackets,
  standard deduction, and Social Security subtraction publications.

This research effort doubles as resolving the existing `TODO.md`/header-
comment "needs to be spot-checked" disclaimers on both data files — worth
doing once, for both purposes.
