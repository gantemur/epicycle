# Status — Phase 4B managed displays awaiting review

## Local Phase 4B branch

The accepted Phase 4A work was verified and saved as local checkpoint `5cbe0c2` on `codex/phase-4a-workspace`. The `codex/phase-4b-displays` development branch contains the browser migration for review. The live local page now uses one assumed-UT1 `WorkspaceState.clock`, stable managed geometry and longitude panels, independent trace/policy/window settings, panel controls, bilingual text, and responsive plot-first mobile layout. The original Single and Compare behavior is available through the Explore one model and Compare longitudes presets, with the Nabonassar/1473/1512 jumps retained. The former dual-clock controller has been removed. See [workspace architecture](workspace-architecture.md) for the current contracts and deferred interactions.

Phase 4B remains unmerged and undeployed; the public `main` site remains the earlier accepted prototype. Final scientific and visual review is required before merging or deployment. The existing Pages workflow and all historical parameters, equations, source records, and fixtures are unchanged.

The managed plot accepts year, date, or full Julian date-time boundaries without changing the strict shared-clock parser. Its new comparison traces explicitly select Copernican exploratory continuation; source-limited traces still leave genuine gaps. The plot marks the exploratory portions with dashed strokes outside the project-chosen 1473–1523 guard, with a visible provenance explanation. Geometry defaults remain source-limited. This guard is not an interval of established observational accuracy.

Phase 4B verification: 30 Python tests, 54 frontend tests, TypeScript typecheck, production build, and `git diff --check` pass. In Safari, a 1500–1600 longitude overlay showed the solid-to-dashed Copernican transition and a continuous Ptolemaic curve at desktop and 360–390 px widths. The local browser was checked in both languages; Safari Start/Pause was checked with actual pointer drags during animation. The later model-disagreement curve was checked in the local in-app browser over short and century-long windows, including sign reversal, provenance, source-limited gaps, and bilingual frame feedback; its Safari rendering remains to be reviewed. The built `dist/` contains only `index.html`, JavaScript, and CSS. Geometry tap-to-play is deferred.

## Local Phase 4A branch

`codex/phase-4a-workspace` was created from the clean, committed Phase 3C branch at `d394608`. Phase 4A added typed pure workspace state, model capability metadata, per-display validation and date availability, presets, and tests. It was checkpointed locally at `5cbe0c2` before the Phase 4B branch was created.

Phase 4A checkpoint verification: 30 Python tests, 32 frontend tests, TypeScript type checking, production build, and `git diff --check` passed. The checkpoint was not pushed.

## Local Phase 3C branch

The `codex/phase-3c-comparison` branch contains committed review-pending model selection and Compare mode. The deployed `main` site still has the accepted Ptolemaic single-model experience. Phase 3C has not been merged or deployed. The GitHub Pages workflow is unchanged.

The browser ports the accepted Phase 3B Earth and Mars geometries from the existing public JSON records. Its small registry supports Ptolemy or Copernicus alone and independent Model A/B choices. The selected evaluators use one assumed UT1 instant, the documented 19°40′ E Frauenburg meridian, and a visibly provisional 30° E Alexandria choice. The original Ptolemaic Nabonassar controls remain available in Single mode.

The original `sn-local-uniform-1473-1523` source-limited policy retains its guard. A separate `sn-uniform-exploratory` policy explicitly continues C3 p.363's uniform rate and fixed 1543 geometry for dates including 2026, without a historical accuracy claim. Out-of-domain Copernican dates request acknowledgement; Ptolemy alone has no Copernican restriction. Today converts the modern Gregorian/UTC instant to the Julian historical date, treating UTC approximately as UT1. Normal BCE/historical dates use numerical Julian arithmetic.

Native historical longitudes remain labelled. The Model B minus Model A difference and comparison plot require a declared, zero-offset **nominal historical tropical-frame alignment**. This is neither a calibrated modern reference nor observational error. Plots have an independent fixed range, practical presets, custom dates, pan/zoom, and wrapped or whole-turn unwrapped display. The current-date marker moves without resampling curves on every animation frame. Phone layouts use a shared sticky playback bar near the diagrams and A/B tabs while keeping both numerical longitudes accessible.

The Python-generated `copernicus-cross-language.json` fixture covers both policies, including 2026, and is checked against the TypeScript Earth/Mars points, lengths, longitudes, corrections and precession. Across 847 numeric fixture fields, the maximum absolute Python/TypeScript difference is 3.0923×10⁻¹¹, unchanged from the earlier 634-field fixture maximum. The accepted historical parameters and equations are unchanged. Current verification: 30 Python tests, 19 frontend tests and a successful production build. Browser-based desktop, mobile and Safari checks remain unverified: the local preview URL was rejected by browser security policy, which forbade switching to another browser route for that URL. Scientific and visual review remain required before any commit or deployment.

