# TODO

This app's own backlog of future features and fixes — not a KVG_Standards
compliance checklist (see [KVG_Standards](https://github.com/gerp93/KVG_Standards)
and this repo's entry in its `REPO_SCOPE.md` for that). Just what's not
built yet.

## Features

- ACA premium tax credit modeling (pre-65 retirees) — deferred out of v1
  per `ROTH_PLANNER_V1_REQUIREMENTS.md` section 2, highest-value fast-follow.
- State tax modules beyond Minnesota — the `StateTaxModule` interface and
  the flat-rate fallback exist; only Minnesota has a real implementation.
- Per-spouse-owned accounts instead of one combined household balance per
  account type (see `src/engine/projection.ts`'s docstring — RMDs currently
  use the older living spouse's age against the combined traditional
  balance, a defensible but literal simplification of the per-account
  IRS rule).
- Automatic withdrawal-sourcing-order choice (requirements section 3.2:
  "which account funds the spending shortfall," implying a user-picked
  preference order) is still not built — Brokerage remains the sole
  automatic shortfall-funder. What v1 now has instead: an explicit
  per-year Traditional withdrawal field (`traditionalWithdrawal`) the
  user sets directly to pull spending cash from Traditional rather than
  Brokerage, plus `targetSpending`/`discretionaryCapitalGains` are now
  wired into the grid — that covers the "normal" retirement patterns
  (RMD + voluntary IRA withdrawal, or draw-down from Brokerage) without
  the fully automatic ordering the requirements doc originally sketched.
- A drill-down view so any grid cell traces to the inputs that produced it
  (requirements section 3.5) — the current UI shows the numbers but not
  their derivation.
- Interest/dividend income in the NIIT calculation (currently capital
  gains only — see `federalTax.ts`'s comment on that simplification).
- Exact fixed-point solve for the year's cash need instead of the two-pass
  approximation in `projection.ts` (documented there; close enough for
  planning, not exact to the dollar in an extreme edge case).
- OBBBA (July 2025) added a new, separate $6,000-per-taxpayer-65+ "senior
  deduction" on top of the existing (much smaller) additional standard
  deduction for 65+ — income-phased, not yet modeled at all. Found
  2026-09-14 while fixing the standard deduction figures below; a real new
  feature, not a data fix.

## Fixes / gaps

- **Federal and Minnesota figures corrected 2026-09-14** (found while
  researching MFS on 2026-09-13, fixed the next day): federal standard
  deduction ($30,000/$15,000 → $31,500/$15,750 — OBBBA, signed July 2025,
  retroactively raised the 2025 figure after the original Rev. Proc.
  2024-40 had already set it), the federal MFJ ordinary brackets (full set,
  derived as exactly double the independently-confirmed MFS breakpoints),
  the federal Single top bracket only ($609,350 → $626,350), and
  Minnesota's standard deduction base/phaseout-start ($29,150/$14,575 →
  $29,900/$14,950; $220,650 → $238,950, now consistent with MFS's
  $119,475 as exactly half). Verified directly against IRS.gov and the
  Minnesota Dept. of Revenue's own 2025 chart — see the Data Sources tab
  for each citation.
- **Still not independently re-verified** (left as the original Rev. Proc.
  2024-40 figures — may or may not also be affected by OBBBA or other
  changes, just not checked yet): Single's non-top ordinary bracket
  breakpoints (only the top one was confirmed), the federal 65+ additional
  standard deduction amounts ($1,550/$1,950), and Minnesota's Social
  Security subtraction cap/phase-out-start figures. Check each against its
  cited source in the Data Sources tab before trusting it for a real
  decision.
- One hand-computed end-to-end scenario is validated
  (`src/engine/handComputedScenario.test.ts` — a full MFJ wages+conversion
  return checked against a by-hand federal + Minnesota calculation, not
  just boundary tests), but that's one scenario. More — especially ones
  exercising SS taxability, IRMAA, and the widow's-penalty switch together
  — plus a review by someone who actually knows the tax code, are still
  needed before treating this as trustworthy for a real household's numbers.
- Electron app has not yet been smoke-tested in a real windowed session in
  this environment (no display available in this sandbox) — `npm run dev`/
  `npm run package` should be tried on a real machine before shipping a
  release.
