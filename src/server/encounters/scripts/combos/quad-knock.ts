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
const HALF_W = ARENA_WIDTH / 2;
const HALF_H = ARENA_HEIGHT / 2;

// Timing constants
const SECOND_PAIR_SPAWN = 2000;
const WARNING_START = 4000;
const WARNING_DURATION = 5000;
const FIRST_KNOCK_TRIGGER = 9500;
const SECOND_KNOCK_TRIGGER = 11000;
const FINAL_STATUS_DURATION = 4000;
const ADDITIONAL_MECHANIC_DURATION = 9000;  // should resolve at same time as line AOEs
const CRYSTAL_AOE_SPAWN = SECOND_KNOCK_TRIGGER + KNOCKBACK_DURATION;
const CRYSTAL_AOE_DURATION = 1000;
const SCRIPT_DURATION = 13000;

// Mechanic constants
const SPREAD_RADIUS = 300;
const SPREAD_DAMAGE = 25;
const STACK_RADIUS = 100;
const STACK_TOTAL_DAMAGE = 100;
const VULNERABILITY_DURATION = 1000;
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
  // === Setup ===
  const clockwise = Math.random() < 0.5;
  const nwSeFirst = Math.random() < 0.5;
  const { firstPair, secondPair } = buildKnockbackPairs(clockwise, nwSeFirst);
  const crystals = spawnCrystals();
  const rootedPlayerIds: string[] = [];
  const bubbledPlayerIds: string[] = [];

  // === Timeline ===
  runner.at(0,                            spawnFirstKnockbackPair);
  runner.at(SECOND_PAIR_SPAWN,            spawnSecondKnockbackPair);
  runner.at(WARNING_START,                applyWarningsAndSpawnMechanics);
  runner.at(WARNING_START + WARNING_DURATION, convertToFinalStatuses);
  runner.at(FIRST_KNOCK_TRIGGER,          knockCrystalsFirstPair);
  runner.at(SECOND_KNOCK_TRIGGER,         knockCrystalsSecondPair);
  runner.at(CRYSTAL_AOE_SPAWN,            spawnCrystalLineAoes);

  await runner.runTimeline({ duration: SCRIPT_DURATION });

  // === Handlers ===

  function spawnFirstKnockbackPair() {
    for (const q of firstPair) {
      spawnKnockback(q, FIRST_KNOCK_TRIGGER);
    }
  }

  function spawnSecondKnockbackPair() {
    for (const q of secondPair) {
      spawnKnockback(q, SECOND_KNOCK_TRIGGER);
    }
  }

  function applyWarningsAndSpawnMechanics() {
    const players = runner.getState().players;
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    const halfCount = Math.floor(shuffled.length / 2);

    // Assign rooted/bubbled warnings
    for (let i = 0; i < shuffled.length; i++) {
      const player = shuffled[i];
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

    // Spawn spreads or stacks
    const isSpreadCase = Math.random() < 0.5;
    if (isSpreadCase) {
      for (const player of players) {
        const id = runner.spawn({
          type: 'spread',
          targetPlayerId: player.id,
          radius: SPREAD_RADIUS,
          duration: ADDITIONAL_MECHANIC_DURATION,
        });
        runner.waitForResolve(id).then(result => {
          const { playersHit } = result.data as { playersHit: string[] };
          for (const playerId of playersHit) {
            runner.damage(playerId, SPREAD_DAMAGE);
            runner.applyStatus(playerId, 'vulnerability', VULNERABILITY_DURATION);
          }
        });
      }
    } else {
      const giveToRooted = Math.random() < 0.5;
      const targetIds = giveToRooted ? rootedPlayerIds : bubbledPlayerIds;
      for (const playerId of targetIds) {
        const id = runner.spawn({
          type: 'stack',
          targetPlayerId: playerId,
          radius: STACK_RADIUS,
          duration: ADDITIONAL_MECHANIC_DURATION,
        });
        runner.waitForResolve(id).then(result => {
          const { playersInside } = result.data as { playersInside: string[] };
          if (playersInside.length > 0) {
            const damagePerPlayer = STACK_TOTAL_DAMAGE / playersInside.length;
            for (const pid of playersInside) {
              runner.damage(pid, damagePerPlayer);
              runner.applyStatus(pid, 'vulnerability', VULNERABILITY_DURATION);
            }
          }
        });
      }
    }
  }

  function convertToFinalStatuses() {
    for (const playerId of rootedPlayerIds) {
      runner.applyStatus(playerId, 'rooted', FINAL_STATUS_DURATION);
    }
    for (const playerId of bubbledPlayerIds) {
      runner.applyStatus(playerId, 'bubbled', FINAL_STATUS_DURATION);
    }
  }

  function knockCrystalsFirstPair() {
    for (const q of firstPair) {
      knockCrystals(q);
    }
  }

  function knockCrystalsSecondPair() {
    for (const q of secondPair) {
      knockCrystals(q);
    }
  }

  function spawnCrystalLineAoes() {
    for (const crystal of crystals) {
      const id = crystal.isRotated
        ? runner.spawn({
            type: 'lineAoe',
            startX: crystal.x,
            startY: 0,
            endX: crystal.x,
            endY: ARENA_HEIGHT,
            width: CRYSTAL_AOE_WIDTH,
            duration: CRYSTAL_AOE_DURATION,
          })
        : runner.spawn({
            type: 'lineAoe',
            startX: ARENA_WIDTH,
            startY: crystal.y,
            endX: 0,
            endY: crystal.y,
            width: CRYSTAL_AOE_WIDTH,
            duration: CRYSTAL_AOE_DURATION,
          });

      runner.waitForResolve(id).then(result => {
        const { playersHit } = result.data as { playersHit: string[] };
        for (const playerId of playersHit) {
          runner.damage(playerId, CRYSTAL_AOE_DAMAGE);
        }
      });
    }
  }

  // === Helpers ===

  function spawnCrystals() {
    const positions = [
      { x: 100, y: 100 },
      { x: 500, y: 300 },
      { x: 700, y: 500 },
      { x: 300, y: 700 },
    ];
    const rotatedIndices = new Set<number>();
    while (rotatedIndices.size < 2) {
      rotatedIndices.add(Math.floor(Math.random() * 4));
    }
    return positions.map((pos, i) => {
      const isRotated = rotatedIndices.has(i);
      const id = runner.spawnDoodad({
        type: 'crystal',
        x: pos.x,
        y: pos.y,
        width: 30,
        height: 60,
        rotation: isRotated ? Math.PI / 2 : 0,
        duration: 15000,
        layer: 'background',
      });
      return { id, x: pos.x, y: pos.y, isRotated };
    });
  }

  function spawnKnockback(q: KnockbackZone, triggerAt: number) {
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
  }

  function knockCrystals(q: KnockbackZone) {
    for (const crystal of crystals) {
      if (isInsideLinearKnockbackRect(
        q.startX, q.startY, q.endX, q.endY, q.width,
        crystal.x, crystal.y
      )) {
        const dir = getLinearKnockbackDirection(q.startX, q.startY, q.endX, q.endY);
        const endpoint = calculateKnockbackEndpoint(
          crystal.x, crystal.y, dir.x, dir.y, KNOCKBACK_DISTANCE
        );
        runner.moveDoodad(crystal.id, endpoint.x, endpoint.y, KNOCKBACK_DURATION);
        crystal.x = endpoint.x;
        crystal.y = endpoint.y;
      }
    }
  }
};

