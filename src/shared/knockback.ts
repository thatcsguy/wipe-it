/**
 * Ease-out cubic function: 1 - (1 - t)^3
 * Starts fast, ends slow (decelerating motion)
 * @param t Progress from 0 to 1
 * @returns Eased value from 0 to 1
 */
export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}
