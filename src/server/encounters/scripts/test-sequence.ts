import { Script } from '../types';
import { random } from '../targeting';
import { ARENA_WIDTH, ARENA_HEIGHT } from '../../../shared/types';

/**
 * Test script that demonstrates basic spawn + wait + select flow:
 * 1. Spawn chariot at arena center
 * 2. Wait 3 seconds
 * 3. Spawn spreads on 2 random players
 * 4. Wait 3 seconds
 * 5. Spawn another chariot
 */
export const testSequenceScript: Script = async (runner, _ctx) => {
  const centerX = ARENA_WIDTH / 2;
  const centerY = ARENA_HEIGHT / 2;

  // Phase 1: Spawn chariot at center
  runner.spawn({ type: 'chariot', x: centerX, y: centerY });

  // Wait 3 seconds
  await runner.wait(3000);

  // Phase 2: Spawn spreads on 2 random players
  const targets = runner.select(random(2));
  for (const player of targets) {
    runner.spawn({ type: 'spread', targetPlayerId: player.id });
  }

  // Wait 3 seconds
  await runner.wait(3000);

  // Phase 3: Spawn another chariot
  runner.spawn({ type: 'chariot', x: centerX, y: centerY });
};
