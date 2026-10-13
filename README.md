# Epicycle Atlas

Epicycle Atlas is an English–Mongolian atlas of pre-Keplerian planetary constructions. Its workspace pairs historical Sun and planetary geometry with longitude plots, backed by independent Python research calculations. The project is independent of [SOL](https://github.com/gantemur/sol); SOL's animations remain a read-only legacy reference.

**Status:** The [public `main` site](https://gantemur.github.io/epicycle/) runs the Phase 5B clock-synchronized workspace. Its implemented catalogue includes Ptolemy's Sun, Mars, Jupiter, and Saturn and Copernicus's Earth/Sun and Mars. Independently configurable geometry and longitude displays share one clock; the Solar comparison and Jupiter and Saturn presets sit alongside Explore one model. See the [status](docs/status.md), [solar specification](docs/sun-almagest.md), [Copernican specification](docs/copernicus-earth-mars.md), and [comparison conventions](docs/comparison-conventions.md).

Ptolemaic Jupiter and Saturn are source-checked, partially validated historical **longitude** models. Their source calculations, exact continuous geometry, and observational validation have distinct evidential status; dates beyond the source examples are mathematical continuations. Saturn retains the IX.4 `296;43°` epoch reading, with `296;44°` and later `296;45°` documented as unused alternatives. Copernican Jupiter and Saturn are not implemented; they belong to Phase 5C. See the [Jupiter](docs/jupiter-almagest.md) and [Saturn](docs/saturn-almagest.md) specifications. The reviewed `codex/phase-5b-ptolemy-outer-planets` branch remains available for reference.

## Run locally

Requires Node.js 22.18+ (for built-in TypeScript test execution) and Python 3.10+. From the repository root:

```sh
npm ci
npm run dev
```

Open `http://127.0.0.1:5173/epicycle/`. One assumed-UT1 clock drives independently configurable geometry and time-series panels. Presets replace the arrangement; adding, moving, or editing a panel does not change the others. Geometry panels select Sun, Mars, Jupiter, or Saturn. The Solar comparison preset shows solar longitudes and Copernicus's Earth/Sun construction; the Jupiter and Saturn preset shows a mixed-body longitude overlay and one Earth-centred geometry panel per outer planet. Plots can mix labelled bodies, or show signed disagreement (B − A) between two models of the **same body** under an appropriate declared frame convention. This is model disagreement, not observational error.

Copernican **Mars** geometry defaults to the source-limited 1473–1523 reconstruction. Comparison plots can explicitly select exploratory Mars continuation; dashed portions show dates outside that reference interval, without an accuracy claim. The solar models have no Mars-apogee guard; their broad-date results are mathematical continuations, not claims of observational accuracy. The original Nabonassar and 1473/1512 jumps remain available. The global clock is independent of panel date policies. Use the header toggle for English or Mongolian.

Scientific limits remain visible in the workspace: ancient local time is represented through an assumed UT1 timeline and Alexandria's 30° E meridian is provisional; the nominal historical tropical-frame alignment does not calibrate either historical equinox to a modern frame; Ptolemy's complete solar-table interpolation is not implemented; Copernicus supplied no complete arbitrary-date Mars-apogee law; and historical numerical validation is partial.

To verify or build:

```sh
PYTHONPATH=src python3 -m unittest discover -s tests -v
npm run test:frontend
npm run typecheck
npm run build
git diff --check
```

`npm run build` produces `dist/` with the `/epicycle/` asset base. `web/` is the only Vite root, `publicDir` is disabled, and only public JSON definitions and fixtures are imported. `private/` is ignored and must not be copied into a build or deployment. The shared numerical fixtures can be regenerated with `PYTHONPATH=src python3 scripts/generate_mars_cross_language.py`, `PYTHONPATH=src python3 scripts/generate_copernicus_cross_language.py`, `PYTHONPATH=src python3 scripts/generate_sun_cross_language.py`, and `PYTHONPATH=src python3 scripts/generate_outer_cross_language.py`. The manually transcribed source cases remain separate from generated fixtures.

## Maintain the GitHub Pages site

Pushing to `main` runs [Deploy Epicycle Atlas to GitHub Pages](.github/workflows/deploy.yml). It runs the Python and frontend tests, builds with Node.js 22.18.0, then uploads and deploys **only `dist/`**. You can also run it manually from the repository's Actions tab. Review the build and deploy jobs after a push; the deploy job reports the published URL. In Settings → Pages, the publishing source must be **GitHub Actions**. `dist/` is generated and ignored by Git; do not commit it or publish the repository root. Check the public page after a successful deployment, including asset loading and controls.

Scientific rule: historical constructions and numbers retain their own provenance and conventions. A modern ephemeris is an explicitly labeled comparison, never a substitute for a historical parameter. Variants are defined per body, not as blanket system-wide revisions.

Start with [status](docs/status.md), then the [Mars specification](docs/mars-almagest.md), [online resources](docs/online-resources.md), [architecture](docs/architecture.md), [sources](docs/sources.md), [legacy audit](docs/legacy-audit.md), [model catalogue](docs/model-catalogue.md), and [roadmap](docs/roadmap.md). Future coding sessions should also read [AGENTS.md](AGENTS.md).

The local `private/` tree contains research PDFs and legacy snapshots. It is ignored recursively and must not be published. The site does not import or copy its contents.
