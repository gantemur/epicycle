# Standing project instructions

- Read `docs/status.md` and the relevant architecture, source, catalogue, and audit documents before implementing a model.
- Keep `private/` read-only and fully ignored. Never stage PDFs, licensed text or images, ephemeris kernels, or legacy snapshots. Check tracked paths before any eventual commit. The repository has a GitHub remote and the accepted Phase 5A scientific workspace is publicly deployed from `main` at https://gantemur.github.io/epicycle/.
- Do not commit, push, create a remote, or deploy without the director's explicit approval. Stop after the assigned phase.
- Preserve original historical numerical notation, units, epoch, frame, body, version, exact source locator, and evidence status. Distinguish explicit values, derivations, scholarly reconstructions, and modern fits. Mark unresolved readings openly.
- Validate equations and parameters against primary passages, historical tables, and independent numerical fixtures. An animation is never proof of correctness. Do not promote SOL or CALTIB outputs to historical authority.
- Define chronology and coordinates explicitly: calendar, astronomical/BCE year convention, day boundary, TT/UT1/UTC, ecliptic/equinox, and geometric versus apparent position. Never use Python `datetime` for BCE dates.
- Keep historical evaluation independent of rendering and of modern reference ephemerides. Share versioned parameter definitions and fixtures between Python and browser code; use Python research calculations as the numerical validation path.
- Treat variants as body-specific. Display at most two historical models at once. Distinguish original geometry, coordinate re-centring, and any distance-dependent reconstruction.
- Design every interface string, unit, graph label, tooltip, and error for English and Mongolian translation. Test phone widths around 360–390 CSS pixels.
- Keep dependencies modest. Document any downloaded reference dataset with version, source, checksum, coverage, and validation range. Preserve reproducible commands and configurations for eventual paper figures.

## Mandatory scientific-code readability

- Write Python and TypeScript scientific algorithms as explicitly structured, human-reviewable steps. Name mathematical and physical quantities clearly; prefer straightforward expressions over clever compression.
- Explain nontrivial formulas, sign conventions, units, frames, epochs, and historical assumptions in comments or docstrings. Comments should explain reasoning, not restate trivial code. Put exact source locators in mathematical specifications and near implementation where useful.
- Separate numerical evaluation, versioned historical data, rendering, interaction state, and plotting. Do not let presentation details choose scientific parameters or policies.
- Keep numerical tests and generated fixtures human-reviewable and document their provenance. Preserve simple reference formulations for verification.
- Prioritize readability and verifiability over marginal speed. Optimize only for a measured performance need while retaining a simple, testable reference calculation.
- Do not maintain compressed, minified, or code-golfed source, including CSS. Production bundles may be minified.
