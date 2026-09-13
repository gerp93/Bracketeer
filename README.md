# Bracketeer

A Roth IRA conversion planner for households approaching or entering
retirement.

Bracketeer models a household's federal + Minnesota tax, Medicare IRMAA
surcharges, and Social Security taxation year by year, under
user-controlled Roth conversion amounts. It's a spreadsheet's transparency
and direct manipulation, with a real tested tax engine underneath instead
of 1,000 hand-copied formula cells.

**It calculates. It does not recommend, optimize, or solve.** Every
assumption is visible and editable — the user decides how much to convert
and when; Bracketeer shows the full consequences: total tax, IRMAA cliffs,
the true marginal cost of the next converted dollar, and terminal
after-tax wealth.

This is a modeling tool, not tax or investment advice.

## Status

Early scaffold. The tax engine and UI are not built yet — see
[`BRACKETEER_BUILD_PLAN.md`](BRACKETEER_BUILD_PLAN.md) for the phased plan
and [`ROTH_PLANNER_V1_REQUIREMENTS.md`](ROTH_PLANNER_V1_REQUIREMENTS.md)
for what v1 covers.

## Scope (v1)

- Federal tax: ordinary brackets, LTCG stacking, Social Security
  provisional-income taxation, NIIT, IRMAA (two-year MAGI lookback), RMDs.
- State tax: a pluggable `StateTaxModule` interface. Minnesota is the only
  real implementation; every other state falls back to a flat
  user-supplied rate.
- The "widow's penalty" — a projected spouse death switches the household
  to single filing status, modeled explicitly rather than ignored.
- A year-by-year projection grid, editable in place, with scenario
  save/compare/diff.
- The true marginal-rate readout: the actual cost of the next converted
  dollar, decomposed across bracket, LTCG stacking, Social Security
  taxability, NIIT, state tax, and the amortized IRMAA cliff.

Out of scope for v1: any solver/"optimize for me" feature, ACA premium
subsidies, states other than Minnesota, Monte Carlo, and more — see the
requirements doc's non-goals section.

## Development

```
npm install
npm run dev        # Vite renderer + Electron, hot-reloading
npm test           # engine unit tests (vitest)
npm run typecheck
npm run build       # production build
npm run package     # electron-builder, local packaging
```

Local data — household inputs, scenarios — lives in a local SQLite file,
relocatable from Settings (see `src/main/dbLocation.ts`); nothing leaves
the machine except the GitHub-release update check.

## Standards

This repo follows [gerp93/KVG_Standards](https://github.com/gerp93/KVG_Standards)
for theming (VisualAssault, pinned to a released tag), release/CI
(`auto-release.yml` + `cut-release.yml` calling `release-electron.yml`),
self-update (`electron-updater`), licensing (AGPL-3.0), and SQLite database
location. See that repo's `REPO_SCOPE.md` for Bracketeer's tracked
standards status.

## License

AGPL-3.0 — see [`LICENSE`](LICENSE).
