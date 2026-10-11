# Almagest Mars longitude: Phase 1 specification and checks

This is a planar, geocentric reconstruction of the longitude construction in Ptolemy's *Almagest*, not a modern orbit or an implementation of the printed interpolation tables. The authoritative input is continuous Egyptian days since the historical epoch. `data/mars-almagest-v1.json` is the machine-readable parameter record; each entry retains its sexagesimal notation, status, and source locator. P1 means Toomer's translation; P2 means Neugebauer's *History of Ancient Mathematical Astronomy* (HAMA); P8 means Pedersen's *Survey of the Almagest*. Page numbers below are printed pages.

## Source and parameter decisions

| Quantity | Historical notation | Value used | Authority and status |
| --- | ---: | ---: | --- |
| Deferent radius | 60 | 60 | Explicit, P1 X.7 pp.494–495; X.8 p.501. |
| Earth-to-equant distance | 12 | 12 | Explicit final double eccentricity, P1 X.7 p.494. |
| Earth-to-deferent-centre and centre-to-equant | 6 each | 6 | Derived from equal division in P1 IX.6 pp.443–444 and the final 12. |
| Epicycle radius | 39;30 | 39.5 | Explicit, P1 X.8 p.501. |
| Mean longitude at epoch | Aries 3;32 | 3.533333…° | Explicit, P1 X.10 p.505; IX.4 Mars table p.433. |
| Mean epicycle anomaly at epoch | 327;13 | 327.216666…° | Explicit, P1 X.10 p.505; IX.4 p.433. |
| Mars apogee at epoch | Cancer 16;40 | 106.666666…° | Explicit, P1 X.10 p.505; IX.4 p.433. |
| Daily mean longitude | 0;31,26,36,53,51,33 | 0.524059711355…°/day | Explicit, P1 IX.3 p.426; IX.4 pp.433–434. |
| Daily mean anomaly | 0;27,41,40,19,20,58 | 0.461575567087…°/day | Explicit, P1 IX.3 p.425; IX.4 pp.433–434. |
| Apsidal shift | 1° per 100 years | 1/36500°/day | Explicit rate in P1 IX.5–6 pp.443–444. Daily conversion uses the 365-day Egyptian year. |

Ptolemy's final eccentricity is the end of an iterative derivation, not his first trial value. Toomer flags small computational inconsistencies in X.7 p.494 notes and the derivation of mean motions in IX.3 p.425 and Appendix C. X.10 p.505 note finds the epoch back-calculation one minute off in each mean argument and identifies a possible dawn-time ambiguity. We retain the values *printed as the final parameters*, with these qualifications; no correction has been silently substituted. P2 pp.186–188 reconstructs a Mars ephemeris from Ptolemy's tables. P8 ch.9 pp.261–263 independently explains the superior-planet periods and the tropical longitude convention, but does not supply a second observational parameter set.

## Geometry and angles

Set Earth `O=(0,0)`, the `x` axis at the vernal equinox, and `y` 90° east along the ecliptic. Angles increase eastward and are reduced modulo 360°. Let `u(φ)=(cos φ,sin φ)`, apsidal longitude `A`, deferent radius `R=60`, half-eccentricity `e=6`, and epicycle radius `r=39.5`. Then deferent centre `D=e u(A)` and equant `Q=2e u(A)`. The epicycle centre `C` lies on the deferent circle `|C−D|=R` and its equant ray has mean longitude `L`. With `κ=L−A`, the positive ray length is

```text
s = -e cos κ + sqrt(R² − e² sin² κ)
C = Q + s u(L)
P = C + r u(L + α)
λ = atan2(P_y, P_x) mod 360°
```

`α` is the mean anomaly from the epicycle apogee, measured from the diameter parallel to the equant ray. Its positive rotation is the order of signs; this follows P1 IX.6 p.444 and X.7 p.498. The angle `L` is the mean position of the epicycle centre as seen from the equant, **not** the longitude of `C` as seen from Earth. The latter is `L+η`, where `η` is the equation of centre. P1 IX.6 pp.443–444 supplies the construction, X.7–8 the Mars dimensions, and XI.12 pp.554–555 the longitude operation.

An independently coded trigonometric route provides a cross-check. Set `b=s+2e cos κ`, `h=−2e sin κ`, `η=atan2(h,b)`, `d=hypot(b,h)`, and `β=α−η`. Then

```text
λ = L + η + atan2(r sin β, d + r cos β)    (mod 360°).
```

The evaluator returns `O`, `D`, `Q`, `C`, `P`, radii, angular arguments and corrections, and geometric distances in deferent-radius units. It does not apply latitude, parallax, aberration, refraction, or a modern apparent-place correction. These unitless distances are not physical Earth distances.

## Epoch, chronology, and frame

For continuous `t` in **mean local Egyptian days after Alexandria noon, 1 Thoth, Nabonassar year 1**, use `L(t)=L₀+n_L t`, `α(t)=α₀+n_α t`, and `A(t)=A₀+t/36500°`. The day count may be negative for algebraic exploration, although named Nabonassar dates start at year 1. The ancient wandering Egyptian year has twelve 30-day months plus five epagomenal days and no leap day. P1 X.10 p.505 states the epoch; P1 IX.5–6 pp.443–444 gives the moving apogee; P2 p.186 uses the same year/month/day arithmetic.

