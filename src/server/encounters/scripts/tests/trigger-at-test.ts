import { Script } from '../../types';
import { ARENA_WIDTH, ARENA_HEIGHT } from '../../../../shared/types';

/**
 * Test script for TRIGGER-008: Verifies triggerAt works correctly.
 *
 * Test scenario:
 * - At T=0, spawn chariot at left side with triggerAt: 3000
 * - At T=1500, spawn chariot at right side with triggerAt: 3000
 *
 * Expected behavior:
 * - Both chariots should resolve at approximately T=3000
 * - Despite different spawn times, they synchronize to same absolute time
 * - First chariot has duration 3000ms, second has duration 1500ms
 *
 * Verification:
 * - Both mechanics should be visible simultaneously before T=3000
 * - Both should disappear at approximately the same time
 */
export const triggerAtTest: Script = async (runner) => {
  console.log('TRIGGER-008 TEST: Starting triggerAt verification');

  // Spawn first chariot at T=0 with triggerAt: 3000
  const id1 = runner.spawn({
    type: 'chariot',
    x: ARENA_WIDTH * 0.25,
    y: ARENA_HEIGHT / 2,
    triggerAt: 3000,
  });
  console.log(`TRIGGER-008: Spawned chariot 1 at T=0, id=${id1}, triggerAt=3000`);

  // Wait 1500ms
  await runner.wait(1500);

  // Spawn second chariot at T=1500 with triggerAt: 3000
  const id2 = runner.spawn({
    type: 'chariot',
    x: ARENA_WIDTH * 0.75,
    y: ARENA_HEIGHT / 2,
    triggerAt: 3000,
  });
  console.log(`TRIGGER-008: Spawned chariot 2 at T=1500, id=${id2}, triggerAt=3000`);

  // Wait for both to resolve
  await Promise.all([
    runner.waitForResolve(id1),
    runner.waitForResolve(id2),
  ]);

  console.log('TRIGGER-008 TEST PASSED: Both chariots resolved');
};
