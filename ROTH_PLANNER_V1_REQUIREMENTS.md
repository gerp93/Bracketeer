# Bracketeer — v1 Baseline Requirements

Status: approved scope, pending repo scaffold.

Bracketeer: a Roth conversion planner for households approaching or
entering retirement.

## 1. What this is

A local desktop application that models a household's retirement finances
year by year, lets the user set a Roth conversion amount for each year, and
shows the full tax and wealth consequences of those choices.

It is a **model, not an advisor**. Every assumption is visible and editable;
the projection recalculates immediately. The user does the deciding — the
tool does the arithmetic and shows its work.

**v1 calculates only. It does not recommend, optimize, or solve.**

Audience: financially literate users approaching or entering retirement.
Not a general-public consumer product — no onboarding wizard, no
hand-holding, no advertising, no monetization. Public repo, AGPL-3.0.

### Why this instead of a spreadsheet

The spreadsheet virtues to preserve: total transparency, direct
manipulation, every variable adjustable.

The spreadsheet failures to fix:
- **Formula rot.** 30 year-columns x 40 interlocking rows breaks on any
  structural edit. The tax engine belongs in tested code.
- **Scenario comparison.** Spreadsheets force whole-sheet duplication.
  Scenarios are first-class here — saved, compared side by side, diffed.
- **Invisible cliffs.** IRMAA and subtraction phase-outs are exactly what a
  spreadsheet silently walks you over. Show the wall before it is hit.
- **Marginal-rate truth.** Not the bracket you are in — the real cost of the
  next converted dollar. No spreadsheet shows this well.
- **Tax law drift.** Bracket tables versioned as data, not baked into cells.

## 2. Non-goals for v1

Explicitly deferred, to be recorded in the app repo's `TODO.md`:

- Any solver / "optimize my conversions" button
- ACA premium tax credit modeling (pre-65 retirees — highest-value
  fast-follow)
- States other than Minnesota (architecture supports them; only MN is built)
- Monte Carlo / stochastic returns / longevity distributions
- QCDs, charitable strategies, Medicaid & long-term-care planning
- Multi-state residency changes mid-projection
- Import from any external source (custodian, CSV, prior tax return)
- Mobile, web-hosted, or multi-user deployment

## 3. Functional scope

### 3.1 Household & accounts

