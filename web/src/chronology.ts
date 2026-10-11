import { modelRecord } from './model.ts';

export type EgyptianDate = Readonly<{ year: number; month: number; day: number; fraction: number }>;
export type CivilDate = Readonly<{ year: number; month: number; day: number; fraction: number }>;

const floor = Math.floor;
const integer = Number.isInteger;

export function civilToJdn(year: number, month: number, day: number): number {
  if (![year, month, day].every(integer) || month < 1 || month > 12) throw new RangeError('Invalid Julian date');
  const leap = year % 4 === 0;
  const lengths = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (day < 1 || day > lengths[month - 1]) throw new RangeError('Invalid Julian day');
  const a = floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return day + floor((153 * m + 2) / 5) + 365 * y + floor(y / 4) - 32083;
}

export function jdnToCivil(jdn: number): Omit<CivilDate, 'fraction'> {
  if (!integer(jdn)) throw new RangeError('JDN must be integral');
  const c = jdn + 32082;
  const d = floor((4 * c + 3) / 1461);
  const e = c - floor(1461 * d / 4);
  const m = floor((5 * e + 2) / 153);
  return {
    year: d - 4800 + floor(m / 10),
    month: m + 3 - 12 * floor(m / 10),
    day: e - floor((153 * m + 2) / 5) + 1,
  };
}

const epochMatch = /^([+-]?\d+)-(\d{2})-(\d{2})$/.exec(modelRecord.epoch.astronomical_julian_date);
if (!epochMatch) throw new Error('Invalid model epoch');
export const epochLocalJdn = civilToJdn(Number(epochMatch[1]), Number(epochMatch[2]), Number(epochMatch[3]));

export function egyptianToDays(date: EgyptianDate): number {
  const { year, month, day, fraction } = date;
  if (![year, month, day].every(integer) || year < 1 || month < 1 || month > 13 ||
      day < 1 || day > (month === 13 ? 5 : 30) || !Number.isFinite(fraction) || fraction < 0 || fraction >= 1) {
    throw new RangeError('Invalid Nabonassar date');
  }
  return (year - 1) * 365 + (month - 1) * 30 + day - 1 + fraction;
}

export function daysToEgyptian(days: number): EgyptianDate {
  if (!Number.isFinite(days) || days < 0) throw new RangeError('Day count precedes the Nabonassar epoch');
  const whole = floor(days);
  const year = floor(whole / 365) + 1;
  const yearDay = whole % 365;
  return { year, month: floor(yearDay / 30) + 1, day: yearDay % 30 + 1, fraction: days - whole };
}

/** Civil date uses local midnight; model epoch/day integers are local noon. */
export function daysToJulian(days: number): CivilDate {
  if (!Number.isFinite(days)) throw new RangeError('Day count must be finite');
  const midnightBased = epochLocalJdn + days + 0.5;
  const jdn = floor(midnightBased);
  return { ...jdnToCivil(jdn), fraction: midnightBased - jdn };
}

export function yearLabel(year: number, bce: string, ce: string): string {
  return year <= 0 ? `${1 - year} ${bce}` : `${year} ${ce}`;
}
