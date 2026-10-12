# Ptolemy's Sun in *Almagest* III

## Source and scope

The source witnesses used here are P1, G. J. Toomer's translation of
*Ptolemy's Almagest*, Book III.2–8, printed pp. 140–169, and P2,
O. Neugebauer, *A History of Ancient Mathematical Astronomy*, I.B.1,
printed pp. 55–60. The numerical rows of P1 III.6, p. 167, were checked
against the page image. These citations identify the historical theory and its
translated table, not a modern solar ephemeris.

This version computes a **geocentric ecliptic longitude** and a distance in
Ptolemy's arbitrary radius units. It does not compute latitude, obliquity,
light-time, a modern apparent place, or physical distance. Ptolemy prefers the
eccentric circle for the Sun. His equivalent deferent and epicycle construction
(P1 III.3, pp. 144–152; P2 p. 57) is the *same* predictive theory and is not
registered as another historical model. Reproduction of the complete III.6
table and its interpolation procedure is deferred.

## Original quantities and evidence

| Quantity | Adopted historical reading | Locator | Status |
| --- | --- | --- | --- |
| Eccentric-circle radius | `60` | P1 III.4–5, pp. 155–160; P2 pp. 57–58 | Explicit normalization |
| Earth-to-circle-centre eccentricity | `2;30` radius units, or `R/24` | P1 III.4, pp. 155–156; P2 p. 58 | Geometrically derived from the cited seasons |
| Apogee from the vernal equinox | Gemini `5;30` = `65;30°` | P1 III.4, pp. 155–156; P2 p. 58 | Derived; fixed in tropical longitude |
| Tropical-year length | `365;14,48` mean days | P1 III.1, p. 140; P2 pp. 54–55 | Explicit adopted period |
| Daily mean solar motion | `0;59,8,17,13,12,31°` | P1 III.1–2, pp. 140, 142–143; P2 p. 55 | Printed six-place value |
| Mean longitude at epoch | Pisces `0;45` = `330;45°` | P1 III.2, p. 142; III.7, pp. 168–169; P2 p. 60 | Derived epoch argument |
| Mean anomaly from apogee at epoch | `265;15°` | P1 III.2, p. 142; III.7, p. 169; P2 p. 60 | Derived epoch argument |

The `94½` and `92½` day spring-to-summer and summer-to-autumn intervals are
the historical inputs to the eccentricity and apsidal derivation (P1 III.4,
pp. 153–156; P2 p. 58). Ptolemy holds the solar apogee fixed against the
**tropical** equinox. The 1° per 100 Egyptian years motion assigned to his
planetary apsides must not be applied to this solar theory (P2 p. 58).

The epoch is Nabonassar year 1, Egyptian Thoth 1, **Alexandria local mean
noon** (P1 III.7–8, pp. 168–169; P2 pp. 59–60). The project's established
formal Julian-day coordinate is JD 1448638, Julian astronomical year −746,
February 26 at local noon; this historical-era correlation is a scholarly
calendar convention, not an ancient UT1 or TT determination. Egyptian years
have 365 days. Civil BCE labels use astronomical year numbering, with year 0
meaning 1 BCE. Conversion from a common assumed UT1 instant requires an
explicit Alexandria meridian; the software's provisional 30° E is illustrative,
not a source-verified ancient longitude. No ancient ΔT is inferred.

The mean motion printed to six sexagesimal fractional places is preserved as
the date evaluator's rate. The mathematical quotient `360° / 365;14,48 days`
is its source derivation, but is slightly more precise and must not silently
replace the printed rate. The date evaluator uses uniform mean days, not a
historical true-solar-time correction (P1 III.9, pp. 169–170; P2 pp. 60–61).

## Continuous eccentric geometry and equation sign

Use east-increasing ecliptic angles measured from Ptolemy's tropical vernal
origin. Let Earth be `O=(0,0)`, the circle centre be
`D=e(cos A, sin A)`, and the Sun be
`P=D+R(cos L, sin L)`, where `L` is the uniform angle around `D` and also
the **mean solar longitude**. The mean anomaly from apogee is
`κ = (L−A) mod 360°`. Thus

