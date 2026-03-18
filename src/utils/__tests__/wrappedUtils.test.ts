import { calculateProgress } from '../wrappedUtils';

describe('calculateProgress', () => {
  it('returns 1 when on the last card', () => {
    expect(calculateProgress(3, 4)).toBe(1);
  });

  it('returns 0.25 for the first card of four', () => {
    expect(calculateProgress(0, 4)).toBe(0.25);
  });

  it('returns 0.5 for the second card of four', () => {
    expect(calculateProgress(1, 4)).toBe(0.5);
  });

  it('returns 1 when there is only one card', () => {
    expect(calculateProgress(0, 1)).toBe(1);
  });

  it('always returns a value greater than 0', () => {
    // Even at index 0 with a large total, result is > 0
    expect(calculateProgress(0, 100)).toBeGreaterThan(0);
  });

  it('always returns a value at most 1', () => {
    expect(calculateProgress(19, 20)).toBeLessThanOrEqual(1);
  });
});
