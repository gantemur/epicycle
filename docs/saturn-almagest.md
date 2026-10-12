# Ptolemy's *Almagest* Saturn longitude

P1 denotes G. J. Toomer's translation of the *Almagest*; P2 denotes O. Neugebauer's *A History of Ancient Mathematical Astronomy* (HAMA). Page numbers are printed pages. The source record is [`data/saturn-almagest-v1.json`](../data/saturn-almagest-v1.json). This is the original planar longitude construction, without Saturn's latitude, complete historical interpolation tables, a modern orbit, or a physical distance scale.

## Original parameters and conventions

| Quantity | Original reading | Normalized value | Locator |
| --- | ---: | ---: | --- |
| Deferent radius `R` | `60` | 60 units | P1 XI.6 pp.539–540; XI.10 p.546 |
| Half-eccentricity `e` | `3;25` | 3.416666… units | P1 XI.5 pp.526–537; XI.6 p.540 |
| Earth–equant distance `2e` | `6;50` | 6.833333… units | Equal division in P1 IX.6 pp.443–444; XI.6 p.540 |
| Epicycle radius `r` | `6;30` | 6.5 units | P1 XI.6 p.540; XI.10 p.546 |
| Greatest/least Earth–epicycle-centre distance | `63;25` / `56;35` | `R ± e` | P1 XI.10 p.546; P2 p.185 |
| Mean longitude at epoch `L₀` | `296;43°` | 296.716666…° | P1 IX.4 p.427; XI.8 p.544 note |
| Mean epicyclic anomaly at epoch `α₀` | `34;02°` | 34.033333…° | P1 IX.4 p.427; XI.8 p.544 |
| Apogee at epoch `A₀` | Scorpio `14;10°` | 224.166666…° | P1 IX.4 p.427; XI.8 p.544 |
| Daily mean longitude `nL` | `0;2,0,33,31,28,51°` | 0.033488540188…°/day | P1 IX.3 p.426; IX.4 p.429 |
| Daily mean anomaly `nα` | `0;57,7,43,41,43,40°` | 0.952146738254…°/day | P1 IX.3 p.424; IX.4 p.429 |
| Apogee motion | `1° per 100 Egyptian years` | `1/36500°`/day | P1 IX.5–6 pp.443–445 |

The selected epoch longitude is deliberately **296;43°**. P1 IX.4 p.427 prints it in the table and P1 XI.8 p.544 note says the manuscript tradition supports it. Ptolemy's stated back-computation instead yields `296;44°`; a more accurate calculation gives `296;45°`, used in the later *Handy Tables* (P2 p.182 n.15). Those are recorded as unused alternatives, not averaged or silently substituted. The exact circle's selected epoch longitude is `294.229375°`; substituting `296;44` or `296;45` for the mean longitude alone would shift it by `+0.967′` or `+1.934′`. The equant direction changes while the printed anomaly and apogee remain fixed. This matters for later variant comparisons.

## Solar coupling, epoch and frame

At Nabonassar 1 Thoth 1, Alexandria mean local noon, `L₀ + α₀ = 296;43 + 34;02 = 330;45°`, the **mean** Ptolemaic Sun's longitude. The printed six-place motions satisfy `nL + nα = 0;59,8,17,13,12,31°/Egyptian day`, the same solar rate in the [solar record](../data/sun-almagest-v1.json). P1 IX.3 pp.424–426 gives this outer-planet coupling explicitly. The identity does not use the eccentric-corrected true Sun.

Use the shared formal Nabonassar epoch, local-noon JDN 1448638, correlated with astronomical proleptic Julian `−746-02-26` (P1 XI.8 pp.543–544; P2 pp.182, 1066). For local mean Egyptian days `t`, `L=L₀+nL t`, `α=α₀+nα t`, and `A=A₀+t/36500°`. Egyptian years have exactly 365 days. Local mean time is not modern TT. P1 IX.5–6 pp.443–445 says the planets' apsidal lines are approximately fixed among stars while their **tropical** longitudes advance `1°` in 100 such years. The Ptolemaic equinox has no modern calibrated alignment.

## Original geometry and phase

Take Earth `O=(0,0)`, x toward the tropical vernal equinox, and eastward-positive y. Write `u(φ)=(cos φ,sin φ)`. With apogee `A`, deferent centre `D=e u(A)` and equant `Q=2e u(A)`. `L` is the mean direction from **Q** to epicycle centre `C`. For `κ=L−A`, the outward equant-ray intersection is

```text
q = sqrt(R² − e² sin²κ) − e cosκ
C = Q + q u(L)
P = C + r u(L + α)
λ = atan2(P_y, P_x) mod 360°.
```

P1 IX.6 pp.443–444 specifies the epicycle diameter rotating with equant mean longitude and anomaly measured from its apogee; P1 XI.9 pp.544–545 gives the exact geometric solution. P2 p.183 confirms the anomaly's **mean epicycle apogee** reference. The same source-supported construction applies to Mars and Jupiter with their own radii and epoch data. The independent scalar route computes `b=q+2e cosκ`, `h=−2e sinκ`, `η=atan2(h,b)`, `d=hypot(b,h)`, `β=α−η`, then `λ=L+η+atan2(r sinβ,d+r cosβ)` modulo 360°. Both corrections retain signs and use all quadrants. The printed XI.11–12 table procedure is an approximation to the exact geometry, not a different set of model parameters.

## Source diagnostics and limits

The literal cases in [`saturn-source-cases.json`](../tests/fixtures/saturn-source-cases.json) include IX.4 epoch and mean-motion entries, a XI.7 ancient-observation derivation, and selected XI.11 p.549 correction rows. P1 XI.7 pp.541–543 gives apogee Scorpio `19;20`, mean centrum `283;33`, and epicyclic anomaly `183;17` for the old observation at approximately Virgo `9;30`. Toomer's p.543 note gets `183;16` from more accurate arithmetic. The observation helped infer the anomaly motion, so it is a source diagnostic, **not** an independent predictive test. The printed XI.11 rows independently check the correction-table quantities but do not imply that the complete historical interpolation algorithm is implemented.

At those printed rounded arguments the exact circle gives Virgo `9;28.843`, **1.157′ below** the source-derived position. For XI.11 mean-centrum `90°`, the printed centre correction is `6;31°` and exact geometry gives `6;30.470°`, a `0.530′` difference. At `96°`, the table has `6;30°` and exact geometry gives `6;30.651°`, a `0.651′` difference. These discrepancies are between rounded source arithmetic and exact circles, not evidence of modern observational accuracy.

Only geocentric tropical longitude is implemented. There is no latitude, modern apparent-place correction, physical distance, calibrated frame, or demonstrated arbitrary-date observational accuracy. Distant dates continue printed historical rates mathematically. Validation remains partial even when source and cross-language tests pass.
