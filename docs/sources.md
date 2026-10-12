# Source inventory and extraction map

Inventory checked locally in Phase 0. All 20 PDFs are in `private/sources/` (about 574 MB); `private/source/` does not exist. The IDs are local working identifiers, not source authority. Phase 1 verified exact P1/P2/P8 locators for the Mars longitude parameters and examples in [mars-almagest.md](mars-almagest.md); other edition details and rights remain to be checked. Phase 5B checked P1 IX.3–6 and XI.1–12 against P2 pp.181–188 for the Jupiter and Saturn records; see [Jupiter](jupiter-almagest.md) and [Saturn](saturn-almagest.md). Never copy these PDFs, page images, or substantial text into the public repository. Web-first research tools and digital editions are catalogued in [online-resources.md](online-resources.md).

| ID | Local file | Identification / first use |
| --- | --- | --- |
| P1 | `P1almagest.pdf` | Toomer, *Ptolemy's Almagest*. Primary Almagest translation; first source for model and table checking. |
| P2 | `P2Neugebauer.pdf` | Neugebauer, *A History of Ancient Mathematical Astronomy*. Mathematical reconstructions and the *Handy Tables* context. |
| P3 | `P3Hamm.pdf` | Translation and commentary on *Planetary Hypotheses* (title page identifies *Ptolemy's Planetary Theory*). Verify edition details before citation. |
| P4 | `P4Hullmeine.pdf` | Hullmeine, *Ptolemy's Cosmology in Greek and Arabic*: *Planetary Hypotheses* background, transmission, edition/translation. |
| P5 | `P5Swerdlow.pdf` | Swerdlow article on Ptolemy's planetary latitude theories. |
| P6 | `P6Duke.pdf` | Duke, “Mean Motions in Ptolemy's Planetary Hypotheses.” |
| P7 | `P7latitude.pdf` | Article on improved superior-planet latitude parameters (2026); later latitude work. |
| P8 | `P8Pedersen.pdf` | Pedersen, survey of the *Almagest*; contextual check. |
| P15 | `P15Riddell.pdf` | Riddell, *The Latitudes of Venus and Mercury in the Almagest*. |
| C1 | `C1revolutionibus.pdf` | English *De revolutionibus* translation; compare readings with original print and commentary. |
| C2 | `C2Kopernik.pdf` | Nuremberg 1543 Latin printing, e-rara / ETH Zürich, Rar 1370 (cover identifies DOI 10.3931/e-rara-420); critical numeric readings visually checked in Phase 3B. |
| C3 | `C3SwerdlowNeugebauer.pdf` | Swerdlow and Neugebauer, *Mathematical Astronomy in Copernicus's De Revolutionibus*. |
| C4 | `C4Swerdlow.pdf` | Swerdlow, *The Derivation and First Draft of Copernicus's Planetary Theory*; *Commentariolus* work. |
| C6 | `C6Cramer.pdf` | Cramer, *The Copernican System: A Detailed Synopsis*; secondary overview. |
| C7 | `C7Riddell.pdf` | Riddell, *Parameter Disposition in Pre-Newtonian Planetary Theories*. |
| C9 | `C9Retyk.pdf` | Polish Rheticus *Narratio prima* material; language/edition to check. |
| M1 | `M1survey.pdf` | Chabás and Goldstein, *A Survey of European Astronomical Tables in the Late Middle Ages*. |
| M2 | `M2Alfonsine.pdf` | *The Alfonsine Tables of Toledo*: Castilian canons, commentary, Parisian legacy. Keep Toledo and Parisian traditions distinct. |
| M5 | `M5Alfonsine.pdf` | Alfonsine-related PDF; image/text extraction gave no reliable title. Identify bibliographically before using. |
| D1 | `D1latitude.pdf` | *Ptolemy, Bianchini, and Copernicus: Tables for Planetary Latitudes*; later latitude comparison. |

**Known unavailable reference:** M3, *Essays on Medieval Computational Astronomy*, was requested in the research plan but is not among the downloaded PDFs. It may aid later medieval table work; its absence does not block Mars longitude.

## Where to begin reading

- **Ptolemy's longitude and geometry:** P1 Book IX (mean motions and Mercury); Book X (Venus and Mars, especially X.6–10); Book XI (Jupiter, Saturn, and the calculation of true longitude). Book XII addresses stations/retrogradations; Book XIII latitude. Lunar theory is in Books IV–V; solar theory in Book III. Cross-check P2's planetary sections and P3/P4 before labeling any *Planetary Hypotheses* variant.
- **Copernicus:** C1 Books III (Earth/solar motion), IV (Moon), V (planetary longitude), VI (latitude). C3 provides mathematical derivations; C4 is relevant to the *Commentariolus*. The C1 preface itself notes textual/printed variants, so record the edition used for each number.
- **Parisian Alfonsine work:** M1 chapters 4–7 cover precession/apogees, mean motions/radices, equations, and true positions. M2 chapter 4 gives astronomical commentary and chapter 6 the later Parisian tradition; its Toledo canons cannot be assumed to supply the Parisian parameter set. Inspect M5's identity before using it as a numerical source.
- **Latitude and physical ordering later:** P1 Book XIII; P5, P7, P15, and D1 for interpretations; P3/P4 for the *Planetary Hypotheses* and its physical arrangement.

Historical source citations in model data must give an exact passage/table and page in the identified edition. The map above is only a reading guide, not numerical transcription or validation. The public upstream code references are [SOL](https://github.com/gantemur/sol) and [CALTIB](https://github.com/gantemur/caltib); local snapshots, not their current main branches, were audited here.


## Phase 3B extraction audit

The [Copernican specification](copernicus-earth-mars.md) and two JSON parameter records now distinguish N1543, C1's restored earlier readings, geometric derivations, printed-table parameters and scholarly reconstructions. C2 III.23 f.93v confirms the solar anomaly epoch 211;14 against C1's 211;19. C2 V.1 f.134v and table f.137v confirm Mars commutation 168;28,30,36,4 per Egyptian year; f.135r's separate proper-motion number is slightly inconsistent and retained as an unused alternative. These are original folio locators, not PDF-page offsets. C3 p.543's geometry/table warning and pp.362–363's missing Mars apsis law govern the implementation status. No source scans, images or substantial extracts have been added to the repository.
