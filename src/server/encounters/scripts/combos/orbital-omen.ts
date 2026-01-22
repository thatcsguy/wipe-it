import { Script } from '../../types';
import { ARENA_WIDTH, ARENA_HEIGHT } from '../../../../shared/types';

// === Timing Gaps (adjust these to tune pacing) ===
const PORTAL_SPAWN_INTERVAL = 1500;    // time between portal pair spawns
const LINE_REACTION_TIME = 500;        // time between line appearing and resolving
const LINE_RESOLVE_INTERVAL = 1500;    // time between line pair resolutions

// === Computed Absolute Times (don't edit directly) ===
const PORTAL_1_TIME = 0;
const PORTAL_2_TIME = PORTAL_1_TIME + PORTAL_SPAWN_INTERVAL;
const PORTAL_3_TIME = PORTAL_2_TIME + PORTAL_SPAWN_INTERVAL;
const PORTAL_4_TIME = PORTAL_3_TIME + PORTAL_SPAWN_INTERVAL;

const LINE_1_TIME = PORTAL_4_TIME + LINE_RESOLVE_INTERVAL;
const LINE_2_TIME = LINE_1_TIME + LINE_RESOLVE_INTERVAL;
const LINE_3_TIME = LINE_2_TIME + LINE_RESOLVE_INTERVAL;
const LINE_4_TIME = LINE_3_TIME + LINE_RESOLVE_INTERVAL;

const LINE_1_RESOLVE = LINE_1_TIME + LINE_REACTION_TIME;
const LINE_4_RESOLVE = LINE_4_TIME + LINE_REACTION_TIME;
const SCRIPT_DURATION = LINE_4_RESOLVE;

// === Derived Durations (auto-align with timeline) ===
const PORTAL_1_DURATION = LINE_1_RESOLVE - PORTAL_1_TIME;
const PORTAL_2_DURATION = LINE_2_TIME + LINE_REACTION_TIME - PORTAL_2_TIME;
const PORTAL_3_DURATION = LINE_3_TIME + LINE_REACTION_TIME - PORTAL_3_TIME;
const PORTAL_4_DURATION = LINE_4_RESOLVE - PORTAL_4_TIME;
const CONE_DURATION = LINE_1_RESOLVE - PORTAL_4_TIME;

// === Mechanic Constants (fixed values, not timeline-dependent) ===
const LINE_WIDTH = 200;
const PORTAL_SIZE = 80;
const PORTAL_OFFSET = -50;
const DAMAGE = 30;
const VULN_DURATION = 5000;
const CONE_ANGLE = Math.PI / 2;
const CONE_RADIUS = 800;

// N-S line center X positions (west to east, positions 1-4)
const NS_POSITIONS = [100, 300, 500, 700];

// E-W line center Y positions (north to south, positions 1-4)
const EW_POSITIONS = [100, 300, 500, 700];

/**
 * Orbital Omen:
 * 4 N-S line AOEs + 4 E-W line AOEs spawn in pairs at intervals.
 * Each set has a random order, but the 2nd spawn must be position 2 or 3.
 * Lines resolve in spawn order. Players must dodge into safe zones as each pair resolves.
 */
