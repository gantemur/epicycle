# Copernicus 1543: Earth and Mars longitude geometry

Status: source-checked implementation with partial numerical validation. This specification uses the Nuremberg 1543 *De revolutionibus* (N), C1's English translation, C2's Latin printing, and C3 (Swerdlow–Neugebauer). All cited pages of C3 are **printed pages**; `f.` denotes the original Copernicus folio. Private scans and working text extracts are not public data.

## Earth checkpoint A — completed before Mars implementation

The adopted Earth constants were checked against C1 III.6–7,11–12,14,19–25 and C3 pp.136–146,154–170,543–544. C2 III.23 f.93v was visually inspected: Christ's solar anomaly is **211;14**, agreeing with C3 p.165. C1 gives **211;19**, an earlier reading restored by editions/translations (C3 p.165 n.51). The record retains it as an unused alternative. Mean solar apogee 61;17 is the difference 272;31 − 211;14, not a separately attested epoch.

Five Earth tests passed before adding the Mars evaluator: a sweep of circle invariants and an independent scalar solar equation, the Christ epoch and calendar intervals, the 1515 eccentricity derivation, the 1525 solar example, and invalid/time-scale arguments. At θ=165;39 the geometry gives an apsidal equation −2.112613°, compared with the source's rounded −2;6,30. For Julian 1525 April 17 00:00 local (the midnight following April 16), elapsed time is exactly 1525 Egyptian years +122 days. Computed true precession is 27.327814° and tropical solar longitude 35.846783°. C3 pp.169–170 gives 35;50 from the printed tables: the geometric difference is +0.807′. This is a comparison of different procedures, not an equality target or an observational accuracy claim.

No essential Earth parameter remains missing for this planar computation. The precession component follows Copernicus's plane-libration approximation (C3 p.136); it does not implement a spherical pole-motion theory.

## Adopted parameters and source lineage

The public records are `data/earth-copernicus-1543-v1.json` and `data/mars-copernicus-1543-v1.json`. Each adopted number carries notation, normalized value, units, status and locator. A semicolon starts sexagesimal fractions; commas separate subsequent base-60 places. In quoted source notation an integer such as `5,59` means 359. Implemented rates use decimal integer parts for easier cross-language parsing.

| Earth quantity | Adopted value | Status and principal locators |
| --- | --- | --- |
| Annual radius R | 10000 | Explicit normalization; C1 III.21 ff.92r-v; C3 pp.162–163 |
| Two eccentric components e₁, e₂ | 369, 48 | Explicit results of geometric derivation; C1 III.21 f.92v; C3 p.163 |
| Maximum/minimum eccentricity | 417 / 321 | e₁ ± e₂; same passages |
| Mean sidereal Sun L₀ | 272;31° | C1 III.19 f.90v; C3 p.165 |
| Solar anomaly at Christ epoch | 211;14° | C2 III.23 f.93v; C3 p.165; C1's 211;19 is excluded |
| Mean solar apogee A₀ | 61;17° | Derived L₀ − anomaly; C3 p.165 |
| Mean sidereal solar motion | 359;44,49,7,4°/Egyptian year | C1 III.14 f.81r; C3 pp.154–156,544 |
| Mean apsidal motion | 0;0,24,20,14°/Egyptian year | C1 III.22 f.93r; C3 p.164 |
| Simple anomaly θ₀; motion | 6;45°; 0;6,17,24,9°/year | C1 III.6 f.70r, III.11 f.77r; C3 pp.138,144,543 |
| Mean precession π̄₀; motion | 5;32°; 0;0,50,12,5°/year | Same C1 passages; C3 pp.139,144,543 |
| Precession equation amplitude b | 1;10° | C1 III.7 f.73r; C3 pp.136,140,543 |

