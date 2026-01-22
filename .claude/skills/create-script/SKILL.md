---
name: create-script
description: Create new encounter scripts following timeline architecture patterns
---

# Create Encounter Script

Use this skill when asked to create a new encounter script or combo script.

## Script Structure

Scripts follow this structure:

```typescript
import { Script } from '../../types';
// other imports...

// === Timing Gaps (adjust these to tune pacing) ===
const PHASE_ONE_DELAY = 2000;      // after start
const PHASE_TWO_DELAY = 3000;      // after phase one
const PHASE_THREE_DURATION = 2000; // how long phase three lasts

// === Computed Absolute Times (don't edit directly) ===
const PHASE_ONE_START = PHASE_ONE_DELAY;
const PHASE_TWO_START = PHASE_ONE_START + PHASE_TWO_DELAY;
const PHASE_THREE_END = PHASE_TWO_START + PHASE_THREE_DURATION;
const SCRIPT_DURATION = PHASE_THREE_END;

// === Derived Durations (auto-align with timeline) ===
const BUFF_DURATION = SCRIPT_DURATION - PHASE_ONE_START; // lasts until script ends

// === Mechanic Constants (fixed values, not timeline-dependent) ===
const DAMAGE_AMOUNT = 50;
const AOE_RADIUS = 100;

export const myScript: Script = async (runner) => {
  // === Setup ===
  // Random choices, build data structures, spawn persistent doodads
  const someChoice = Math.random() < 0.5;
  const trackedPlayerIds: string[] = [];

  // === Timeline ===
  runner.at(0,                  phaseOne);
  runner.at(PHASE_ONE_START,    phaseTwo);
  runner.at(PHASE_TWO_START,    phaseThree);

  await runner.runTimeline({ duration: SCRIPT_DURATION });

  // === Handlers ===
  function phaseOne() { /* ... */ }
  function phaseTwo() { /* ... */ }
  function phaseThree() { /* ... */ }

  // === Helpers ===
  function spawnSomething() { /* ... */ }
};

// === Types ===
type MyType = { /* ... */ };

// === Pure functions (no runner dependency) ===
function buildSomeData() { /* ... */ }
```

## Key Patterns

### Timeline Visibility

Put all `runner.at()` calls together at the top so the encounter flow is visible at a glance:

```typescript
// === Timeline ===
runner.at(0,                    spawnInitialMechanics);
runner.at(WARN_TIME,            applyWarnings);
runner.at(RESOLVE_TIME,         resolveMechanics);

await runner.runTimeline({ duration: SCRIPT_DURATION });
```

Use named functions, not inline callbacks. The timeline should read like a table of contents.

### Mechanic Resolution

Register `.then()` handlers at spawn time to avoid race conditions:

```typescript
function spawnSpreads() {
  for (const player of players) {
    const id = runner.spawn({
      type: 'spread',
      targetPlayerId: player.id,
      radius: SPREAD_RADIUS,
      duration: SPREAD_DURATION,
    });

    // Register handler immediately at spawn time
    runner.waitForResolve(id).then(result => {
      const { playersHit } = result.data as { playersHit: string[] };
      for (const playerId of playersHit) {
        runner.damage(playerId, SPREAD_DAMAGE);
      }
    });
  }
}
```

Do NOT collect promises and await them later. The `runTimeline({ duration })` keeps the script alive.

### Timing Architecture

Use **relative gaps** between events, then compute absolute times. This makes pacing easy to adjust:

```typescript
// === Timing Gaps (adjust these to tune pacing) ===
const WARNING_DELAY = 2000;        // after start → warnings appear
const WARNING_DURATION = 5000;     // warnings visible before resolve
const RESOLVE_DELAY = 500;         // after warnings → mechanic fires
const AOE_DURATION = 1000;         // line AOE telegraph time

// === Computed Absolute Times (don't edit directly) ===
const WARNING_START = WARNING_DELAY;
const WARNING_END = WARNING_START + WARNING_DURATION;
const RESOLVE_TIME = WARNING_END + RESOLVE_DELAY;
const AOE_END = RESOLVE_TIME + AOE_DURATION;
const SCRIPT_DURATION = AOE_END;

// === Derived Durations (auto-align with timeline) ===
const STATUS_DURATION = SCRIPT_DURATION - WARNING_END;  // lasts until script ends
```

