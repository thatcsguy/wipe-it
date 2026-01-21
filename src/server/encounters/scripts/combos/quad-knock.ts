import { Script } from '../../types';
import { ARENA_WIDTH, ARENA_HEIGHT } from '../../../../shared/types';
import { all } from '../../targeting';

const KNOCKBACK_DISTANCE = 400;
const KNOCKBACK_DURATION = 1000;

// Quadrant centers
const HALF_W = ARENA_WIDTH / 2;  // 400
const HALF_H = ARENA_HEIGHT / 2; // 400

// Timeline (absolute times from script start):
// T=0ms      First knockback pair spawns (NW/SE or NE/SW)
// T=2000ms   Second knockback pair spawns
// T=4000ms   Warning statuses applied + additional mechanics spawn (spreads or stacks)
// T=9000ms   Warnings convert to rooted/bubbled
// T=9500ms   First knockbacks trigger
// T=10500ms  First knockback ends
// T=11000ms  Second knockbacks trigger
// T=12000ms  Second knockback ends, additional mechanics resolve
// T=12500ms  All statuses expire

const SECOND_PAIR_SPAWN = 2000;
const WARNING_START = 4000;
const WARNING_DURATION = 5000;          // 4000 → 9000
const FIRST_KNOCK_TRIGGER = 9500;       // absolute time from script start
const SECOND_KNOCK_TRIGGER = 11000;     // absolute time from script start
const FINAL_STATUS_DURATION = 3500;     // 9000 → 12500

// Additional mechanic constants
const ADDITIONAL_MECHANIC_DURATION = 8000; // 4000 → 12000 (resolve at end of final knockback)
const SPREAD_RADIUS = 400;
const SPREAD_DAMAGE = 25;
const STACK_RADIUS = 100;
const STACK_TOTAL_DAMAGE = 100;
const VULNERABILITY_DURATION = 1000;

/**
 * Quad-Knock: 4 linear knockbacks in two pairs (opposite corners).
 * All knock either clockwise or counterclockwise (randomly chosen).
 *
 * Clockwise (tangential around center):
 * - NW (top-left) → push east
 * - NE (top-right) → push south
 * - SE (bottom-right) → push west
 * - SW (bottom-left) → push north
 *
 * Counterclockwise:
 * - NW (top-left) → push south
 * - NE (top-right) → push west
 * - SE (bottom-right) → push north
 * - SW (bottom-left) → push east
 */