| Mars quantity | Adopted value | Status and principal locators |
| --- | --- | --- |
| Principal radius R | 10000 | C1 V.16 f.157r, V.19 f.159r; C3 p.365 |
| Eccentric offset e₁ / small epicycle r′ | 1460 / 500 | C1 V.16 f.157r, V.19 f.159r; C3 pp.356–357,365 |
| Double eccentricity | 1960 | Sum e₁+r′; C3 pp.356–357,546; not the centre offset |
| Earth annual radius r | 6580 | Parameter derivation C1 V.19 ff.159v–160r; C3 p.366 |
| Mean commutation ᾱ₀ | 238;22° | C1 V.18 f.158v; C3 p.363 |
| Mean commutation motion | 168;28,30,36,4°/year | C2 V.1 f.134v and table f.137v; C3 pp.361–363,546 |
| Mean Mars L₀; annual motion | 34;9°; 191;16,18,31,0°/year | Derived **from the Earth mean Sun minus commutation**, C3 pp.363,546 |
| Apogee at 1523 February 22 05:00 local | 119;40° sidereal | C1 V.16 ff.158r-v; C3 pp.357–358 |
| Arbitrary-date apsidal law / secular eccentricity law | **Unavailable** | Explicit null records; C3 pp.358–363 |

C2's f.134v text and f.137v table (including the 60-year row retaining the fourth fractional place) were visually checked. C1's V.1 prose gives the manuscript rate 168;28,29,13,12, while its table gives the Nuremberg rate. C2 f.135r prints a slightly inconsistent separate proper-motion rate 191;16,18,30,36. The implemented proper motion is a dependent difference, as in C3 p.546; the printed alternative is retained. No modern fitting, Prutenic rate, or ancient e₁=1500 is used.

C3 p.543 explicitly warns that its geometric parameter summary is not a parameterization of every printed correction table. In the solar tables, the sixth column retains the earlier maximum eccentricity 414; the fifth column was adjusted near its maximum to 1;51 rather than the geometric 1;50 for eccentricity 321; the proportional-minutes column also retains inconsistent arithmetic (C3 pp.168–169). These unused values have separate records. No Copernican correction-table evaluator is claimed. The 1473 and 1525 table values below are transcribed comparison fixtures, not outputs of such an evaluator.

## Time, epochs, and frame

The computational epoch is **Julian 1 January 1 CE, midnight**, formal local JD **1721423.5**, at Copernicus's common Frauenburg/Cracow meridian. C1 III.19 and V.18 supply the epoch; C3 pp.165,543 clarify its use. Copernicus treated those meridians as identical; C3 p.165 n.51 notes the actual approximately 15′ longitude separation. Calendar years use astronomical numbering; elapsed Egyptian years are `days / 365`. Continuous rates are the stated annual rates divided by 365, without repeated minute rounding or substituting the slightly truncated daily-table rates.

Alexander's epoch, Julian astronomical −323 November 12 noon, is also recorded for lineage. It precedes Christ's epoch by 323 Egyptian years +130.5 days (C1 III.19; C3 p.543). Source-rounded epoch positions are preserved separately; the evaluator does not switch between them. C3's 1500 computational epoch is a modern convenience added by the commentators, not an additional original epoch adopted here.

**C3 p.543 supplementary-epoch inconsistency.** Its precession-anomaly entry for 1500 January 0 is `2,24;0,11°` (144°00′11″). Starting with C3's Christ-epoch θ₀=`6;45°` and its annual motion `0;6,17,24,9°`, the stated interval of 1500 Egyptian years +8 days gives θ=164.003339° ≈ `2,44;0,12°` (164°00′12″). C3's 1525 worked calculation on pp.145–146 reaches θ≈166;40°, consistent with the latter. The 1500 entry is therefore an **apparent inconsistency or typographical error in the secondary source**. It is not adopted, and the annual motion remains unchanged.

Coordinates use +x toward Copernicus's first star of Aries, +y in the direction of increasing ecliptic longitude, in a two-dimensional historical ecliptic. They are neither modern barycentric coordinates nor a calibrated ICRF system. Solar and planetary vectors are instantaneous geometric directions; there is no light time, aberration, nutation, refraction, topocentric parallax or latitude. Historical “apparent” longitude does not mean a modern apparent-place calculation.

The positive sidereal-to-tropical addition is

\[
\pi=\bar\pi-b\sin(2\theta),\qquad \lambda_{trop}=(\lambda_{sid}+\pi)\bmod360^\circ.
\]

This is the historical plane-libration treatment of the two circular motions that generate a line oscillation (C1 III.3–7,12; C3 pp.134–136,145–146). Copernicus permits replacing small spherical arcs by straight lines; a fully spherical mechanism is not implemented. The negative sign for double anomaly below 180° follows C1 III.12 f.77v. Do not replace this with modern precession.