## Deployed baseline on `main`

Git `main` tracks `origin/main` at `gantemur/epicycle`. The GitHub Pages workflow builds and deploys only `dist/`; `private/` remains ignored and outside the Vite root and build import graph. The public target is [gantemur.github.io/epicycle](https://gantemur.github.io/epicycle/).

The *Almagest* Mars longitude geometry is **source-checked, implemented, and partially numerically validated**. `data/mars-almagest-v1.json` is shared by Python and TypeScript. The browser evaluates historical positions from the geometry, draws its construction with SVG, and uses continuous Egyptian days for date controls and playback. English and Mongolian strings are centralized and the selected language is stored locally where browser storage is available. The site is configured for `/epicycle/`.

The Neugebauer Table 15 discrepancy is now independently reconstructed from a limited literal transcription of P1 XI.11 in [mars-almagest.md](mars-almagest.md) and tested: `0.297′` centre correction, `5.913′` epicycle correction, and `0.417′` final rounding make the `6.626′` geometric versus printed-table difference at the specified rounded arguments. Table 15 rows 1, 2, 4, and 5 agree to their printed minute; row 3 remains one minute different at an interpolation/rounding threshold. This is a diagnostic of distinct numerical procedures, not a reason to change historical parameters.

`tests/fixtures/mars-cross-language.json` is generated by the Python evaluator. TypeScript tests compare all returned coordinates, radii, angles, and distances for historical and synthetic arguments and several dates; Python tests guard the saved fixture. The browser's default Nabonassar date shows `47.660°` (unrounded `47.660458°`). The P2 rounded arguments yield `47.660439°`.

Run the commands in [README.md](../README.md). Phase 2 verification includes Python tests, TypeScript tests, a production build, and local browser checks at desktop, 360 px, and 390 px in both languages. The geometry, playback, trail toggle, example jump, and source panel were inspected. No horizontal overflow was observed at either phone width. The built `dist/` contains only HTML, CSS, and JS assets; no private paths.

The [comparison conventions](comparison-conventions.md) now specify explicit civil/JD/UT1/LMT/TT boundaries, an uncertain ancient ΔT, metadata-checked geocentric longitude residuals, and the source work needed for a coupled Copernican Earth + Mars model. A coupled Copernican Earth–Mars Python evaluator is now implemented; no modern adapter is present. Open work: the complete XI.11–12 table remains unimplemented; row 3's rounding path is unresolved; Alexandria's historical meridian and any ancient ΔT choice must be sourced before physical-instant comparisons. The deployed `main` UI remains the accepted one-model Phase 2 prototype, with no latitude or modern prediction.


## Phase 3B

Phase 3A is accepted with partial validation. The new [Copernican specification](copernicus-earth-mars.md) documents the 1543 Earth double eccentric and Mars eccentric/small-epicycle construction, source lineage, true Sun versus mean Sun, chronology and the unresolved Mars apsidal evolution. Versioned Earth/Mars JSON records and transcribed source-case fixtures preserve original notation and unused alternatives. Critical readings were checked visually in C2's Nuremberg 1543 printing.

Earth checkpoint A was completed before Mars implementation. Source checks reproduce the 1515 eccentricity derivation, the 1525 precession/solar table example, the January 1512 Mars parameter derivation and the scholarly 1473 table example, with measured discrepancies rather than altered constants. The continuous geometric results differ from the cited solar and Mars table examples by 0.807′ and 1.170′ sidereal respectively. The January 1512 rounded-argument result differs from the observation used to determine the radius by −1.500′; it is not independent predictive validation.

The date API has **no default Mars apsidal law**. It requires a supplied apsis with provenance, the explicit `sn-local-uniform-1473-1523` scholarly approximation within its guard, or the separately selected hypothetical `sn-uniform-exploratory` continuation. This is not full historical verification. The two-model diagnostic uses one declared UT1 instant and separate meridians, and suppresses residuals without an explicit planar frame alignment. Modern frame calibration, a full Copernican correction-table implementation, arbitrary-date apsidal/eccentricity evolution and broader independent prediction checks remain unavailable.

Verification: **28 Python tests, 9 frontend tests, production build, and the documented diagnostic command passed**. The final scientific review correction documents the January 1512 distance arithmetic, C3's inconsistent supplementary 1500 anomaly entry, and the omitted Toruń meridian reduction in the 1473 example. No dependencies or browser files changed. Historical Ptolemaic parameters/formulas/fixtures remain unchanged. That Phase 3B checkpoint preceded the local Phase 3C browser implementation described above.
