# Epicycle Atlas

Epicycle Atlas is an English–Mongolian atlas of pre-Keplerian planetary constructions. Its development workspace pairs historical Mars geometry with longitude plots, backed by independent Python research calculations. The project is independent of [SOL](https://github.com/gantemur/sol); SOL's animations remain a read-only legacy reference.

**Status:** The deployed `main` site at [gantemur.github.io/epicycle](https://gantemur.github.io/epicycle/) remains the accepted single-model Ptolemaic prototype. Phase 4B is committed on `codex/phase-4b-displays` for final review; it has not been merged or deployed. The development branch uses the accepted historical evaluators and public source records. See the [Copernican specification](docs/copernicus-earth-mars.md), [comparison conventions](docs/comparison-conventions.md), and [status](docs/status.md).

## Run locally

Requires Node.js 22.18+ (for built-in TypeScript test execution) and Python 3.10+. From the repository root:

```sh
npm ci
npm run dev
```

Open `http://127.0.0.1:5173/epicycle/`. One assumed-UT1 clock drives independently configurable geometry and time-series panels. Presets replace the arrangement; adding, moving, or editing a panel does not change the others. The plot offers longitude overlays or signed model disagreement (B − A), with its own date window, pan/zoom, and explicit nominal historical tropical-frame alignment. This difference is between models, not observational error.

Copernican geometry defaults to the source-limited 1473–1523 reconstruction. Comparison plots can explicitly select exploratory continuation; dashed portions show dates outside that reference interval, without an accuracy claim. The original Nabonassar and 1473/1512 jumps remain available. The global clock is independent of panel date policies. Use the header toggle for English or Mongolian. To verify or build:

```sh
PYTHONPATH=src python3 -m unittest discover -s tests -v
npm run test:frontend
npm run typecheck
npm run build
git diff --check
```

`npm run build` produces `dist/` with the `/epicycle/` asset base. `web/` is the only Vite root, `publicDir` is disabled, and only the public JSON definitions and fixtures are imported. `private/` is ignored and must not be copied into a build or deployment. The shared numerical fixtures can be regenerated with `PYTHONPATH=src python3 scripts/generate_mars_cross_language.py` and `PYTHONPATH=src python3 scripts/generate_copernicus_cross_language.py`.

## Maintain the GitHub Pages site

Pushing to `main` runs [Deploy Epicycle Atlas to GitHub Pages](.github/workflows/deploy.yml). It runs the Python and frontend tests, builds with Node.js 22.18.0, then uploads and deploys **only `dist/`**. You can also run it manually from the repository's Actions tab. Review the build and deploy jobs after a push; the deploy job reports the published URL. In Settings → Pages, the publishing source must be **GitHub Actions**. `dist/` is generated and ignored by Git; do not commit it or publish the repository root. Check the public page after a successful deployment, including asset loading and controls.

Scientific rule: historical constructions and numbers retain their own provenance and conventions. A modern ephemeris is an explicitly labeled comparison, never a substitute for a historical parameter. Variants are defined per body, not as blanket system-wide revisions.

Start with [status](docs/status.md), then the [Mars specification](docs/mars-almagest.md), [online resources](docs/online-resources.md), [architecture](docs/architecture.md), [sources](docs/sources.md), [legacy audit](docs/legacy-audit.md), [model catalogue](docs/model-catalogue.md), and [roadmap](docs/roadmap.md). Future coding sessions should also read [AGENTS.md](AGENTS.md).

The local `private/` tree contains research PDFs and legacy snapshots. It is ignored recursively and must not be published. The prototype does not import or copy its contents.
