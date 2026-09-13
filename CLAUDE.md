# CLAUDE.md — Bracketeer

Bracketeer is a Roth IRA conversion planner for households approaching or
entering retirement. It models a household's federal + Minnesota tax,
IRMAA surcharges, and Social Security taxation year by year under
user-controlled conversion amounts.

**It calculates. It does not recommend, optimize, or solve.** Every
assumption is visible and editable; the user decides the conversion
amounts, the tool shows the consequences.

This repo follows [gerp93/KVG_Standards](https://github.com/gerp93/KVG_Standards)
for theming, release/CI, self-update, licensing, and SQLite database
location — see that repo for the actual rules and this repo's entry in its
`REPO_SCOPE.md`. In short: Electron GUI category, VisualAssault theming
pinned to a released tag, `auto-release.yml`/`cut-release.yml` calling
`release-electron.yml`, `electron-updater`, AGPL-3.0, and the
`dbLocation.ts` pattern for the local SQLite file.

## Planning documents

- `ROTH_PLANNER_V1_REQUIREMENTS.md` — what v1 is and is not, functional
  scope, and the settled product decisions (MFJ-only with the widow's
  penalty modeled, Minnesota-only state tax with a pluggable interface,
  nominal internally / today's-dollars display).
- `BRACKETEER_BUILD_PLAN.md` — the phased build order. The tax engine
  (`src/engine/`) is built and proven correct with no UI attached before
  any UI work starts — see that doc's "Guiding principle."

## Engine boundary

`src/engine/` must have no dependency on Electron or on anything under
`src/main/`. It's a pure module, independently testable, so the numbers
can be proven right before they're ever displayed. Keep new engine code
there; keep app/window/IPC code in `src/main/`.

## Current state

Phase 0 (repo scaffold) only. The engine files under `src/engine/` are
placeholders that throw rather than compute — see `TODO.md`.