export const quadKnock: Script = async (runner) => {
  const clockwise = Math.random() < 0.5;
  const nwSeFirst = Math.random() < 0.5;

  // Knockback direction = perpendicular right of line = (lineDirY, -lineDirX)
  // East knockback: line goes south (top to bottom)
  // South knockback: line goes west (right to left)
  // West knockback: line goes north (bottom to top)
  // North knockback: line goes east (left to right)

  // NW quadrant (0,0)-(400,300)
  // CW: push east (line south), CCW: push south (line west)
  const nw = clockwise
    ? { startX: HALF_W / 2, startY: 0, endX: HALF_W / 2, endY: HALF_H, width: HALF_W }
    : { startX: HALF_W, startY: HALF_H / 2, endX: 0, endY: HALF_H / 2, width: HALF_H };

  // NE quadrant (400,0)-(800,300)
  // CW: push south (line west), CCW: push west (line north)
  const ne = clockwise
    ? { startX: ARENA_WIDTH, startY: HALF_H / 2, endX: HALF_W, endY: HALF_H / 2, width: HALF_H }
    : { startX: HALF_W + HALF_W / 2, startY: HALF_H, endX: HALF_W + HALF_W / 2, endY: 0, width: HALF_W };

  // SE quadrant (400,300)-(800,600)
  // CW: push west (line north), CCW: push north (line east)
  const se = clockwise
    ? { startX: HALF_W + HALF_W / 2, startY: ARENA_HEIGHT, endX: HALF_W + HALF_W / 2, endY: HALF_H, width: HALF_W }
    : { startX: HALF_W, startY: HALF_H + HALF_H / 2, endX: ARENA_WIDTH, endY: HALF_H + HALF_H / 2, width: HALF_H };

  // SW quadrant (0,300)-(400,600)
  // CW: push north (line east), CCW: push east (line south)
  const sw = clockwise
    ? { startX: 0, startY: HALF_H + HALF_H / 2, endX: HALF_W, endY: HALF_H + HALF_H / 2, width: HALF_H }
    : { startX: HALF_W / 2, startY: HALF_H, endX: HALF_W / 2, endY: ARENA_HEIGHT, width: HALF_W };

  const firstPair = nwSeFirst ? [nw, se] : [ne, sw];
  const secondPair = nwSeFirst ? [ne, sw] : [nw, se];

  // Helper to spawn a knockback using triggerAt (absolute time from script start)
  const spawnKnockback = (q: typeof nw, triggerAt: number) => {
    runner.spawn({
      type: 'linearKnockback',
      lineStartX: q.startX,
      lineStartY: q.startY,
      lineEndX: q.endX,
      lineEndY: q.endY,
      width: q.width,
      triggerAt,
      knockbackDistance: KNOCKBACK_DISTANCE,
      knockbackDuration: KNOCKBACK_DURATION,
    });
  };

  // Track player assignments across timeline callbacks
  const rootedPlayerIds: string[] = [];
  const bubbledPlayerIds: string[] = [];

  // Track additional mechanics
  const additionalMechanicIds: string[] = [];
  let isSpreadCase = false;

  // T=0: Spawn first pair (triggers at T=9500)
  runner.at(0, () => {
    for (const q of firstPair) {
      spawnKnockback(q, FIRST_KNOCK_TRIGGER);
    }
  });

  // T=2000: Spawn second pair (triggers at T=11000)
  runner.at(SECOND_PAIR_SPAWN, () => {
    for (const q of secondPair) {
      spawnKnockback(q, SECOND_KNOCK_TRIGGER);
    }
  });

  // T=4000: Apply warning statuses (distributed equally) + spawn additional mechanics
  runner.at(WARNING_START, () => {
    const players = runner.select(all());
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    const halfCount = Math.floor(shuffled.length / 2);

    for (let i = 0; i < shuffled.length; i++) {
      const player = shuffled[i];
      // First half: rooted, second half: bubbled, middle (if odd): random
      const isMiddle = shuffled.length % 2 === 1 && i === halfCount;
      const assignRooted = isMiddle ? Math.random() < 0.5 : i < halfCount;

      if (assignRooted) {
        runner.applyStatus(player.id, 'root-warning', WARNING_DURATION);
        rootedPlayerIds.push(player.id);
      } else {
        runner.applyStatus(player.id, 'bubble-warning', WARNING_DURATION);
        bubbledPlayerIds.push(player.id);
      }
    }

    // Spawn additional mechanics: 50% spread case, 50% stack case
    isSpreadCase = Math.random() < 0.5;

    if (isSpreadCase) {
      // Case 1: All players get 400px spread
      for (const player of players) {
        const id = runner.spawn({
          type: 'spread',
          targetPlayerId: player.id,
          radius: SPREAD_RADIUS,
          duration: ADDITIONAL_MECHANIC_DURATION,
        });
        additionalMechanicIds.push(id);
      }
    } else {
      // Case 2: Either rooted or bubbled players get 100px stack
      const giveToRooted = Math.random() < 0.5;
      const targetIds = giveToRooted ? rootedPlayerIds : bubbledPlayerIds;
      for (const playerId of targetIds) {
        const id = runner.spawn({
          type: 'stack',
          targetPlayerId: playerId,
          radius: STACK_RADIUS,
          duration: ADDITIONAL_MECHANIC_DURATION,
        });
        additionalMechanicIds.push(id);
      }
    }
  });

  // T=9000: Convert warnings to final statuses
  runner.at(WARNING_START + WARNING_DURATION, () => {
    for (const playerId of rootedPlayerIds) {
      runner.applyStatus(playerId, 'rooted', FINAL_STATUS_DURATION);
    }
    for (const playerId of bubbledPlayerIds) {
      runner.applyStatus(playerId, 'bubbled', FINAL_STATUS_DURATION);
    }
  });

  // Execute the timeline
  await runner.runTimeline();

  // Wait for additional mechanics to resolve (T=12000) and apply damage/effects
  // Register ALL handlers upfront before any mechanics resolve (they resolve simultaneously)
  if (isSpreadCase) {
    const resolvePromises = additionalMechanicIds.map(id => runner.waitForResolve(id));
    const results = await Promise.all(resolvePromises);

    // Process results sequentially for proper vulnerability chaining
    for (const result of results) {
      const { playersHit } = result.data as { playersHit: string[] };
      for (const playerId of playersHit) {
        runner.damage(playerId, SPREAD_DAMAGE);
        runner.applyStatus(playerId, 'vulnerability', VULNERABILITY_DURATION);
      }
    }
  } else {
    const resolvePromises = additionalMechanicIds.map(id => runner.waitForResolve(id));
    const results = await Promise.all(resolvePromises);

    for (const result of results) {
      const { playersInside } = result.data as { playersInside: string[] };
      if (playersInside.length > 0) {
        const damagePerPlayer = STACK_TOTAL_DAMAGE / playersInside.length;
        for (const playerId of playersInside) {
          runner.damage(playerId, damagePerPlayer);
          runner.applyStatus(playerId, 'vulnerability', VULNERABILITY_DURATION);
        }
      }
    }
  }

  // Wait for statuses to expire (T=12500)
  await runner.wait(FINAL_STATUS_DURATION);
};
