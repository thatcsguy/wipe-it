import { Script } from '../../types';
import { ARENA_WIDTH, ARENA_HEIGHT } from '../../../../shared/types';
import {
  isInsideLinearKnockbackRect,
  getLinearKnockbackDirection,
  calculateKnockbackEndpoint,
} from '../../../../shared/knockback';

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
// T=12000ms  Second knockback ends, line AOEs spawn through crystals
// T=13000ms  All resolve together: line AOEs, spreads/stacks, rooted/bubbled expire

const SECOND_PAIR_SPAWN = 2000;
const WARNING_START = 4000;
const WARNING_DURATION = 5000;          // 4000 → 9000
const FIRST_KNOCK_TRIGGER = 9500;       // absolute time from script start
const SECOND_KNOCK_TRIGGER = 11000;     // absolute time from script start
const FINAL_STATUS_DURATION = 4000;     // 9000 → 13000 (synced with line AOEs)

// Additional mechanic constants
const ADDITIONAL_MECHANIC_DURATION = 9000; // 4000 → 13000 (synced with line AOEs)
const SPREAD_RADIUS = 300;
const SPREAD_DAMAGE = 25;
const STACK_RADIUS = 100;
const STACK_TOTAL_DAMAGE = 100;
const VULNERABILITY_DURATION = 1000;

// Crystal line AOE constants
const CRYSTAL_AOE_SPAWN = SECOND_KNOCK_TRIGGER + KNOCKBACK_DURATION; // T=12000
const CRYSTAL_AOE_DURATION = 1000;
const CRYSTAL_AOE_WIDTH = 200;
const CRYSTAL_AOE_DAMAGE = 100;

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

  // Crystal positions
  const crystalPositions = [
    { x: 100, y: 100 },
    { x: 500, y: 300 },
    { x: 700, y: 500 },
    { x: 300, y: 700 },
  ];

  // Randomly select 2 crystals to rotate 90 degrees
  const rotatedIndices = new Set<number>();
  while (rotatedIndices.size < 2) {
    rotatedIndices.add(Math.floor(Math.random() * 4));
  }

  // Spawn 4 crystal doodads and track their positions and rotation
  const crystals = crystalPositions.map((pos, i) => {
    const isRotated = rotatedIndices.has(i);
    const rotation = isRotated ? Math.PI / 2 : 0;
    const id = runner.spawnDoodad({
      type: 'crystal',
      x: pos.x,
      y: pos.y,
      width: 30,
      height: 60,
      rotation,
      duration: 15000,
      layer: 'background',
    });
    return { id, x: pos.x, y: pos.y, isRotated };
  });

  // Helper to check if a crystal is in a knockback zone and move it
  const checkAndKnockCrystal = (crystal: { id: string; x: number; y: number }, q: typeof nw) => {
    if (isInsideLinearKnockbackRect(
      q.startX, q.startY,
      q.endX, q.endY,
      q.width,
      crystal.x, crystal.y
    )) {
      const dir = getLinearKnockbackDirection(q.startX, q.startY, q.endX, q.endY);
      const endpoint = calculateKnockbackEndpoint(
        crystal.x, crystal.y,
        dir.x, dir.y,
        KNOCKBACK_DISTANCE
      );
      runner.moveDoodad(crystal.id, endpoint.x, endpoint.y, KNOCKBACK_DURATION);
      crystal.x = endpoint.x;
      crystal.y = endpoint.y;
    }
  };

  // Helper to check all crystals against a knockback zone
  const checkAndKnockAllCrystals = (q: typeof nw) => {
    for (const crystal of crystals) {
      checkAndKnockCrystal(crystal, q);
    }
  };

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

  // Track crystal line AOE IDs
  const crystalLineAoeIds: string[] = [];

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

  // T=9500: First knockbacks trigger - check crystals
  runner.at(FIRST_KNOCK_TRIGGER, () => {
    for (const q of firstPair) {
      checkAndKnockAllCrystals(q);
    }
  });

  // T=11000: Second knockbacks trigger - check crystals
  runner.at(SECOND_KNOCK_TRIGGER, () => {
    for (const q of secondPair) {
      checkAndKnockAllCrystals(q);
    }
  });

  // T=12000: Second knockbacks resolve - spawn line AOEs through crystals
  runner.at(CRYSTAL_AOE_SPAWN, () => {
    for (const crystal of crystals) {
      let id: string;
      if (crystal.isRotated) {
        // Rotated crystals (horizontal 2x1) → vertical line AOE through column, from north
        id = runner.spawn({
          type: 'lineAoe',
          startX: crystal.x,
          startY: 0,
          endX: crystal.x,
          endY: ARENA_HEIGHT,
          width: CRYSTAL_AOE_WIDTH,
          duration: CRYSTAL_AOE_DURATION,
        });
      } else {
        // Non-rotated crystals (vertical 1x2) → horizontal line AOE through row, from east
        id = runner.spawn({
          type: 'lineAoe',
          startX: ARENA_WIDTH,
          startY: crystal.y,
          endX: 0,
          endY: crystal.y,
          width: CRYSTAL_AOE_WIDTH,
          duration: CRYSTAL_AOE_DURATION,
        });
      }
      crystalLineAoeIds.push(id);
    }
  });

  // T=4000: Apply warning statuses (distributed equally) + spawn additional mechanics
  runner.at(WARNING_START, () => {
    const players = runner.getState().players; // Include dead players
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

  // Wait for crystal line AOEs to resolve and apply damage
  const lineAoePromises = crystalLineAoeIds.map(id => runner.waitForResolve(id));
  const lineAoeResults = await Promise.all(lineAoePromises);

  for (const result of lineAoeResults) {
    const { playersHit } = result.data as { playersHit: string[] };
    for (const playerId of playersHit) {
      runner.damage(playerId, CRYSTAL_AOE_DAMAGE);
    }
  }

  // Wait for statuses to expire
  await runner.wait(FINAL_STATUS_DURATION);
};
