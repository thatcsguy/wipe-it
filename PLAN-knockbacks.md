# Knockback Mechanics Implementation Plan

## Overview

Add radial and linear knockback mechanics. First mechanic type that forcibly moves players.

---

## 1. Data Structures (shared/types.ts)

### Knockback Mechanic Types

```typescript
interface RadialKnockbackMechanicState {
  type: 'radialKnockback';
  id: string;
  originX: number;
  originY: number;
  startTime: number;      // When visible
  endTime: number;        // When knockback triggers
  knockbackDistance: number;
  knockbackDuration: number;
}

interface LinearKnockbackMechanicState {
  type: 'linearKnockback';
  id: string;
  lineStartX: number;     // Point A
  lineStartY: number;
  lineEndX: number;       // Point B
  lineEndY: number;
  startTime: number;
  endTime: number;
  knockbackDistance: number;
  knockbackDuration: number;
}
```

**Linear direction**: Knockback towards right-hand side when walking A→B. Use cross product to determine which players are affected (all players on that side).

### Player Knockback State

Add to `PlayerState`:
```typescript
knockback?: {
  startTime: number;
  startX: number;
  startY: number;
  endX: number;           // Pre-calculated endpoint (with wall clamping)
  endY: number;
  duration: number;
};
```

**Note**: Endpoint is pre-calculated at knockback application time, accounting for wall collisions. This makes position calculation simpler and ensures client/server agreement on final position.

---

## 2. Knockback Physics (shared/knockback.ts)

New shared module for deterministic knockback math (used by both client and server).

```typescript
// Ease-out cubic: fast start, slow end
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function getKnockbackPosition(kb: KnockbackState, now: number): {x, y, active: boolean} {
  const elapsed = now - kb.startTime;
  if (elapsed >= kb.duration) {
    return { x: kb.endX, y: kb.endY, active: false };
  }
  const progress = elapsed / kb.duration;
  const easedProgress = easeOutCubic(progress);
  return {
    x: kb.startX + (kb.endX - kb.startX) * easedProgress,
    y: kb.startY + (kb.endY - kb.startY) * easedProgress,
    active: true
  };
}

function getKnockbackDirection(mechanic, playerX, playerY): {dirX, dirY} {
  if (mechanic.type === 'radialKnockback') {
    // Direction = normalized(player - origin)
    const dx = playerX - mechanic.originX;
    const dy = playerY - mechanic.originY;
    const len = Math.sqrt(dx*dx + dy*dy) || 1;
    return { dirX: dx/len, dirY: dy/len };
  } else {
    // Linear: perpendicular to line, towards right side
    const lineX = mechanic.lineEndX - mechanic.lineStartX;
    const lineY = mechanic.lineEndY - mechanic.lineStartY;
    const len = Math.sqrt(lineX*lineX + lineY*lineY) || 1;
    // Right-hand perpendicular: (lineY, -lineX) normalized
    return { dirX: lineY/len, dirY: -lineX/len };
  }
}

function isOnKnockbackSide(mechanic: LinearKnockbackMechanicState, px, py): boolean {
  // Cross product determines side
  const ax = mechanic.lineStartX, ay = mechanic.lineStartY;
  const bx = mechanic.lineEndX, by = mechanic.lineEndY;
  const cross = (bx - ax) * (py - ay) - (by - ay) * (px - ax);
  return cross < 0; // Right side when walking A→B
}

// Calculate endpoint with wall sliding
function calculateKnockbackEndpoint(startX, startY, dirX, dirY, distance, bounds): {x, y} {
  // Theoretical endpoint without walls
  let endX = startX + dirX * distance;
  let endY = startY + dirY * distance;

  // If endpoint is within bounds, use it directly
  if (endX >= bounds.minX && endX <= bounds.maxX &&
      endY >= bounds.minY && endY <= bounds.maxY) {
    return { x: endX, y: endY };
  }

  // Wall collision: find closest valid point to theoretical endpoint
  // Clamp to bounds - this naturally handles corner cases
  endX = Math.max(bounds.minX, Math.min(bounds.maxX, endX));
  endY = Math.max(bounds.minY, Math.min(bounds.maxY, endY));

  return { x: endX, y: endY };
}
```

### Wall Collision Behavior

