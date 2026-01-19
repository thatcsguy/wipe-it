import { KnockbackState } from './types';

/**
 * Ease-out cubic function: 1 - (1 - t)^3
 * Starts fast, ends slow (decelerating motion)
 * @param t Progress from 0 to 1
 * @returns Eased value from 0 to 1
 */
export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export interface KnockbackPositionResult {
  x: number;
  y: number;
  active: boolean;
}

/**
 * Calculate knockback position at given time using ease-out cubic interpolation
 * @param knockback The knockback state with start/end positions and timing
 * @param currentTime Current timestamp in ms
 * @returns Position {x, y} and whether knockback is still active
 */
export function getKnockbackPosition(
  knockback: KnockbackState,
  currentTime: number
): KnockbackPositionResult {
  const elapsed = currentTime - knockback.startTime;

  // Knockback complete
  if (elapsed >= knockback.duration) {
    return {
      x: knockback.endX,
      y: knockback.endY,
      active: false,
    };
  }

  // Calculate progress (0 to 1) and apply easing
  const t = elapsed / knockback.duration;
  const easedT = easeOutCubic(t);

  // Interpolate between start and end positions
  const x = knockback.startX + (knockback.endX - knockback.startX) * easedT;
  const y = knockback.startY + (knockback.endY - knockback.startY) * easedT;

  return { x, y, active: true };
}
