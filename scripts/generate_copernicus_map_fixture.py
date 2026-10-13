"""Generate research-side common-scale Map checks from existing Python models.

These are generated numerical checks, not transcriptions of Copernicus's tables.
The two civil dates use Julian Frauenburg local midnight/06:00 and one assumed
UT1 boundary at 19°40′ E (C3 p.170), as in comparison-time.ts.
"""

import json
import math
from pathlib import Path

from epicycle_atlas import copernicus_earth, copernicus_jupiter, copernicus_mars, copernicus_saturn
from epicycle_atlas.chronology import civil_to_local_jd
from epicycle_atlas.copernicus_superior import to_common_earth_units

OUTPUT = Path(__file__).resolve().parents[1] / "tests" / "fixtures" / "copernicus-map-generated.json"
FRAUENBURG_EAST = 19 + 40 / 60


def case(year, month, day, hour):
    local_jd = civil_to_local_jd(year, month, day, hour / 24)
    ut1_jd = local_jd - FRAUENBURG_EAST / 360
    local_days = local_jd - copernicus_earth.EPOCH_LOCAL_JD
    earth = copernicus_earth.evaluate_earth(local_days)
    planets = {
        "mars": to_common_earth_units(copernicus_mars.evaluate_mars(
            local_days, apsis_policy="sn-uniform-exploratory")),
        "jupiter": to_common_earth_units(copernicus_jupiter.evaluate_jupiter(local_days)),
        "saturn": to_common_earth_units(copernicus_saturn.evaluate_saturn(local_days)),
    }
    points = {
        "true-sun": earth["true_sun"], "earth": earth["earth"],
        **{body: result["planet"] for body, result in planets.items()},
    }
    distances = {
        f"earth-{body}": math.dist(points["earth"], points[body])
        for body in ("mars", "jupiter", "saturn")
    }
    return {
        "julian_frauenburg": [year, month, day, hour], "ut1_jd": ut1_jd,
        "local_days": local_days, "frame_id": "copernicus-1543-sidereal",
        "length_unit": "historical Earth annual radius = 10000",
        "mean_sun": earth["mean_sun"], "positions": points,
        "earth_to_planet_distances": distances,
        "planet_to_common_scales": {
            body: result["planet_to_common_scale"] for body, result in planets.items()
        },
    }


def main():
    document = {
        "provenance": "Generated from existing Python Copernican evaluators; not a source table",
        "mars_policy": "sn-uniform-exploratory",
        "cases": [case(1512, 1, 1, 6), case(2026, 10, 13, 0)],
    }
    OUTPUT.write_text(json.dumps(document, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
