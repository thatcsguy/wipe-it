import { Script } from '../../types';
import { ARENA_WIDTH, ARENA_HEIGHT } from '../../../../shared/types';

/**
 * Test script for TIMELINE-005: Verifies dynamic at() calls during runTimeline().
 *
 * Test scenario:
 * - Schedule fn1 at T=0, fn2 at T=2000
 * - fn1 dynamically schedules fn3 at T=1000
 * - Call runTimeline()
 *
 * Expected execution order:
 * - T=0:    fn1 executes (spawns chariot at top-left, schedules fn3)
 * - T=1000: fn3 executes (spawns chariot at center)
 * - T=2000: fn2 executes (spawns chariot at bottom-right)
 *
 * Verification:
 * - Watch console for correct order: "fn1", "fn3", "fn2"
 * - Or observe chariot spawn order visually (top-left, center, bottom-right)
 */
export const dynamicSchedulingTest: Script = async (runner) => {
  const executionLog: string[] = [];

  // Schedule fn1 at T=0
  runner.at(0, () => {
    executionLog.push('fn1');
    console.log('[TIMELINE-005] fn1 executed');
    runner.spawn({
      type: 'chariot',
      x: ARENA_WIDTH * 0.2,
      y: ARENA_HEIGHT * 0.2,
      duration: 4000,
    });

    // Dynamically schedule fn3 at T=1000
    runner.at(1000, () => {
      executionLog.push('fn3');
      console.log('[TIMELINE-005] fn3 executed (dynamically scheduled)');
      runner.spawn({
        type: 'chariot',
        x: ARENA_WIDTH * 0.5,
        y: ARENA_HEIGHT * 0.5,
        duration: 3000,
      });
    });
  });

  // Schedule fn2 at T=2000
  runner.at(2000, () => {
    executionLog.push('fn2');
    console.log('[TIMELINE-005] fn2 executed');
    runner.spawn({
      type: 'chariot',
      x: ARENA_WIDTH * 0.8,
      y: ARENA_HEIGHT * 0.8,
      duration: 2000,
    });
  });

  // Run the timeline
  await runner.runTimeline();

  // Verify execution order
  const expected = ['fn1', 'fn3', 'fn2'];
  const passed = executionLog.length === 3 &&
    executionLog[0] === 'fn1' &&
    executionLog[1] === 'fn3' &&
    executionLog[2] === 'fn2';

  if (passed) {
    console.log(`[TIMELINE-005] TEST PASSED: Execution order correct: ${executionLog.join(' -> ')}`);
  } else {
    console.error(`[TIMELINE-005] TEST FAILED: Expected ${expected.join(' -> ')}, got ${executionLog.join(' -> ')}`);
  }
};
