jest.mock('../../lib/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn(),
}));

import {
  decayHealth,
  getEvolutionStage,
  getPetMood,
  shouldScheduleInactivityNotification,
} from '../petService';

describe('decayHealth', () => {
  it('returns unchanged health when 0 full days have elapsed', () => {
    const lastFedAt = '2024-01-10T12:00:00Z';
    const now = new Date('2024-01-10T23:59:59Z');
    expect(decayHealth(80, lastFedAt, now)).toBe(80);
  });

  it('reduces health by 15 per full day', () => {
    const lastFedAt = '2024-01-10T00:00:00Z';
    const now = new Date('2024-01-12T00:00:00Z'); // 2 full days
    expect(decayHealth(100, lastFedAt, now)).toBe(70);
  });

  it('caps health at 0 when decay exceeds current health', () => {
    const lastFedAt = '2024-01-01T00:00:00Z';
    const now = new Date('2024-01-08T00:00:00Z'); // 7 days → 105 decay
    expect(decayHealth(100, lastFedAt, now)).toBe(0);
  });

  it('uses floor for partial days', () => {
    const lastFedAt = '2024-01-10T00:00:00Z';
    const now = new Date('2024-01-11T12:00:00Z'); // 1.5 days → floor = 1
    expect(decayHealth(50, lastFedAt, now)).toBe(35);
  });
});

describe('getEvolutionStage', () => {
  it('returns egg for 0 XP', () => {
    expect(getEvolutionStage(0)).toBe('egg');
  });

  it('returns egg for 99 XP', () => {
    expect(getEvolutionStage(99)).toBe('egg');
  });

  it('returns baby for 100 XP', () => {
    expect(getEvolutionStage(100)).toBe('baby');
  });

  it('returns baby for 499 XP', () => {
    expect(getEvolutionStage(499)).toBe('baby');
  });

  it('returns teen for 500 XP', () => {
    expect(getEvolutionStage(500)).toBe('teen');
  });

  it('returns teen for 999 XP', () => {
    expect(getEvolutionStage(999)).toBe('teen');
  });

  it('returns adult for 1000 XP', () => {
    expect(getEvolutionStage(1000)).toBe('adult');
  });

  it('returns adult for very high XP', () => {
    expect(getEvolutionStage(5000)).toBe('adult');
  });
});

describe('getPetMood', () => {
  it('returns sad when health is 0', () => {
    expect(getPetMood(0)).toBe('sad');
  });

  it('returns sad when health is 29', () => {
    expect(getPetMood(29)).toBe('sad');
  });

  it('returns happy when health is 30', () => {
    expect(getPetMood(30)).toBe('happy');
  });

  it('returns happy when health is 100', () => {
    expect(getPetMood(100)).toBe('happy');
  });
});

describe('shouldScheduleInactivityNotification', () => {
  it('returns true when health is 0 and 7+ days inactive', () => {
    const lastFedAt = '2024-01-01T00:00:00Z';
    const now = new Date('2024-01-08T00:00:00Z'); // exactly 7 days
    expect(shouldScheduleInactivityNotification(0, lastFedAt, now)).toBe(true);
  });

  it('returns false when health is 0 but less than 7 days', () => {
    const lastFedAt = '2024-01-01T00:00:00Z';
    const now = new Date('2024-01-07T23:59:59Z'); // 6.99 days → floor = 6
    expect(shouldScheduleInactivityNotification(0, lastFedAt, now)).toBe(false);
  });

  it('returns false when health is above 0 even with 7+ days', () => {
    const lastFedAt = '2024-01-01T00:00:00Z';
    const now = new Date('2024-01-10T00:00:00Z');
    expect(shouldScheduleInactivityNotification(1, lastFedAt, now)).toBe(false);
  });

  it('returns false when health is above 0 and less than 7 days', () => {
    const lastFedAt = '2024-01-01T00:00:00Z';
    const now = new Date('2024-01-03T00:00:00Z');
    expect(shouldScheduleInactivityNotification(50, lastFedAt, now)).toBe(
      false
    );
  });
});
