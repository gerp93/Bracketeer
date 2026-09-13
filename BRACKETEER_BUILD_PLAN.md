# Bracketeer — v1 Implementation Plan

Companion to `ROTH_PLANNER_V1_REQUIREMENTS.md`. That doc is *what*; this is
*how* and *in what order*.

## Guiding principle

**The tax engine is the product; the UI is a viewer for it.**

Everything is sequenced around that. The engine gets built first, as a pure
module with no Electron dependency, validated against hand-computed cases
before a single pixel is drawn. A pretty app on top of a wrong engine is
worse than useless here — it is confidently wrong about someone's
irreversible six-figure decision.

Corollary: **no phase is done until its tests pass.** Not "builds", not
"looks right" — passes the fixture cases for its cliffs and boundaries.

## Phase 0 — Repo scaffold

Blocked on: a `gerp93/Bracketeer` repo existing, and this session (or a
future one) having it in scope via `add_repo`.

Also needed in scope: `gerp93/Sweeper`, the reference implementation for
Electron window icon wiring, `electron-updater`, and `dbLocation.ts`.

1. Electron + TypeScript + Vite skeleton, strict mode on.
2. Standards wiring, per the `app-standards` skill:
   - `LICENSE` — AGPL-3.0, copied from an existing repo, then verified
     against Bracketeer's actual dependency tree (nothing GPL-2.0-only or
     source-available may enter it).
   - `templates/auto-release.yml` + `templates/cut-release.yml` copied in,
     both calling `release-electron.yml` — Electron desktop apps get
     **both** triggers, not one.
   - `VERSION_BUMP.md` (required wherever `auto-release.yml` exists).
   - `TODO.md` from the template, seeded with the deferred scope from the
     requirements doc's section 2.
   - VisualAssault CSS vendored, pinned to a released tag — never `@main`.
   - `electron-updater`, wired per Sweeper's `src/main/main.ts`.
   - `README.md` and `CLAUDE.md` that state Bracketeer follows
     KVG_Standards and link to it — the skill treats a passing mention of
     one topic as a violation, so this needs to be explicit.
3. `assets/logo.png` + `scripts/generate-icons.js` (Node + sharp, Sweeper's
   pattern). All four surfaces: README hero, runtime `BrowserWindow` icon,
   in-app UI, and `build/icon.png` for electron-builder.
4. Add Bracketeer to `REPO_SCOPE.md` in KVG_Standards — its own PR there,
   on `claude/roth-ira-conversion-planner-qei9ho`.

**Done when:** `main` builds, produces a release artifact, and the app opens
an empty window with correct theming and icons.

## Phase 1 — Tax engine core (federal)

Pure TypeScript. No Electron import anywhere in this module, enforced by a
lint rule so it cannot rot.

### 1a. Tax table data layer

- Schema for a year's tables: ordinary brackets by filing status, standard
  deduction incl. the 65+ addition, LTCG breakpoints, SS provisional
  thresholds, NIIT threshold, IRMAA tiers (Part B and D), RMD Uniform
  Lifetime divisors.
- Real data for the known year(s), marked `actual`.
- A projector that inflates the newest actual table forward, marking those
  years `projected` — the flag propagates to the UI, which must show the
  user which years are real law and which are an assumption.
- **Tests:** schema round-trip; a projected year inflates every indexed
  figure and leaves un-indexed ones (e.g. the NIIT threshold, which is not
  inflation-adjusted) alone.

### 1b. The ordering problem

Single most important design decision in the engine. Federal tax is not a
sum of independent parts — it is a fixed-point problem:

- Social Security taxability depends on provisional income, which depends
  on the conversion amount.
- LTCG stacking depends on ordinary income, which includes the conversion
  and the now-taxable SS.
- IRMAA depends on MAGI from **two years prior**, not this year — a
  lookback the projection must carry, and which means a conversion's IRMAA
  cost lands two years later, not in the conversion year.

Resolution: one explicit, documented, ordered pipeline
(`computeFederalTax`), each stage a named pure function, with the ordering
rationale written down in the module. IRMAA is computed off the projection's
stored MAGI history, never off the current year.

**Tests:** hand-computed fixtures per stage, then end-to-end returns.

### 1c. Stages

Ordinary income → deductions → SS provisional inclusion → LTCG stacking →
bracket application → NIIT → RMD → pro-rata basis handling → IRMAA lookback.