When knockback would push player past arena bounds:
- Calculate theoretical endpoint (start + direction * distance)
- Clamp endpoint to arena bounds
- Player slides along wall to get as close as possible to theoretical endpoint
- Knockback still takes full duration (eases into wall position)

---

## 3. Server-Side Implementation

### 3a. Mechanic Classes (server/mechanics/)

Create `RadialKnockbackMechanic.ts` and `LinearKnockbackMechanic.ts`:
- Follow existing pattern (ChariotMechanic, etc)
- `resolve()` applies knockback state to affected players
- Radial: affects all players
- Linear: affects players on right side of line (use cross product check)

### 3b. Player Knockback Application (player.ts)

Add method:
```typescript
applyKnockback(dirX, dirY, distance, duration, now, bounds): void {
  // Ignore if already being knocked back
  if (this.knockback) return;

  const endpoint = calculateKnockbackEndpoint(this.x, this.y, dirX, dirY, distance, bounds);
  this.knockback = {
    startTime: now,
    startX: this.x,
    startY: this.y,
    endX: endpoint.x,
    endY: endpoint.y,
    duration
  };
}
```

### 3c. Input Processing During Knockback (player.ts)

Modify `processInput()`:
```typescript
processInput(input, now): void {
  // Always update lastProcessedInput (for reconciliation)
  this.lastProcessedInput = input.seq;

  // Skip movement if in active knockback
  if (this.knockback) {
    const pos = getKnockbackPosition(this.knockback, now);
    this.x = pos.x;
    this.y = pos.y;
    if (!pos.active) {
      this.knockback = undefined;  // Knockback finished
    }
    return; // Ignore WASD input
  }

  // Normal movement processing...
}
```

### 3d. Game Tick Update (game.ts)

In `tick()`, after input processing, update knockback positions:
```typescript
for (const player of players) {
  if (player.knockback) {
    const pos = getKnockbackPosition(player.knockback, now);
    player.x = clamp(pos.x, bounds);
    player.y = clamp(pos.y, bounds);
    if (!pos.active) player.knockback = undefined;
  }
}
```

---

## 4. Client-Side Implementation

### 4a. Prediction with Knockback (network.ts)

Modify prediction/reconciliation:

```typescript
// In reconciliation:
if (serverPlayer.knockback) {
  // Apply knockback state from server
  localPlayer.knockback = serverPlayer.knockback;
}

// Position calculation during knockback:
if (localPlayer.knockback) {
  const pos = getKnockbackPosition(localPlayer.knockback, now);
  localX = pos.x;
  localY = pos.y;
  if (!pos.active) localPlayer.knockback = undefined;
  // Don't replay pending inputs during knockback
} else {
  // Normal input replay...
}
```

**Key insight**: Knockback position is deterministic from start params + current time. Client and server compute same position independently. Inputs during knockback are acknowledged (seq updated) but ignored.

### 4b. Input Handling During Knockback (input.ts)

Option A: Still capture and send inputs (server ignores them)
- Simpler, consistent flow
- Allows instant response when knockback ends

Option B: Don't send inputs during knockback
- Requires client to know knockback state
- More complex but saves bandwidth

**Recommendation**: Option A - simpler, negligible bandwidth impact.

---

## 5. Rendering (renderer.ts)

Visuals appear from startTime until endTime (warning phase only). Disappear when knockback triggers.

### 5a. Radial Knockback Visualization

**Double chevron rings expanding from origin:**
- Pattern: `>> >> >> >>` (double chevron, gap, repeat)
- 10 chevrons per ring, evenly spaced (36° apart)
- Multiple rings fill the arena, spawning continuously from center
- Animation: rings move outward from origin
- As chevrons move outward:
  - **Size increases** (small at center, larger at edge)
  - **Opacity decreases** (more transparent at edge)
- Overall quite transparent (many overlapping chevrons create the effect)

