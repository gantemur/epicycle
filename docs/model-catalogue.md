# Model catalogue by body

This is a research queue, not a claim that complete parameters exist. Each cell represents a potential **body-specific** variant. Every entry begins as `unverified`; move it forward only with source-specific parameter records and numerical tests. A work's title alone never certifies a planetary model.

| Body | Candidate variants and order of investigation | Current evidence |
| --- | --- | --- |
| Sun | *Almagest* solar eccentric; Alfonsine-inspired rotating-apsis solar variant; Copernican Earth/Sun apparent relation | Copernican 1543 Earth/Sun geometry is implemented in Python and partially validated; see the Phase 3B entry below. Other solar variants remain research candidates. |
| Moon | *Almagest* lunar double anomaly and latitude; *Handy Tables* revision if evidenced; Copernican lunar model | SOL has a longitude/phase animation, while its calculator also has lunar latitude. No new transcription yet. |
| Mercury | *Almagest* moving-deferent construction; *Handy Tables* / *Planetary Hypotheses* only where Mercury-specific changes are established; Parisian Alfonsine; *Commentariolus*; *De revolutionibus* | Complex geometry; defer until Mars longitude is validated. |
| Venus | *Almagest* longitude and later latitude; other Ptolemaic versions only if Venus-specific evidence exists; Parisian Alfonsine; both Copernican works | Latitude interpretation needs P15 and P5. |
| Mars | *Almagest* longitude first, then latitude; a documented later Ptolemaic/Alfonsine variant if evidence supports it; *Commentariolus*; *De revolutionibus* | **Source-checked and implemented; partially numerically validated.** P1 IX–XI constants and geometry are in [mars-almagest.md](mars-almagest.md), with source-derived opposition checks and a distinct P2 tabular comparison. Full XI.11 table interpolation is pending. Copernican 1543 Earth–Mars is also implemented in Python, with an explicitly incomplete secular apsidal theory; see below. SOL remains a non-independent diagnostic. |
| Jupiter | *Almagest* longitude and latitude; later Ptolemaic/Parisian variants if evidenced; Copernican works | SOL has longitude animation and calculator latitude. |
| Saturn | *Almagest* longitude and latitude; later Ptolemaic/Parisian variants if evidenced; Copernican works | SOL has longitude animation and calculator latitude. |

Tychonic and relevant Islamic constructions are future catalogue extensions, entered per body and source. “Handy Tables,” “Planetary Hypotheses,” and “Alfonsine” must not become one global toggle applied to every body. Mark unavailable parameters and observables explicitly.


## Copernican 1543 Earth and Mars

`copernicus-1543-earth-longitude` and `copernicus-1543-mars-longitude` are **source-checked, implemented, partially numerically validated** planar geometric models. The Mars record depends on the specific Earth record. Returned geocentric sidereal/tropical longitude is supported; latitude, other planets, original correction-table interpolation and modern physical calibration are not.

The four Mars lengths describe the modern-observation construction, not a complete arbitrary-date model. Its mean-Sun apogee law and secular eccentricity evolution are unavailable in the source. A bounded Swerdlow–Neugebauer uniform estimate is optional and visibly labeled; caller-supplied apsides require provenance. Earlier ancient-observation eccentricity, manuscript readings and Prutenic rates remain separate unused alternatives. See [Copernicus Earth–Mars](copernicus-earth-mars.md) for the evidence and review limitations.