`copernicus_days_at_ut1` and the existing `ptolemy_days_at_ut1` convert the **same declared UT1 instant** through separately supplied meridians. Neither assumes TT, TDB or UTC. An original apparent-time observation must first be reduced to historical mean time; the original examples used here are explicitly uniform hours or local midnight. No modern equation of time is silently inserted.

## Earth's circular construction

Write \(u(q)=(\cos q,\sin q)\), with all displayed angles in degrees. The evaluator returns the equivalent **double eccentric** construction of C1 III.20, C3 pp.159–161:

1. The true Sun is \(S=(0,0)\).
2. \(F=-e_1u(A)\), where \(A\) is the **mean solar apogee**, not Earth's aphelion.
3. \(G=F-e_2u(A-\theta)\). G is the centre of Earth's annual circle, the **mean Sun** in the planetary theory.
4. \(E=G-Ru(L_\odot)\). Earth circles G with the mean solar direction displaced by 180°.

Thus SF=369, FG=48, GE=10000 are actual circular radii/offsets. No ellipse is fitted. The first solar inequality is the angular difference between \(S-E\) and mean solar longitude; the second inequality varies both eccentricity and apsidal direction through the small circle:

\[
e=\sqrt{e_1^2+e_2^2+2e_1e_2\cos\theta},\quad
\delta=\operatorname{atan2}(e_2\sin\theta,e_1+e_2\cos\theta),\quad A_{true}=A-\delta.
\]

The independent scalar check uses \(\alpha=L_\odot-A_{true}\) and

\[
c_\odot=-\operatorname{atan2}(e\sin\alpha,R+e\cos\alpha),\qquad
\lambda_{\odot,sid}=L_\odot+c_\odot.
\]

The maximum apsidal equation is \(\arcsin(48/369)\), about 7;28°, as in III.21. Returned directions, centres, radii, eccentricity, apsidal and solar corrections expose this geometry for a later renderer.

## Mars and the annual motion

Scale **all Earth coordinates** by \(s=6580/10000\) into Mars principal-radius units. Let these scaled points be G and E, set mean planetary longitude \(L=L_\odot-\bar\alpha\), and denote the supplied Mars apogee by B:

\[
M=G+1460u(B),\quad C=M+10000u(L),\quad
P=C-500u(2L-B),\quad V=P-E.
\]

M is the Mars principal-circle centre; C carries the small epicycle; P is Mars. The epicycle's offset direction advances twice as fast as L relative to a fixed B, and is inward at apogee. The geocentric sidereal longitude is `atan2(V.y,V.x)`, normalized to [0,360). The solar model returns Earth geometry in its original units; a separate named output holds it in Mars units. Mars's mean-Sun distance and longitude are explicitly distinguished from true-Sun coordinates.

With \(\kappa=L-B\), the independent scalar calculation is

\[
x_r=10000+(1460-500)\cos\kappa,\quad
x_t=-(1460+500)\sin\kappa,\quad
\eta=\operatorname{atan2}(x_t,x_r),\quad d=\sqrt{x_r^2+x_t^2},
\]
\[
\alpha=\bar\alpha-\eta,\quad
c=\operatorname{atan2}(6580\sin\alpha,d+6580\cos\alpha),\quad
\lambda_{sid}=L+\eta+c.
\]

Here η is the **signed** equation of centre; c is the annual parallax equation (historical commutation, not modern observer parallax). These formulas follow the construction/triangles in C3 pp.295–301. `atan2` retains the correct quadrant throughout the orbit.

The common G translation cancels in P−E. Therefore the two solar eccentric motions change true-Sun coordinates, but at fixed mean arguments and supplied Mars apsis they do **not** add the apparent solar equation to the geocentric Mars longitude. Substituting the apparent solar longitude for the mean Sun would be a different theory. Tests deliberately vary Earth's eccentric geometry to verify this cancellation. This translated construction is an instantaneous coordinate representation; it does not supply the missing true-Sun secular evolution of Mars's orbit.

## Missing apsidal evolution and the explicit policy

