"""Minimal metadata guard for longitude comparisons; no frame transforms."""

from dataclasses import dataclass
from math import isfinite

from .chronology import ScaledJulianDay
from .mars import signed_difference


@dataclass(frozen=True)
class LongitudeSample:
    degrees: float
    body: str
    instant_ut1: ScaledJulianDay
    frame_id: str
    position_kind: str
    observer: str = "geocentre"

    def __post_init__(self):
        if not isfinite(self.degrees) or not self.body or not self.frame_id:
            raise ValueError("longitude, body, and specific frame are required")
        if self.instant_ut1.scale != "UT1" or self.position_kind not in ("geometric", "astrometric", "apparent"):
            raise ValueError("shared UT1 instant and declared position kind are required")
        if self.observer != "geocentre":
            raise ValueError("the initial comparison observable is geocentric")


def longitude_residual(first, second):
    """Signed first minus second in [-180, 180), only for matched observables."""
    if (first.body, first.instant_ut1.value, first.frame_id, first.position_kind, first.observer) != (
            second.body, second.instant_ut1.value, second.frame_id, second.position_kind, second.observer):
        raise ValueError("longitude metadata differ; convert frames or conventions explicitly")
    return signed_difference(first.degrees, second.degrees)
