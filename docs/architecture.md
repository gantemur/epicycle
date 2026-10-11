# Proposed architecture (Phase 0)

## Boundaries

1. **Historical definitions:** versioned, reviewable data per `(tradition, work, variant, body)`. Each parameter stores the original sexagesimal string or tuple, normalized value and unit, epoch, frame, source ID with book/chapter/page/table, and one of `explicit`, `derived`, `reconstruction`, `modern_fit`. Add ambiguity notes and alternate readings. A missing value means unknown, not zero. A model record states which observables are actually defined.
2. **Historical evaluator:** pure functions of a model definition and an explicit time argument. Return geocentric coordinates *and* intermediate construction points, angles, and distances with units; rendering consumes these results. Keep any original geometrical lengths distinct from screen pixels.
3. **Chronology and coordinates:** one documented Julian-day representation plus explicit civil calendar (proleptic Julian or Gregorian), astronomical year numbering and BCE display conversion, day boundary, time scale, equinox/ecliptic, obliquity, precession, and angular wrapping rules. Convert at defined boundaries rather than inside individual models. Record uncertainty in ancient ΔT.
4. **Modern reference:** a separate adapter reporting dataset and version, coverage, frame, correction choices, and whether coordinates are geometric or apparent. The browser may use pre-generated, validated coefficients; Python may use a local JPL kernel. Generation-time download is acceptable; deployed evaluation should work offline.
5. **Presentation:** a browser application that evaluates at most two historical models and optional modern reference. Two synchronized geometry panels avoid mixing unlike constructions. Geocentric longitude is the initial shared observable. A Sun-centred view must label original geometry, coordinate re-centring, or an assumption-dependent reconstruction separately; a geocentric construction does not uniquely determine a physical heliocentric orbit.
6. **Research:** independent Python commands for historical evaluation, table checks, reference comparisons, optimization, sensitivity work, and reproducible paper tables/figures. Scientific scripts and configurations are versioned. Large kernels remain external with acquisition instructions and checksums.
7. **Provenance and validation:** per-parameter source locators, typed fixtures, independent historical table examples, numerical cross-checks across Python/browser, and explicit validation status. `implemented`, `source-checked`, and `numerically-validated` are separate states.

## Initial technology choices

- Browser: TypeScript, Vite, native SVG/Canvas as appropriate, and small reusable UI modules. Use a centralized `en`/`mn` message catalogue and a compact **English | Монгол** header toggle, with local selection persistence. Avoid a heavy internationalization or chart library until the actual plotting needs justify one. Vite's base path must be `/epicycle/` when deployment is authorized.
- Layout: phone-first at 360–390 CSS px; a large geometry panel, touch-sized controls, stacked or collapsible sections, and comparison tabs on narrow screens. Respect reduced motion; do not encode meaning only in colour. Translate graph labels, units, legends, tooltips, errors, model names, and source information.
- Python: a small package with standard-library historical mathematics first; add NumPy/SciPy, plotting, and JPL tooling only to the research extras that need them. Pin versions when reproducible experiments begin. Use a local JPL ephemeris interface exposing general position vectors rather than CALTIB's lunar-elongation-specific facade.
- Shared data: human-readable JSON with schema validation, sourced sexagesimal values, and versioned expected-output fixtures. Both runtimes parse the same definitions; neither browser code nor SOL constants are the canonical source. Decide the exact schema only after the first source-verified Mars transcription.

## Phase 2 implementation boundary

`data/mars-almagest-v1.json` remains the single historical parameter record. `web/src/model.ts` imports it and independently evaluates the Cartesian construction; it returns the Earth, deferent centre, equant, epicycle centre, Mars, radii, angles, and distances in historical units. `web/src/diagram.ts` maps those coordinates to a fixed SVG viewBox. The trail samples the same evaluator at earlier days. Viewport changes scale the SVG uniformly without changing geometry or time.

`web/src/chronology.ts` implements Egyptian 365-day dates and proleptic Julian civil labels with astronomical year numbering. Its time argument is the continuous Egyptian mean local day count from the Alexandria-noon epoch, not a JavaScript `Date` or a TT/UT timestamp. `web/src/state.ts` contains pure control transitions; `web/src/i18n.ts` is the complete English/Mongolian catalogue; `web/src/app.ts` binds controls and renders. Playback advances the same day argument used by Python. Hiding the page pauses it.

`scripts/generate_mars_cross_language.py` writes Python results for historical examples, the Neugebauer reconstruction inputs, synthetic arguments, and continuous dates to `tests/fixtures/mars-cross-language.json`. Both Python and TypeScript tests check this file. The browser defaults to the Nabonassar example recorded in `mars-source-cases.json`; its exact time-evaluated longitude is `47.660458°`, while the exact geometry at P2's rounded arguments is `47.660439°`.

Vite's root is `web/`, its base is `/epicycle/`, its public directory is disabled, and the build emits only that import graph to `dist/`. The local information panel names the model's partial validation and distinguishes direct geometry from Ptolemy's table interpolation. Later comparison panels should reuse the evaluator/render boundary rather than adding a second body or variant to this Phase 2 view.

## Comparison contract to settle before implementation

Specify a common observable such as geocentric ecliptic longitude of date, distinguish historical computed/true position from modern apparent position (light time, aberration, nutation as applicable), and label any correction applied to either. Compare angular residuals on `[-180°, 180°)`; unwrap only for continuous time-series display. Latitude and distance appear only where the historical model and scale define them. Cite time-scale and frame assumptions alongside every reported residual.

## Open decisions

The micro-VSOP term threshold in CALTIB is a size heuristic (`|A|·3^power`), not a global error guarantee. Before choosing browser coefficients, benchmark longitude, latitude, and distance over declared historical epochs against an appropriate local high-precision ephemeris, including near close approaches and range boundaries. Verify the generator's source files, checksums, licenses, coefficients, and coordinate convention. Evaluate light-time and apparent-place needs separately. For Python, verify actual kernel coverage and the ancient ΔT model before claiming a historical error figure.
