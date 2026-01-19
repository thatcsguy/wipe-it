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

export interface KnockbackDirection {
  x: number;
  y: number;
}

/**
 * Calculate knockback direction for radial knockback (from origin toward player)
 * Returns normalized direction vector
 */
export function getRadialKnockbackDirection(
  originX: number,
  originY: number,
  playerX: number,
  playerY: number
): KnockbackDirection {
  const dx = playerX - originX;
  const dy = playerY - originY;
  const len = Math.sqrt(dx * dx + dy * dy);

  // If player at origin, push in arbitrary direction (up)
  if (len === 0) {
    return { x: 0, y: -1 };
  }

  return { x: dx / len, y: dy / len };
}

/**
 * Calculate knockback direction for linear knockback (perpendicular to line)
 * Direction is to the right side when walking from lineStart to lineEnd
 * Formula: perpendicular = (lineY/len, -lineX/len)
 */
export function getLinearKnockbackDirection(
  lineStartX: number,
  lineStartY: number,
  lineEndX: number,
  lineEndY: number
): KnockbackDirection {
  const lineX = lineEndX - lineStartX;
  const lineY = lineEndY - lineStartY;
  const len = Math.sqrt(lineX * lineX + lineY * lineY);

  // If line has zero length, default direction (down)
  if (len === 0) {
    return { x: 0, y: 1 };
  }

  // Perpendicular to line, righthand side: (lineY/len, -lineX/len)
  return { x: lineY / len, y: -lineX / len };
}

/**
 * Check if a player is on the knockback side of a linear knockback line
 * Uses cross product to determine which side of the line the player is on
 * Returns true when player is on the right side (walking from A to B)
 * Cross product formula: (bx-ax)*(py-ay) - (by-ay)*(px-ax)
 * Negative cross product = right side = knockback side
 */
export function isOnKnockbackSide(
  lineStartX: number,
  lineStartY: number,
  lineEndX: number,
  lineEndY: number,
  playerX: number,
  playerY: number
): boolean {
  const cross =
    (lineEndX - lineStartX) * (playerY - lineStartY) -
    (lineEndY - lineStartY) * (playerX - lineStartX);
  return cross < 0;
}
