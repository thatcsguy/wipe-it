import { Script } from '../../types';
import { random } from '../../targeting';

/**
 * Simple stack test script:
 * 1. Select 1 random player
 * 2. Spawn stack on that player
 * 3. Wait for resolve
 * 4. Log result for verification
 */
export const stackTest: Script = async (runner, ctx) => {
  const targets = runner.select(random(1));
  if (targets.length < 1) {
    console.log('stackTest: No players found');
    return;
  }

  const targetPlayer = targets[0];
  console.log(`stackTest: Spawning stack on player ${targetPlayer.id}`);

  const stackId = runner.spawn({
    type: 'stack',
    targetPlayerId: targetPlayer.id,
    duration: 3000,
    radius: 100,
  });

  console.log(`stackTest: Stack spawned with ID ${stackId}`);

  const result = await runner.waitForResolve(stackId);
  const data = result.data as { playersInside: string[]; targetPosition: { x: number; y: number } | null };

  console.log(`stackTest: Stack resolved`);
  console.log(`  - playersInside: [${data.playersInside.join(', ')}]`);
  console.log(`  - targetPosition: ${data.targetPosition ? `(${data.targetPosition.x}, ${data.targetPosition.y})` : 'null'}`);

  // Store in context for external verification
  ctx.stackResult = result;
};
