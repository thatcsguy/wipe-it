# Encounter System Plan

## Overview

Unified **Script** system for composing mechanics into combos, phases, and encounters. Scripts are recursive - a script can spawn mechanics or other scripts. Server-authoritative; clients receive mechanics as they spawn, no script awareness.

## Architecture

```
src/server/
  encounters/
    targeting.ts       # Selector functions
    script-runner.ts   # Executes scripts, timing, events
    context.ts         # State bag for passing data between steps
    types.ts           # Script, Selector, MechanicResult types
    scripts/
      combos/          # Small reusable compositions
      encounters/      # Full boss fights
```

---

## Phase 1: Targeting System

**Goal**: Abstract player selection logic into composable selectors.

### Types

```typescript
type Selector = (state: GameState, ctx: Context) => PlayerState[];
```

### Built-in Selectors

| Selector | Description |
|----------|-------------|
| `all()` | All living players |
| `random(n)` | Random n players |
| `closest(point)` | Single player closest to point |
| `furthest(point)` | Single player furthest from point |
| `nClosest(n, point)` | N players closest to point |
| `nFurthest(n, point)` | N players furthest from point |
| `withStatus(effect)` | Players with specific status effect |
| `withoutStatus(effect)` | Players without specific status effect |

### Combinators

| Combinator | Description |
|------------|-------------|
| `exclude(selector, excluded)` | selector results minus excluded results |
| `first(n, selector)` | First n from selector results |
| `union(...selectors)` | Combine results, dedupe |

### Example Usage

```typescript
// Random player excluding whoever is closest to center
const target = exclude(random(1), closest({ x: 400, y: 400 }));

// 2 furthest players from boss
const targets = nFurthest(2, bossPosition);
```

---

## Phase 2: Script Runner Core

**Goal**: Execute scripts with timing control and mechanic spawning.

### Types

```typescript
interface Context {
  [key: string]: unknown; // Mutable state bag
}

type Script = (runner: ScriptRunner, ctx: Context) => Promise<void>;

interface ScriptRunner {
  // Spawning
  spawn(mechanic: MechanicParams): string; // Returns mechanic ID

  // Timing
  wait(ms: number): Promise<void>;

  // State access
  getState(): GameState;

  // Targeting helper
  select(selector: Selector): PlayerState[];
}
```

### Example Script

```typescript
const simpleScript: Script = async (runner, ctx) => {
  // Spawn spreads on 2 random players
  const targets = runner.select(random(2));
  for (const player of targets) {
    runner.spawn({ type: 'spread', targetPlayerId: player.id });
  }

  await runner.wait(3000);

  // Spawn chariot
  runner.spawn({ type: 'chariot', position: { x: 400, y: 300 } });
};
```

### Runner Implementation Notes

- Runner holds reference to Game instance for spawning and state
- `wait()` uses setTimeout wrapped in Promise
- On error: abort entire encounter, log error, cleanup active mechanics
- Scripts are `async` functions, runner awaits them

---

## Phase 3: Event Hooks

**Goal**: React to mechanic lifecycle events (resolve, expire, damage).

### Additions to ScriptRunner

```typescript
interface ScriptRunner {
  // ... previous methods ...

  // Event handling
  waitForResolve(mechanicId: string): Promise<MechanicResult>;
}
```

### MechanicResult

Each mechanic type defines its result shape:

```typescript
interface TetherResult {
  player1: { id: string; position: Position };
  player2: { id: string; position: Position };
  stretched: boolean; // Did they stretch far enough?
}

interface SpreadResult {
  targetId: string;
  position: Position;
  playersHit: string[];
}

// Generic wrapper
interface MechanicResult {
  mechanicId: string;
  type: string;
  data: TetherResult | SpreadResult | /* etc */;
}
```

### Mechanic Changes Required

Mechanics must emit results on resolution. Add to base mechanic handling:

```typescript
// In game.ts mechanic resolution
const result = mechanic.resolve(gameState);
this.emit('mechanicResolved', { mechanicId: mechanic.id, result });
```

Each mechanic type implements `resolve()` returning its specific result shape.

---

## Phase 4: Context & State Passing

**Goal**: Pass data between script steps.

### Usage Pattern

