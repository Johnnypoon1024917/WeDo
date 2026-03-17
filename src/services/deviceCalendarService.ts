import * as Calendar from 'expo-calendar';
import { Platform } from 'react-native';

/**
 * Request OS calendar read/write permissions.
 * Returns true if granted, false if denied.
 */
export async function requestPermissions(): Promise<boolean> {
  try {
    const { status } = await Calendar.requestCalendarPermissionsAsync();
    return status === 'granted';
  } catch (err) {
    console.warn('[DeviceCalendarService] requestPermissions failed', err);
    return false;
  }
}

/**
 * Find the default calendar for new events, falling back to the first
 * available writable calendar. Returns null if none exist.
 */
async function getTargetCalendar(): Promise<Calendar.Calendar | null> {
  const calendars = await Calendar.getCalendarsAsync(
    Calendar.EntityTypes.EVENT,
  );

  if (Platform.OS === 'ios') {
    const defaultCal = await Calendar.getDefaultCalendarAsync();
    if (defaultCal) return defaultCal;
  }

  // Android: look for the primary / default calendar
  const primary = calendars.find(
    (c) =>
      c.isPrimary ||
      c.accessLevel === Calendar.CalendarAccessLevel.OWNER,
  );
  if (primary) return primary;

  // Fall back to first available writable calendar
  const writable = calendars.find(
    (c) =>
      c.allowsModifications !== false,
  );
  return writable ?? null;
}

/**
 * Create an event in the user's native device calendar.
 *
 * @param event.title  – event title (required)
 * @param event.date   – ISO date string, e.g. "2025-03-15"
 * @param event.time   – optional HH:mm string, e.g. "14:30"
 */
export async function syncEventToDevice(event: {
  title: string;
  date: string;
  time?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const calendar = await getTargetCalendar();
    if (!calendar) {
      return {
        success: false,
        error: 'No calendar available on this device.',
      };
    }

    const startDate = buildDate(event.date, event.time);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // +1 hour

    await Calendar.createEventAsync(calendar.id, {
      title: event.title,
      startDate,
      endDate,
      allDay: !event.time,
    });

    return { success: true };
  } catch (err: any) {
    console.warn('[DeviceCalendarService] syncEventToDevice failed', err);
    return {
      success: false,
      error: err?.message ?? 'Failed to sync event to device calendar.',
    };
  }
}

/**
 * Build a Date from an ISO date string and optional HH:mm time.
 */
function buildDate(dateStr: string, time?: string): Date {
  if (time) {
    const [hours, minutes] = time.split(':').map(Number);
    const d = new Date(dateStr);
    d.setHours(hours, minutes, 0, 0);
    return d;
  }
  return new Date(dateStr);
}