Copernicus's modern observations yield e₁=1460, while his ancient reconstruction yields 1500. He connects the reduction with displacement of Earth's annual centre, yet that displacement alone cannot explain the whole change in apsidal direction. C3 pp.358–363 shows that a true-Sun Mars apsis must also rotate. **Copernicus supplies no complete law to recover the mean-Sun apogee at arbitrary dates.** Holding the four lengths fixed is not a solution to this missing law.

Two date-evaluation choices are available:

- Supply `apogee_longitude` and a nonempty `apogee_provenance`. This is a declared input/hypothesis, with the fixed modern-observation geometry; it does not certify an arbitrary historical date.
- Select `apsis_policy="sn-local-uniform-1473-1523"`. This extrapolates 119;40 at Julian 1523 February 22 05:00 with **0;0,28,10° per Egyptian year**, the uniform estimate in C3 p.363, used by C3 p.455 at 1473 February 19. It is explicitly a scholarly approximation, not the missing nonuniform historical law. The implementation restricts it to **1473 February 19 00:00 through 1523 February 22 05:00 local**. That guard spans the worked examples; it is a project choice, not a proved historical validity interval. Fixed e₁=1460 over that interval is an additional declared assumption.

Omitting the choice, mixing choices, or requesting the approximation outside its interval raises an error. The Prutenic rate 0;0,28,44,37 remains an excluded alternative. Direct argument evaluation remains available for source derivations without implying a date law.

## Numerical evidence and its limits

`tests/fixtures/copernicus-source-cases.json` holds transcribed source values, separate from generated implementation results. Differences below are computation minus cited value.

| Case | Computation | Cited value | Difference / interpretation |
| --- | --- | --- | --- |
| Earth, θ=165;39 | e=322.716959 | 323 | −0.283 length units; parameter derivation, III.21 |
| Same apsidal equation | −2.112613° | −2;6,30° | −0.257′; historical rounding |
| 1525 April 16/17 precession | 27.327814° | C3 27;20; C1 27;21 | −0.331′ / −1.331′; original C1 arithmetic differs |
| Same solar tropical longitude | 35.846783° | C3 p.170 printed-table calculation 35;50 | +0.807′; independent continuous geometry |
| January 1512, rounded source arguments: mean Sun to epicycle centre | 11098.804815 | Copernicus 11097; C3 corrected 11099 | +1.805 / −0.195 units |
| Same mean Sun to Mars distance | 10778.041597 | 10776 | +2.042 units; the numerical reconstruction below explains the printed value |
| Same centre equation | −7.239647° | Copernicus −7;13; C3 corrected −7;14 | −1.379′ / −0.379′ |
| Same geocentric sidereal longitude | 191.441674° | observation used in derivation 191;28 | −1.500′; **not independent predictive validation** |
| 1473 February 19 16:48, explicit scholarly policy | 294.519494° sidereal; 321.307875° tropical | C3 p.455 tables: 294;30 / 321;17 | +1.170′ / +1.472′; continuous geometry versus rounded table procedure |

The January 1512 source uses rounded L☉=262, ᾱ=98;28 and implied B=119;40, not the later uniform approximation evaluated backward. With continuous epoch-derived arguments and the source's fixed B, longitude becomes 191.454971° sidereal; with the optional uniform approximation it is 191.447549°. These are distinct calculation paths, not silently interchangeable fixtures. The trigonometric radius derivation `10776 sin(35;9)/sin(70;32)` agrees with 6580 to under one unit, but uses the same observation from which the radius was obtained.

**Reconstruction of C3 p.365's January 1512 distance.** The exact construction gives SC=11098.804815 and SP=10778.041597. Keep its computed directions between the centre vector SC and the 500-unit epicycle offset, changing only the length inserted for SC in the cosine rule. With Copernicus's originally printed SC=11097, the resulting SP is 10776.238, consistent with his printed 10776 after rounding. Inserting C3's corrected SC=11099 instead gives SP=10778.237. Retaining the uncorrected SC thus provides a well-supported numerical explanation for the printed SP. It does not prove which intermediate number Copernicus actually used. The evaluator remains unchanged, and the source fixture preserves both printed values.

C3's 1473 calculation uses the stated Toruń time without the Toruń–Frauenburg meridian reduction. C3 p.454 note 19 explicitly says it neglects a −0;5° longitude correction, equivalent to 20 seconds of time. The source comparison above follows that convention; it does not silently incorporate the omitted reduction.

