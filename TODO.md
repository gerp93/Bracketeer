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
- Configurable withdrawal sourcing order (currently: taxable account funds
  the spending + tax shortfall, traditional is only touched via RMD/
  conversion) — requirements section 3.2 calls for this to be user-chosen.
- A drill-down view so any grid cell traces to the inputs that produced it
  (requirements section 3.5) — the current UI shows the numbers but not
  their derivation.
- Interest/dividend income in the NIIT calculation (currently capital
  gains only — see `federalTax.ts`'s comment on that simplification).
- Exact fixed-point solve for the year's cash need instead of the two-pass
  approximation in `projection.ts` (documented there; close enough for
  planning, not exact to the dollar in an extreme edge case).

## Fixes / gaps

- **No `assets/logo.png` yet** — deliberately deferred, per direction to
  worry about the logo later. `scripts/generate-icons.js` is ready to run
  the moment a source mark exists; every consuming surface (window icon,
  in-app usage, packaged binary icon) is already wired to read from it.
- Minnesota tax figures (brackets, SS subtraction cap/phase-out,
  standard-deduction phase-down) are 2025 estimates from public sources —
  **need verification against Minnesota Department of Revenue publications**
  before being relied on for a real decision. Federal figures likewise need
  a spot-check against the IRS's own Rev. Proc. Both are called out in the
  app's own footer disclaimer in the meantime.
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
