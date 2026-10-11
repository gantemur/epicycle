"""Small conditional two-model comparison. Run with --help for the contract."""

import argparse
import json
import math

from .chronology import ScaledJulianDay, ptolemy_days_at_ut1
from .comparison import LongitudeSample, longitude_residual
from .copernicus_earth import copernicus_days_at_ut1
from .copernicus_mars import evaluate_mars as copernicus_mars, APSIS_POLICY
from .mars import evaluate_mars as ptolemy_mars, normalize


def compare_at_ut1(instant, alexandria_meridian, copernicus_meridian, *,
                   meridian_provenance, frame_offset_degrees=None,
                   frame_provenance=None, **apsis_options):
    """Two native predictions; residual only with an explicit planar alignment.

    frame_offset_degrees is ADDED to Copernicus's tropical longitude to put
    it in the declared Ptolemaic tropical comparison frame at this instant.
    A zero offset explicitly identifies both intended equinox-of-date origins;
    it is a nominal historical convention, not a modern frame calibration.
    This scalar alignment cannot transform between differently tilted planes.
    """
    if not isinstance(meridian_provenance, str) or not meridian_provenance.strip():
        raise ValueError("the two meridian choices need provenance")
    if (frame_offset_degrees is None) != (frame_provenance is None):
        raise ValueError("frame offset and provenance must be supplied together")
    if frame_offset_degrees is not None and (not math.isfinite(frame_offset_degrees) or
            not isinstance(frame_provenance, str) or not frame_provenance.strip()):
        raise ValueError("finite frame offset and nonempty alignment provenance required")
    p = ptolemy_mars(ptolemy_days_at_ut1(instant, alexandria_meridian))
    c = copernicus_mars(copernicus_days_at_ut1(instant, copernicus_meridian), **apsis_options)
    result = {
        "instant": {"jd": instant.value, "scale": instant.scale, "provenance": instant.provenance},
        "meridians": {"alexandria_east_degrees": alexandria_meridian,
                      "copernicus_east_degrees": copernicus_meridian, "provenance": meridian_provenance},
        "method": "continuous planar geometry for both models; no historical correction tables",
        "ptolemy": {"days_since_nabonassar_epoch": p["days_since_epoch"],
                    "native_tropical_longitude": p["longitude"]},
        "copernicus": {"days_since_christ_epoch": c["days_since_epoch"],
                       "native_sidereal_longitude": c["geocentric_sidereal_longitude"],
                       "native_tropical_longitude": c["geocentric_tropical_longitude"],
                       "true_precession": c["true_precession"], "mars_apogee": c["mars_apogee"],
                       "apsis_assignment": c["apsis_assignment"]},
        "frame_alignment": None, "copernicus_minus_ptolemy_degrees": None,
        "comparison_status": "native outputs only; no common-frame alignment supplied",
    }
    if frame_offset_degrees is not None:
        frame = "declared-planar-ptolemaic-tropical-comparison"
        aligned = normalize(c["geocentric_tropical_longitude"] + frame_offset_degrees)
        a = LongitudeSample(aligned, "Mars", instant, frame, "geometric")
        b = LongitudeSample(p["longitude"], "Mars", instant, frame, "geometric")
        result["frame_alignment"] = {"copernicus_offset_degrees": frame_offset_degrees,
                                     "provenance": frame_provenance, "frame_id": frame,
                                     "copernicus_aligned_longitude": aligned}
        result["copernicus_minus_ptolemy_degrees"] = longitude_residual(a, b)
        result["comparison_status"] = "conditional on the declared planar frame alignment and meridians"
    return result


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ut1-jd", type=float, required=True, help="assumed shared UT1 JD, never TT/UTC")
    parser.add_argument("--instant-provenance", required=True)
    parser.add_argument("--alexandria-meridian", type=float, required=True, help="degrees east")
    parser.add_argument("--copernicus-meridian", type=float, required=True, help="degrees east")
    parser.add_argument("--meridian-provenance", required=True)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--apsis-policy", choices=[APSIS_POLICY])
    group.add_argument("--apogee-deg", type=float)
    parser.add_argument("--apogee-provenance")
    parser.add_argument("--frame-offset-deg", type=float, help="add to Copernicus tropical longitude; omit to suppress residual")
    parser.add_argument("--frame-provenance", help="authority/assumption for common plane and equinoctial origin at this instant")
    args = parser.parse_args(argv)
    try:
        result = compare_at_ut1(
            ScaledJulianDay(args.ut1_jd, "UT1", provenance=args.instant_provenance),
            args.alexandria_meridian, args.copernicus_meridian,
            meridian_provenance=args.meridian_provenance,
            frame_offset_degrees=args.frame_offset_deg, frame_provenance=args.frame_provenance,
            apsis_policy=args.apsis_policy, apogee_longitude=args.apogee_deg,
            apogee_provenance=args.apogee_provenance)
    except ValueError as error:
        parser.error(str(error))
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
