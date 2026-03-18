import {
  getMonthRange,
  groupEventsByDay,
  sortEventsChronologically,
  buildMarkedDates,
} from '../calendarHelpers';
import { CalendarEvent } from '../../services/realtimeManager';

function makeEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: 'evt-1',
    relationship_id: 'rel-1',
    day: '2025-01-15',
    title: 'Dinner',
    time: '18:00',
    created_by: 'user-1',
    created_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('getMonthRange', () => {
  it('returns correct bounds for January', () => {
    expect(getMonthRange(2025, 1)).toEqual({
      firstDay: '2025-01-01',
      lastDay: '2025-01-31',
    });
  });

  it('handles February in a non-leap year', () => {
    expect(getMonthRange(2023, 2)).toEqual({
      firstDay: '2023-02-01',
      lastDay: '2023-02-28',
    });
  });

  it('handles February in a leap year', () => {
    expect(getMonthRange(2024, 2)).toEqual({
      firstDay: '2024-02-01',
      lastDay: '2024-02-29',
    });
  });

  it('handles months with 30 days', () => {
    expect(getMonthRange(2025, 4)).toEqual({
      firstDay: '2025-04-01',
      lastDay: '2025-04-30',
    });
  });

  it('handles December', () => {
    expect(getMonthRange(2025, 12)).toEqual({
      firstDay: '2025-12-01',
      lastDay: '2025-12-31',
    });
  });
});

describe('groupEventsByDay', () => {
  it('returns empty map for empty array', () => {
    const result = groupEventsByDay([]);
    expect(result.size).toBe(0);
  });

  it('groups events by their day field', () => {
    const events = [
      makeEvent({ id: '1', day: '2025-01-10' }),
      makeEvent({ id: '2', day: '2025-01-10' }),
      makeEvent({ id: '3', day: '2025-01-15' }),
    ];
    const result = groupEventsByDay(events);
    expect(result.size).toBe(2);
    expect(result.get('2025-01-10')!.length).toBe(2);
    expect(result.get('2025-01-15')!.length).toBe(1);
  });

  it('preserves total event count across groups', () => {
    const events = [
      makeEvent({ id: '1', day: '2025-03-01' }),
      makeEvent({ id: '2', day: '2025-03-02' }),
      makeEvent({ id: '3', day: '2025-03-01' }),
    ];
    const result = groupEventsByDay(events);
    let total = 0;
    for (const [, group] of result) total += group.length;
    expect(total).toBe(events.length);
  });
});

describe('sortEventsChronologically', () => {
  it('sorts events by time ascending', () => {
    const events = [
      makeEvent({ id: '1', time: '14:00' }),
      makeEvent({ id: '2', time: '09:00' }),
      makeEvent({ id: '3', time: '18:00' }),
    ];
    const sorted = sortEventsChronologically(events);
    expect(sorted.map((e) => e.time)).toEqual(['09:00', '14:00', '18:00']);
  });

  it('places null times last', () => {
    const events = [
      makeEvent({ id: '1', time: null }),
      makeEvent({ id: '2', time: '10:00' }),
      makeEvent({ id: '3', time: null }),
    ];
    const sorted = sortEventsChronologically(events);
    expect(sorted[0].time).toBe('10:00');
    expect(sorted[1].time).toBeNull();
    expect(sorted[2].time).toBeNull();
  });

  it('does not mutate the original array', () => {
    const events = [
      makeEvent({ id: '1', time: '14:00' }),
      makeEvent({ id: '2', time: '09:00' }),
    ];
    const original = [...events];
    sortEventsChronologically(events);
    expect(events).toEqual(original);
  });
});

describe('buildMarkedDates', () => {
  it('returns empty object for empty map', () => {
    expect(buildMarkedDates(new Map())).toEqual({});
  });

  it('marks each day with events using Soft Coral dot', () => {
    const map = new Map<string, CalendarEvent[]>();
    map.set('2025-01-10', [makeEvent()]);
    map.set('2025-01-15', [makeEvent(), makeEvent()]);

    const result = buildMarkedDates(map);
    expect(Object.keys(result)).toHaveLength(2);
    expect(result['2025-01-10']).toEqual({ marked: true, dotColor: '#FF7F50' });
    expect(result['2025-01-15']).toEqual({ marked: true, dotColor: '#FF7F50' });
  });
});
