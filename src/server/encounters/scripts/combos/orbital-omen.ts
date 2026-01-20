import { Script, ScriptRunner } from '../../types';
import { ARENA_WIDTH, ARENA_HEIGHT } from '../../../../shared/types';

const LINE_WIDTH = 200;
const PORTAL_SIZE = 80;
const PORTAL_OFFSET = -50; // Distance outside arena edge
const DAMAGE = 30;
const VULN_DURATION = 5000;
const SPAWN_INTERVAL = 1500; // Time between portal spawns
const PORTAL_DURATION = 7500; // Time from portal spawn to line resolution
const LINE_REACTION_TIME = 500; // Time between line appearing and resolving
const CONE_ANGLE = Math.PI / 2; // 90 degrees in radians
const CONE_RADIUS = 800;

/** Apply damage and vulnerability to hit players */
function applyEffects(runner: ScriptRunner, playersHit: string[]): void {
  for (const playerId of playersHit) {
    runner.damage(playerId, DAMAGE);
    runner.applyStatus(playerId, 'vulnerability', VULN_DURATION);
  }
}

// N-S line center X positions (west to east, positions 1-4)
const NS_POSITIONS = [100, 300, 500, 700];

// E-W line center Y positions (north to south, positions 1-4)
const EW_POSITIONS = [100, 300, 500, 700];

/**
 * Generate random order of [0,1,2,3] where the 2nd element (index 1) is 1 or 2
 * (corresponding to positions 2 or 3 in 1-indexed terms)
 */
function generateConstrainedOrder(): number[] {
  // Pick whether 2nd spawn is position 2 (index 1) or position 3 (index 2)
  const middleIndex = Math.random() < 0.5 ? 1 : 2;

  // Remaining indices to place in slots 0, 2, 3
  const remaining = [0, 1, 2, 3].filter(i => i !== middleIndex);

  // Shuffle remaining
  for (let i = remaining.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
  }

  // Build result: [remaining[0], middleIndex, remaining[1], remaining[2]]
  return [remaining[0], middleIndex, remaining[1], remaining[2]];
}

/**
 * Orbital Omen:
 * 4 N-S line AOEs + 4 E-W line AOEs spawn in pairs at 1.5s intervals.
 * Each set has a random order, but the 2nd spawn must be position 2 or 3.
 * After 3s pause, they resolve in spawn order (1.5s apart).
 * Players must dodge into safe zones as each pair resolves.
 */
