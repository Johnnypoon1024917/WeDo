import { CalendarEvent } from '../services/realtimeManager';

/**
 * Computes the first and last day (YYYY-MM-DD) for a given year/month,
 * correctly handling leap years.
 */
export function getMonthRange(
  year: number,
  month: number
): { firstDay: string; lastDay: string } {
  const y = String(year).padStart(4, '0');
  const m = String(month).padStart(2, '0');
  const firstDay = `${y}-${m}-01`;
  // Day 0 of the *next* month gives the last day of the current month
  const lastDayNum = new Date(year, month, 0).getDate();
  const lastDay = `${y}-${m}-${String(lastDayNum).padStart(2, '0')}`;
  return { firstDay, lastDay };
}

/**
 * Groups an array of CalendarEvents by their `day` field.
 */
export function groupEventsByDay(
  events: CalendarEvent[]
): Map<string, CalendarEvent[]> {
  const map = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const existing = map.get(event.day);
    if (existing) {
      existing.push(event);
    } else {
      map.set(event.day, [event]);
    }
  }
  return map;
}

/**
 * Sorts events chronologically by `time` field (HH:MM).
 * Events with null time are placed last.
 * Returns a new sorted array (does not mutate the input).
 */
export function sortEventsChronologically(
  events: CalendarEvent[]
): CalendarEvent[] {
  return [...events].sort((a, b) => {
    if (a.time === null && b.time === null) return 0;
    if (a.time === null) return 1;
    if (b.time === null) return -1;
    return a.time.localeCompare(b.time);
  });
}

/**
 * Builds a markedDates object for react-native-calendars from a grouped
 * events map. Each day with events gets a Soft Coral (#FF7F50) dot.
 */
export function buildMarkedDates(
  monthEvents: Map<string, CalendarEvent[]>
): Record<string, { marked: boolean; dotColor: string }> {
  const result: Record<string, { marked: boolean; dotColor: string }> = {};
  for (const [day] of monthEvents) {
    result[day] = { marked: true, dotColor: '#FF7F50' };
  }
  return result;
}
