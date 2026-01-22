# Create Encounter Script

Use this skill when asked to create a new encounter script or combo script.

## Script Structure

Scripts follow this structure:

```typescript
import { Script } from '../../types';
// other imports...

// === Constants ===
// Timing constants (group together)
const PHASE_ONE_START = 2000;
const PHASE_TWO_START = 5000;
const SCRIPT_DURATION = 10000;

// Mechanic constants (group together)
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

### Script Duration

Declare total script duration explicitly. This eliminates promise tracking:

```typescript
const SCRIPT_DURATION = 13000;  // when everything should be resolved

await runner.runTimeline({ duration: SCRIPT_DURATION });
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

const SPREAD_SPAWN = 2000;
const SPREAD_DURATION = 3000;
const SPREAD_DAMAGE = 25;
const SCRIPT_DURATION = 5000;

export const simpleSpreads: Script = async (runner) => {
  // === Timeline ===
  runner.at(0,            spawnSpreads);

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
