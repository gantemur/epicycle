# Online research resources

Verified 2026-10-10. This catalogue covers web-first sources and tools; locally held books are inventoried in [sources.md](sources.md). “Page accessible” means the text or index loaded during this audit. Unless stated otherwise, interactive calculations were **not** executed, and numerical accuracy or current browser compatibility is unverified. Links and descriptions are recorded without importing third-party code or copyrighted material.

## Ptolemaic numerical and geometric implementations

### Robert H. van Gent — [Almagest Ephemeris Calculator](https://webspace.science.uu.nl/~gent0113/astro/almagestephemeris_main.htm)

**Type and coverage:** scholarly **calculation engine** for Ptolemy's Sun, Moon, five planets, precession, calendar conversions, aspects, and related quantities. Its documentation says the mean motions reproduce the Almagest tables while geometric equations can differ from Ptolemy's compressed correction tables by a few arcminutes. It identifies its epoch as 1 Thoth 1 Nabonassar at Alexandria, distinguishes mean/apparent solar time, and discloses its own Alexandria-to-UT longitude and equation-of-time offsets. **Lineage:** SOL's index explicitly credits van Gent as a partial basis; agreement is a descendant check, not independent validation. **Access:** main text and form load; numerical form submission was not exercised here. The layout requests a 1000-pixel screen. **Reuse:** no explicit code licence found on the page; link and cite, do not import code. **Phase:** Phase 1 diagnostic and later date/frame comparison.

### Dennis W. Duke — [Ancient Planetary Model Animations](https://people.sc.fsu.edu/~dduke/models) and [technical notes](https://people.sc.fsu.edu/~dduke/technotes.htm)

**Type and coverage:** visualization and published ActionScript construction for Sun, Moon, five planets, Arabic equant replacements, Copernican transformations, and comparative models. The technical notes expose a Mars equant/epicycle animation with `R=60`, `e=6`, `r=39.5` and six-decimal rates, useful for understanding geometry and legacy visual conventions. **Lineage:** SOL's index credits Duke; its older self-contained `mars.html` shares the technical notes' six-decimal Mars rates and geometric vocabulary. This supports adaptation or inspiration, not a claim of verbatim copying. **Access:** HTML notes work, but the original browser animations require Flash and were not executed; downloadable legacy standalone applications were not tried. **Reuse:** Duke's page permits free **non-commercial** use of the animations; scope for source-code redistribution is not stated separately. **Phase:** Phase 1 lineage, later animation research.

### Pierre Paquette — [L'Almageste de Ptolémée](https://ecliptiqc.ca/Almageste.php) and [Book XIII](https://ecliptiqc.ca/Almageste_Livre13.php)

**Type and coverage:** modern French translation/commentary of the 13-book *Almagest*; Book XIII treats planetary latitude. It is a secondary translation/interpretation, not a new ancient manuscript witness. **Relation:** useful against P1 for reading difficult passages, and for later latitude; no implementation dependency established. **Access:** both pages load; embedded calculations or PDF download were not exercised. **Reuse:** no permission to republish text established; link and cite. **Phase:** Phase 1 reading check; Phase 3 latitude.

## Copernican and comparative implementations

### Pierre Paquette — [Les Révolutions de Copernic](https://ecliptiqc.ca/Copernic.php)

**Type and coverage:** French commentary/online treatment of *De revolutionibus*, including planetary theory. **Relation:** secondary aid to local C1–C4, not evidence for Ptolemy's Mars parameters. **Access:** index loads; detailed modules were not generally tested. **Reuse:** no reuse permission identified. **Phase:** later Copernican models.

### Pierre Paquette — [Book V calculations](https://ecliptiqc.ca/Copernic_5.php)

**Type and coverage:** linked detailed Copernican planetary calculations. **Relation:** continuation of Paquette's project. **Access:** an anti-bot “One moment, please” challenge appeared in this audit, so content and interactivity remain unverified. **Reuse:** unknown. **Phase:** later Copernican verification.

### Pierre Paquette — [Evolution of planetary theories](https://ecliptiqc.ca/evolution.php)

**Type and coverage:** linked interactive comparison of historical theories; model scope to verify when accessible. **Relation:** Paquette's comparative project, not an independent source for ancient numbers. **Access:** anti-bot challenge prevented inspection and interaction. **Reuse:** unknown. **Phase:** later comparative visualization.

## Historical tables and online editions

### DISHAS / ALFA — [DISHAS](https://dishas.obspm.fr/) and [research tools](https://dishas.obspm.fr/resources)

