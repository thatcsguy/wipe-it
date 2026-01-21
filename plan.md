# God Mode, Death State, Wipe Banner & Ready Check

## Summary
- Toggle for "god mode" (current behavior) vs death mode
- Dead players (0 HP): red X overlay, completely frozen, can't move
- First death triggers wipe: block new mechanics, slide-in "WIPE IT!" banner
- Ready check: 'R' to ready, green checkmarks, all ready → heal + restart script

---

## Types (`src/shared/types.ts`)

Add to `PlayerState`:
```typescript
dead: boolean;
```

Add to `GameState`:
```typescript
godMode: boolean;
wipeInProgress: boolean;
readyPlayerIds: string[];
```

---

## Server Changes

### `src/server/player.ts`
- Add `dead: boolean = false` field
- `processInput()`: early return if `this.dead` (completely frozen - no WASD, no knockback)
- `toState()`: include `dead` field
- Add `setDead(dead: boolean)` and `resetDead()` methods

### `src/server/game.ts`
- Add fields: `godMode = true`, `wipeInProgress = false`, `readyPlayers = new Set<string>()`, `activeScript: Script | null = null`
- `toggleGodMode()`: flip godMode, broadcast
- `triggerWipe()`: set wipeInProgress = true, emit `wipe:started` to all
- `checkDeath()`: called in `tick()` after damage; if any player hp ≤ 0 && !godMode && !wipeInProgress → mark dead, call `triggerWipe()`
- `setPlayerReady(socketId)`: add to readyPlayers; if all players ready → `resetEncounter()`
- `resetEncounter()`: heal all, clear dead flags, clear readyPlayers, wipeInProgress = false, emit `wipe:reset`, run activeScript if set
- `isWipeTriggered()`: returns wipeInProgress (for ScriptRunner)
- `setActiveScript(script)`: store for restart
- Update `broadcast()`: include godMode, wipeInProgress, `readyPlayerIds: [...readyPlayers]`

### `src/server/encounters/script-runner.ts`
- Modify `spawn()`: check `this.game.isWipeTriggered()` at start; if true, return early (no spawn, return empty string or null)
- `runEncounter()`: call `game.setActiveScript(script)` before running

### `src/server/index.ts`
- Add: `socket.on('admin:toggleGodMode', () => game.toggleGodMode())`
- Add: `socket.on('player:ready', () => game.setPlayerReady(socket.id))`

---

## Client Changes

### `src/client/renderer.ts`
- Modify `drawPlayerAt()`: if player.dead, draw red X over player circle after drawing player
- X: two diagonal lines from top-left to bottom-right and top-right to bottom-left, thick red stroke

### `src/client/wipeOverlay.ts` (NEW)
- Create/manage HTML overlay for wipe UI (covers canvas only, not side panel)
- `initWipeOverlay()`: create DOM structure inside `.game-container`
- `showWipeOverlay(players)`: show banner with slide-in animation, show ready list
- `hideWipeOverlay()`: hide and reset
- `updateReadyState(readyPlayerIds)`: update checkmarks

DOM structure (inside `.game-container`, positioned over canvas):
```html
<div id="wipe-overlay" class="hidden">
  <div class="wipe-banner">WIPE IT!</div>
  <div class="ready-check">
    <div class="ready-message">Press 'R' to ready up.</div>
    <div class="ready-list">
      <!-- populated dynamically -->
    </div>
  </div>
</div>
```

### `src/client/game.ts`
- Import and init wipeOverlay
- On `state` update: if wipeInProgress, call `showWipeOverlay()`; update ready checkmarks
- Listen for `wipe:reset`: call `hideWipeOverlay()`
- Add 'r' keydown listener: if wipeInProgress, emit `player:ready`

### `src/client/network.ts`
- In `applyInput()`: check if local player dead, skip prediction if so

### `public/index.html`
- Add wipe overlay container inside `.game-container` div (after canvas, sibling to modal)
- Add god mode toggle button in Utility section: `<button id="toggle-godmode-btn">Toggle God Mode</button>`

### `public/css/style.css`
- Import Google Font: `@import url('https://fonts.googleapis.com/css2?family=Permanent+Marker&display=swap');`
- `.game-container`: add `position: relative` (if not already) for overlay positioning
- `#wipe-overlay`: `position: absolute`, covers canvas (1000x1000), pointer-events on overlay only
- `.wipe-banner`: absolute position top/center of canvas, `font-family: 'Permanent Marker'`, red color, large size, slide-in from right animation
- `.ready-check`: semi-transparent black bg, centered below banner within canvas bounds
- `.ready-list .player-entry`: player name with checkmark space
- `.player-entry.ready::before`: green checkmark (✓)
- `@keyframes slideInFromRight`: translateX(100%) → translateX(0)

### `src/client/admin.ts`
- Add click handler for `#toggle-godmode-btn` → emit `admin:toggleGodMode`
- Add to `__adminTest`: `emitToggleGodMode()`

---

## Socket Events

| Event | Direction | Payload | Description |
|-------|-----------|---------|-------------|
| `admin:toggleGodMode` | C→S | none | Toggle god mode |
| `player:ready` | C→S | none | Player pressed R |
| `wipe:started` | S→C | none | Wipe triggered, show overlay |
| `wipe:reset` | S→C | none | All ready, hide overlay |

---

## Implementation Order

1. **Types**: Add dead/godMode/wipeInProgress/readyPlayerIds to shared types
2. **Player death**: Add dead field, block movement in processInput()
3. **God mode toggle**: Server field + admin button + broadcast
4. **Death detection**: Check HP in tick(), mark dead, trigger wipe
5. **Script blocking**: ScriptRunner checks wipeInProgress before spawn
6. **Wipe overlay HTML/CSS**: Create structure, banner animation, ready list styles
7. **Wipe overlay JS**: Show/hide/update logic
8. **Ready check**: R key → server → track → broadcast → checkmarks
9. **Reset logic**: All ready → heal, clear dead, restart script, hide overlay
10. **Renderer**: Draw red X on dead players

---

## Files to Modify
- `src/shared/types.ts` - types
- `src/server/player.ts` - dead state, movement block
- `src/server/game.ts` - godMode, wipe, ready, reset
- `src/server/encounters/script-runner.ts` - block spawns during wipe
- `src/server/index.ts` - socket handlers
- `src/client/renderer.ts` - dead player visual
- `src/client/game.ts` - overlay integration, R key
- `src/client/network.ts` - skip prediction if dead
- `src/client/admin.ts` - god mode button handler
- `public/index.html` - god mode button, overlay container
- `public/css/style.css` - banner/ready UI styles

## New Files
- `src/client/wipeOverlay.ts` - wipe UI management

---

## Verification
1. Start dev server: `npm run dev`
2. Join with 2 browser tabs
3. Disable god mode via admin toggle
4. Run tutorial encounter
5. Let mechanic hit player to 0 HP
6. Verify: dead player has red X, can't move, banner slides in
7. Press R in both tabs
8. Verify: checkmarks appear, encounter restarts, players healed
