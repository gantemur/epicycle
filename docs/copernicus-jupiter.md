# Copernicus 1543: Jupiter longitude

Status: source-checked planar geometry, with partial historical numerical validation. `C1` is Rosen's translation, `C2` the Nuremberg 1543 printing, and `C3` Swerdlow–Neugebauer. Original folios below are from the printed book, not PDF page numbers. The versioned source record is [`data/jupiter-copernicus-1543-v1.json`](../data/jupiter-copernicus-1543-v1.json).

## Source readings and convention

| Quantity | Adopted reading | Evidence |
| --- | --- | --- |
| Principal radius | 10000 | C1/C2 V.10 f.150r; C3 pp.337–338, 545 |
| Reported double eccentricity | 917 | C1/C2 V.10 f.150r and V.11 f.152v; C3 pp.343–344, 545 |
| Principal eccentric component | 687 | C1/C2 V.10 f.150r; V.11 f.152v |
| Small epicycle radius | 229 | C1/C2 V.10 f.150r; V.11 f.152v |
| Earth annual radius in Jupiter units | 1916 | C1/C2 V.14 f.155r; C3 pp.348–349, 545 |
| Christ-epoch mean commutation | 98;16° | C1 V.13 f.154r; C3 p.545 |
| Christ-epoch mean proper longitude | 174;15° | C3 p.545; mean Sun 272;31° minus commutation |
| Christ-epoch sidereal apogee | 153;55° | C3 p.545, from V.10–13 epochs and uniform motion |
| Annual commutation | 329;25,8,15,6° | C2 V.1 f.134v and original table f.136v; C1 V.1; C3 p.545, p.554 |
| Annual proper longitude | 30;19,40,51,58° | C1/C2 V.1 f.135r; C3 p.545 |
| Annual sidereal apogee motion | 0;0,12° | C1 V.12 f.153v: approximately 1° in 300 years; C3 p.545 |

All annual rates refer to a **365-day Egyptian year**. The epoch is Julian 1 January 1 CE, midnight, historical Frauenburg/Cracow local mean time. Angles are in Copernicus's native sidereal frame, directed eastward from his first star of Aries. Historical tropical longitude adds the existing Earth model's true precession; it is not a modern calibrated frame. The existing Earth model supplies the **mean** Sun, its distinct true Sun, and Earth's position. In exact sexagesimal arithmetic, 174;15 + 98;16 = 272;31° and 30;19,40,51,58 + 329;25,8,15,6 = 359;44,49,7,4°: the same mean-Sun epoch and annual motion as the Earth record.

The original 917 is separately reported. The individually rounded components add to **916**, not 917. C3 pp.343–344 discusses intermediate reconstructed values near 913 and 915 and uncertainty in Copernicus's route to the adopted 917. Neither intermediate replaces the printed final reading. The continuous geometry uses the explicit 687 and 229; it does not silently alter either component to force the reported sum. C3 p.543 cautions that summary geometry need not reproduce the original correction tables' underlying parameters or procedure. Complete table interpolation is outside this model.

The original commutation table at C2 f.136v has year one `5,29;25,8,15°` and year sixty `5,25;8,15,6°` in base-60 integer notation. The former omits a low-order place; the latter independently retains the adopted fourth fractional place. Both are kept as literal source fixtures.

## Mathematical specification

In a common planar sidereal frame let `G` be the mean Sun, `S` the true Sun, `E` Earth, `M` Jupiter's eccentric centre, `C` its small-epicycle centre, `P` Jupiter, `B` the sidereal apogee, `Ls` the mean sidereal Sun, and `alpha` mean commutation. With `u(a)=(cos a,sin a)` and `L=Ls-alpha`, use `M=G+687u(B)`, `C=M+10000u(L)`, `P=C-229u(2L-B)`, and `E=G-1916u(Ls)` in Jupiter units. The Earth model's full geometry is first scaled by `1916/10000`. This is the superior-planet construction of C1 V.2–4 and C3 pp.291–301, not a Keplerian ellipse. The planet's geocentric longitude is the direction of `P-E`, not `P-S`.

For local days `t` since the Christ epoch, `alpha=98;16+(t/365)329;25,8,15,6` and `B=153;55+(t/365)0;0,12`; the Earth model supplies `Ls(t)`. The original uniform apsidal rule is continued mathematically over the computational domain, without claiming observational accuracy there. Jupiter has no Mars-style 1473–1523 software guard.

## Historical numerical checks and limits

C2 V.14 f.154r prints the Roman date XII Kalends of March 1520, **Julian February 18 at 06:00** (six hours before noon); C3 p.348 uses February 18, while C1 translates it as February 19. Its rounded arguments are mean Sun 309;16°, commutation 111;15°, mean Jupiter 198;01°, apogee about 159°, centre equation −3;11°, and reported sidereal geocentric longitude 205;09°. The source's intermediate mean-Sun-to-Jupiter distance is 10373 and its Earth annual radius is 1916. Direct continuous geometry at the printed arguments gives approximately 10371.892. C3 p.348 instead prints 10353 as a correction to 10373; that correction has not been reconciled with the stated 687/229 geometry and is not substituted into the evaluator. This observation **determined** the radius; a nearby continuous-circle result is a source-calculation diagnostic, not independent predictive validation. Preserve the rounded original arithmetic and exact geometry as separate results.

C3 p.545 supplies supplementary Alexander and 1500 epoch arguments, which are rounded checks rather than new source epochs. C3's 1500 precession-anomaly entry is apparently inconsistent with its own annual motion (see [Earth–Mars audit](copernicus-earth-mars.md)); it is not an input here. Latitude, original full correction-table interpolation, modern physical distances and modern observational comparison remain unavailable. A common Earth-annual-radius scale multiplies all Jupiter-unit vectors by `10000/1916` for future multi-planet use; it is a historical normalization, not a modern AU.
