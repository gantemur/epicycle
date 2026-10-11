"""Civil calendar and Egyptian day counts for the Mars model.

Julian Day numbers here are formal local-noon calendar coordinates. Mapping
Alexandria mean local time to UT, TT, or dynamical ephemeris time is outside
Phase 1; the returned JD must not be used as a modern ephemeris timestamp.
"""

from math import floor, isfinite


def _leap(year, calendar):
    if calendar == "julian":
        return year % 4 == 0
    if calendar == "gregorian":
        return year % 4 == 0 and (year % 100 != 0 or year % 400 == 0)
    raise ValueError("calendar must be 'julian' or 'gregorian'")


def _month_length(year, month, calendar):
    if not 1 <= month <= 12:
        raise ValueError("month must be 1..12")
    if month == 2:
        return 29 if _leap(year, calendar) else 28
    return 30 if month in (4, 6, 9, 11) else 31


def civil_to_jdn(year, month, day, calendar="julian"):
    """Proleptic civil date at noon to integer JDN; year 0 is 1 BCE."""
    if not isinstance(year, int) or not isinstance(month, int) or not isinstance(day, int):
        raise TypeError("civil date components must be integers")
    if not 1 <= day <= _month_length(year, month, calendar):
        raise ValueError("invalid civil day")
    a = (14 - month) // 12
    y = year + 4800 - a
    m = month + 12 * a - 3
    if calendar == "julian":
        return day + (153 * m + 2) // 5 + 365 * y + y // 4 - 32083
    return day + (153 * m + 2) // 5 + 365 * y + y // 4 - y // 100 + y // 400 - 32045


def jdn_to_civil(jdn, calendar="julian"):
    """Integer JDN to proleptic civil date in astronomical year numbering."""
    if not isinstance(jdn, int):
        raise TypeError("jdn must be an integer")
    if calendar == "julian":
        c = jdn + 32082
        d = (4 * c + 3) // 1461
        e = c - (1461 * d) // 4
        m = (5 * e + 2) // 153
        day = e - (153 * m + 2) // 5 + 1
        month = m + 3 - 12 * (m // 10)
        year = d - 4800 + m // 10
    elif calendar == "gregorian":
        a = jdn + 32044
        b = (4 * a + 3) // 146097
        c = a - (146097 * b) // 4
        d = (4 * c + 3) // 1461
        e = c - (1461 * d) // 4
        m = (5 * e + 2) // 153
        day = e - (153 * m + 2) // 5 + 1
        month = m + 3 - 12 * (m // 10)
        year = 100 * b + d - 4800 + m // 10
    else:
        raise ValueError("calendar must be 'julian' or 'gregorian'")
    return (year, month, day)


EPOCH_LOCAL_JDN = civil_to_jdn(-746, 2, 26, "julian")


def egyptian_to_days(year, month, day, fraction=0.0):
    """Nabonassar year/month/day to days since year 1 Thoth 1 noon.

    Months 1..12 have 30 days; month 13 is the five epagomenal days. Fraction
    is elapsed mean local day after noon, so 0.5 is local midnight.
    """
    if not all(isinstance(v, int) for v in (year, month, day)):
        raise TypeError("Egyptian date components must be integers")
    if year < 1 or not 1 <= month <= 13 or not 1 <= day <= (5 if month == 13 else 30):
        raise ValueError("invalid Nabonassar/Egyptian date")
    if not isfinite(fraction) or not 0.0 <= fraction < 1.0:
        raise ValueError("fraction must be in [0, 1)")
    return (year - 1) * 365 + (month - 1) * 30 + day - 1 + fraction


def days_to_egyptian(days):
    if not isfinite(days) or days < 0:
        raise ValueError("Nabonassar dates begin at the epoch")
    whole = floor(days)
    year, rem = divmod(whole, 365)
    month, day = divmod(rem, 30)
    return (year + 1, month + 1, day + 1, days - whole)


def days_to_local_jd(days):
    """Formal Julian Day coordinate for Alexandria mean local time."""
    if not isfinite(days):
        raise ValueError("days must be finite")
    return EPOCH_LOCAL_JDN + days


def civil_to_local_jd(year, month, day, day_fraction=0.0, calendar="julian"):
    """Civil midnight-based date and day fraction to formal local JD."""
    if not isfinite(day_fraction) or not 0.0 <= day_fraction < 1.0:
        raise ValueError("day_fraction must be in [0, 1)")
    return civil_to_jdn(year, month, day, calendar) - 0.5 + day_fraction


def local_jd_to_civil(jd, calendar="julian"):
    """Civil date plus fraction after local midnight, retaining time convention."""
    if not isfinite(jd):
        raise ValueError("jd must be finite")
    midnight_based = jd + 0.5
    jdn = floor(midnight_based)
    return (*jdn_to_civil(jdn, calendar), midnight_based - jdn)


def bce_ce(year):
    """Display astronomical integer year in civil BCE/CE notation."""
    return f"{1 - year} BCE" if year <= 0 else f"{year} CE"