**Why this matters:** To give players more reaction time, just increase `WARNING_DURATION`. Everything downstream shifts automatically.

**Antipattern:** Don't use `SCRIPT_DURATION + 1000` for entity durations. If something needs to persist until the script ends, use `SCRIPT_DURATION` directly. If you need buffer time, add it to `SCRIPT_DURATION` computation itself.

### Script Duration

Compute `SCRIPT_DURATION` from the final event, don't hardcode it:

```typescript
// Good: computed from last event
const AOE_END = RESOLVE_TIME + AOE_DURATION;
const SCRIPT_DURATION = AOE_END;

// Bad: hardcoded, goes stale when timing changes
const SCRIPT_DURATION = 13000;
```

Persistent entities (doodads, etc.) should use `SCRIPT_DURATION` for their duration:

```typescript
runner.spawnDoodad({
  type: 'crystal',
  duration: SCRIPT_DURATION,  // not SCRIPT_DURATION + 1000
});
```

### Comments

- Do NOT write comments with specific timing values (e.g., `// T=4000ms`, `// 2000 → 5000`)
- These go stale when timings are adjusted
- The timeline in code IS the source of truth
- Only comment on relationships: `// should resolve at same time as line AOEs`

### Shared State

Handler functions use closure access to shared state defined in Setup:

```typescript
const rootedPlayerIds: string[] = [];  // Setup

function applyWarnings() {
  // Can read/write rootedPlayerIds via closure
  rootedPlayerIds.push(player.id);
}

function resolveStatuses() {
  // Same array accessible here
  for (const id of rootedPlayerIds) { /* ... */ }
}
```

### Pure Functions

Move logic that doesn't need `runner` outside the script function:

```typescript
export const myScript: Script = async (runner) => {
  const data = buildComplexData(someInput);  // pure function call
  // ...
};

// Outside - no closure dependencies
function buildComplexData(input: SomeType) {
  // Pure computation
  return result;
}
```

## Available Mechanic Types

Reference `src/server/encounters/types.ts` for `MechanicParams`:
- `chariot` - circular AOE at position
- `spread` - circular AOE following player (fails if players overlap)
- `stack` - circular AOE following player (players should stack)
- `tower` - position that requires N players standing in it
- `tether` - line between two endpoints (players or points)
- `lineAoe` - rectangular AOE along a line
- `conalAoe` - cone/pizza slice AOE
- `radialKnockback` - knockback away from origin point
- `linearKnockback` - knockback perpendicular to a line

## Available Selectors

Reference `src/server/encounters/targeting.ts`:
- `all()` - all living players
- `random(n)` - n random players
- `closest(point)` / `furthest(point)` - by distance
- `nClosest(n, point)` / `nFurthest(n, point)` - n players by distance
- `withStatus(effect)` / `withoutStatus(effect)` - filter by status
- `exclude(selector, excluded)` - subtract results
- `union(...selectors)` - combine results

## Example: Simple Script

```typescript
import { Script } from '../../types';
import { random } from '../../targeting';

// === Timing Gaps ===
const SPREAD_DELAY = 2000;         // after start → spreads appear
const SPREAD_DURATION = 3000;      // spread telegraph time

// === Computed Absolute Times ===
const SPREAD_START = SPREAD_DELAY;
const SPREAD_END = SPREAD_START + SPREAD_DURATION;
const SCRIPT_DURATION = SPREAD_END;

// === Mechanic Constants ===
const SPREAD_DAMAGE = 25;

export const simpleSpreads: Script = async (runner) => {
  // === Timeline ===
  runner.at(SPREAD_START, spawnSpreads);

  await runner.runTimeline({ duration: SCRIPT_DURATION });

  // === Handlers ===
  function spawnSpreads() {
    const targets = runner.select(random(2));
    for (const player of targets) {
      const id = runner.spawn({
        type: 'spread',
        targetPlayerId: player.id,
        duration: SPREAD_DURATION,
      });
      runner.waitForResolve(id).then(result => {
        const { playersHit } = result.data as { playersHit: string[] };
        for (const pid of playersHit) {
          runner.damage(pid, SPREAD_DAMAGE);
        }
      });
    }
  }
};
```
