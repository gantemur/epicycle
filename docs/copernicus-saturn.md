# Copernicus 1543: Saturn longitude

Status: source-checked planar geometry, with partial historical numerical validation. `C1` is Rosen's translation, `C2` the original Nuremberg 1543 printing, and `C3` Swerdlow–Neugebauer. Folios are original folios. The versioned source record is [`data/saturn-copernicus-1543-v1.json`](../data/saturn-copernicus-1543-v1.json).

## Source readings and mean-motion variant

| Quantity | Adopted reading | Evidence |
| --- | --- | --- |
| Principal radius | 10000 | C1/C2 V.5 f.144v; C3 pp.324–326, 545 |
| Reported double eccentricity | 1139 | C1/C2 V.5 f.144v; V.6 f.147r; C3 p.545 |
| Principal eccentric component | 854 | C1/C2 V.5 f.144v; V.6 f.147r |
| Small epicycle radius | 285 | Same passages; 854+285=1139 |
| Earth annual radius in Saturn units | 1090 | C1/C2 V.9 f.149v; C3 pp.335–336, 545 |
| Christ-epoch mean commutation | 205;49° | C1 V.8 f.148v; C3 p.545 |
| Christ-epoch mean proper longitude | 66;42° | C3 p.545; mean Sun 272;31° minus commutation |
| Christ-epoch sidereal apogee | 225;02° | C3 p.545, from V.5–8 epochs and uniform motion |
| Annual commutation | 347;32,3,9,40° | C2 V.1 f.134v and original table f.135v; C3 pp.545, 554 |
| Annual proper longitude | 12;12,45,57,24° | Nuremberg/table pair; C3 pp.545, 554 |
| Annual sidereal apogee motion | 0;0,36° | C1 V.7 f.148r: about 1° in 100 years; C3 p.545 |

The original V.1 table's year-one entry is 5,47;32,3,9° and its 60-year entry retains `...9,40`; C3 p.554 identifies this as the Nuremberg (`N`) version. Rosen's C1 V.1 prose instead gives **347;32,2,54,12°**, paired with **12;12,46,12,52°**. C3 p.554 identifies that pair with the earlier manuscript (`M`) version restored in the translation. Both whole pairs sum to the same mean solar annual motion; mixing one member of each pair does not. The Nuremberg pair is adopted for 1543 geometry and the manuscript pair remains an unused, sourced variant. Its annual commutation difference is −0;0,0,15,28°; continued for roughly 1514 or 1527 Egyptian years it accumulates to approximately −0.1084° or −0.1093° (about −6.5′). This is a model-argument difference, not an observational residual.

The epoch is Julian 1 January 1 CE, midnight, historical Frauenburg/Cracow local mean time. Rates use **365-day Egyptian years**. The frame is Copernicus's native sidereal direction from his first star of Aries. Tropical conversion adds the existing Earth's true precession, without a modern frame calibration. Exact sexagesimal checks are 66;42 + 205;49 = 272;31° and 12;12,45,57,24 + 347;32,3,9,40 = 359;44,49,7,4°. Thus the planetary arguments use the existing **mean** Sun, not the distinct true Sun.

## Mathematical specification

Let `G` be mean Sun, `S` true Sun, `E` Earth, `M` Saturn's eccentric centre, `C` the small-epicycle centre, `P` Saturn, `B` its sidereal apogee, `Ls` the mean Sun and `alpha` commutation. With `L=Ls-alpha` and `u(a)=(cos a,sin a)`, set `M=G+854u(B)`, `C=M+10000u(L)`, `P=C-285u(2L-B)`, and `E=G-1090u(Ls)` in Saturn units. Scale the complete existing Earth geometry by `1090/10000`. This is the compound circular construction of C1 V.2–4 and C3 pp.291–301. Its geocentric direction is `P-E` in either viewing centre.

At local day count `t` since the Christ epoch, `alpha=205;49+(t/365)347;32,3,9,40` and `B=225;02+(t/365)0;0,36`, with `Ls(t)` from the Earth model. This original approximate uniform sidereal apsidal rule continues mathematically across the computational domain. It is not a modern secular fit or independently validated all-era prediction. No special Mars apsis guard applies.

## Historical numerical checks and limits

C1/C2 V.9 ff.148v–149v gives Saturn on 1514 February 24, five local hours after midnight. Its rounded arguments are mean Sun 315;41°, commutation 116;31°, mean Saturn 199;10°, apogee about 240;20°, centre equation +4;06°, and reported sidereal geocentric longitude 209;00°. Its intermediate planet distance is 10465 and its Earth annual radius is 1090. The observation **determined** the Earth-orbit radius, so matching it checks reconstruction rather than independent prediction. C3 pp.325–326 also discusses inconsistent intermediate numbers in the ancient-opposition derivation; they are historical arithmetic issues, not a mandate to replace the final 854/285 geometry.

C3 p.545's Alexander and supplementary 1500 arguments are rounded checks; the latter is not an additional Copernican epoch. C3 p.543 warns that summary geometry may differ from parameters/procedures behind original correction tables. Full original table interpolation, latitude, modern physical distances and observational accuracy are unverified. For future common-scale coordinates, multiply all Saturn-unit vectors by `10000/1090` to obtain Earth-annual-radius units, without identifying this historical unit with modern AU.