**Tests, specifically at the boundaries** — one dollar either side of: each
bracket edge, each IRMAA tier, the 0%/15% LTCG line, both SS inclusion
tiers, the NIIT threshold. These are where the value of this tool lives and
where an engine bug would be invisible and expensive.

## Phase 2 — State engine + Minnesota

- `StateTaxModule` interface: `computeStateTax(federalResult, householdYear,
  tables) -> StateTaxResult`.
- `FlatRateState` fallback — one user-supplied rate, labeled in the UI as an
  approximation.
- `MinnesotaTaxModule`: starts from federal AGI; four brackets
  (5.35/6.80/7.85/9.85); capital gains as ordinary income (no state 0%
  equivalent); the Social Security subtraction and its income phase-out;
  the MN standard deduction and its high-income phase-down.
- **Figures verified against MN Department of Revenue** before this phase is
  called done, and stored as versioned data like the federal tables.
- **Tests:** MN returns hand-computed against published examples; the SS
  subtraction phase-out boundary specifically, since that is a marginal
  spike the user will be steering around.

## Phase 3 — Projection engine

- Year-by-year loop: apply returns, take RMDs, apply the conversion, fund
  the spending shortfall from the chosen account order, compute federal +
  state + IRMAA, roll balances forward.
- Carries a MAGI history for the IRMAA two-year lookback.
- **Widow's penalty:** from the year after an assumed spouse death, switch
  to single filing — single brackets, single standard deduction, single
  IRMAA thresholds — while the survivor keeps the larger SS benefit (the
  smaller ends) and inherits the full traditional balance with RMDs
  continuing on it.
- Terminal after-tax wealth: pre-tax balances haircut by the assumed heir
  rate.
- **Tests:** a multi-year projection with no conversions is stable and
  matches hand-computed balances; the IRMAA lookback lands the surcharge in
  the correct year; the filing-status switch fires in the right year and
  changes the right things.

## Phase 4 — Marginal rate analyzer

The differentiating feature (requirements §3.6). Computed by **finite
difference on the real engine** — add a small delta to the conversion,
re-run the year, decompose the change — rather than by a second,
hand-derived rate formula that could drift from the engine's actual
behavior.

Decomposed into: federal bracket, LTCG pushed out of 0%, SS dragged into
taxability, NIIT, Minnesota (incl. SS subtraction phase-out), and the IRMAA
cliff amortized over the headroom to it.

Headroom markers via binary search against the engine: top of current
bracket, next IRMAA tier, top of 0% LTCG, MN subtraction phase-out start.

**Tests:** decomposed components sum to the observed total; markers land on
the true boundary dollar.

## Phase 5 — UI

Only now. React + the projection grid as the centerpiece.

- Inputs: household, accounts, income timeline, assumptions.
- Projection grid, conversion column editable in place, instant recalc.
- Drill-down: any cell traces to its inputs. Non-negotiable — this is what
  separates a model from a black box.
- Marginal-rate panel with the decomposition and headroom markers.
- Scenario management: save, duplicate, compare side by side, diff.
- Persistence: SQLite via Sweeper's `dbLocation.ts` pattern — user can
  relocate the file, with the settings UI the standard requires (current
  path, adopt existing, copy to new location, reset to default).
- Non-dismissible disclaimer: modeling tool, not tax or investment advice.

## Phase 6 — Validation before it is trusted

- End-to-end scenarios hand-checked against an independent calculation.
- A sanity pass by someone who knows the tax code, on real-shaped numbers.
- README documenting every assumption and every known limitation, plainly.

## Sequencing notes

Phases 1–4 are independently testable with no UI, which is the point: the
engine can be proven correct before any of it is visible. Phase 5 is
comparatively mechanical once 1–4 are solid.

Phase 0 is blocked on repo creation. Phase 2's Minnesota figures are blocked
on MN DOR verification. Everything else is unblocked.

**Risks, honestly stated:**
- The engine's fixed-point ordering (1b) is the likeliest source of a subtle
  wrong answer. It gets the most test attention.
- IRMAA's two-year lookback is easy to model a year off, and the error would
  look plausible.
- Minnesota's SS subtraction phase-out interacts with the federal SS
  torpedo; the combined marginal spike is exactly the kind of thing a
  naive implementation smooths over.
