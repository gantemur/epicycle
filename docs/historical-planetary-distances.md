# Historical planetary order and distance evidence — Phase 6B audit

This is source metadata, not a longitude evaluator or a spatial reconstruction. The [versioned transcription](../data/ptolemy-nested-spheres-v1.json) preserves conditional physical-sphere bounds in Earth radii. Angular Map uses only the **outward order** Sun–Mars–Jupiter–Saturn and assigns independent illustrative screen radii of 25%, 45%, 65%, and 85%. The ring spacing has no historical distance meaning.

## Ptolemy

In *Almagest* IX.1 (Toomer, printed pp. 419–420, P1), Ptolemy reports agreement that the three superior planets lie beyond the Sun and the inferior pair, with Mars, Jupiter, then Saturn outward. Earlier astronomers put Mercury and Venus below the Sun; some successors put them above it because they had not been seen crossing the solar disk. Ptolemy rejects non-observation of a transit as decisive, since latitude could prevent a crossing. He says planetary parallaxes were not noticeable, so distance and the inferior pair's order were not observationally demonstrated. He adopts the older placement with the Sun in the middle as more plausible, partly separating bodies always near the Sun from those reaching all angular separations. This is an **adopted order**, not measured interplanetary ranges.

*Planetary Hypotheses* I.16–17 (Hullmeine, P4, printed pp. 271–275) constructs contiguous planetary spheres from ratios of extremal distances and an assumption against empty intervals. It gives the following **rounded bounds** in Earth radii, not a body's distance at a date:

| Sphere | Minimum | Maximum in transmitted text |
| --- | ---: | ---: |
| Moon | 33 | 64 |
| Mercury | 64 | 166 |
| Venus | 166 | 1079 |
| Sun | 1160 | 1260 |
| Mars | 1260 | 8820 |
| Jupiter | 8820 | 14187 |
| Saturn | 14187 | 19865 |

Venus's maximum and the Sun's minimum leave **81 Earth radii** in these rounded values. Ptolemy discusses changing the lunar/solar distance estimate to close that gap; it must not be silently filled in the data. The transmitted Jupiter maximum is **14187** and the corresponding Saturn minimum is **14187**. Hullmeine's commentary (p. 364 note 49) follows Goldstein and Swerdlow in correcting both boundary values to **14189**; both readings are retained. Hullmeine pp. 363–365 stresses that the nested construction is conditional on physical assumptions, especially no void; Ptolemy treats the resulting distances cautiously, as lower limits if gaps exist. Confidence is high for the printed readings and for their classification, but not for their observational accuracy.

Neugebauer, *History of Ancient Mathematical Astronomy* (P2, printed pp. 917–921, especially Tables 24–25), separates the **Almagest**'s separately normalized deferents (`R = 60`) from Earth-radius scaling in the *Planetary Hypotheses*. The latter combines rounded extremal ratios and contiguous spheres; Neugebauer's Tables 24–25 include bracketed reconstructions, alternative Proclus/Thābit readings, and values derived from less-rounded Almagest parameters. His Table 25 prints 14187, while Hullmeine records the later correction. These columns are different source layers, not interchangeable parameter sets. The optional mean distance used later for estimating body sizes is a derived statistic, not a historical instantaneous planetary radius (P2 p. 921).

## Limited comparison of other traditions

| Tradition | Evidence checked | Readiness and confidence |
| --- | --- | --- |
| al-Farghānī | Hullmeine's historical survey, ch. II, discusses his contiguous-sphere calculation and ratios inherited from the *Almagest*; his *Elements* chs. 21–22 concern distances and sizes. | Separate physical-distance scheme plausible; **moderate confidence** in this secondary-source classification, no critical numerical transcription or coordinates adopted. |
| al-Battānī | His *Zīj* ch. 50 treats planetary distances using contiguous spheres (see the historical account in the *Dictionary of Scientific Biography* entry linked below); Hullmeine also notes his cosmological discussion. | Potential revised bounds; **moderate confidence** in the textual classification, no checked complete numeric record or spatial ephemeris here. |
| Indian siddhāntic works | *Sūrya-Siddhānta* XII describes orbital circumferences in yojanas and conversion to orbit diameters. These are source-specific cosmological measures; interpreting their relation to corrected planetary longitude requires a separate geometric audit. | Distance-bearing text exists, but **low confidence** in any interpretation as compatible instantaneous geocentric vectors. |
| Tibetan Phugpa/Kālacakra | The local read-only CALTIB `PlanetsEngineProtocol` and `TraditionalPlanetsEngine` return mean and true geocentric **longitudes in turns** from mean motion and correction tables. They expose no distance observable. | **High confidence** in the inspected software interface; source-supported physical distance and runtime integration into this atlas remain separate future work. Epicyclic terminology alone is insufficient. |
| Babylonian Systems A/B | Published studies describe arithmetical dates and zodiacal longitudes of successive synodic phenomena; A uses step functions and B zigzag functions. | **High confidence** in event/longitude classification; no evidence here for continuous spatial trajectories or generic all-time longitudes. No interpolation into Angular Map without a source-backed rule. |

This is a limited readiness audit, not a cross-cultural numeric database. Sources for future checks include [al-Battānī's biographical/source account](https://mathshistory.st-andrews.ac.uk/DSB/Al-Battani.pdf), the [Burgess translation of *Sūrya-Siddhānta*](https://www.wilbourhall.org/pdfs/suryaenglish.pdf), and [de Jong's study of Babylonian System A/B schemes](https://link.springer.com/article/10.1007/s00407-023-00311-3). The CALTIB source inspected here is under `private/legacy/caltib/src/caltib/engines/`; it remains read-only and outside the web build.
