import { Script } from '../../types';
import { ARENA_WIDTH, ARENA_HEIGHT } from '../../../../shared/types';

const KNOCKBACK_DISTANCE = 400;
const KNOCKBACK_DURATION = 1000;
const DELAY = 2000;

// Quadrant centers
const HALF_W = ARENA_WIDTH / 2;  // 400
const HALF_H = ARENA_HEIGHT / 2; // 300

/**
 * Quad-Knock: 4 simultaneous linear knockbacks, one per quadrant.
 * All knock either clockwise or counterclockwise (randomly chosen).
 *
 * Clockwise (tangential around center):
 * - Top-left → push east
 * - Top-right → push south
 * - Bottom-right → push west
 * - Bottom-left → push north
 *
 * Counterclockwise:
 * - Top-left → push south
 * - Top-right → push west
 * - Bottom-right → push north
 * - Bottom-left → push east
 */
export const quadKnock: Script = async (runner) => {
  const clockwise = Math.random() < 0.5;

  // Knockback direction = perpendicular right of line = (lineDirY, -lineDirX)
  // East knockback: line goes south (top to bottom)
  // South knockback: line goes west (right to left)
  // West knockback: line goes north (bottom to top)
  // North knockback: line goes east (left to right)

  // Top-left quadrant (0,0)-(400,300)
  // CW: push east (line south, vertical), CCW: push south (line west, horizontal)
  const topLeft = clockwise
    ? { startX: HALF_W / 2, startY: 0, endX: HALF_W / 2, endY: HALF_H, width: HALF_W }
    : { startX: HALF_W, startY: HALF_H / 2, endX: 0, endY: HALF_H / 2, width: HALF_H };

  // Top-right quadrant (400,0)-(800,300)
  // CW: push south (line west, horizontal), CCW: push west (line north, vertical)
  const topRight = clockwise
    ? { startX: ARENA_WIDTH, startY: HALF_H / 2, endX: HALF_W, endY: HALF_H / 2, width: HALF_H }
    : { startX: HALF_W + HALF_W / 2, startY: HALF_H, endX: HALF_W + HALF_W / 2, endY: 0, width: HALF_W };

  // Bottom-right quadrant (400,300)-(800,600)
  // CW: push west (line north, vertical), CCW: push north (line east, horizontal)
  const bottomRight = clockwise
    ? { startX: HALF_W + HALF_W / 2, startY: ARENA_HEIGHT, endX: HALF_W + HALF_W / 2, endY: HALF_H, width: HALF_W }
    : { startX: HALF_W, startY: HALF_H + HALF_H / 2, endX: ARENA_WIDTH, endY: HALF_H + HALF_H / 2, width: HALF_H };

  // Bottom-left quadrant (0,300)-(400,600)
  // CW: push north (line east, horizontal), CCW: push east (line south, vertical)
  const bottomLeft = clockwise
    ? { startX: 0, startY: HALF_H + HALF_H / 2, endX: HALF_W, endY: HALF_H + HALF_H / 2, width: HALF_H }
    : { startX: HALF_W / 2, startY: HALF_H, endX: HALF_W / 2, endY: ARENA_HEIGHT, width: HALF_W };

  const quadrants = [topLeft, topRight, bottomRight, bottomLeft];

  // Spawn all 4 knockbacks simultaneously
  for (const q of quadrants) {
    runner.spawn({
      type: 'linearKnockback',
      lineStartX: q.startX,
      lineStartY: q.startY,
      lineEndX: q.endX,
      lineEndY: q.endY,
      width: q.width,
      delay: DELAY,
      knockbackDistance: KNOCKBACK_DISTANCE,
      knockbackDuration: KNOCKBACK_DURATION,
    });
  }

  // Wait for knockbacks to resolve
  await runner.wait(DELAY + KNOCKBACK_DURATION);
};