export const orbitalOmen: Script = async (runner, ctx) => {
  // Generate independent random orders for N-S and E-W sets
  const nsOrder = generateConstrainedOrder();
  const ewOrder = generateConstrainedOrder();

  // Store orders in context for debugging/inspection
  ctx.nsOrder = nsOrder;
  ctx.ewOrder = ewOrder;

  let northConeId: string | null = null;
  let southConeId: string | null = null;

  // Phase 1: Spawn all portals (visual warning) and cones
  for (let i = 0; i < 4; i++) {
    const nsPos = NS_POSITIONS[nsOrder[i]];
    const ewPos = EW_POSITIONS[ewOrder[i]];

    // Spawn portal doodads at origin points to indicate where lines WILL spawn
    // N-S lines come from both top and bottom
    runner.spawnDoodad({
      type: 'portal',
      x: nsPos,
      y: PORTAL_OFFSET, // Above arena (north edge)
      width: PORTAL_SIZE,
      height: PORTAL_SIZE,
      duration: PORTAL_DURATION,
      color: '#8844ff',
      layer: 'background',
    });
    runner.spawnDoodad({
      type: 'portal',
      x: nsPos,
      y: ARENA_HEIGHT - PORTAL_OFFSET, // Below arena (south edge)
      width: PORTAL_SIZE,
      height: PORTAL_SIZE,
      duration: PORTAL_DURATION,
      color: '#8844ff',
      layer: 'background',
    });

    // E-W lines come from both left and right
    runner.spawnDoodad({
      type: 'portal',
      x: PORTAL_OFFSET, // Left of arena (west edge)
      y: ewPos,
      width: PORTAL_SIZE,
      height: PORTAL_SIZE,
      duration: PORTAL_DURATION,
      color: '#8844ff',
      layer: 'background',
    });
    runner.spawnDoodad({
      type: 'portal',
      x: ARENA_WIDTH - PORTAL_OFFSET, // Right of arena (east edge)
      y: ewPos,
      width: PORTAL_SIZE,
      height: PORTAL_SIZE,
      duration: PORTAL_DURATION,
      color: '#8844ff',
      layer: 'background',
    });

    // Spawn conal AOEs with the 4th pair
    if (i === 3) {
      const centerX = ARENA_WIDTH / 2;
      const centerY = ARENA_HEIGHT / 2;

      // Cones resolve with first line set
      const coneDuration = PORTAL_DURATION - 3 * SPAWN_INTERVAL;

      // North-pointing cone
      northConeId = runner.spawn({
        type: 'conalAoe',
        centerX,
        centerY,
        endpointX: centerX,
        endpointY: centerY - CONE_RADIUS,
        angle: CONE_ANGLE,
        duration: coneDuration,
      });

      // South-pointing cone
      southConeId = runner.spawn({
        type: 'conalAoe',
        centerX,
        centerY,
        endpointX: centerX,
        endpointY: centerY + CONE_RADIUS,
        angle: CONE_ANGLE,
        duration: coneDuration,
      });
    }

    // Wait before next portal spawn (except after the last one)
    if (i < 3) {
      await runner.wait(SPAWN_INTERVAL);
    }
  }

  // Phase 2: Spawn lines shortly before resolution (limited reaction window)
  // After phase 1, we're at t = 3 * SPAWN_INTERVAL = 4500ms
  // First line should spawn at t = PORTAL_DURATION - LINE_REACTION_TIME = 7000ms
  await runner.wait(PORTAL_DURATION - 3 * SPAWN_INTERVAL - LINE_REACTION_TIME);

  for (let i = 0; i < 4; i++) {
    const nsPos = NS_POSITIONS[nsOrder[i]];
    const ewPos = EW_POSITIONS[ewOrder[i]];

    // Spawn lines with short duration - limited time to react
    const nsId = runner.spawn({
      type: 'lineAoe',
      startX: nsPos,
      startY: 0,
      endX: nsPos,
      endY: ARENA_HEIGHT,
      width: LINE_WIDTH,
      duration: LINE_REACTION_TIME,
    });

    const ewId = runner.spawn({
      type: 'lineAoe',
      startX: 0,
      startY: ewPos,
      endX: ARENA_WIDTH,
      endY: ewPos,
      width: LINE_WIDTH,
      duration: LINE_REACTION_TIME,
    });

    // Wait for resolution and apply effects
    if (i === 0 && northConeId && southConeId) {
      // First pair: also resolve cones
      const [nsResult, ewResult, northConeResult, southConeResult] = await Promise.all([
        runner.waitForResolve(nsId),
        runner.waitForResolve(ewId),
        runner.waitForResolve(northConeId),
        runner.waitForResolve(southConeId),
      ]);

      const nsHit = (nsResult.data as { playersHit: string[] }).playersHit;
      const ewHit = (ewResult.data as { playersHit: string[] }).playersHit;
      const northConeHit = (northConeResult.data as { playersHit: string[] }).playersHit;
      const southConeHit = (southConeResult.data as { playersHit: string[] }).playersHit;

      applyEffects(runner, nsHit);
      applyEffects(runner, ewHit);
      applyEffects(runner, northConeHit);
      applyEffects(runner, southConeHit);
    } else {
      const [nsResult, ewResult] = await Promise.all([
        runner.waitForResolve(nsId),
        runner.waitForResolve(ewId),
      ]);

      const nsHit = (nsResult.data as { playersHit: string[] }).playersHit;
      const ewHit = (ewResult.data as { playersHit: string[] }).playersHit;

      applyEffects(runner, nsHit);
      applyEffects(runner, ewHit);
    }

    // Wait before spawning next line pair (except after last)
    if (i < 3) {
      await runner.wait(SPAWN_INTERVAL - LINE_REACTION_TIME);
    }
  }
};