The tests also cover radius and vector invariants, rotation covariance, the mean-Sun translation cancellation, independent scalar/Cartesian equality over the full range of both Mars arguments, source notation normalization, dependency compatibility, epoch/annual motions, exact historical day intervals, policy endpoints, invalid inputs, UT1/TT rejection, and frame-alignment guards. These demonstrate mathematical consistency and selected historical reproductions. They do not establish all-era accuracy or full historical verification.

## Python commands and conditional comparison

From the repository root, a direct Earth/date evaluation and the coupled Mars evaluation are:

```sh
PYTHONPATH=src python3 - <<'PY'
from epicycle_atlas.chronology import civil_to_local_jd
from epicycle_atlas.copernicus_earth import EPOCH_LOCAL_JD, evaluate_earth
from epicycle_atlas.copernicus_mars import evaluate_mars, APSIS_POLICY
solar = evaluate_earth(civil_to_local_jd(1525, 4, 17) - EPOCH_LOCAL_JD)
print(solar['solar_tropical_longitude'])
t = civil_to_local_jd(1512, 1, 1, 6/24) - EPOCH_LOCAL_JD
mars = evaluate_mars(t, apsis_policy=APSIS_POLICY)
print(mars['geocentric_sidereal_longitude'], mars['geocentric_tropical_longitude'])
PY
```

The diagnostic reports both native results but suppresses the residual unless a planar frame alignment is explicitly supplied. The following is an **illustrative nominal-frame comparison**, using a declared 30°E Alexandria assumption and C3 p.170's 19;40°E Frauenburg. It is not a sourced calibration of Alexandria's meridian or either model to a modern reference:

```sh
PYTHONPATH=src python3 -m epicycle_atlas.copernicus_diagnostic \
  --ut1-jd 2273315.6953703705 \
  --instant-provenance 'Julian 1512-01-01 06:00 Frauenburg mean time, converted at 19;40E' \
  --alexandria-meridian 30 --copernicus-meridian 19.666666666666668 \
  --meridian-provenance 'Illustrative Alexandria 30E assumption; Frauenburg C3 p.170 19;40E' \
  --apsis-policy sn-local-uniform-1473-1523 \
  --frame-offset-deg 0 \
  --frame-provenance 'Nominal shared ecliptic and intended vernal equinox of date: P1 IX.5-6; C1 III.25. No modern calibration.'
```

Remove the last two options to obtain native longitudes **without** a residual. Nonzero offsets must have an independently justified meaning at the requested instant; a constant scalar cannot transform tilted reference planes. The Python helper runs the existing metadata comparison guard after the explicit alignment. It does not infer a modern transformation or claim the historical origins have been observationally calibrated. The residual is **Copernicus minus Ptolemy**, wrapped to [−180°,180°).

## Readiness and next phase

The scientific dependency and selected examples are ready for review; two-model comparison is **conditional** on the apsis policy, meridians and declared nominal frame or justified alignment. A modern observational residual is not ready. Full historical verification still lacks an unambiguous Mars secular apsidal/eccentricity prescription, a complete correction-table audit and broader independent historical predictions.

After scientific acceptance, the next browser phase can port these two small evaluators using the same JSON records, add cross-language fixtures, show separate Ptolemaic and Copernican geometries, and display one synchronized geocentric-longitude comparison. It must present four distinct concepts: each model's **native sidereal and tropical longitudes** where defined; an **explicitly declared nominal historical frame alignment** for a conditional two-model residual; a **genuinely calibrated modern reference frame** only if a later source-backed conversion supplies one; and the **reconstructed Mars apogee with its restricted domain**. The UI must also distinguish true Sun from mean Sun and retain English/Mongolian and mobile support. No latitude, other planets, modern ephemeris or parameter fitting is needed for that phase. This phase makes no browser changes.

Verification on completion: `PYTHONPATH=src python3 -m unittest discover -s tests -v` passed 28 tests; `npm run test:frontend` passed 9 tests; `npm run build` passed. The diagnostic command above returned native tropical longitudes 210.909404° (Ptolemy) and 218.639983° (Copernicus), with the explicitly conditional nominal-frame difference +7.730579°. This is a comparison of historical theories under the stated assumptions, not a modern accuracy estimate.
