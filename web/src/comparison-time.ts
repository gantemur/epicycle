import { civilToJdn, jdnToCivil, type CivilDate } from './chronology.ts';

export const frauenburgMeridian = 19 + 40 / 60;
export const alexandriaMeridian = 30;
export const ptolemyEpochJd = 1448638;
export const copernicusEpochLocalJd = 1721423.5;

export function civilToLocalJd(year: number, month: number, day: number, fraction = 0): number {
  if (!Number.isFinite(fraction) || fraction < 0 || fraction >= 1) throw new RangeError('Invalid day fraction');
  return civilToJdn(year, month, day) - 0.5 + fraction;
}

export function localJdToCivil(jd: number): CivilDate {
  if (!Number.isFinite(jd)) throw new RangeError('JD must be finite');
  const midnightBased = jd + 0.5;
  const jdn = Math.floor(midnightBased);
  return { ...jdnToCivil(jdn), fraction: midnightBased - jdn };
}

/** One assumed UT1 instant; historical local mean time is a meridian translation. */
export function modelDaysAtUt1(ut1Jd: number): { ptolemy: number; copernicus: number } {
  if (!Number.isFinite(ut1Jd)) throw new RangeError('UT1 JD must be finite');
  // East longitude advances local mean time by longitude/360 of a day.
  // Frauenburg 19°40′ E is C3 p.170; Alexandria 30° E is a provisional
  // illustrative assumption, not a sourced historical meridian.
  return {
    ptolemy: ut1Jd + alexandriaMeridian / 360 - ptolemyEpochJd,
    copernicus: ut1Jd + frauenburgMeridian / 360 - copernicusEpochLocalJd,
  };
}

export function frauenburgCivilToUt1(year: number, month: number, day: number, hour = 0, minute = 0): number {
  if (![hour, minute].every(Number.isInteger) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    throw new RangeError('Invalid civil time');
  }
  // Historical input uses proleptic Julian civil arithmetic and local midnight.
  // No JavaScript Date, Gregorian interpretation, ΔT, or apparent-place correction.
  return civilToLocalJd(year, month, day, (hour * 60 + minute) / 1440) - frauenburgMeridian / 360;
}

export const example1512Ut1 = frauenburgCivilToUt1(1512, 1, 1, 6);
export const example1473Ut1 = frauenburgCivilToUt1(1473, 2, 19, 16, 48);
export const comparisonUt1Domain = {
  start: frauenburgCivilToUt1(1473, 2, 19),
  end: frauenburgCivilToUt1(1523, 2, 22, 5),
} as const;

export function formatFrauenburgInput(ut1Jd: number): string {
  const date = localJdToCivil(ut1Jd + frauenburgMeridian / 360);
  const minutes = Math.round(date.fraction * 1440);
  const normalized = minutes === 1440 ? localJdToCivil(ut1Jd + frauenburgMeridian / 360 + 1 / 1440) : date;
  const time = minutes % 1440;
  const year = normalized.year < 0
    ? `-${String(-normalized.year).padStart(4, '0')}`
    : String(normalized.year).padStart(4, '0');
  return `${year}-${String(normalized.month).padStart(2, '0')}-${String(normalized.day).padStart(2, '0')}T${String(Math.floor(time / 60)).padStart(2, '0')}:${String(time % 60).padStart(2, '0')}`;
}

export function parseFrauenburgInput(input: string): number {
  const m = /^([+-]?\d{4,6})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(input);
  if (!m) throw new RangeError('Invalid Julian civil date and time');
  return frauenburgCivilToUt1(...m.slice(1).map(Number) as [number, number, number, number, number]);
}

/** Today control only: UTC Unix milliseconds, treated as UT1 without a ΔUT1 correction.
 *  JD 2440587.5 is the Gregorian 1970-01-01 UTC Unix epoch. The returned
 *  astronomical JD is converted to Julian Frauenburg LMT for display.
 */
export function utcMillisToAssumedUt1(milliseconds: number): number {
  if (!Number.isFinite(milliseconds)) throw new RangeError('UTC instant must be finite');
  return 2440587.5 + milliseconds / 86400000;
}
