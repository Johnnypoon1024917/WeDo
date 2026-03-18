/**
 * Utility functions for the Relationship Wrapped experience.
 */

/**
 * Calculate progress through the Wrapped card sequence.
 *
 * @param activeIndex - 0-based index of the currently active card
 * @param totalCards - Total number of cards (must be > 0)
 * @returns Progress value in the range (0, 1]
 */
export function calculateProgress(activeIndex: number, totalCards: number): number {
  return (activeIndex + 1) / totalCards;
}
