import { Script } from '../../types';
import { random } from '../../targeting';
import { ARENA_WIDTH, ARENA_HEIGHT } from '../../../../shared/types';

const TETHER_FAIL_DAMAGE = 100;
const TETHER_FAIL_VULN_DURATION = 1000;

// Wall midpoints (game coords: 0 to ARENA_WIDTH/HEIGHT)
const WALL_MIDPOINTS = [
  { x: ARENA_WIDTH / 2, y: 0 }, // Top
  { x: ARENA_WIDTH / 2, y: ARENA_HEIGHT }, // Bottom
  { x: 0, y: ARENA_HEIGHT / 2 }, // Left
  { x: ARENA_WIDTH, y: ARENA_HEIGHT / 2 }, // Right
];

/**
 * Tether to Line AOE combo:
 * 1. Select 1 random player
 * 2. Pick a random wall midpoint
 * 3. Spawn stretch tether between player and wall
 * 4. Wait for tether to resolve
 * 5. Spawn line AOE from player's position to wall point
 */
export const tetherLineCombo: Script = async (runner, ctx) => {
  // Select 1 random player for the tether
  const targets = runner.select(random(1));
  if (targets.length < 1) {
    return;
  }

  // Pick a random wall midpoint
  const wallPoint = WALL_MIDPOINTS[Math.floor(Math.random() * WALL_MIDPOINTS.length)];

  // Store tether target in context for potential reuse
  ctx.tetherTarget = targets[0].id;
  ctx.wallPoint = wallPoint;

  // Spawn stretch tether from wall midpoint to player (pulse animates A→B)
  const tetherId = runner.spawn({
    type: 'tether',
    endpointA: { type: 'point', x: wallPoint.x, y: wallPoint.y },
    endpointB: { type: 'player', playerId: targets[0].id },
  });

  // Wait for tether to resolve
  const result = await runner.waitForResolve(tetherId);

  // Extract positions from tether result
  const data = result.data as {
    player1: { id: string | null; position: { x: number; y: number } };
    player2: { id: string | null; position: { x: number; y: number } };
    stretched: boolean;
  };

  // If tether wasn't stretched, apply damage and vulnerability to the player
  if (!data.stretched) {
    runner.damage(targets[0].id, TETHER_FAIL_DAMAGE);
    runner.applyStatus(targets[0].id, 'vulnerability', TETHER_FAIL_VULN_DURATION);
  }

  // Calculate direction vector and extend line by 200px on both sides
  const p1 = data.player1.position;
  const p2 = data.player2.position;
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.sqrt(dx * dx + dy * dy);
  const ux = dx / len;
  const uy = dy / len;
  const extend = 200;

  // Spawn line AOE extended 200px past both endpoints
  runner.spawn({
    type: 'lineAoe',
    startX: p1.x - ux * extend,
    startY: p1.y - uy * extend,
    endX: p2.x + ux * extend,
    endY: p2.y + uy * extend,
    width: 200,
    duration: 300,
  });
};