```typescript
// Pseudocode for radial chevron rendering
const CHEVRONS_PER_RING = 10;
const RING_SPACING = 80;  // pixels between rings
const RING_SPEED = 200;   // pixels per second

for (let ringOffset = 0; ringOffset < ARENA_SIZE; ringOffset += RING_SPACING) {
  const radius = (ringOffset + animationOffset) % ARENA_SIZE;
  const scale = 0.5 + (radius / ARENA_SIZE) * 1.5;  // 0.5x to 2x
  const alpha = 0.4 * (1 - radius / ARENA_SIZE);     // Fade out

  for (let i = 0; i < CHEVRONS_PER_RING; i++) {
    const angle = (i / CHEVRONS_PER_RING) * Math.PI * 2;
    const x = originX + Math.cos(angle) * radius;
    const y = originY + Math.sin(angle) * radius;
    drawDoubleChevron(x, y, angle, scale, alpha);
  }
}
```

### 5b. Linear Knockback Visualization

**Double chevrons along the line, moving perpendicular:**
- Chevrons ~100px wide, arranged along the full line
- Animation: chevrons spawn at line and move in knockback direction
- As chevrons move away from line:
  - **Opacity decreases** (fade out)
  - Size stays constant (no radial expansion effect)
- Fill arena depth in knockback direction

```typescript
// Pseudocode for linear chevron rendering
const CHEVRON_WIDTH = 100;
const CHEVRON_SPEED = 200;  // pixels per second
const MAX_DEPTH = ARENA_SIZE;

// Calculate perpendicular (knockback) direction
const perpX = lineY / lineLen;
const perpY = -lineX / lineLen;

// Draw chevrons along line
for (let along = 0; along < lineLength; along += CHEVRON_WIDTH) {
  for (let depth = 0; depth < MAX_DEPTH; depth += CHEVRON_SPACING) {
    const d = (depth + animationOffset) % MAX_DEPTH;
    const alpha = 0.4 * (1 - d / MAX_DEPTH);  // Fade with distance

    const x = lineStartX + (along / lineLength) * (lineEndX - lineStartX) + perpX * d;
    const y = lineStartY + (along / lineLength) * (lineEndY - lineStartY) + perpY * d;
    drawDoubleChevron(x, y, knockbackAngle, 1.0, alpha);
  }
}
```

### 5c. Double Chevron Shape

```
>>  >>
```
Two chevron arrows with a gap. Each chevron is a simple `>` shape:
- Draw as two lines forming a `>` pointing in movement direction
- Rotate to face outward (radial) or perpendicular to line (linear)

---

## 6. Debug Panel Support

Add data attributes:
```html
<div class="debug-mechanic"
     data-type="radialKnockback"
     data-origin-x="400"
     data-origin-y="400"
     data-kb-distance="200"
     data-kb-duration="500">

<div class="debug-player"
     data-knockback-active="true"
     data-kb-dir-x="0.707"
     data-kb-dir-y="0.707">
```

Add admin buttons:
- `#spawn-radial-kb-btn`
- `#spawn-linear-kb-btn`

---

## 7. Testing Plan

1. **Unit**: Knockback math (easing curve, direction calculation, cross product)
2. **Integration**:
   - Radial knockback moves all players away from origin
   - Linear knockback moves only players on correct side
   - Players can't move during knockback duration
   - Movement resumes after knockback ends
3. **Prediction/Reconciliation**:
   - Client knockback movement matches server
   - Inputs sent during knockback are acknowledged but ignored
   - Smooth transition when knockback ends

---

## Design Decisions (Resolved)

1. **Arena bounds**: Players slide along walls. Endpoint clamped to arena bounds; knockback eases to closest valid position to theoretical endpoint.

2. **Multiple knockbacks**: Prevented by design. Mechanics won't create overlapping knockback zones affecting same player.

3. **Knockback during knockback**: Ignored. If player already in knockback state, new knockbacks have no effect.

4. **Invulnerability frames**: None. No i-frames after knockback.

5. **Linear knockback scope**: Affects all players on that side of the line, anywhere in arena.

---

## Implementation Order

1. shared/types.ts - Add mechanic and player knockback types
2. shared/knockback.ts - Easing and position math
3. server/mechanics/RadialKnockbackMechanic.ts
4. server/mechanics/LinearKnockbackMechanic.ts
5. server/player.ts - applyKnockback(), modify processInput()
6. server/game.ts - Knockback position updates in tick
7. client/network.ts - Prediction/reconciliation changes
8. client/renderer.ts - Mechanic and knockback visuals
9. Debug panel updates
10. Playwright tests
