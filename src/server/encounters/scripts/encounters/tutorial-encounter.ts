import { Script } from '../../types';
import { all } from '../../targeting';
import { tetherLineCombo } from '../combos/tether-line-combo';
import { ARENA_WIDTH, ARENA_HEIGHT } from '../../../../shared/types';

/**
 * Multi-phase tutorial encounter:
 * Phase 1: Spawn chariot at center, wait 4s
 * Phase 2: Spawn spreads on all players, wait 4s
 * Phase 3: Run tether-line combo
 * Phase 4: Spawn chariot + spreads simultaneously
 */
export const tutorialEncounter: Script = async (runner, _ctx) => {
  const centerX = ARENA_WIDTH / 2;
  const centerY = ARENA_HEIGHT / 2;

  // Phase 1: Chariot at center
  runner.spawn({ type: 'chariot', x: centerX, y: centerY });
  await runner.wait(4000);

  // Phase 2: Spreads on all players
  const allPlayers = runner.select(all());
  for (const player of allPlayers) {
    runner.spawn({ type: 'spread', targetPlayerId: player.id });
  }
  await runner.wait(4000);

  // Phase 3: Tether-line combo
  await runner.run(tetherLineCombo);

  // Phase 4: Chariot + spreads simultaneously
  runner.spawn({ type: 'chariot', x: centerX, y: centerY });
  const players = runner.select(all());
  for (const player of players) {
    runner.spawn({ type: 'spread', targetPlayerId: player.id });
  }
};
