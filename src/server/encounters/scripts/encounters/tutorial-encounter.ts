import { Script, ScriptRunner } from '../../types';
import { all } from '../../targeting';
import { tetherLineCombo } from '../combos/tether-line-combo';
import { ARENA_WIDTH, ARENA_HEIGHT } from '../../../../shared/types';

const CHARIOT_DAMAGE = 50;
const SPREAD_DAMAGE = 30;

/** Apply damage to hit players */
function applyDamage(runner: ScriptRunner, playersHit: string[], damage: number): void {
  for (const playerId of playersHit) {
    runner.damage(playerId, damage);
  }
}

/**
 * Multi-phase tutorial encounter:
 * Phase 1: Spawn chariot at center, wait for resolve, apply damage
 * Phase 2: Spawn spreads on all players, wait for resolve, apply damage
 * Phase 3: Run tether-line combo (handles its own effects)
 * Phase 4: Spawn chariot + spreads simultaneously, wait for resolve, apply damage
 */
export const tutorialEncounter: Script = async (runner, _ctx) => {
  const centerX = ARENA_WIDTH / 2;
  const centerY = ARENA_HEIGHT / 2;

  // Phase 1: Chariot at center
  const chariotId1 = runner.spawn({ type: 'chariot', x: centerX, y: centerY });
  const chariotResult1 = await runner.waitForResolve(chariotId1);
  const chariotHit1 = (chariotResult1.data as { playersHit: string[] }).playersHit;
  applyDamage(runner, chariotHit1, CHARIOT_DAMAGE);

  // Phase 2: Spreads on all players
  const allPlayers = runner.select(all());
  const spreadIds: string[] = [];
  for (const player of allPlayers) {
    spreadIds.push(runner.spawn({ type: 'spread', targetPlayerId: player.id }));
  }
  // Wait for all spreads to resolve and apply damage
  const spreadResults = await Promise.all(spreadIds.map(id => runner.waitForResolve(id)));
  for (const result of spreadResults) {
    const playersHit = (result.data as { playersHit: string[] }).playersHit;
    applyDamage(runner, playersHit, SPREAD_DAMAGE);
  }

  // Phase 3: Tether-line combo (handles its own effects)
  await runner.run(tetherLineCombo);

  // Phase 4: Chariot + spreads simultaneously
  const chariotId2 = runner.spawn({ type: 'chariot', x: centerX, y: centerY });
  const players = runner.select(all());
  const spreadIds2: string[] = [];
  for (const player of players) {
    spreadIds2.push(runner.spawn({ type: 'spread', targetPlayerId: player.id }));
  }

  // Wait for all mechanics to resolve and apply damage
  const [chariotResult2, ...spreadResults2] = await Promise.all([
    runner.waitForResolve(chariotId2),
    ...spreadIds2.map(id => runner.waitForResolve(id)),
  ]);

  const chariotHit2 = (chariotResult2.data as { playersHit: string[] }).playersHit;
  applyDamage(runner, chariotHit2, CHARIOT_DAMAGE);

  for (const result of spreadResults2) {
    const playersHit = (result.data as { playersHit: string[] }).playersHit;
    applyDamage(runner, playersHit, SPREAD_DAMAGE);
  }
};
