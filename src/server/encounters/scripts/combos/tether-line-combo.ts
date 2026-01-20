import { Script } from '../../types';
import { random } from '../../targeting';

/**
 * Tether to Line AOE combo:
 * 1. Select 2 random players
 * 2. Spawn stretch tether between them
 * 3. Wait for tether to resolve
 * 4. Spawn line AOE from player1's position to player2's position
 */
export const tetherLineCombo: Script = async (runner, ctx) => {
  // Select 2 random players for the tether
  const targets = runner.select(random(2));
  if (targets.length < 2) {
    // Not enough players - exit early
    return;
  }

  // Store tether targets in context for potential reuse
  ctx.tetherTargets = [targets[0].id, targets[1].id];

  // Spawn stretch tether between the two players
  const tetherId = runner.spawn({
    type: 'tether',
    endpointA: { type: 'player', playerId: targets[0].id },
    endpointB: { type: 'player', playerId: targets[1].id },
  });

  // Wait for tether to resolve
  const result = await runner.waitForResolve(tetherId);

  // Extract positions from tether result
  const data = result.data as {
    player1: { id: string | null; position: { x: number; y: number } };
    player2: { id: string | null; position: { x: number; y: number } };
    stretched: boolean;
  };

  // Spawn line AOE from player1's position to player2's position
  runner.spawn({
    type: 'lineAoe',
    startX: data.player1.position.x,
    startY: data.player1.position.y,
    endX: data.player2.position.x,
    endY: data.player2.position.y,
  });
};
