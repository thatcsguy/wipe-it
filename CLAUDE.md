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
