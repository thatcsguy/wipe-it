import {
  PlayerInput,
  PlayerState,
  PLAYER_SPEED,
  PLAYER_RADIUS,
  ARENA_WIDTH,
  ARENA_HEIGHT,
} from '../shared/types';

// Pending input with predicted position after applying it
interface PendingInput {
  input: PlayerInput;
  predictedX: number;
  predictedY: number;
}

// Pending inputs array (sent to server but not yet acknowledged)
const pendingInputs: PendingInput[] = [];

// Local player's current predicted position
let localX = ARENA_WIDTH / 2;
let localY = ARENA_HEIGHT / 2;

// Initialize local position (called when joining game)
export function initLocalPosition(x: number, y: number): void {
  localX = x;
  localY = y;
}

// Get local predicted position
export function getLocalPosition(): { x: number; y: number } {
  return { x: localX, y: localY };
}

// Apply input locally for prediction (same physics as server)
export function applyInput(input: PlayerInput): void {
  const { keys, dt } = input;

  // Calculate velocity based on input keys
  let dx = 0;
  let dy = 0;

  if (keys.w) dy -= 1;
  if (keys.s) dy += 1;
  if (keys.a) dx -= 1;
  if (keys.d) dx += 1;

  // Normalize diagonal movement
  if (dx !== 0 && dy !== 0) {
    const len = Math.sqrt(dx * dx + dy * dy);
    dx /= len;
    dy /= len;
  }

  // Apply movement
  localX += dx * PLAYER_SPEED * dt;
  localY += dy * PLAYER_SPEED * dt;

  // Clamp to arena bounds
  localX = Math.max(PLAYER_RADIUS, Math.min(ARENA_WIDTH - PLAYER_RADIUS, localX));
  localY = Math.max(PLAYER_RADIUS, Math.min(ARENA_HEIGHT - PLAYER_RADIUS, localY));

  // Store pending input with predicted position
  pendingInputs.push({
    input,
    predictedX: localX,
    predictedY: localY,
  });
}

// Get pending inputs (for debugging/testing)
export function getPendingInputs(): PendingInput[] {
  return [...pendingInputs];
}

// Get pending input count
export function getPendingInputCount(): number {
  return pendingInputs.length;
}

// Clear all pending inputs (for testing)
export function clearPendingInputs(): void {
  pendingInputs.length = 0;
}

// Expose for testing
(window as any).__networkTest = {
  getLocalPosition,
  getPendingInputs,
  getPendingInputCount,
  applyInput,
  initLocalPosition,
  clearPendingInputs,
};
