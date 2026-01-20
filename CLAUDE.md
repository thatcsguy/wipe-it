# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Wipe-It is a browser-based 1-4 player real-time multiplayer raiding game with client-side prediction, server reconciliation, and entity interpolation. Full-stack TypeScript (Node.js backend + Web frontend).

## Commands

```bash
npm run dev      # Start dev server with hot-reload (localhost:3000)
npm run build    # Compile TypeScript + bundle client
npm start        # Run compiled production build
```

Build process: `tsc` (server) → `tsc -p tsconfig.client.json` (client) → `esbuild` bundles to `public/js/main.js`

## Architecture

### Server (`src/server/`)
- **index.ts**: Express + Socket.IO setup, handles `join`, `input`, `disconnect` events
- **game.ts**: Game singleton - 60Hz physics tick, 20Hz state broadcast to all clients
- **player.ts**: Player state, `processInput()` applies WASD with delta time, clamps to bounds

### Client (`src/client/`)
- **main.ts**: Socket.IO connection, join flow, calls `startGame()`
- **input.ts**: WASD keyboard capture, creates sequenced `PlayerInput` objects
- **network.ts**: Core netcode - prediction, reconciliation, interpolation
- **game.ts**: requestAnimationFrame loop - input → predict → send → reconcile → render
- **renderer.ts**: Canvas 2D drawing (arena, players with names)

### Shared (`src/shared/types.ts`)
- Contains constants and interfaces needed by both server and client.

## Key Netcode Patterns

1. **Client-Side Prediction**: Inputs applied locally immediately, stored in `pendingInputs[]`
2. **Server Reconciliation**: On state update, discard acknowledged inputs (seq ≤ lastProcessedInput), reset to server position, replay remaining inputs
3. **Entity Interpolation**: Other players rendered ~100ms in past using buffered position snapshots

## Testing

### Setup
```bash
npm run dev  # Start server on localhost:3000
```

### Debug Panel
Append `?debug=1` to URL to show debug panel. Displays real-time player/mechanic data via DOM attributes.

```javascript
// Programmatic control (works without ?debug=1)
__debugTest.show()      // Show panel
__debugTest.hide()      // Hide panel
__debugTest.isVisible() // Returns boolean
__debugTest.getElement() // Returns #debug-panel element
```

### DOM Selectors for Playwright

**Players:**
```javascript
page.locator('.debug-player')                    // All players
page.locator('.debug-player[data-player-id="X"]') // Specific player
// Attributes: data-player-id, data-hp, data-x, data-y
```

**Mechanics:**
```javascript
page.locator('.debug-mechanic')                      // All mechanics
page.locator('.debug-mechanic[data-type="chariot"]') // By type
// Attributes: data-mechanic-id, data-type, data-expires
```

**Status Effects:**
```javascript
page.locator('.debug-player .debug-status[data-effect="vulnerability"]')
```

**Combat Log:**
```javascript
page.locator('#combat-log')                              // Combat log container
page.locator('.combat-entry', { hasText: 'Spawned chariot' }) // Specific entry
```

**Admin Buttons:**
- `#spawn-chariot-btn` - Spawns chariot mechanic
- `#spawn-spreads-btn` - Spawns spread mechanics
- `#spawn-line-aoe-btn` - Spawns line AOE mechanic
- `#spawn-conal-aoe-btn` - Spawns conal AOE mechanic
- `#heal-all-btn` - Heals all players

### Test APIs (window globals)

**__gameTest:**
```javascript
getGameState()                    // Returns current GameState
getLocalPlayerId()                // Returns local player ID
onStateChange(cb)                 // cb(GameState) on every update, returns unsubscribe fn
onMechanicSpawn(cb)               // cb(MechanicState) when new mechanic appears
onMechanicResolve(cb)             // cb(mechanicId) when mechanic disappears
waitForMechanicResolve(id)        // Promise resolves when mechanic gone
```

**__combatLogTest:**
```javascript
log(message)  // Programmatically add combat log entry
```

### Time-Sensitive Testing

**Problem:** Mechanics expire in 1-5 seconds. Sequential tool calls (spawn → screenshot) often take longer, causing mechanics to disappear before capture.

**Solution:** Use timing overrides to extend mechanic durations for testing:

