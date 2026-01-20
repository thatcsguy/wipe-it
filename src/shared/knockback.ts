import { KnockbackState, PLAYER_RADIUS, ARENA_WIDTH, ARENA_HEIGHT } from './types';

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
 * Check if a point is inside the linear knockback rectangle.
 * Uses local coordinate transform (same approach as lineAoe):
 * - Origin at lineStart
 * - X-axis along line direction
 * - Y-axis perpendicular to line
 * Then checks if within [0, length] x [-width/2, width/2]
 */
export function isInsideLinearKnockbackRect(
  lineStartX: number,
  lineStartY: number,
  lineEndX: number,
  lineEndY: number,
  width: number,
  playerX: number,
  playerY: number
): boolean {
  // Direction vector from start to end
  const dx = lineEndX - lineStartX;
  const dy = lineEndY - lineStartY;
  const length = Math.sqrt(dx * dx + dy * dy);

  if (length === 0) return false;

  // Unit vectors
  const ux = dx / length; // along line
  const uy = dy / length;
  // Perpendicular unit vector
  const vx = -uy;
  const vy = ux;

  // Vector from start to point
  const relX = playerX - lineStartX;
  const relY = playerY - lineStartY;

  // Project onto local axes
  const localX = relX * ux + relY * uy; // distance along line
  const localY = relX * vx + relY * vy; // distance perpendicular to line

  // Check bounds
  const halfWidth = width / 2;
  return localX >= 0 && localX <= length && localY >= -halfWidth && localY <= halfWidth;
}

export interface KnockbackEndpoint {
  x: number;
  y: number;
}

/**
 * Calculate knockback endpoint accounting for arena wall collisions
 * @param startX Player starting X position
 * @param startY Player starting Y position
 * @param dirX Normalized knockback direction X
 * @param dirY Normalized knockback direction Y
 * @param distance Knockback distance in pixels
 * @returns Clamped endpoint position
 */
export function calculateKnockbackEndpoint(
  startX: number,
  startY: number,
  dirX: number,
  dirY: number,
  distance: number
): KnockbackEndpoint {
  // Calculate theoretical endpoint
  const theoreticalX = startX + dirX * distance;
  const theoreticalY = startY + dirY * distance;

  // Clamp to arena bounds (PLAYER_RADIUS to ARENA_SIZE - PLAYER_RADIUS)
  const minBound = PLAYER_RADIUS;
  const maxBoundX = ARENA_WIDTH - PLAYER_RADIUS;
  const maxBoundY = ARENA_HEIGHT - PLAYER_RADIUS;

  const clampedX = Math.max(minBound, Math.min(maxBoundX, theoreticalX));
  const clampedY = Math.max(minBound, Math.min(maxBoundY, theoreticalY));

  return { x: clampedX, y: clampedY };
}
