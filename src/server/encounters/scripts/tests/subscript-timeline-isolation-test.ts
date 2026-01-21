import { Script } from '../../types';
import { ARENA_WIDTH, ARENA_HEIGHT } from '../../../../shared/types';

/**
 * Test script for TIMELINE-006: Verifies sub-scripts via run() get isolated timeline arrays.
 *
 * Test scenario:
 * - Parent schedules fn_parent1@T=0, fn_parent2@T=2000 via at()
 * - fn_parent1 calls run(subScript)
 * - subScript schedules fn_sub@T=500 and calls runTimeline()
 *
 * Expected behavior:
 * - Parent timeline: [fn_parent1@0, fn_parent2@2000]
 * - Sub-script timeline: [fn_sub@500] (completely separate)
 * - Execution order:
 *   T=0:    fn_parent1 starts, calls run(subScript)
 *   T=500:  fn_sub executes (within subScript's runTimeline)
 *   T=~500: fn_parent1 returns, parent continues
 *   T=2000: fn_parent2 executes
 *
 * Visual verification:
 * - Chariot at top-left (160,160) = parent fn1
 * - Chariot at center (400,400) = sub-script fn
 * - Chariot at bottom-right (640,640) = parent fn2
 */

const subScript: Script = async (runner) => {
  console.log('[TIMELINE-006] Sub-script started');

  // Schedule fn_sub at T=500 (relative to sub-script start)
  runner.at(500, () => {
    console.log('[TIMELINE-006] fn_sub executed at sub-script T=500');
    runner.spawn({
      type: 'chariot',
      x: ARENA_WIDTH * 0.5,  // Center
      y: ARENA_HEIGHT * 0.5,
      duration: 3000,
    });
  });

  // Run sub-script's own timeline
  await runner.runTimeline();
  console.log('[TIMELINE-006] Sub-script finished');
};

export const subscriptTimelineIsolationTest: Script = async (runner) => {
  const executionLog: string[] = [];

  // Schedule fn_parent1 at T=0
  runner.at(0, async () => {
    executionLog.push('fn_parent1_start');
    console.log('[TIMELINE-006] fn_parent1 executed');
    runner.spawn({
      type: 'chariot',
      x: ARENA_WIDTH * 0.2,  // Top-left
      y: ARENA_HEIGHT * 0.2,
      duration: 4000,
    });

    // Call sub-script - its timeline should be isolated
    await runner.run(subScript);

    executionLog.push('fn_parent1_end');
    console.log('[TIMELINE-006] fn_parent1 returned from sub-script');
  });

  // Schedule fn_parent2 at T=2000
  runner.at(2000, () => {
    executionLog.push('fn_parent2');
    console.log('[TIMELINE-006] fn_parent2 executed');
    runner.spawn({
      type: 'chariot',
      x: ARENA_WIDTH * 0.8,  // Bottom-right
      y: ARENA_HEIGHT * 0.8,
      duration: 2000,
    });
  });

  // Run parent timeline
  await runner.runTimeline();

  // Verify execution order
  const expected = ['fn_parent1_start', 'fn_parent1_end', 'fn_parent2'];
  const passed = executionLog.length === 3 &&
    executionLog[0] === 'fn_parent1_start' &&
    executionLog[1] === 'fn_parent1_end' &&
    executionLog[2] === 'fn_parent2';

  if (passed) {
    console.log(`[TIMELINE-006] TEST PASSED: Execution order correct: ${executionLog.join(' -> ')}`);
    console.log('[TIMELINE-006] Sub-script timeline was isolated from parent timeline');
  } else {
    console.error(`[TIMELINE-006] TEST FAILED: Expected ${expected.join(' -> ')}, got ${executionLog.join(' -> ')}`);
  }
};