```text
λ = atan2(P_y, P_x) mod 360°
c = wrap_signed(λ − L)
  = −atan2(e sin κ, R + e cos κ)
distance OP = hypot(P_x, P_y)
```

The `atan2` correction uses the full quadrant. With `0 < κ < 180°`, the
true Sun lags the mean Sun and `c < 0`; with `180° < κ < 360°`, it leads and
`c > 0`. At apogee and perigee the correction is zero; the distance is
`R+e = 62;30` and `R−e = 57;30`, respectively. This sign rule is explicit in
P1 III.8, p. 169, and P2 pp. 59–60. The maximum tabular correction is about
`2;23°`; P1 III.4, p. 156, places it at mean anomaly about `92;23°`.
Ptolemy's original chord arithmetic and rounded values need not coincide with
the continuous trigonometric expression to its final arcminute.

## Independent source cases for numerical checks

The following are **transcribed source values**, separate from evaluator
outputs. A row of III.6 provides an independent check on geometry at its
printed argument; its stated minute is not a demand for exact equality to a
continuous trigonometric result.

| Mean anomaly `κ` | Printed correction magnitude | Source |
| --- | --- | --- |
| `6°` or `354°` | `0;14°` | P1 III.6, p. 167, row 1 |
| `90°` or `270°` | `2;23°` | P1 III.6, p. 167, row 15 |
| `93°` or `267°` | `2;23°` | P1 III.6, p. 167, row 16 |
| `135°` or `225°` | `1;44°` | P1 III.6, p. 167, row 30 |
| `174°` or `186°` | `0;16°` | P1 III.6, p. 167, row 43 |
| `180°` | `0;00°` | P1 III.6, p. 167, final row |

P1 III.7, pp. 168–169, obtains the epoch mean anomaly from an autumnal
equinox in Hadrian 17, Athyr 7, two equinoctial hours after Alexandria noon:
`116;40°` at that observation, minus the adopted `211;25°` mean motion over
`879` Egyptian years, `66` days and `2` hours, gives `265;15°` at the
Nabonassar epoch. This observation **sets the epoch parameter** and is not an
independent predictive validation. P2 p. 60 notes that literal recomputation
of the mean-motion tables yields `211;25,43°`; it relates Ptolemy's rounded
`211;25°` to the equation of time in its later discussion (p. 63). The
historical epoch reading is retained rather than adjusted to erase this
difference. At the epoch P1 III.6's nearby rows give `+2;23°` and a printed
true longitude Pisces `3;8°` (P2 p. 60).

An **off-epoch source calculation** is discussed in P2 p. 60 and originates in
P1 VII.3, p. 338. For Nabonassar year 845, Mechir 18/19, P2 specifies
`19;30` equinoctial hours after Alexandria noon, with elapsed time `844`
Egyptian years, `5` months, `17` days and `19;30` hours. It reports mean
motion `320;12,20°`, mean longitude Capricorn `20;57°`, anomaly `225;27°`,
table correction `+1;45°`, and true longitude Capricorn `22;42°`, rounded
to Capricorn `23°` for the stellar discussion. This checks a complete
historical position away from the defining epoch; it is a **source-computation
reproduction**, not an independent modern observation of solar longitude.
P2 p. 60 explains that the input time itself reflects both Rome-to-Alexandria
longitude reduction and conversion from seasonal to equinoctial hours. Its
precision should not be overinterpreted as a modern timed observation.

## Validation boundary

Continuous geometry, historical rounded table entries, and the original
tabular interpolation are separate numerical procedures. Tests should compare
the first with the second at arcminute scale and should report their signed
differences. This implementation does not claim complete reproduction of
III.6 interpolation, modern frame alignment, or calibrated historical accuracy
at arbitrary dates. A future Ptolemy–Copernicus longitude disagreement must
declare the project's nominal historical tropical-frame alignment; the two
authors' equinoxes are not thereby calibrated to one modern frame.
