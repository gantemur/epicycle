# Epicycle Atlas

Epicycle Atlas is an English–Mongolian atlas of pre-Keplerian planetary constructions. The local first prototype pairs a mobile-friendly Mars diagram with independent Python research calculations. The project is independent of [SOL](https://github.com/gantemur/sol); SOL's existing animations remain a read-only legacy reference.

**Status:** Phase 3B adds a Python implementation of Copernicus's 1543 Earth–Mars longitude geometry, with source records, partial validation, an explicit limited apsis reconstruction and a conditional comparison diagnostic. The browser remains the accepted Phase 2 Ptolemaic prototype. See the [Copernican specification and evaluation commands](docs/copernicus-earth-mars.md) and [status](docs/status.md). The GitHub Pages target is [gantemur.github.io/epicycle](https://gantemur.github.io/epicycle/).

## Run locally

Requires Node.js 22.18+ (for built-in TypeScript test execution) and Python 3.10+. From the repository root:

```sh
npm ci
npm run dev
```

Open `http://127.0.0.1:5173/epicycle/`. The app starts at Nabonassar 450 X 8. Use the header toggle for English or Mongolian. To verify or build:

```sh
PYTHONPATH=src python3 -m unittest discover -s tests -v
npm run test:frontend
npm run build
```

`npm run build` produces `dist/` with the `/epicycle/` asset base. `web/` is the only Vite root, `publicDir` is disabled, and only the public JSON definitions and fixtures are imported. `private/` is ignored and must not be copied into a build or deployment. The shared numerical fixture can be regenerated with `PYTHONPATH=src python3 scripts/generate_mars_cross_language.py`.

## Maintain the GitHub Pages site

Pushing to `main` runs [Deploy Epicycle Atlas to GitHub Pages](.github/workflows/deploy.yml). It runs the Python and frontend tests, builds with Node.js 22.18.0, then uploads and deploys **only `dist/`**. You can also run it manually from the repository's Actions tab. Review the build and deploy jobs after a push; the deploy job reports the published URL. In Settings → Pages, the publishing source must be **GitHub Actions**. `dist/` is generated and ignored by Git; do not commit it or publish the repository root. Check the public page after a successful deployment, including asset loading and controls.

Scientific rule: historical constructions and numbers retain their own provenance and conventions. A modern ephemeris is an explicitly labeled comparison, never a substitute for a historical parameter. Variants are defined per body, not as blanket system-wide revisions.

Start with [status](docs/status.md), then the [Mars specification](docs/mars-almagest.md), [online resources](docs/online-resources.md), [architecture](docs/architecture.md), [sources](docs/sources.md), [legacy audit](docs/legacy-audit.md), [model catalogue](docs/model-catalogue.md), and [roadmap](docs/roadmap.md). Future coding sessions should also read [AGENTS.md](AGENTS.md).

The local `private/` tree contains research PDFs and legacy snapshots. It is ignored recursively and must not be published. The prototype does not import or copy its contents.