**Type and coverage:** Observatoire de Paris database for historical astral tables and parameters, with table analysis tools. The resources page links the [DISHAS Interactive Parameter Squeezer](https://dips.obspm.fr/), [Kanon](https://github.com/ALFA-project-erc/kanon), documentation, table transcriber, and DTI. These support analysis of later medieval/Alfonsine tables; they are not a replacement for citing the original table witness. **Access:** index and resource list load; DIPS and DTI numerical workflows were not exercised. **Reuse:** DISHAS footer states CC BY 4.0 for the site; check each dataset separately before reuse. Kanon's repository states BSD-3-Clause. **Phase:** medieval/Alfonsine table work and historical interpolation tooling.

### Ptolemaeus Arabus et Latinus — [Planetary Hypotheses work record](https://ptolemaeus.badw.de/work/141) and [online Greek text](https://ptolemaeus.badw.de/edition/6/141/text/1)

**Type and coverage:** scholarly bibliographic record and **primary digital edition** of the extant Greek *Planetary Hypotheses*. The work record explains that only the first part of Book I survives in Greek and the complete work in Arabic; do not equate the Greek edition with a complete text. This concerns a distinct later Ptolemaic work, not the Phase 1 *Almagest* Mars longitude source. **Access:** metadata and Greek text pages load; search and download were not exercised. **Reuse:** [PAL licences](https://ptolemaeus.badw.de/licenses) state CC BY for catalogue and text repository; print publications have CC BY-NC-ND and website code Apache 2.0. Check edition attribution before reuse. **Phase:** later *Planetary Hypotheses* variants and physical ordering.

## Modern reference and inherited projects

### NASA JPL — [Horizons](https://ssd.jpl.nasa.gov/horizons/) and [API documentation](https://ssd-api.jpl.nasa.gov/doc/horizons.html)

**Type and coverage:** modern numerical ephemeris/reference service for Solar System bodies, with observer/vector/elements output and selectable time/frame conventions. **Relation:** future comparison baseline, never a historical parameter authority. **Access:** documentation loads; no API computation was requested or performed. Runtime network availability and ancient-epoch coverage must be checked before use. **Reuse:** service/data terms need review before distributing derived datasets. **Phase:** later modern-reference work.

### Gantemur — [SOL original planetary tool](https://github.com/gantemur/sol/tree/main/tools/planets-en)

**Type and coverage:** source-code repository and Canvas visualization for Ptolemaic Sun, Moon, five planets; local `private/legacy/sol-planets-en/` snapshot audited. Its index credits van Gent and Duke. `almagest.js` is a form calculator, while the shared Canvas pages use `palmagest.js` and body drawing modules; these paths must not be conflated. **Access:** local snapshot is available; the GitHub subdirectory URL did not load reliably in this audit, so current upstream revision and live interactivity were not verified. **Reuse:** repository licence not established from the audited material; no code copied. **Phase:** Phase 1 lineage and diagnostic comparison, later UI inspiration.

### Gantemur — [CALTIB](https://github.com/gantemur/caltib)

**Type and coverage:** Python calendar research repository with chronology, reference ephemeris, and diagnostics infrastructure; not an Almagest model. **Relation:** local `private/legacy/caltib/` snapshot was audited in Phase 0; useful architectural patterns but no inherited Phase 1 numerical constants. **Access:** upstream repository index and local snapshot accessible; no package workflow run. **Reuse:** confirm repository and data-specific licence before porting; no code copied. **Phase:** later chronology and modern-reference design.

## Related links found on the named sites

- [Lars Gislén's Astromodels](https://www.thep.lu.se/~larsg/astromodels.zip) — linked from van Gent's bibliography as Excel applications for ephemerides from ancient tables, including the *Almagest*. The ZIP target did not load in this audit; no file was downloaded or executed, and licence is unknown. Potential later independent table-procedure comparison if accessible.
- [Glen Van Brummelen's Almagest animations](https://faculty.bennington.edu/~gvanbrum/) — linked by Duke, described there as Geometer's Sketchpad geometric visualizations. Target did not load in this audit, so present availability and reuse terms are unknown. Potential later visualization source.
- [Craig Sean McConnell's ancient planetary visualizations](https://faculty.fullerton.edu/cmcconnell/Planets.html) — linked by Duke, reportedly spans Eudoxus to Copernicus. Target did not load; scope and rights remain unverified. Potential later comparison source.
- [Giampiero Barbieri's planetary animations](https://www.ac-ilsestante.it/ASTRONOMIA/i_grandi_astronomi/i_grandi_astronomi.html) — linked by Duke for Ptolemy/Copernicus/Kepler/Newton. Target did not load; rights and software status unknown. Later comparative design only.
- [Kanon documentation](https://kanon.readthedocs.io/en/latest/) — linked from DISHAS; online documentation for historical positional numerals, tables, and calendars. Page loads. BSD-3-Clause applies to the linked code repository; this is a later table-transcription tool, not a Phase 1 dependency.

## Dependency rule for comparisons

`Almagest (P1) → van Gent calculator → partly SOL calculator/Canvas tool` and `Almagest (P1) → Duke visualization → partly SOL animation design` are evidence-backed **influence paths**, with SOL's own acknowledgement and overlapping published conventions. Exact source-code ancestry for each formula is not established. P2 and P8 are scholarly reconstructions/interpretations of Ptolemy, not independent observations. Agreement among these descendants can diagnose a transcription or implementation difference; historical validity rests on the original source and independently derived geometry. See [legacy-audit.md](legacy-audit.md) for local file-level findings.
