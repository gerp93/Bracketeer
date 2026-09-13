# TODO

This app's own backlog of future features and fixes — not a KVG_Standards
compliance checklist (see [KVG_Standards](https://github.com/gerp93/KVG_Standards)
and this repo's entry in its `REPO_SCOPE.md` for that). Just what's not
built yet.

## Features

- The whole engine: federal tax pipeline, Minnesota tax module (figures
  need verification against MN Department of Revenue), projection loop,
  widow's-penalty filing-status switch, marginal-rate analyzer. See
  `BRACKETEER_BUILD_PLAN.md` Phases 1-4.
- The UI: household/account inputs, income timeline, the projection grid,
  marginal-rate panel, scenario save/compare/diff. See
  `BRACKETEER_BUILD_PLAN.md` Phase 5.
- ACA premium tax credit modeling (pre-65 retirees) — deferred out of v1
  per `ROTH_PLANNER_V1_REQUIREMENTS.md` section 2, highest-value fast-follow.
- State tax modules beyond Minnesota (the `StateTaxModule` interface exists;
  only the flat-rate fallback and a not-yet-implemented Minnesota stub do).

## Fixes / gaps

- No `assets/logo.png` yet — needs a source mark before
  `scripts/generate-icons.js` can produce anything. Every other surface
  (window icon, in-app usage, packaged binary icon) is wired to read from
  it once it exists.
- Minnesota tax figures (brackets, SS subtraction formula, standard
  deduction phase-down) are placeholders that intentionally throw rather
  than compute a wrong number — see `src/engine/states/minnesotaTax.ts`.
