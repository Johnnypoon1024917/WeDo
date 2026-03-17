/**
 * Anniversary window calculation utility.
 *
 * Determines whether a given date falls within ±7 days of the yearly
 * anniversary of a relationship start date.
 */

/**
 * Returns the anniversary date for a given start date in the target year.
 * Handles leap-year edge case: if the start date is Feb 29 and the target
 * year is not a leap year, the anniversary falls on Feb 28.
 */
function getAnniversaryInYear(startDate: Date, year: number): Date {
  const month = startDate.getMonth();
  const day = startDate.getDate();

  // For Feb 29 start dates in non-leap years, use Feb 28
  if (month === 1 && day === 29) {
    const lastDayOfFeb = new Date(year, 2, 0).getDate(); // 28 or 29
    return new Date(year, 1, lastDayOfFeb);
  }

  return new Date(year, month, day);
}

/**
 * Returns the number of calendar days between two dates, ignoring time.
 * Result is always non-negative.
 */
function daysBetween(a: Date, b: Date): number {
  const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.abs(utcB - utcA) / (1000 * 60 * 60 * 24);
}

/**
 * Checks whether `currentDate` is within ±7 days of the yearly anniversary
 * of `startDate`.
 *
 * The window spans year boundaries — e.g. a Dec 30 anniversary is reachable
 * from Jan 3 of the following year (4 days after), and a Jan 2 anniversary
 * is reachable from Dec 28 of the prior year (5 days before).
 *
 * @param startDate  The relationship start date.
 * @param currentDate  The date to check.
 * @returns `true` if `currentDate` is within 7 days of any yearly anniversary.
 */
export function isWithinAnniversaryWindow(
  startDate: Date,
  currentDate: Date,
): boolean {
  const currentYear = currentDate.getFullYear();

  // Check the anniversary in the current year and the adjacent years
  // to handle year-boundary crossings.
  for (const year of [currentYear - 1, currentYear, currentYear + 1]) {
    if (year < startDate.getFullYear()) continue;

    const anniversary = getAnniversaryInYear(startDate, year);
    if (daysBetween(currentDate, anniversary) <= 7) {
      return true;
    }
  }

  return false;
}
