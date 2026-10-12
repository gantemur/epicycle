# Epicycle Atlas: historical model and parameter census

**Research audit, 12 October 2026.** This is a source-informed eligibility catalogue, **not** a claim that every parameter below has been independently transcribed from its first printed or manuscript witness or that the resulting arbitrary-date ephemerides are complete.

## 0. Scope, corpus and interpretation

The scope is positional mathematical astronomy before the establishment of Keplerian ellipses, emphasizing historical circular/eccentric/epicycle models and historically computable tables. It includes the Sun (Earth in Copernicus's annual theory), Moon and all five classical planets. Additional historical traditions are included as candidates; original date-based models and mere geometrical equivalences must not be conflated.

**Actually examined for this audit:** P1 = G. J. Toomer's translation of the *Almagest* (especially Books III–V and IX–XIII); P2 = O. Neugebauer, *A History of Ancient Mathematical Astronomy*, notably printed pp. 55–60, 70, 88–90, 185, 207–226, 900–916; P4 = P. Hullmeine (2024), *Ptolemy's Cosmology in Greek and Arabic*, a critical edition/translation of the *Planetary Hypotheses*; C1 = E. Rosen's translation of *De revolutionibus* (Books III–VI); C3 = N. M. Swerdlow and O. Neugebauer, *Mathematical Astronomy in Copernicus's De Revolutionibus* (1984), especially printed pp. 543–547 and sections identified below; M1 = J. Chabás and B. R. Goldstein, *A Survey of European Astronomical Tables in the Late Middle Ages*. The pivotal numerical summary tables (P2 p. 185; C3 pp. 544–547) have been inspected as page images, not relied upon solely as OCR.

**Identified in project inventory, not directly inspected in this pass:** P3 Hamm, P5 Swerdlow on Ptolemy's latitude, P6 Duke on *Planetary Hypotheses* mean motions, P7 recent latitude paper, P8 Pedersen, P15 Riddell on inferior-planet latitude, C2 original 1543 print (used and checked in earlier project phases), C4 Swerdlow on *Commentariolus*, C6/C7, M2 Toledo Alfonsine, M5 unidentified, and D1 planetary-latitude tables. Their presence in local `private/sources/` does **not** by itself upgrade any parameter to verified status. External specialist works and online digital editions are included as identified acquisition priorities; they are not equivalent to a complete primary-source audit.

### Inclusions and evidence grades

- **A — working and checked:** source-linked geometry, versioned parameters, date evaluator, cross-language/independent mathematical validation; incomplete historical tabular validation still disclosed.
- **B — readily source-extractable:** substantial numerical constants and book/section/table locators have been examined, but full date arguments, epochs and exact historical algorithms still require transcription and independent regression.
- **C — source candidate:** identifiable mathematical model or tabular tradition with specialist sources, but incomplete accessible parameter/equation/witness audit.
- **D — conceptual/derived:** geometrical reformulation, a kinematic reinterpretation, or a non-source-verified dataset; not an independently supported historical planetary model.
- **Outside core:** post-Kepler ellipses and modern ephemerides; possible comparison references, not historical circular models.

The grade belongs to a **body + author/work + version + observable + calculation convention**, not an entire author or era. Longitude, latitude, radius/distance, tabular procedures, frame choices and date laws can and often must have different grades.

## 1. Cross-family census (body-specific)

| Body | Ptolemy, *Almagest* | Canobic / *Planetary Hypotheses* / *Handy Tables* | Copernicus *Commentariolus* | Copernicus 1543 | Medieval Latin / Islamic | Tycho and later |
|---|---|---|---|---|---|---|
| Sun (annual Earth) | B: solar eccentric, equation, epoch | B/C: mostly shared solar law, differing precession/time procedures | C: early annual construction | **A**: Earth double eccentric implemented; apparent Sun derivable | C: solar apogee/precession variants, Ibn al-Shatir | C: Tychonic solar theory and epoch/rate variants |
| Moon | B: IV simple + V evection/prosneusis; inclination | B/C: Canobic nodal correction; *PH* equivalent normalized geometry plus altered mean motion | C: lunar double epicycles | **B**: two epicycles, parameters/epochs available; not implemented | C: Ibn al-Shatir distinct lunar distances; Alfonsine/Toledan tables | C: Tycho/Longomontanus revised lunar theory |
| Mercury | B: moving eccentric + epicycle, greatest implementation complexity | **B**: *PH* e2=2;30 rather than 3 and r=22;15 rather than 22;30; revised latitudes | C | B/C: special 2-eccentric + small epicycle with competing apsidal rates | C: Ibn al-Shatir, Parisian equations, Regiomontanus | C: mathematical architecture vs fitted tables |
| Venus | B: epicycle/equant arrangement | B/C: later latitude changes; no assumption of whole-new longitude | C | B: 246/104 double eccentric, orbit 7193 Earth units | C: Ibn al-Shatir, Alfonsine, alternative solar arguments | C |
| Mars | **A**: implemented longitude; partial tabular validation | B/C: latitude/epochs/tabular refinements | C | **A**: implemented Earth+Mars; missing original all-date apsidal law | C: Ibn al-Shatir, Alfonsine, distinct variants | C: authentic Tycho vs mere Tychonic re-centring |
| Jupiter | **B**: normal equant + epicycle | B/C: revised latitude (equal 1;30 inclinations), distinct epoch and tables | C | **B**: complete-looking radius/eccentric/rate summary | C: Maragha/Ibn al-Shatir, Alfonsine | C |
| Saturn | **B**: normal equant + epicycle | B/C: revised latitude (equal 2;30 inclinations), distinct epoch and tables | C | **B**: complete-looking radius/eccentric/rate summary | C: Maragha/Ibn al-Shatir, Alfonsine | C: Saturn-specific models/parameters must be checked |

**Interpretation:** A table of mean positions and an epicycle diagram do not necessarily specify all inputs required to evaluate a historical apparent place at any date. For every model we must additionally know the calendar, epoch, mean motions, apogee/node evolution, meridian, interpolation/rounding rules, reference plane/equinox, and any dependency on another body's motion.

## 2. Ptolemy, *Almagest*: concrete starting numbers

### 2.1 Sun (Book III)

From P1 Book III and P2 printed pp. 55–60:

- Solar eccentric/deferent radius `R=60`; Earth-to-centre eccentricity `e=2;30` (equivalent radius `1/24 R`).
- Fixed **tropical** apogee `Gemini 5;30 = 65;30°`.
- Mean solar longitude at epoch **Nabonassar 1, Thoth 1, Alexandria noon**: `Pisces 0;45 = 330;45°` (P2 p. 60).
- Tropical year `365;14,48` days; mean solar motion `0;59,8,17,13,12,31° per mean day` (P2 p. 55).
- Ptolemy's solar equation and *Almagest* III.6 table are distinct implementations: continuous geometric values need not agree to the final arcminute with tabular interpolation and historical rounding. The eccentre and epicycle are mathematically equivalent presentations of **one** solar theory, not independent historical predictions.

**Vetting: B and priority 1.** A small, fully sourced longitude evaluator with a strong epoch and one worked position; eventually implement separate III.6 table reproduction. It also provides mean-solar data needed by the Ptolemaic Moon and inferior planets.

### 2.2 Five planetary longitude theories (Books IX–XI)

P2 p. 185 gives the following exact summary at deferent radius `R=60`. The *Almagest* mean motions are in IX.4; geometrical planetary construction and true-longitude/correction tables span IX–XI (and stations XII).

| Body | Epicycle `r` | Eccentricity `e` | Maximum / minimum `OC` | Apogee longitude at Nabonassar epoch | Assessment |
|---|---:|---:|---:|---|---|
| Saturn | `6;30` | `3;25` | `63;25` / `56;35` | Scorpio `14;10` = **224;10°** | B: ordinary superior-planet model |
| Jupiter | `11;30` | `2;45` | `62;45` / `57;15` | Virgo `2;09` = **152;09°** | B: ordinary superior-planet model |
| Mars | `39;30` | `6;00` | `66;00` / `54;00` | Cancer `16;40` = **106;40°** | A: already in atlas |
| Venus | `43;10` | `1;15` | `61;15` / `58;45` | Pisces `16;10` = **346;10°** | B: linked to mean Sun; inspect its exact inner-planet conventions |
| Mercury | `22;30` | `3;00` | **`69;00` / `55;34`** | Libra `1;10` = **181;10°** | B but difficult: moving eccentric; maximum `R+3e`, not `R+e` |

P2 p. 185 supplies additional epoch arguments for the mean centre and epicycle anomaly (verify the notation and signs in the original before storing): Saturn `296;43/34;02`, Jupiter `184;41/146;04`, Mars `3;32/327;13`, Venus `330;45/71;07`, Mercury `330;45/21;55`. These numbers **must not** be pasted into numerical records until their precise definitions and reference directions are transcribed.

**Implementation implications:** Jupiter and Saturn are the lowest-risk planetary additions based on the already tested Mars equant/deferent machinery. Venus requires the historical Sun-coupling in the inner-planet epicycle centre. Mercury is not obtained by changing Mars's three constants: its eccentric centre moves, the distance extrema are anomalous, and its equations depend on that changing geometry. The original XI.11 tabular interpolation is a separate evaluator, not the same as exact Cartesian geometry.

### 2.3 Ptolemaic lunar model (Books IV and V)

Book IV initially models eclipse/syzygy positions using a simple epicycle; Book V introduces the second inequality (commonly called evection), a rotating eccentric centre and the **prosneusis/inclination of the lunar epicycle's reference direction**. P2 printed pp. 70, 85–90, particularly p. 88:

- Original normalization `R=60`, lunar epicycle radius `r=5;15`, eccentric offset `e=10;19`; eccentric-circle radius `R-e=49;41` (the orientation and choice of reference radii matter).
- Lunar mean longitude `13;10,34,58,33,30,30°/day`.
- Revised mean anomaly `13;3,53,56,17,51,59°/day` (distinct from an intermediate value in P2 p. 70).
- Mean latitude argument `13;13,45,39,48,56,37°/day`.
- Derived retrograde nodal motion `−0;3,10,41,15,26,7°/day`.
- Inclination `5°`. Lunar distance extrema within the idealized model reach `65;15` and `34;7` in the stated reference radius, an historically problematic near-twofold ratio (P2 p. 88).

**Vetting: B, high historical value, nontrivial.** Implement a simple syzygy/first-inequality demonstrator first, but treat the full Book V longitude, latitude and distance as a distinct, source-verified target; the simpler demonstrator must not masquerade as Ptolemy's full lunar predictions.

### 2.4 Planetary latitudes (Book XIII)

Longitude and latitude are separate mathematical submodels. P2 printed pp. 207–226 and particularly pp. 907–909, supplemented later by project P5/P15/D1, distinguish deferent-plane inclination `i0` and epicycle-plane inclination/slant `i1`/`i2`:

| Body | *Almagest* `i0` | *Almagest* epicycle angle(s) | Specific concern |
|---|---|---|---|
| Saturn | `2;30°` | `4;30°` | Later *PH*: `i0=i1=2;30°` |
| Jupiter | `1;30°` | `2;30°` | Later *PH*: `i0=i1=1;30°` |
| Mars | `1;00°` | `2;15°` | Later *PH*: `i0=i1=1;50°` |
| Venus | varying deferent tilt `0…+0;10°` | `2;30°`, `3;30°` | *PH* fixed tilt, equal epicycle angles, careful plane conventions |
| Mercury | varying deferent tilt `−0;45…0°` | `6;15°`, `7;00°` | *PH* fixed tilt and equal epicycle angles `6;30°` |

Do not translate these directly into modern orbital inclinations. A 3D rendering must reproduce Ptolemy's historically defined rotating planes, inclinations, deviations, apogee/node connections and the original latitude algorithms, not just attach a sine wave to an existing longitude result. Moon's latitude is separately specified.

## 3. Ptolemy beyond the *Almagest*: genuine alternatives versus equivalent presentations

Sources: P2 printed pp. 900–916, P4 Hullmeine's complete Greek/Arabic edition and translation, and the PAL catalogue: <https://ptolemaeus.badw.de/work/141> (partial surviving Greek / complete Arabic) and <https://ptolemaeus.badw.de/work/153> (*Handy Tables*).

### 3.1 Mercury: source-supported alternative geometry

This is a **real** alternative to the *Almagest* model, not just a different diagram. P2 printed pp. 907–908 (especially table 18):

- *Almagest*: moving-eccentric component `e1=e2=3`, epicycle `r=22;30`.
- *Planetary Hypotheses* (and Canobic evidence): `e1=3`, `e2=2;30`, epicycle `r=22;15`.

The relationship and historical source witnesses should be checked against P4 and P1 before implementation. Its contrast with the *Almagest* Mercury construction would make an excellent later paired model.

### 3.2 Lunar changes: some rates differ, some radii are merely renormalized

P2 p. 903: *Planetary Hypotheses* `R=60, e=12;30, r=6;20, i=5°`, substantially a **different normalization** of the *Almagest* `e=10;19, r=5;15`. Do **not** count this alone as a new predictive theory. But P2 p. 904 reports a slightly different *PH* lunar anomaly daily motion, approximately `13;3,53,54…°` versus *Almagest* `13;3,53,56,17,51,59°`; validate this at original-table precision.

The **Canobic Inscription** explicitly revises the lunar node/epicycle mean rate (P2 p. 914): lunar reference-circle epicycle daily motion `13;13,45,40,21,51,21°` and implied nodal motion magnitude `0;3,10,41,48,20,51°/day` versus the *Almagest* nodal magnitude `0;3,10,41,15,26,7°/day`. This is a serious candidate for a precisely testable small numerical lunar variant, not a wholesale new lunar mechanism. Check the manuscript variants indicated by P2 before classing it as primary-source verified.

### 3.3 Outer and inner latitude revisions

P2 pp. 908–909: *Planetary Hypotheses* makes outer planetary epicycle planes parallel to the deferent plane using `i0=i1` (Saturn `2;30`, Jupiter `1;30`, Mars `1;50`), unlike the *Almagest* two-parameter values above. For inferior planets, the later model adopts fixed deferent inclination and equalizes paired epicycle angles (Venus `3;30`, Mercury `6;30`) where earlier models had varying inclination and two different angles. These are meaningful **latitude** versions; do not automatically carry them into longitude.

### 3.4 Epochs, physical distance and tabular algorithms

The *Planetary Hypotheses*/*Handy Tables* use the **Philip/Death-of-Alexander** epoch where the *Almagest* uses Nabonassar. Epoch values and parameters sometimes disagree slightly, and their original correction tables need independent reconstruction. P4 also preserves physical nesting and absolute-distance proposals: those are an **additional layer with earth-radius units and ordering assumptions**, not proof of a new five-planet longitude prediction. In particular, PH unit changes for the Moon and scale changes for celestial spheres must be kept separate.

**Vetting:** real additional configurations exist (Mercury longitude, lunar nodal/mean motion, several latitudes), but a project-wide `Almagest/PH/Handy` toggle applied uniformly to every body would be historically false.

## 4. Copernicus 1543: all seven bodies and parameter availability

C1 *De revolutionibus* III (Earth), IV (Moon), V (longitudes), VI (latitudes); C3 specialist discussion and **printed pp. 543–547** provide concrete parameter inventories. These tables list the numerical *results of geometric derivations*; the corresponding original correction tables sometimes retain **older or differently rounded parameters** (C3 p. 543 and pp. 168–169). Geometry and historical table computation remain distinct inclusion targets.

### 4.1 Earth / Sun (already implemented)

The annual Earth's double eccentric has `R=10000`, large eccentric component `e1=369` and small moving component `e2=48`, with mean Sun G separated from true Sun S. Earth's annual direction and the apparent geocentric Sun are obtainable from the existing evaluator. C3 p. 544 records solar mean motions and epochs; the repository has exact versioned data and worked cases, including the documented early printed `211;14` versus Rosen's `211;19` reading. **A**, no new historical model needed: expose a new Sun observable and construction appropriate to the existing underlying Earth model.

### 4.2 Moon (Book IV)

C3 **p. 544**, carefully checked as an image:

- Reference lunar deferent radius `R=10000`.
- Two epicycle radii `r1=1097`, `r2=237`.
- Effective lunar epicycle radius at syzygy `r_min=860`, at quadrature `r_max=1334`.
- Approximate maximum lunar equation `4;56°` at syzygy and `7;40°` at quadrature.
- Inclination `5°`.
- Christ-epoch mean elongation, anomaly, latitude argument (sexagesimal notation) `3,29;58°`, `3,27;7°`, `2,9;45°` respectively; exact notation and epoch origin to be confirmed in mathematical derivation.
- Mean annual elongation `2,9;37,22,36,25°/Egyptian year`, anomaly `1,28;43,9,7,15°/year`, latitude argument `2,28;42,45,17,21°/year` (where the integer part before the semicolon is itself sexagesimal), as well as corresponding daily values in C3 p. 544.

**B** for parameter recovery, **not yet** a working evaluator. Particularly attractive paired with Ptolemy Book V because the Copernican double epicycle offers a different distance variation; must reconstruct exact phase directions and lunar latitude/nodal conventions from C1 IV and C3 pp. 193–231. Keep Copernicus's Moon Earth-centred within his heliocentric cosmology.

### 4.3 Five planets: tabulated geometric constants

For **superior planets**, C3 normalizes their main circle to `R=10000`: `2e` is a reported double eccentricity, `e1` the eccentric offset, `r′` the small epicycle, and `r` the annual Earth-circle radius expressed in that planet's radius units. These are not Ptolemy's epicycle radii.

| Body | `2e` | `e1` | `r′` | Earth annual radius `r` in planet units | Apogee rule noted by C3 | Readiness |
|---|---:|---:|---:|---:|---|---|
| Saturn | 1139 | 854 | 285 | 1090 | uniform `0;0,36°/Egyptian year` | B, simplest coupled extension |
| Jupiter | **917** | 687 | 229 | 1916 | uniform `0;0,12°/Egyptian year` | B; **rounding/summary mismatch below** |
| Mars | 1960 | 1460 | 500 | 6580 | nonuniform original law missing; separate declared policy | **A** longitude, already live |

**Important discrepancy:** C3 printed p. 545 has Jupiter `2e=917` but also `e1=687` and `r′=229`, which add to **916**, not 917. Do not silently repair or impose the identity using a derived integer; investigate the source derivation, historical roundings and any printing issue and preserve the printed values separately if warranted. Saturn (854+285=1139) and Mars (1460+500=1960) have no such discrepancy.

The inferior planets have genuinely different constructions and scales:

| Body | Source constants | Mean/apsidal status | Assessment |
|---|---|---|---|
| Venus | C3 p. 546 `2e=350`, `e1=246`, `e2=104`, Venus orbital circle `r=7193` relative to Earth's 10000 | Mean longitude tied to mean Sun; apogee `48;20°` fixed; epicycle/counter-motion requires C1 V and C3 geometry | B, do not reuse superior-planet code blindly |
| Mercury | C3 p. 547 `e=524`, `e1=736`, `e2=212`, mean orbital radius `r̄=3763`, small epicycle `r′=190` | Two apsidal-rate and epoch alternatives, e.g. rates `0;1,14,11°/year` and `0;0,57,20°/year`, not one unquestioned rule | B/C, high-risk interpretation and source variant |

C3 p. 546 also lists historical latitude parameters Mars `1;51, 0;9`, Venus `2;30, 3;30, +0;10`; p. 545 Saturn `2;44, 2;16`, Jupiter `1;42, 1;18`; p. 547 Mercury `6;15, 7;0, −0;45`. Their meaning belongs to Copernicus's Book VI mathematical planes; **do not** treat them as a direct 3D modern orbit inclination.

For all five, `mean motion`, `mean anomalies`, and epoch arguments are in the very same C3 pp. 545–547, including explicit Christ/Alexander/1500 entries. Transcribe the chosen **Christ-era original epochs**, preserving ancillary modern-computed 1500 values as diagnostics rather than silently declaring them historical originals. Original Nuremberg witness C2 may differ from C1's reconstructed/misprinted variants (the project already discovered several in Mars).

### 4.4 Earlier Copernicus and derived Tychonic representation

The early *Commentariolus* is a separate historical theory to vet from C4 (Swerdlow 1973, pp. 423–512), not a simplified toggle for 1543. An ordinary kinematic re-centring of Copernican planetary vectors to make Earth stationary is a **derived geoheliocentric visualization**, not automatically Tycho's historically specified 1588 planetary theory. Distinguish geometric transformation from a new historical parameter set.

## 5. Medieval Latin astronomy and Alfonsine families

Main audit source M1 Chabás–Goldstein, supplemented by the project's M2 Toledo source inventory. **Not one unified model called ‘Alfonsine’.** Competing witnesses, numerical tables, epochs, canons and mean motions can yield distinct results.

Candidate subfamilies to catalogue separately:

1. **al-Khwārizmī / Indian-derived tabular traditions**, especially different lunar/planetary latitude formulations; see M1 pp. 110–112.
2. **al-Battānī and Toledan Tables**: distinct solar-apogee, mean-motion and precession assumptions; consult original tables and sources rather than extracting a few constants from modern summaries.
3. **Castilian/Toledo Alfonsine** original canons of Alfonso X (~1270); M2 presents edition, commentary and transmission.
4. **Parisian Alfonsine** 1320s onward: mean motion, radices, apogees/precession including trepidation, equation tables. M1 pp. 47–72 and 108–116; source witness and epoch must be declared.
5. **John of Murs, John of Lignères, John Vimond, Giovanni Bianchini, Tabulae Anglicanae**: sometimes especially distinctive in double-argument and latitude tables; do not assign their calculations to 'Alfonsine' globally.
6. **Regiomontanus moving eccentric representations** of Mercury/Venus: first establish whether predictions differ from the source epicycle model; an equivalent rearrangement is a display, not a new prediction.

Concrete medieval numerical entries already identified:

- Parisian Alfonsine linear precession corresponding to 360° in **49,000 years**, together with a 9°-amplitude **access/recess (trepidation)** term of 7,000-year period; M1 pp. 49–51. A schematic combination is `360 t/49000 + asin(sin 9° · sin(360 t/7000))`, but this is **not executable without a sourced epoch, sign/phase conventions, and exact tabular interpolation**.
- Parisian solar and inferior-planet mean daily motion `0;59,8,19,37,19,13,56°/day` in one table tradition (M1 p. 55–56), different from Ptolemy's `0;59,8,17,13,12,31`.
- An **explicit later witness** for the total-precession epoch is Bianchini's epoch: M1 p. 52 specifies **17 May, AD 16** (retain exactly this date and convert only after choosing the manuscript calendar/epoch convention). M1 also notes that this attribution to Ptolemy's star catalogue contradicts Ptolemy's own AD 137 epoch; do not generalize Bianchini's radix to all Alfonsine tables.
- Azarquiel's separately attributed proper motion of solar apogee **1° per 279 Julian years** (M1 p. 47), not automatically transferable to every 'Toledan' or 'Alfonsine' construction.
- Different historical maximum planetary-latitude/equation tables documented by M1 pp. 108–116. These may form genuine *table-method* variants without defining a new physical geometry.

**Vetting: C.** Very good eventual research comparisons, but do not implement from a generic modern ‘Alfonsine constants’ list. Choose one edited manuscript/print, a specific date problem, exact tabular entries, and interpret that algorithm fully; DISHAS (https://dishas.obspm.fr/) and Kanon are appropriate scholarly discovery/transcription tools.

## 6. Islamic theoretical astronomy beyond Ptolemy

These constructions are distinctive research-level comparison candidates, not interchangeable 'Arabic epicycles'.

| Tradition / author | Candidate bodies | Mathematical character | Evidence currently at hand | Grade |
|---|---|---|---|---|
| Naṣīr al-Dīn al-Ṭūsī, *Tadhkira* | Moon, superior planets, etc. | Coupled circles / Ṭūsī couple to remove objectionable motions | Ragep scholarly edition/translation, Duke reconstructions | C |
| Muʾayyad al-Dīn al-ʿUrḍī | Superior planets / Venus | Equant replacement, ʿUrḍī lemma | Specialist papers, Duke, secondary comparisons | C |
| Quṭb al-Dīn al-Shīrāzī | Superior planets | Marāgha-style replacements, sometimes mathematically equivalent to ʿUrḍī | Specialist reconstructions | C |
| Ibn al-Shāṭir (Damascus, 14th c.) | **Sun, Moon, all five planets, latitude** | Fully developed geometrical replacements, Earth–Moon distance improvement, original Mercury model | Penchèvre critical Arabic/French edition, Roberts 1957, Kennedy–Roberts 1959 | **C, unusually high source-acquisition priority** |
| Ibn al-Haytham / earlier critiques | General orbital construction | Critical and geometrical programs, not necessarily date-calibrated ephemerides | Penchèvre and specialist literature | C/D |

Erwan Penchèvre, *Ibn al-Šātir, Kitāb nihāya al-sūl* (critical edition, translation and mathematical commentary), https://arxiv.org/abs/1709.04965, is especially valuable because it approaches a **whole solar–lunar–planetary catalogue**. Complement with V. Roberts, “The Solar and Lunar Theory of Ibn ash-Shāṭir,” *Isis* 48 (1957), 428–432, DOI 10.1086/348609; E. S. Kennedy and V. Roberts, “The Planetary Theory of Ibn al-Shāṭir,” *Isis* 50 (1959), 227–235, DOI 10.1086/348774. A model diagram or set of circle ratios alone does not guarantee the historical mean motions, epoch, and arbitrary-date algorithm; verify these separately. Do not state as established that Copernicus personally used a specific Islamic source; mathematical resemblance and an actual documented transmission path are different claims.

## 7. Renaissance alternatives, Tycho and boundary of the project

- **Erasmus Reinhold's *Prutenic Tables* (1551):** Copernican-derived *tables* but with its own epochs/algorithms and some altered mean/rate choices. A historically distinct **tabular prediction** to source before it is called 'Copernicus 1543'. Source C3 discusses a Prutenic Mars apsis rate alternative; its mere existence is not authority to replace current source-linked rate.
- **Tycho Brahe 1580s–1602:** separate his **geoheliocentric system geometry** from genuinely new solar, lunar and planetary parameters. A Tychonic-style geocentric translation of Copernicus may be offered as a derived representation with transparent provenance, not named a source-verified Tycho ephemeris. Body-specific Tycho theories need edition and witness.
- **Tycho/Christian Longomontanus Moon:** particularly rewarding. Swerdlow, “The Lunar Theories of Tycho Brahe and Christian Longomontanus in the *Progymnasmata* and *Astronomia Danica*,” *Annals of Science* 66 (2009) 5–58, DOI 10.1080/00033790802364429, documents meaningful variations of equation, nodes, inclination, parallax and apparent diameter. Tycho's earlier variants and Longomontanus's 1622 tables are **distinct**.
- **Kepler's circular 'vicarious hypothesis' of Mars** is potentially within the last pre-elliptic stage, but should be introduced only as its precisely sourced, historically bounded construction, not Kepler's later elliptical solution.
- **Kepler's *Rudolphine Tables* (1627): outside the circular-model core**, since its predictions depend on Keplerian elliptical theory, despite their derivation from Tycho's observations. Keep it as a potential *historical comparison benchmark*, not a Tychonic circular model.

## 8. Other mathematical cultures and the selection boundary

- **Indian siddhāntic astronomy**: *Sūryasiddhānta* manda/sīghra epicyclic corrections, mean revolutions, nodes, solar/lunar/planetary coordinates. Burgess's 1860 translation, chs. 1–2 (https://www.swaveda.com/texts/surya-siddhanta/1/ and /2/), provides a starting primary-text translation. Version, chronology, constants and edition selection need a dedicated audit. This is not a minor reparameterization of Ptolemy.
- **Babylonian mathematical astronomy**, including Systems A and B, is historically fundamental, but its zigzag/step/tabular schemes are not simply systems of physical circles. It belongs in a future **historical tables** display rather than a misleading epicycle construction.
- **Eudoxus, Callippus, Aristotle**: homocentric sphere kinematics and qualitative histories; allow an independent sphere-model module only where numerical periods, orientations and starting conditions can genuinely be sourced. Avoid filling unspecified ancient arguments with modern parameters and calling the result reconstructed history.
- **Hipparchus**: simple epicyclic/eccentric solar/lunar antecedents, several reconstructions through Ptolemy; appropriate only with explicit attribution of what survives vs what is modern inference.
- **Observational modern reference** (JPL Horizons, DE, VSOP): eventually allowed as *calibrated comparison*, never a source for historical parameters or a substitute for historical mean motions.

## 9. Recommended admission protocol

Before a new model is admitted to the atlas's public registry as an independently identified historical theory, prepare:

1. **Identity:** body, author, work, model version, witness/edition, source passages and scholarly derivation locators; state whether it is original, reconstructed, or a mathematical equivalent.
2. **Observable contract:** longitude (sidereal/tropical), latitude, relative distance, angular separation, local solar phase, and possible geocentric/true-Sun display centres; mark unsupported observables rather than filling them with zeros.
3. **Versioned data:** exact original sexagesimal notation, normalization/radius units, mean motions, initial arguments, epochs, apsidal/nodal laws, reference directions, and any known source disagreements; original/source vs scholar inferred vs software assumption status per datum.
4. **Historical chronology:** calendar, BCE/astronomical year numbering, day boundary (often astronomical noon), UT1 assumed bridge, meridian, mean versus apparent solar time, Egyptian versus Julian year, chosen ecliptic/equinox and historical precession.
5. **Calculation path:** explicit signed equations/vectors, order of tabular corrections or geometry, historical interpolation and rounding algorithm when claiming original tabular predictions; document all dependent models, e.g. mean Sun/solar elongation.
6. **Validation pyramid:** independent analytic geometric identities; published parameter derivation/example; worked source-table row; an independently transcribed set of times covering meaningful anomaly extrema; Python–TypeScript fixture agreement; careful distinguish agreement with historical source numbers from observational accuracy.
7. **Date behavior:** mathematically defined continuation vs original historically specified secular evolution; optional reconstruction/extrapolation policies visibly declared. Date policy must be body-specific and not freeze unrelated workspace displays.
8. **Visual integrity:** circle scale and origin invariance, correct observer-ray vertex, documented projection, no intentionally exaggerated eccentricity without prominent warning, aligned legends and bilingual descriptions.
9. **Provenance independence:** historical source -> derived Python evaluator -> browser, compared against source tables; inherited SOL / van Gent / Duke animation agreement is not independent confirmation.

A 'model' can reasonably provide only one observable with partial validation, provided this limitation is explicit. But a pile of numerical constants is not itself a calendar-ready planetary theory. Store alternative witnesses/rates as separate choices rather than smoothing them into a synthetic hybrid.

## 10. Ranked implementation and sourcing campaign

### Immediate engineering candidates (parameters strong, implementation short)

| Priority | Deliverable | Why now | Gate to move to public 'A' |
|---|---|---|---|
| **1** | Ptolemy *Almagest* Sun longitude + source-table procedure later | Complete simple numbers/epoch; supports Venus/Mercury and lunar elongation | III.2, III.6 source fixtures; independent solar angular equation; chronology checks |
| **1b** | Copernicus Earth/Sun as explicit annual geometry and geocentric apparent solar longitude | Earth geometry already evaluated and tested; gives paired historical Sun comparison | Reuse verified 1543 Earth record; distinguish true/mean Sun and solar frame policies |
| **2** | Ptolemy Jupiter and Saturn longitude | Highest-confidence Mars-style deferent/equant reuse; Table p185 constants | Exact IX.4 rates/epoch directions, selected XI.11 table checks, geocentric longitudes |
| **3** | Copernicus Jupiter and Saturn longitude | C3 545 summary and Earth dependency available | Resolve Jupiter 917 vs 687+229 mismatch; verify source epoch, apsis uniform rates, source cases |
| **4** | Ptolemy Moon Book IV/V longitude (and distance interpretation) | Central to historical astronomy, true distinct double anomaly | Precise rotating lunar eccentric/prosneusis geometry and IV/V source cases |
| **5** | Copernicus 1543 Moon longitude | C3 p544 complete two-epicycle constants and mean arguments; notable distance comparison | Exact IV geometry, rate/phase conventions, astronomical example & independent scalar checks |
| **6** | Ptolemy Venus and Copernicus Venus longitude | Solar dependence, strong source summary, nontrivial inner-planet geometry | Inner centre/mean-Sun laws; original table/source fixtures |
| **7** | Ptolemy *Almagest* Mercury, then Ptolemy PH Mercury and Copernicus Mercury | Rich genuinely different models, but hardest mechanics and alternate parameters | Moving eccentric/revised two centres, two Copernican apsis choices, witness checks |

### Research acquisition (may proceed in parallel, but should not gate the first Sun implementation)

**Track A — Ptolemy alternative versions and latitude:** read P3/P4, P5, P6, P15/D1; transcribe *PH* Mercury and Book XIII latitude; investigate Canobic lunar node exact witness and algorithm. Avoid claiming full Handy Tables from P1 alone.

**Track B — medieval original tables:** M1/M2/M5 bibliographic resolution, manuscript-specific Parisian edition via DISHAS; first transcribe an independently checkable Sun or Mars row before adding a generic interface option.

**Track C — Islamic geometry:** obtain Penchèvre's Ibn al-Shāṭir edition, Roberts, Kennedy–Roberts, Ragep al-Ṭūsī; create parameter-ledger and dates; prioritize the lunar model as an illuminating comparison with Ptolemy and Copernicus.

**Track D — early/late Copernican and Tycho:** C4 *Commentariolus* and Reinhold original *Prutenic Tables*; source Tycho original and Longomontanus lunar models separately, then body-specific planetary variants.

**Track E — Indian historical epicycles:** choose exact *Sūryasiddhānta* recension/translation and test a small independent Sun/Mars calculation, with specific chronological conventions.

## 11. Immediate research questions that must not be guessed

1. Which **original IX.4 mean motions and Nabonassar epoch positions** are to be chosen for each Ptolemaic longitude body, and do they agree with the figures summarized by P2 p185? Confirm integer-part sexagesimal notation and direction conventions.
2. For Ptolemy Moon, what exact Book V angles rotate the eccentric and prosneusis axis; what separate material is needed for lunar latitude and real distance? Use original worked examples, not modern textbook schematics.
3. Which C3 p545 **Jupiter eccentric** value(s) are independently rounded, a source table rather than pure geometry, or suspect print readings? Preserve `2e=917`, `e1=687`, `r′=229` pending resolution.
4. For Copernicus Venus/Mercury, which alternative eccentric and apsis versions belong to which observational dates, and are any secular laws missing? Compare C1, C2, C3 source witnesses before choosing defaults.
5. What exact medieval Parisian **radices, epoch, sign and interpolation** define the 49k/7k precession, solar/apogee and table calculations? A formula alone is not enough.
6. What mathematical constants in the *Handy Tables* differ from the *Almagest* as opposed to being table arrangement/epoch/normalization changes, for each particular body?
7. When new model families are added, which historical ecliptic/equinox and observer-time assumptions allow a **meaningful nominal comparison**, and when must subtraction be disabled?

## 12. Source and resource ledger

**Local examined:** P1 Toomer, *Ptolemy's Almagest*, Books III–V/IX–XIII; P2 Neugebauer, *A History of Ancient Mathematical Astronomy*, printed pp. 55–60, 70, 88–90, 185, 207–226, 900–916; P4 Hullmeine (2024), *Ptolemy's Cosmology in Greek and Arabic*, critical text/English translation; C1 Rosen, *De revolutionibus*, Books III–VI; C3 Swerdlow & Neugebauer (1984), *Mathematical Astronomy in Copernicus's De Revolutionibus*, printed pp. 543–547, 193–231 and relevant planetary chapters; M1 Chabás & Goldstein, *A Survey of European Astronomical Tables in the Late Middle Ages*, pp. 47–72, 108–116. Source ID = project-private audit label, not the public URL.

**External digital editions/tools:** Ptolemaeus Arabus et Latinus work 141 https://ptolemaeus.badw.de/work/141 and work 153 https://ptolemaeus.badw.de/work/153; Hullmeine full Arabic edited source https://ptolemaeus.badw.de/edition/7/194/text/1 ; DISHAS https://dishas.obspm.fr/ ; Duke historical planetary diagrams https://people.sc.fsu.edu/~dduke/models (not independent numerical authority).

**Research acquisition:** Penchèvre 2017 Ibn al-Shāṭir https://arxiv.org/abs/1709.04965 ; Roberts 1957 DOI https://doi.org/10.1086/348609 ; Kennedy–Roberts 1959 DOI https://doi.org/10.1086/348774 ; Swerdlow 1973 *Commentariolus* https://www.jstor.org/stable/986461 ; Swerdlow 2009 Tycho/Longomontanus lunar DOI https://doi.org/10.1080/00033790802364429 ; Chabás–Goldstein 2003 Toledo Alfonsine https://doi.org/10.1007/978-94-017-0213-3 ; Burgess 1860 *Sūrya Siddhānta* https://books.google.com/books?id=jpE7AAAAcAAJ .

### Bottom line

The source corpus supports a **coherent twenty-plus-model body/version research programme** but currently certifies **two completed historical Mars longitude evaluations** and the dependent Copernican Earth construction at atlas level. It already supports source-backed extraction for the Ptolemaic Sun, lunar theories, four other planetary longitudes, the 1543 Copernican Moon and four other planets; later historical families have distinct validated **existence** but not yet a complete project-specific parameter implementation. The next prudent step is a parameter transcription and independent test of Ptolemy's Sun, plus exposing the already-evaluated Copernican Sun, while simultaneously preparing precise Moon and Jupiter/Saturn ledgers.