```typescript
const tetherToLineCombo: Script = async (runner, ctx) => {
  // Select 2 random players, store in context
  const [p1, p2] = runner.select(random(2));
  ctx.tetherTargets = [p1.id, p2.id];

  // Spawn tether
  const tetherId = runner.spawn({
    type: 'stretchTether',
    player1Id: p1.id,
    player2Id: p2.id,
  });

  // Wait for resolution
  const result = await runner.waitForResolve(tetherId);

  // Use result to spawn line AOE
  runner.spawn({
    type: 'lineAoe',
    from: result.data.player1.position,
    to: result.data.player2.position,
  });
};
```

Context is just a plain object. Scripts write to it freely. Child scripts receive same context (or a spread copy if isolation needed).

---

## Phase 5: Script Composition

**Goal**: Scripts can invoke other scripts.

### Addition to ScriptRunner

```typescript
interface ScriptRunner {
  // ... previous methods ...

  run(script: Script): Promise<void>; // Run sub-script, await completion
}
```

### Example

```typescript
const phase1: Script = async (runner, ctx) => {
  await runner.run(tetherToLineCombo);
  await runner.wait(2000);
  await runner.run(spreadPattern);
};

const bossEncounter: Script = async (runner, ctx) => {
  await runner.run(phase1);
  await runner.run(phase2);
  await runner.run(phase3);
};
```

---

## Phase 6: First Combo - Stretch Tether → Line AOE

**Goal**: Prove out the system with a real combo.

### Behavior

1. Select 2 random players
2. Spawn stretch tether between them
3. On resolve: spawn line AOE from player 1's position to player 2's position
4. If tether wasn't stretched enough, players have vulnerability → line AOE kills them

### Prerequisites

- Stretch tether mechanic must emit result with both player positions
- Stretch tether must apply vulnerability status if not stretched
- Line AOE already exists

### Script

```typescript
export const stretchTetherLineCombo: Script = async (runner, ctx) => {
  const [p1, p2] = runner.select(random(2));

  const tetherId = runner.spawn({
    type: 'stretchTether',
    player1Id: p1.id,
    player2Id: p2.id,
    minDistance: 200,
    duration: 5000,
  });

  const result = await runner.waitForResolve(tetherId);

  runner.spawn({
    type: 'lineAoe',
    from: result.data.player1.position,
    to: result.data.player2.position,
    width: 40,
    duration: 1000,
  });
};
```

---

## Phase 7: First Multi-Phase Encounter

**Goal**: String together multiple phases into a complete encounter.

### Simple Test Encounter

```typescript
export const tutorialEncounter: Script = async (runner, ctx) => {
  // Phase 1: Basic dodging
  runner.spawn({ type: 'chariot', position: { x: 400, y: 300 } });
  await runner.wait(4000);

  // Phase 2: Spreads
  await runner.run(spreadOnAllPlayers);
  await runner.wait(3000);

  // Phase 3: Tether combo
  await runner.run(stretchTetherLineCombo);
  await runner.wait(3000);

  // Phase 4: Combination
  // Chariot + spreads simultaneously
  runner.spawn({ type: 'chariot', position: { x: 400, y: 300 } });
  await runner.run(spreadOnAllPlayers);

  // Victory - encounter complete
};
```

### Encounter Lifecycle

1. Player(s) join, trigger encounter start
2. ScriptRunner executes encounter script
3. On any player death (HP ≤ 0): abort script, show "Wipe it!", reset
4. On script completion: victory state

---

## Implementation Order

1. **targeting.ts** - Selector functions, no dependencies
2. **types.ts** - Script, Context, MechanicResult interfaces
3. **context.ts** - Simple context factory (just `{}` initially)
4. **script-runner.ts** - Core runner with spawn, wait, select
5. **Mechanic results** - Add resolve() to existing mechanics, emit events
6. **waitForResolve()** - Event subscription in runner
7. **run()** - Sub-script execution
8. **stretchTetherLineCombo** - First combo script
9. **tutorialEncounter** - First full encounter
10. **Encounter start/reset** - Wire up to game lifecycle

---

## Open Questions (Resolved)

| Question | Decision |
|----------|----------|
| spawn() return value | ID-based (Option B) |
| Parallel scripts | Not supported initially |
| Error handling | Abort encounter |
| Client script awareness | None - mechanics sent on spawn |
| Roles for targeting | Later - keep targeting extensible |
| Win/lose conditions | Any death = wipe (implement later) |

---

## Future Considerations (Not In Scope)

- Visual phase indicators (can be mechanics later)
- Cast bars (can be mechanics later)
- Data-driven script format (JSON)
- Visual encounter editor
- Role-based targeting (tank/healer/dps)
- Encounter checkpoints/persistence