The usual scholarly civil correlation is **astronomical Julian −746-02-26**, i.e. 26 February 747 BCE, at Alexandria mean local noon (P2 HAMA VI.A.2 p.1066 era table; [van Gent's date note](https://webspace.science.uu.nl/~gent0113/astro/almagestephemeris_main.htm)). Its formal local-noon JDN is 1448638. This is a calendar label, not a UT or TT timestamp. `chronology.py` converts integer JDNs and proleptic Julian/Gregorian calendar dates using astronomical year numbering (year 0 = 1 BCE), and exposes civil dates with a midnight-based day fraction; the Egyptian fraction remains noon-based. At `t=0.5`, the civil label is −746-02-27 00:00 local time. It does not apply a geographic longitude offset, equation of time, ΔT, or ancient civil leap-year irregularities. The 450 X 8 day count is 164162 and corresponds to Julian astronomical −297-08-10, matching P2 Table 15 p.188.

Longitudes are tropical: measured from Ptolemy's equinoctial origin, with the apogee advancing 1° per century relative to it. P1 IX.5 pp.442–443 explicitly contrasts that with its near-fixed position among stars; P8 ch.9 pp.262–263 corroborates the tropical period convention. The absolute historical equinox is not transformed into a modern ecliptic of date in this phase. `t` must not be passed directly to JPL Horizons without an explicit time-scale and frame conversion.

## Validation and discrepancies

Machine-readable source cases are in `tests/fixtures/mars-source-cases.json`. Tests use the original rounded values, with one arcminute tolerance for source angles and one sixtieth of a deferent unit for a rounded chord-derived length. Those tolerances reflect the printed precision and intermediate rounding, not fit parameters.

| Case | Original result | Geometric result | Difference | Interpretation |
| --- | ---: | ---: | ---: | --- |
| P1 X.7 pp.495–496, first opposition centre, mean centrum −41;33 | −34;30° from apogee | −34;29.996° | +0.004′ | Agreement at printed minute precision. |
| P1 X.7 pp.496–497, second opposition centre, mean centrum 40;11 | 33;20° | 33;20.026° | +0.026′ | Agreement at printed minute precision. |
| P1 X.7 pp.497–498, third opposition centre, mean centrum 135;39 | 52;56° before perigee | 52;56.117° | +0.117′ | Agreement at printed minute precision. |
| P1 X.8 pp.500–501, centre distance, mean centrum 137;11 | 56;4 units | 56;3.393 units | −0;0.607 units | Chord and intermediate-length rounding. |
| P2 HAMA pp.186–188 Table 15, Nab. 450 X 8, `L=354;13,25`, `α=140;23,5`, `A=111;10` | **Table** 47;33° | **Geometry** 47;39.626° | +6.626′ | Distinct numerical procedures. P2 applies Ptolemy's XI.11 corrections, including interpolated distance correction; the Cartesian model evaluates the circles directly. |

P2's Table 15 is Neugebauer's scholarly reconstruction from Almagest IX.4 and XI.11, **not a directly printed Ptolemy example nor independent observation**. Its mean arguments agree with the continuous-motion calculation to under 0.02′ at the stated date; the apogee differs by about 0.14′ because P2 rounds precession to `4;30` for 450 years. His tabular longitude differs from exact geometry by several arcminutes; forcing that equality would erase a real distinction. P1 XI.11 p.551 prints Mars' correction table and XI.12 pp.554–555 explains its interpolation. We have documented and compared that procedure but have not transcribed and implemented the full historical table, so numerical validation is **partial**.

The difference has a concrete component account. For P2 Table 15 row 1, the XI.11–12 reconstructed centre correction is `10;37°`, versus `10;37.297°` from exact geometry: `+0.297′`. Its corrected epicycle equation is `42;43°`, versus `42;48.913°`: `+5.913′`. The table components and mean longitude sum to `47;33,25°`, which P2 prints as `47;33°`; that final `25″` is another `0.417′`. The total is `6.626′`. The table's `c₆=41;8°`, `c₇=5;24°`, `c₈=0;17,36` and rounded `c₇c₈=1;35°` are visible in P2 p.188; the column use follows P1 XI.11 p.551 and XI.12 pp.554–555. This accounts for this row without claiming the complete historical interpolation algorithm has been implemented.

Across 180 varied argument configurations, the separate Cartesian and trigonometric routes agree below `1e-10` degree in binary floating-point arithmetic; circle radii and centre offsets satisfy their invariants. BCE/CE, epoch, Egyptian boundary, and JDN cases pass. This establishes implementation consistency, not observational accuracy. Output is normally stable to much better than a minute for moderate historical `t`; the printed source parameters and table approximations dominate historical uncertainty. Very large `|t|` eventually loses floating-point angular precision.

Secondary legacy diagnostics are in [legacy-audit.md](legacy-audit.md). The shared SOL page has the same sexagesimal constants and formula family, so agreement is expected and is **not independent validation**. SOL's apsidal rate uses 36525 days per degree-century; at Nab. 450 X 8 its apogee is about 0.00308° behind this implementation and its longitude about 0.000059° behind. The older self-contained SOL Mars page uses Duke-like six-decimal rates and arbitrary phase, so a date-aligned historical comparison is unavailable without defining that page's `t=0` mapping. van Gent's interactive numerical module was not exercised in Phase 1; its published date, time, table, and frame conventions are catalogue entries, not an additional passing check.

## Reproduce

From the repository root, with Python 3.9 or later and no third-party packages:

```sh
PYTHONPATH=src python3 -m unittest discover -s tests -v
PYTHONPATH=src python3 -c 'from epicycle_atlas import evaluate_mars; print(evaluate_mars(0))'
```

Open questions: reproduce more complete XI.11–12 table cases directly from the printed Almagest; analyse Toomer's epoch and mean-motion textual notes against manuscript variants; fix a precise comparison protocol for van Gent (especially its Alexandria-to-UT and equation-of-time options); quantify long-span source roundoff separately from floating-point precision. No source-derived adjustment has been made to force table agreement.
