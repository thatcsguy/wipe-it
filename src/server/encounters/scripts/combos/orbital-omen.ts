import { Script, ScriptRunner } from '../../types';
import { ARENA_WIDTH, ARENA_HEIGHT } from '../../../../shared/types';

const LINE_WIDTH = 200;
const DAMAGE = 50;
const VULN_DURATION = 5000;
const SPAWN_INTERVAL = 1500;
const DURATION = 7500; // All lines have same duration so they resolve in spawn order

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

  // Store mechanic IDs for each pair
  const pairs: { nsId: string; ewId: string }[] = [];

  // Spawn all 4 pairs
  for (let i = 0; i < 4; i++) {
    const nsPos = NS_POSITIONS[nsOrder[i]];
    const ewPos = EW_POSITIONS[ewOrder[i]];

    // N-S line (vertical): runs from top to bottom at nsPos X
    const nsId = runner.spawn({
      type: 'lineAoe',
      startX: nsPos,
      startY: 0,
      endX: nsPos,
      endY: ARENA_HEIGHT,
      width: LINE_WIDTH,
      duration: DURATION,
    });

    // E-W line (horizontal): runs from left to right at ewPos Y
    const ewId = runner.spawn({
      type: 'lineAoe',
      startX: 0,
      startY: ewPos,
      endX: ARENA_WIDTH,
      endY: ewPos,
      width: LINE_WIDTH,
      duration: DURATION,
    });

    pairs.push({ nsId, ewId });

    // Wait before next spawn (except after the last one)
    if (i < 3) {
      await runner.wait(SPAWN_INTERVAL);
    }
  }

  // Wait for each pair to resolve and apply effects
  for (const pair of pairs) {
    const [nsResult, ewResult] = await Promise.all([
      runner.waitForResolve(pair.nsId),
      runner.waitForResolve(pair.ewId),
    ]);

    // Apply effects to players hit by either AOE
    const nsHit = (nsResult.data as { playersHit: string[] }).playersHit;
    const ewHit = (ewResult.data as { playersHit: string[] }).playersHit;

    applyEffects(runner, nsHit);
    applyEffects(runner, ewHit);
  }
};
