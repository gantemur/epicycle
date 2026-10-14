# Epicycle Atlas

Epicycle Atlas is an English–Mongolian atlas of pre-Keplerian planetary constructions. Its workspace pairs historical Sun and planetary geometry with longitude plots, backed by independent Python research calculations. The project is independent of [SOL](https://github.com/gantemur/sol); SOL's animations remain a read-only legacy reference.

**Status:** The [public `main` site](https://gantemur.github.io/epicycle/) runs the Phase 6B clock-synchronized workspace, with Ptolemaic and Copernican longitude constructions for Sun / Earth, Mars, Jupiter and Saturn. Its Planetary Map offers both the original Copernican Spatial Map and an Earth-centred Angular Map. Independently configurable displays share one clock. See the [Map specification](docs/planetary-map.md), [status](docs/status.md), [Jupiter](docs/copernicus-jupiter.md) and [Saturn](docs/copernicus-saturn.md) source specifications, and [comparison conventions](docs/comparison-conventions.md).

**Angular Map:** Choose a Ptolemaic or Copernican set, or select historical models independently for Sun, Mars, Jupiter and Saturn. Two predictions of the same body can share one ring, with distinct markers, signed difference, optional trails and visible retrograde motion. Ring radii are illustrative, not physical distances; Ptolemy's nested-sphere distance bounds are separate [historical metadata](docs/historical-planetary-distances.md). Mixed historical frames require an explicit nominal alignment, never a modern calibration. Every display has its own one- or two-column desktop width; phones use one column without changing that preference. Workspace schema v3 migrates valid v1/v2 configurations. The reviewed `codex/phase-6b-angular-map` branch remains available for reference.

Ptolemaic Jupiter and Saturn are source-checked, partially validated historical **longitude** models. Their source calculations, exact continuous geometry, and observational validation have distinct evidential status; dates beyond the source examples are mathematical continuations. Saturn retains the IX.4 `296;43°` epoch reading, with `296;44°` and later `296;45°` documented as unused alternatives. Phase 5C added source-checked, partially validated Copernican Jupiter and Saturn with historical 1543 parameters, Earth-centred and true-Sun-centred geometry, and same-body longitude comparisons. Their common historical Earth-annual-radius coordinates now support the Planetary Map. Jupiter’s reported double eccentricity 917 remains distinct from its rounded component sum 916; Saturn’s Nuremberg rates remain distinct from the unused manuscript pair, and C3’s supplementary Saturn 1500 discrepancy of approximately 7°29′ remains unresolved. Original correction-table interpolation and independent observational validation remain incomplete. The reviewed Phase 5C development branch remains available for reference.

## Run locally

Requires Node.js 22.18+ (for built-in TypeScript test execution) and Python 3.10+. From the repository root:

```sh
npm ci
npm run dev
```

Open `http://127.0.0.1:5173/epicycle/`. One assumed-UT1 clock drives independently configurable geometry, time-series and Planetary Map panels. Presets replace the arrangement; adding, moving, or editing a panel does not change the others. The Copernican Spatial Map preset displays the true Sun, Earth, Mars, Jupiter and Saturn in common historical Earth-annual-radius units. It offers any-body viewing centres by geometric translation, independent body visibility and past trails, and panel-local Fit, zoom and pan. Its linear and compressed `asinh` radial scales are display choices: compression preserves angular directions and numerical historical distances while altering screen distances, trajectory shapes and screen speeds. The Ptolemaic and Copernican Angular Map presets show geocentric tropical longitudes on illustrative rings. Geometry panels select Sun, Mars, Jupiter, or Saturn. The Solar comparison preset shows solar longitudes and Copernicus's Earth/Sun construction; the Jupiter and Saturn preset shows a mixed-body longitude overlay. The workspace also offers Jupiter and Saturn Ptolemy–Copernicus presets with two geometry panels each. Plots can mix labelled bodies, or show signed disagreement (B − A) between two models of the **same body** under an appropriate declared frame convention. This is model disagreement, not observational error.

Copernican **Mars** geometry defaults to the source-limited 1473–1523 reconstruction. Comparison plots and the Planetary Map can explicitly select exploratory Mars continuation; dashed portions show dates outside that reference interval, without an accuracy claim. The solar, Jupiter and Saturn models have no Mars-apogee guard; their broad-date results are mathematical continuations, not claims of observational accuracy. The original Nabonassar and 1473/1512 jumps remain available. The global clock is independent of panel date policies. Use the header toggle for English or Mongolian.

Scientific limits remain visible in the workspace: ancient local time is represented through an assumed UT1 timeline and Alexandria's 30° E meridian is provisional; the nominal historical tropical-frame alignment does not calibrate either historical equinox to a modern frame; Ptolemy's complete solar-table interpolation is not implemented; Copernicus supplied no complete arbitrary-date Mars-apogee law; and historical numerical validation is partial.

To verify or build:

```sh
PYTHONPATH=src python3 -m unittest discover -s tests -v
npm run test:frontend
npm run typecheck
npm run build
git diff --check
```

`npm run build` produces `dist/` with the `/epicycle/` asset base. `web/` is the only Vite root, `publicDir` is disabled, and only public JSON definitions and fixtures are imported. `private/` is ignored and must not be copied into a build or deployment. The shared numerical fixtures can be regenerated with `PYTHONPATH=src python3 scripts/generate_mars_cross_language.py`, `PYTHONPATH=src python3 scripts/generate_copernicus_cross_language.py`, `PYTHONPATH=src python3 scripts/generate_sun_cross_language.py`, `PYTHONPATH=src python3 scripts/generate_outer_cross_language.py`, and `PYTHONPATH=src python3 scripts/generate_copernicus_map_fixture.py`. The manually transcribed source cases remain separate from generated fixtures.

## Maintain the GitHub Pages site

Pushing to `main` runs [Deploy Epicycle Atlas to GitHub Pages](.github/workflows/deploy.yml). It runs the Python and frontend tests, builds with Node.js 22.18.0, then uploads and deploys **only `dist/`**. You can also run it manually from the repository's Actions tab. Review the build and deploy jobs after a push; the deploy job reports the published URL. In Settings → Pages, the publishing source must be **GitHub Actions**. `dist/` is generated and ignored by Git; do not commit it or publish the repository root. Check the public page after a successful deployment, including asset loading and controls.

Scientific rule: historical constructions and numbers retain their own provenance and conventions. A modern ephemeris is an explicitly labeled comparison, never a substitute for a historical parameter. Variants are defined per body, not as blanket system-wide revisions.

Start with [status](docs/status.md), then the [Mars specification](docs/mars-almagest.md), [online resources](docs/online-resources.md), [architecture](docs/architecture.md), [sources](docs/sources.md), [legacy audit](docs/legacy-audit.md), [model catalogue](docs/model-catalogue.md), and [roadmap](docs/roadmap.md). Future coding sessions should also read [AGENTS.md](AGENTS.md).

The local `private/` tree contains research PDFs and legacy snapshots. It is ignored recursively and must not be published. The site does not import or copy its contents.
