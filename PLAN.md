# Combat Log Feature Plan

## Overview
Replace toast notifications with persistent scrollable combat log. Client-side only.

---

## Phase 1: Create Combat Log

### 1.1 New file: `src/client/combatLog.ts`
- Export `logCombat(message: string)` - appends entry to log
- Prepend `[HH:MM:SS]` timestamp (local timezone) to each entry
- Get/create `#combat-log` container
- Create `<div class="combat-entry">` per message
- Auto-scroll to bottom on append
- Prune oldest entries when exceeding 100
- Expose `__combatLogTest.log()` for testing

### 1.2 HTML (`public/index.html`)
- Replace `<div id="action-log">` with `<div id="combat-log">`
- Position below admin panel (already in correct spot)

### 1.3 CSS (`public/css/style.css`)
- `.combat-log` - fixed position, right side, below admin panel
- Set max-height, overflow-y: auto for scrolling
- `.combat-entry` - single line entry styling
- Remove all `.toast` and `.action-log` styles

---

## Phase 2: Add State Diffing for Events

### 2.1 Modify `src/client/game.ts`
- Store previous GameState reference
- On `'state'` event, before updating `currentGameState`:
  - Diff player HP: if `newHp < oldHp`, log damage
  - Diff status effects: compare arrays, log gains/losses
- Track player names for readable messages

### 2.2 Log Format Examples
```
PlayerName took 10 damage
PlayerName gained Vulnerability
PlayerName lost Vulnerability
```

---

## Phase 3: Replace Toast Calls

### 3.1 `src/client/main.ts`
- Line 55: name change → `logCombat()`
- Lines 80-86: remove tether resolution toast code entirely

### 3.2 `src/client/admin.ts`
- Lines 24, 34, 44, 54, 64: spawn/heal toasts → `logCombat()`

---

## Phase 4: Remove Toast Code

### 4.1 Delete `src/client/toast.ts`

### 4.2 Remove imports
- `src/client/main.ts` - remove `showToast` import
- `src/client/admin.ts` - remove `showToast` import

### 4.3 Update docs
- `CLAUDE.md` - replace toast references with combat log
- Remove `__toastTest` documentation, add `__combatLogTest`

---

## File Changes Summary

| File | Action |
|------|--------|
| `src/client/combatLog.ts` | CREATE |
| `src/client/toast.ts` | DELETE |
| `src/client/game.ts` | MODIFY (add diffing) |
| `src/client/main.ts` | MODIFY (swap toast→log) |
| `src/client/admin.ts` | MODIFY (swap toast→log) |
| `public/index.html` | MODIFY (rename container) |
| `public/css/style.css` | MODIFY (new styles, remove toast) |
| `CLAUDE.md` | MODIFY (update test docs) |

---

## Decisions

- **Entry limit:** 100 entries max, prune oldest when exceeded
- **Timestamps:** `[HH:MM:SS]` prefix, browser local timezone
- **Styling:** Plain text only, no color coding
- **Admin actions:** Keep logging spawn/heal actions