export const orbitalOmen: Script = async (runner, ctx) => {
  // === Setup ===
  const nsOrder = generateConstrainedOrder();
  const ewOrder = generateConstrainedOrder();
  ctx.nsOrder = nsOrder;
  ctx.ewOrder = ewOrder;

  // === Timeline ===
  runner.at(PORTAL_1_TIME, () => spawnPortalPair(0, PORTAL_1_DURATION));
  runner.at(PORTAL_2_TIME, () => spawnPortalPair(1, PORTAL_2_DURATION));
  runner.at(PORTAL_3_TIME, () => spawnPortalPair(2, PORTAL_3_DURATION));
  runner.at(PORTAL_4_TIME, () => {
    spawnPortalPair(3, PORTAL_4_DURATION);
    spawnCones();
  });

  runner.at(LINE_1_TIME, () => spawnLinePair(0));
  runner.at(LINE_2_TIME, () => spawnLinePair(1));
  runner.at(LINE_3_TIME, () => spawnLinePair(2));
  runner.at(LINE_4_TIME, () => spawnLinePair(3));

  await runner.runTimeline({ duration: SCRIPT_DURATION });

  // === Handlers ===
  function spawnPortalPair(index: number, duration: number) {
    const nsPos = NS_POSITIONS[nsOrder[index]];
    const ewPos = EW_POSITIONS[ewOrder[index]];

    // N-S portals (top and bottom)
    runner.spawnDoodad({
      type: 'portal',
      x: nsPos,
      y: PORTAL_OFFSET,
      width: PORTAL_SIZE,
      height: PORTAL_SIZE,
      duration,
      color: '#8844ff',
      layer: 'background',
    });
    runner.spawnDoodad({
      type: 'portal',
      x: nsPos,
      y: ARENA_HEIGHT - PORTAL_OFFSET,
      width: PORTAL_SIZE,
      height: PORTAL_SIZE,
      duration,
      color: '#8844ff',
      layer: 'background',
    });

    // E-W portals (left and right)
    runner.spawnDoodad({
      type: 'portal',
      x: PORTAL_OFFSET,
      y: ewPos,
      width: PORTAL_SIZE,
      height: PORTAL_SIZE,
      duration,
      color: '#8844ff',
      layer: 'background',
    });
    runner.spawnDoodad({
      type: 'portal',
      x: ARENA_WIDTH - PORTAL_OFFSET,
      y: ewPos,
      width: PORTAL_SIZE,
      height: PORTAL_SIZE,
      duration,
      color: '#8844ff',
      layer: 'background',
    });
  }

  function spawnCones() {
    const centerX = ARENA_WIDTH / 2;
    const centerY = ARENA_HEIGHT / 2;

    // North-pointing cone
    const northConeId = runner.spawn({
      type: 'conalAoe',
      centerX,
      centerY,
      endpointX: centerX,
      endpointY: centerY - CONE_RADIUS,
      angle: CONE_ANGLE,
      duration: CONE_DURATION,
    });
    runner.waitForResolve(northConeId).then(result => {
      const { playersHit } = result.data as { playersHit: string[] };
      applyEffects(playersHit);
    });

    // South-pointing cone
    const southConeId = runner.spawn({
      type: 'conalAoe',
      centerX,
      centerY,
      endpointX: centerX,
      endpointY: centerY + CONE_RADIUS,
      angle: CONE_ANGLE,
      duration: CONE_DURATION,
    });
    runner.waitForResolve(southConeId).then(result => {
      const { playersHit } = result.data as { playersHit: string[] };
      applyEffects(playersHit);
    });
  }

  function spawnLinePair(index: number) {
    const nsPos = NS_POSITIONS[nsOrder[index]];
    const ewPos = EW_POSITIONS[ewOrder[index]];

    const nsId = runner.spawn({
      type: 'lineAoe',
      startX: nsPos,
      startY: 0,
      endX: nsPos,
      endY: ARENA_HEIGHT,
      width: LINE_WIDTH,
      duration: LINE_REACTION_TIME,
    });
    runner.waitForResolve(nsId).then(result => {
      const { playersHit } = result.data as { playersHit: string[] };
      applyEffects(playersHit);
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
    runner.waitForResolve(ewId).then(result => {
      const { playersHit } = result.data as { playersHit: string[] };
      applyEffects(playersHit);
    });
  }

  // === Helpers ===
  function applyEffects(playersHit: string[]) {
    for (const playerId of playersHit) {
      runner.damage(playerId, DAMAGE);
      runner.applyStatus(playerId, 'vulnerability', VULN_DURATION);
    }
  }
};

// === Pure functions (no runner dependency) ===

/**
 * Generate random order of [0,1,2,3] where the 2nd element (index 1) is 1 or 2
 * (corresponding to positions 2 or 3 in 1-indexed terms)
 */
function generateConstrainedOrder(): number[] {
  const middleIndex = Math.random() < 0.5 ? 1 : 2;
  const remaining = [0, 1, 2, 3].filter(i => i !== middleIndex);

  for (let i = remaining.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
  }

  return [remaining[0], middleIndex, remaining[1], remaining[2]];
}
