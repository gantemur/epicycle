# Ptolemy's *Almagest* Jupiter longitude

P1 denotes G. J. Toomer's translation of the *Almagest*; P2 denotes O. Neugebauer's *A History of Ancient Mathematical Astronomy* (HAMA). Page numbers are printed pages. The source record is [`data/jupiter-almagest-v1.json`](../data/jupiter-almagest-v1.json). This specification concerns Ptolemy's planar geocentric longitude construction, not latitude, original full table interpolation, a modern orbit, or a physical distance scale.

## Original parameters and conventions

| Quantity | Original reading | Normalized value | Locator |
| --- | ---: | ---: | --- |
| Deferent radius `R` | `60` | 60 units | P1 XI.2 pp.521–522; XI.10 p.546 |
| Half-eccentricity `e` | `2;45` | 2.75 units | P1 XI.1 pp.507–519; XI.2 p.521 |
| Earth–equant distance `2e` | `5;30` | 5.5 units | Equal division in P1 IX.6 pp.443–444; derived from `e` |
| Epicycle radius `r` | `11;30` | 11.5 units | P1 XI.2 p.522; XI.10 p.546 |
| Greatest/least Earth–epicycle-centre distance | `62;45` / `57;15` | `R ± e` | P1 XI.10 p.546; P2 p.185 |
| Mean longitude at epoch `L₀` | `184;41°` | 184.683333…° | P1 IX.4 p.430; XI.4 p.525 |
| Mean epicyclic anomaly at epoch `α₀` | `146;04°` | 146.066666…° | P1 IX.4 p.430; XI.4 p.525 |
| Apogee at epoch `A₀` | Virgo `2;09°` | 152.15° | P1 IX.4 p.430; XI.4 p.525 |
| Daily mean longitude `nL` | `0;4,59,14,26,46,31°` | 0.083122436364…°/day | P1 IX.3 p.426; IX.4 p.432 |
| Daily mean anomaly `nα` | `0;54,9,2,46,26,0°` | 0.902512842078…°/day | P1 IX.3 p.424; IX.4 p.432 |
| Apogee motion | `1° per 100 Egyptian years` | `1/36500°`/day | P1 IX.5–6 pp.443–445 |

`e` is **half** the Earth–equant separation. Ptolemy's XI.2 rounded epicycle derivation ends at `11;30`; Toomer's p.522 note obtains approximately `11;38` from more accurate intermediate arithmetic. The model retains the final original `11;30`. P1 XI.3 pp.522–525 uses an ancient Jupiter/star report to help infer the anomaly rate. This is a parameter source, not an independent successful prediction. P2 pp.181–182 explains the back-calculation and p.185 independently summarizes the printed theory; the summary is not a second ancient observation.

## Solar coupling, epoch and frame

At Nabonassar 1 Thoth 1, Alexandria mean local noon, `L₀ + α₀ = 184;41 + 146;04 = 330;45°`, the **mean** Ptolemaic Sun's longitude. The printed six-place daily motions satisfy `nL + nα = 0;59,8,17,13,12,31°/Egyptian day`, again the mean solar rate in the [solar record](../data/sun-almagest-v1.json). P1 IX.3 pp.424–426 explicitly constructs outer-planet longitude motion as mean solar motion minus anomaly motion. Neither identity concerns the true, eccentric-corrected Sun.

Use the shared formal Nabonassar epoch, local-noon JDN 1448638, correlated with astronomical proleptic Julian `−746-02-26` (P1 XI.4 p.525; P2 pp.182, 1066). An Egyptian year is exactly 365 days; it is not a Julian year. For local mean Egyptian days `t`, `L=L₀+nL t`, `α=α₀+nα t`, and `A=A₀+t/36500°`. This historical LMT day is not TT or a modern ephemeris time. P1 IX.5–6 pp.443–445 assigns the shared apogee rate to the planets: the apsidal line is approximately fixed among stars while its **tropical** longitude advances. The longitude origin is Ptolemy's historical equinox; no modern calibration is supplied.

## Original geometry and phase

Take Earth `O=(0,0)`, the tropical vernal equinox as the positive x-axis, eastward 90° as positive y, and `u(φ)=(cos φ,sin φ)`. With apogee `A`, `D=e u(A)` is the deferent centre and `Q=2e u(A)` the equant. `L` is the direction **from Q** to epicycle centre `C`, not the apparent Earth-centred longitude. For `κ=L−A`, the outward intersection of that ray with `|C−D|=R` is

```text
q = sqrt(R² − e² sin²κ) − e cosκ
C = Q + q u(L)
P = C + r u(L + α)
λ = atan2(P_y, P_x) mod 360°.
```

P1 IX.6 pp.443–444 says the planet's anomaly is measured from the epicycle diameter rotating with the equant mean motion, and at its apogee the planet moves eastward in the order of signs. P1 XI.9 pp.544–545 describes the geometric solution; P2 p.183 explicitly identifies `α` as reckoned from the **mean epicycle apogee**. Those passages support `L+α` for the epicycle radius, as in the already checked Mars construction. P1 XI.12 pp.554–555 instead describes the convenient, approximate tabular calculation, including a corrected anomaly argument. The exact circles and that table procedure are distinct numerical methods.

The independently coded scalar check uses `b=q+2e cosκ`, `h=−2e sinκ`, `η=atan2(h,b)`, `d=hypot(b,h)`, and `β=α−η`. Then `λ=L+η+atan2(r sinβ,d+r cosβ)` modulo 360°. `η` is the signed centre equation. The second atan2 term is the signed epicycle equation. All distances remain source radius units, not astronomical units.

## Source diagnostics and limits

The literal source cases in [`jupiter-source-cases.json`](../tests/fixtures/jupiter-source-cases.json) include the IX.4 epoch and one-year/daily entries, the XI.3 ancient-observation derivation, and selected XI.11 p.550 printed correction rows. P1 XI.3 pp.522–525 gives the ancient case as apogee Virgo `7;13`, mean centrum `285;41`, and anomaly `77;02` at an observation with printed longitude Cancer `7;33`. Toomer's p.524 note obtains `77;00` from more accurate reconstruction. It is useful for checking orientation and rounding, but the observed position helped determine the motion. The XI.11 table rows test source arithmetic separately from this geometrical inversion; they do not certify full XI.11–12 interpolation.

Only geocentric tropical longitude is implemented. There is no original latitude theory, light-time or modern apparent-place correction, physical distance, calibrated frame, or demonstrated arbitrary-date observational accuracy. The printed rate continued far outside the ancient examples is explicitly mathematical continuation. Selected source cases and numerical residuals are reported with the implementation; passing geometric and cross-language tests establish calculation agreement, not comprehensive historical validation.
