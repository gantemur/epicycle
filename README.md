# Epicycle Atlas

Epicycle Atlas is an English–Mongolian atlas of pre-Keplerian planetary constructions. The local first prototype pairs a mobile-friendly Mars diagram with independent Python research calculations. The project is independent of [SOL](https://github.com/gantemur/sol); SOL's existing animations remain a read-only legacy reference.

**Status:** The deployed `main` site at [gantemur.github.io/epicycle](https://gantemur.github.io/epicycle/) remains the accepted single-model Ptolemaic prototype. The uncommitted `codex/phase-3c-comparison` branch adds review-pending single-model selection and Ptolemy–Copernicus browser comparison. It uses the accepted Phase 3B Python geometry and public source records; it has not been merged or deployed. See the [Copernican specification](docs/copernicus-earth-mars.md), [comparison conventions](docs/comparison-conventions.md), and [status](docs/status.md).

## Run locally

Requires Node.js 22.18+ (for built-in TypeScript test execution) and Python 3.10+. From the repository root:

```sh
npm ci
npm run dev
```

Open `http://127.0.0.1:5173/epicycle/`. Single mode starts with the accepted Ptolemaic Nabonassar view and can also show the Copernican Earth–Mars construction. Compare mode starts with Ptolemy as Model A and Copernicus as Model B; either selector can choose either implemented model. Both use one assumed UT1 instant and a provisional Alexandria meridian. The Copernican apogee defaults to the guarded 1473–1523 scholarly reconstruction; other dates require explicit exploratory extrapolation, which continues the historical rate and fixed 1543 geometry without an accuracy claim. Today converts a Gregorian/UTC instant to the displayed Julian historical convention. The fixed plot window accepts presets, custom dates, pan/zoom and wrapped or continuous longitudes. The model difference requires a visibly declared nominal historical tropical-frame alignment; it is Model B minus Model A, not an observational error. Use the header toggle for English or Mongolian. To verify or build:

```sh
PYTHONPATH=src python3 -m unittest discover -s tests -v
npm run test:frontend
npm run build
```

`npm run build` produces `dist/` with the `/epicycle/` asset base. `web/` is the only Vite root, `publicDir` is disabled, and only the public JSON definitions and fixtures are imported. `private/` is ignored and must not be copied into a build or deployment. The shared numerical fixtures can be regenerated with `PYTHONPATH=src python3 scripts/generate_mars_cross_language.py` and `PYTHONPATH=src python3 scripts/generate_copernicus_cross_language.py`.

## Maintain the GitHub Pages site

Pushing to `main` runs [Deploy Epicycle Atlas to GitHub Pages](.github/workflows/deploy.yml). It runs the Python and frontend tests, builds with Node.js 22.18.0, then uploads and deploys **only `dist/`**. You can also run it manually from the repository's Actions tab. Review the build and deploy jobs after a push; the deploy job reports the published URL. In Settings → Pages, the publishing source must be **GitHub Actions**. `dist/` is generated and ignored by Git; do not commit it or publish the repository root. Check the public page after a successful deployment, including asset loading and controls.

Scientific rule: historical constructions and numbers retain their own provenance and conventions. A modern ephemeris is an explicitly labeled comparison, never a substitute for a historical parameter. Variants are defined per body, not as blanket system-wide revisions.

Start with [status](docs/status.md), then the [Mars specification](docs/mars-almagest.md), [online resources](docs/online-resources.md), [architecture](docs/architecture.md), [sources](docs/sources.md), [legacy audit](docs/legacy-audit.md), [model catalogue](docs/model-catalogue.md), and [roadmap](docs/roadmap.md). Future coding sessions should also read [AGENTS.md](AGENTS.md).

The local `private/` tree contains research PDFs and legacy snapshots. It is ignored recursively and must not be published. The prototype does not import or copy its contents.