```javascript
// Duration overrides (default 3000ms for most, 5000ms for tower)
__adminTest.emitSpawnChariot({ duration: 10000 })
__adminTest.emitSpawnSpreads({ duration: 10000 })
__adminTest.emitSpawnTower({ duration: 15000 })
__adminTest.emitSpawnPointTethers({ duration: 10000 })
__adminTest.emitSpawnPlayerTethers({ duration: 10000 })
__adminTest.emitSpawnLineAoe({ duration: 10000 })
__adminTest.emitSpawnConalAoe({ duration: 10000 })

// Knockback delay overrides (default 2000ms delay, 500ms knockbackDuration)
__adminTest.emitSpawnRadialKnockback({ delay: 8000 })
__adminTest.emitSpawnLinearKnockback({ delay: 5000, knockbackDuration: 2000 })
```

**Atomic operations with browser_run_code:** For reliable spawn+screenshot, combine in single Playwright call:

```javascript
await page.evaluate(() => {
  __adminTest.emitSpawnChariot({ duration: 10000 });
});
// Now safe to screenshot - mechanic has 10s lifetime
```

**Tip:** Check `data-expires` attribute on `.debug-mechanic` elements to verify timing before debugging visuals.

### Playwright Examples

```javascript
// Wait for player to exist
await page.evaluate(() => new Promise(resolve => {
  __gameTest.onStateChange(state => {
    if (state.players.length > 0) resolve(true);
  });
}));

// Spawn mechanic and wait for it to resolve
await page.click('#spawn-chariot-btn');
const mechanicId = await page.evaluate(() => __gameTest.getGameState().mechanics[0]?.id);
await page.evaluate(id => __gameTest.waitForMechanicResolve(id), mechanicId);

// Verify HP updates after damage
const hpBefore = await page.locator('.debug-player').first().getAttribute('data-hp');
// ... trigger damage ...
await expect(page.locator('.debug-player').first()).not.toHaveAttribute('data-hp', hpBefore);
```

## Encounter System

Server-side scripting system for multi-phase encounters with sequenced mechanics.

### Core Types (`src/server/encounters/types.ts`)

```typescript
// Script: async function defining encounter logic
type Script = (runner: ScriptRunner, ctx: Context) => Promise<void>;

// Context: key-value store for passing data between phases
interface Context { [key: string]: unknown; }

// Selector: function selecting players from game state
type Selector = (state: GameState, ctx: Context) => PlayerState[];

// MechanicResult: returned when mechanic resolves
interface MechanicResult { mechanicId: string; type: string; data: unknown; }
```

### ScriptRunner API

Available to scripts via `runner` parameter:

| Method | Description |
|--------|-------------|
| `spawn(params)` | Spawn mechanic, returns mechanic ID |
| `wait(ms)` | Async wait for ms milliseconds |
| `getState()` | Get current GameState |
| `select(selector)` | Get players matching selector |
| `waitForResolve(id)` | Await mechanic resolution, returns MechanicResult |
| `run(script)` | Execute sub-script with fresh context |
| `damage(playerId, amount)` | Deal `amount` damage to player |
| `applyStatus(playerId, type, duration)` | Apply status effect (e.g., 'vulnerability') |

### Targeting Selectors (`src/server/encounters/targeting.ts`)

**Basic selectors:**
- `all()` - all living players (hp > 0)
- `random(n)` - n random living players
- `closest(point)` - single player nearest to {x, y}
- `furthest(point)` - single player farthest from {x, y}

**Advanced selectors:**
- `nClosest(n, point)` - n players closest to point
- `nFurthest(n, point)` - n players farthest from point
- `withStatus(effect)` - players with status effect
- `withoutStatus(effect)` - players without status effect

**Combinators:**
- `exclude(selector, excluded)` - results minus excluded
- `first(n, selector)` - first n results
- `union(...selectors)` - combine results, deduped by id

### MechanicParams Types

```typescript
{ type: 'chariot'; x: number; y: number; radius?; duration? }
{ type: 'spread'; targetPlayerId: string; radius?; duration? }
{ type: 'tether'; endpointA: endpoint; endpointB: endpoint; requiredDistance?; duration? }
{ type: 'tower'; x: number; y: number; radius?; duration?; requiredPlayers? }
{ type: 'lineAoe'; startX; startY; endX; endY; width?; duration? }
{ type: 'conalAoe'; centerX; centerY; endpointX; endpointY; angle?; duration? }
{ type: 'radialKnockback'; originX; originY; delay?; knockbackDistance?; knockbackDuration? }
{ type: 'linearKnockback'; lineStartX; lineStartY; lineEndX; lineEndY; delay?; knockbackDistance?; knockbackDuration? }
```

