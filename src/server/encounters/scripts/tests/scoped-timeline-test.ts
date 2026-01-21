import { Script } from '../../types';
import { ARENA_WIDTH, ARENA_HEIGHT } from '../../../../shared/types';

/**
 * Test script for TRIGGER-006a: Verifies sub-scripts get scoped timeline.
 *
 * Test scenario:
 * - Parent script waits 3000ms
 * - Then calls run() with a sub-script
 * - Sub-script spawns chariot with triggerAt: 1500
 *
 * Expected behavior (with fix):
 * - Sub-script's T=0 is when run() is called (at parent's T=3000)
 * - Chariot spawns at sub-script's T=0 with duration=1500ms
 * - Chariot resolves at parent's T=4500
 *
 * Failure behavior (without fix):
 * - Sub-script would use parent's timeline where elapsed=3000
 * - triggerAt: 1500 would be in the past → throws error
 */
const subScript: Script = async (runner) => {
  // This should work because sub-script has its own timeline
  // Sub-script T=0 is when run() is called
  runner.spawn({
    type: 'chariot',
    x: ARENA_WIDTH / 2,
    y: ARENA_HEIGHT / 2,
    triggerAt: 1500,
  });
};

export const scopedTimelineTest: Script = async (runner) => {
  // Spawn a marker chariot to show test started
  runner.spawn({
    type: 'chariot',
    x: ARENA_WIDTH * 0.2,
    y: ARENA_HEIGHT * 0.2,
    duration: 5000,
  });

  // Wait 3 seconds - after this, parent elapsed time = 3000ms
  await runner.wait(3000);

  // Run sub-script. If fix is correct:
  // - Sub-script gets new ScriptRunnerImpl with scriptStartTime = now
  // - Sub-script's getElapsedTime() returns ~0
  // - triggerAt: 1500 computes to duration: 1500ms
  // - Chariot spawns successfully
  //
  // Without fix:
  // - Sub-script reuses parent runner where elapsed = 3000ms
  // - triggerAt: 1500 computes to 1500 - 3000 = -1500 (negative!)
  // - Error thrown: "triggerAt time has already passed"
  await runner.run(subScript);

  // If we get here, the test passed
  console.log('TRIGGER-006a TEST PASSED: Sub-script timeline is correctly scoped');
};