// === Types ===

type KnockbackZone = { startX: number; startY: number; endX: number; endY: number; width: number };

// === Pure functions ===

function buildKnockbackPairs(clockwise: boolean, nwSeFirst: boolean) {
  // Knockback direction = perpendicular right of line = (lineDirY, -lineDirX)
  const nw: KnockbackZone = clockwise
    ? { startX: HALF_W / 2, startY: 0, endX: HALF_W / 2, endY: HALF_H, width: HALF_W }
    : { startX: HALF_W, startY: HALF_H / 2, endX: 0, endY: HALF_H / 2, width: HALF_H };

  const ne: KnockbackZone = clockwise
    ? { startX: ARENA_WIDTH, startY: HALF_H / 2, endX: HALF_W, endY: HALF_H / 2, width: HALF_H }
    : { startX: HALF_W + HALF_W / 2, startY: HALF_H, endX: HALF_W + HALF_W / 2, endY: 0, width: HALF_W };

  const se: KnockbackZone = clockwise
    ? { startX: HALF_W + HALF_W / 2, startY: ARENA_HEIGHT, endX: HALF_W + HALF_W / 2, endY: HALF_H, width: HALF_W }
    : { startX: HALF_W, startY: HALF_H + HALF_H / 2, endX: ARENA_WIDTH, endY: HALF_H + HALF_H / 2, width: HALF_H };

  const sw: KnockbackZone = clockwise
    ? { startX: 0, startY: HALF_H + HALF_H / 2, endX: HALF_W, endY: HALF_H + HALF_H / 2, width: HALF_H }
    : { startX: HALF_W / 2, startY: HALF_H, endX: HALF_W / 2, endY: ARENA_HEIGHT, width: HALF_W };

  return {
    firstPair: nwSeFirst ? [nw, se] : [ne, sw],
    secondPair: nwSeFirst ? [ne, sw] : [nw, se],
  };
}