- Filing status: **MFJ only in v1.** Single filing status is still
  implemented in the engine, because the surviving spouse reverts to it
  (see the widow's penalty below) — but it is not user-selectable as a
  starting status. MFS and HoH are out of scope.
- Birthdate per spouse — drives RMD start age, Medicare eligibility at 65,
  SS claiming age, and the 59-1/2 penalty boundary
- State of residence (v1: Minnesota implemented; others via flat-rate
  fallback)
- Accounts, per spouse where ownership matters:
  - Traditional IRA / 401k — balance, and nondeductible basis (pro-rata rule)
  - Roth IRA — balance, contribution basis, and per-year conversion basis
    (the two distinct 5-year rules)
  - Taxable brokerage — balance and cost basis (needed for LTCG realization)
  - HSA — balance
- Per-account expected return assumption, editable

### 3.2 Income & spending timeline

Per projection year, editable:
- Wages / self-employment
- Pension income
- Social Security — claiming age per spouse, benefit at full retirement age;
  app applies early/delayed adjustment
- Other ordinary income
- Target annual spending
- Withdrawal sourcing: which account funds the spending shortfall

Global assumptions: general inflation rate, a separate healthcare inflation
rate, projection horizon (default through age 95), and the assumed heir
marginal rate used for the terminal-wealth haircut.

**Death of a spouse (the widow's penalty).** The user sets an assumed death
year per spouse, or leaves it unset. From the year after a spouse's death,
the projection switches the household to single filing status: roughly half
the bracket widths, a smaller standard deduction, and IRMAA thresholds at
the single-filer levels — while household income often falls far less than
half (the larger Social Security benefit continues, pension survivor
benefits may continue in part, and the full traditional IRA balance is
inherited by the survivor and still subject to RMDs).

This is not an edge case. The prospect of a survivor taxed at single rates
on nearly the same income is one of the strongest arguments for converting
aggressively while both spouses are alive, and a model that omits it
systematically understates the case for conversion. The survivor's Social
Security is modeled as the larger of the two benefits; the smaller ends.

### 3.3 Tax engine (federal)

The correctness core. Highest testing priority.

- Ordinary income brackets and standard deduction, including the extra
  standard deduction at 65+
- Long-term capital gains and qualified dividends, **stacked on top of**
  ordinary income — the 0% bracket and how conversions push gains out of it
- Social Security taxation via provisional income (the 50%/85% inclusion
  tiers; the "tax torpedo" marginal zone)
- Net Investment Income Tax, 3.8% over threshold
- IRMAA Medicare Part B and Part D surcharges, on the **MAGI from two years
  prior**, modeled as true cliffs, per covered person
- RMDs from the Uniform Lifetime Table, starting at the user's applicable
  age (73 or 75 per birth year)
- Pro-rata rule for conversions where nondeductible basis exists
- Conversion tax paid from outside funds vs. withheld from the conversion
  (the latter is a distribution; penalized if under 59-1/2)

Bracket, deduction, and threshold figures live in **versioned per-tax-year
data files**, not as constants in code. Future years are projected by
inflating the most recent known table at the stated inflation assumption,
and the UI must make clear which years are actual vs. projected.

### 3.4 Tax engine (state) — pluggable

A `StateTaxModule` interface, resolved by state code at runtime:

```
computeStateTax(federalResult, householdYear, stateTables) -> StateTaxResult
```

Each module owns: its starting income basis (federal AGI vs. taxable
income), its additions and subtractions, its brackets and deductions, its
treatment of Social Security, and its treatment of capital gains.

**v1 implements Minnesota only.** All other states resolve to a
`FlatRateState` fallback module using a single user-supplied effective rate,
clearly labeled in the UI as an approximation.

Minnesota specifics to implement (all figures to be verified against MN
Department of Revenue before shipping, and stored as versioned data):
- Starts from federal AGI
- Four brackets: 5.35% / 6.80% / 7.85% / 9.85%
- Capital gains taxed as ordinary income — **no state 0% LTCG equivalent**,
  so the federal gain-stacking benefit does not carry over
- Social Security subtraction, phased out by income — a conversion can push
  the household off it, producing a state-level marginal spike stacking on
  the federal SS torpedo
- Minnesota standard deduction, including its phase-down at higher incomes
- No IRMAA-equivalent state surcharge

### 3.5 Projection

A year-by-year grid from the current year through the horizon. Columns:

Age(s) | Starting balances by account | Income by source | RMD | Conversion
| Federal taxable income | Federal tax | State tax | IRMAA surcharge |
Total tax | Effective rate | Marginal rate | Ending balances | Cumulative tax

Requirements:
- Conversion amount editable in place, per year, spreadsheet-style
- Recalculation is immediate on edit
- Any cell traceable to its inputs — the user can see how a number was
  derived (a drill-down panel, not a black box)
- Summary metrics: lifetime tax paid, terminal total balance, and
  **terminal after-tax wealth** — pre-tax balances discounted by the assumed
  heir rate, so a large traditional balance is not counted as if it were
  spendable money. Terminal after-tax wealth is the headline comparison
  metric.

### 3.6 Marginal rate readout — the differentiating feature

For the selected year, display the **true marginal cost of the next
converted dollar**, decomposed into its contributing parts:

- Federal ordinary bracket rate
- Capital gains pushed from 0% into 15% (or 15% into 20%)
- Additional Social Security benefit dragged into taxability
- NIIT exposure
- Minnesota rate, plus any SS-subtraction phase-out effect
- IRMAA cliff, amortized across the headroom remaining to it

Alongside it, passive headroom markers for the selected year:
- "Top of 22% bracket: +$X"
- "Next IRMAA tier: +$X"
- "Top of 0% LTCG bracket: +$X"
- "MN SS subtraction phase-out begins: +$X"

These are **landmarks, not advice**. The tool states where the walls are;
the user chooses the number.

### 3.7 Scenarios

- Create, name, save, duplicate, delete
- Compare two or more side by side, with a diff view of the summary metrics
- Reference comparisons the user will build constantly: no conversions vs.
  fill-to-12% vs. fill-to-22% vs. fill-to-IRMAA-line
- All scenarios persist locally

## 4. Non-functional requirements

- **Local only.** All data stays on the user's machine. No accounts, no
  sync, no telemetry, no analytics. The only outbound network call is the
  GitHub release update check.
- **Correctness is the product.** The tax engine is pure, deterministic,
  and unit-tested against hand-computed cases, with fixture cases covering
  each cliff and phase-out boundary specifically.
- **Responsive.** A full 30-year recalculation must feel instant on edit.
- **Legible.** Assumptions are never hidden. Projected (inflated) tax-table
  years are visually distinguished from known ones.
- **Disclaimed.** Clear, non-dismissible statement that this is a modeling
  tool, not tax or investment advice.

## 5. Technical approach

Stack: **Electron** — an existing, fully-covered category in
KVG_Standards. No new standard needs designing or approving.

Rationale: the UI is a dense, reactive, many-inputs-one-projection surface,
which web tech handles well; it keeps data local on the user's machine; and
the category already has theming, release/CI, self-update, SQLite location
handling, and a Windows installer.

Standards inherited (per the `app-standards` skill):
- Theming: VisualAssault, vendored and pinned to a released tag
- Release/CI: `release-electron.yml` via `templates/auto-release.yml` and
  `cut-release.yml`
- Self-update: `electron-updater` (Sweeper is the reference)
- SQLite location: Sweeper's `src/main/dbLocation.ts` pattern — the user can
  relocate the data file for backup
- Licensing: AGPL-3.0, verified against actual dependencies
- Logo & branding: `assets/logo.png` plus a checked-in icon generation script
- `VERSION_BUMP.md`, `TODO.md`, and a `CLAUDE.md` pointing back to
  KVG_Standards

Internal structure:
- Tax engine as a pure, side-effect-free module with no UI dependency —
  independently testable, and reusable if a non-Electron surface is ever
  wanted
- Tax tables as versioned JSON data, per year, per jurisdiction
- State modules behind the `StateTaxModule` interface, registered by code
- Nominal dollars internally (bracket and IRMAA inflation requires it);
  display defaults to today's dollars with a nominal toggle

## 6. Settled decisions

- **Name:** Bracketeer.
- **Filing status:** MFJ only as a user selection; single implemented
  internally for the surviving spouse.
- **Widow's penalty:** in scope for v1 (section 3.2).
- **States:** pluggable from day one, Minnesota the only implementation,
  flat-rate fallback elsewhere.
- **Dollars:** nominal internally, displayed in today's dollars by default
  with a nominal toggle.
- **Stack:** Electron, an existing KVG_Standards category.

## 7. Open questions

1. Exact Minnesota figures need verification against MN DOR before ship.
2. Repo visibility at creation — public from the first commit, or private
   until it does something useful?