### Script-Driven Effects

Mechanics do **not** apply damage/effects directly. Instead:
1. Mechanic detects hits/success and returns result via `getResult()`
2. Script uses `waitForResolve(id)` to get `MechanicResult`
3. Script calls `runner.damage()` / `runner.applyStatus()` to apply effects

**getResult() return values by mechanic type:**

| Mechanic | Result Data |
|----------|-------------|
| chariot | `{ playersHit: string[] }` |
| spread | `{ playersHit: string[], position: {x,y} \| null }` |
| lineAoe | `{ playersHit: string[] }` |
| conalAoe | `{ playersHit: string[] }` |
| tower | `{ success: boolean, playersInside: string[] }` |
| tether | `{ player1: {position}, player2: {position}, stretched: boolean }` |

**Example: Applying damage after mechanic resolves**

```typescript
const chariotId = runner.spawn({ type: 'chariot', x: 400, y: 300 });
const result = await runner.waitForResolve(chariotId);
const { playersHit } = result.data as { playersHit: string[] };
for (const playerId of playersHit) {
  runner.damage(playerId, 50);
}
```

**Example: Handling tether failure**

```typescript
const tetherId = runner.spawn({
  type: 'tether',
  endpointA: { type: 'player', playerId: p1.id },
  endpointB: { type: 'player', playerId: p2.id }
});
const result = await runner.waitForResolve(tetherId);
const data = result.data as { stretched: boolean; player1: { position: {x,y} }; player2: { position: {x,y} } };
if (!data.stretched) {
  // Tether failed - apply damage to both players
  runner.damage(p1.id, 100);
  runner.damage(p2.id, 100);
  runner.applyStatus(p1.id, 'vulnerability', 5000);
  runner.applyStatus(p2.id, 'vulnerability', 5000);
}
```

### Example Script

```typescript
import { Script } from './types';
import { all, random } from './targeting';

export const myEncounter: Script = async (runner, ctx) => {
  // Phase 1: spawn chariot, wait
  runner.spawn({ type: 'chariot', x: 400, y: 300 });
  await runner.wait(3000);

  // Phase 2: spreads on random 2 players
  const targets = runner.select(random(2));
  for (const p of targets) {
    runner.spawn({ type: 'spread', targetPlayerId: p.id });
  }
  await runner.wait(3000);

  // Phase 3: tether + wait for resolve + spawn line at result positions
  const players = runner.select(random(2));
  if (players.length >= 2) {
    const id = runner.spawn({
      type: 'tether',
      endpointA: { type: 'player', playerId: players[0].id },
      endpointB: { type: 'player', playerId: players[1].id }
    });
    const result = await runner.waitForResolve(id);
    const data = result.data as { player1: { position: {x,y} }, player2: { position: {x,y} } };
    runner.spawn({
      type: 'lineAoe',
      startX: data.player1.position.x,
      startY: data.player1.position.y,
      endX: data.player2.position.x,
      endY: data.player2.position.y
    });
  }
};
```

### Running Encounters

```typescript
import { runEncounter } from './script-runner';
import { myEncounter } from './scripts/my-encounter';

runEncounter(game, myEncounter);
```

### Script Admin Buttons

| Button | ID | __adminTest Method | Script |
|--------|----|--------------------|--------|
| Run Tether→Line Combo | `#run-tether-line-btn` | `emitRunTetherLineCombo()` | tetherLineCombo |
| Run Tutorial Encounter | `#run-tutorial-btn` | `emitRunTutorialEncounter()` | tutorialEncounter |
| Run Orbital Omen | `#run-orbital-omen-btn` | `emitRunOrbitalOmen()` | orbitalOmen |

### File Structure

```
src/server/encounters/
├── types.ts          # Core types: Script, ScriptRunner, Selector, etc.
├── targeting.ts      # Selector functions and combinators
├── context.ts        # createContext() factory
├── script-runner.ts  # ScriptRunnerImpl + runEncounter()
└── scripts/
    └── combos/
    │   ├── tether-line-combo.ts   # Tether → waitForResolve → line AOE
    │   └── orbital-omen.ts        # 4 N-S + 4 E-W line AOEs, random order with constraints
    └── encounters/
        └── tutorial-encounter.ts  # Multi-phase encounter example
```
