import {
  PlayerInput,
  PlayerState,
  GameState,
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

// Apply physics to a position (helper for reconciliation replay)
function applyPhysicsToPosition(
  x: number,
  y: number,
  input: PlayerInput
): { x: number; y: number } {
  const { keys, dt } = input;

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
  x += dx * PLAYER_SPEED * dt;
  y += dy * PLAYER_SPEED * dt;

  // Clamp to arena bounds
  x = Math.max(PLAYER_RADIUS, Math.min(ARENA_WIDTH - PLAYER_RADIUS, x));
  y = Math.max(PLAYER_RADIUS, Math.min(ARENA_HEIGHT - PLAYER_RADIUS, y));

  return { x, y };
}

// Server reconciliation: process authoritative state from server
export function reconcile(state: GameState, localPlayerId: string): void {
  // Find our player in the server state
  const serverPlayer = state.players.find((p) => p.id === localPlayerId);
  if (!serverPlayer) {
    // We're not in the game state (disconnected?)
    return;
  }

  const lastProcessedInput = serverPlayer.lastProcessedInput;

  // Remove all acknowledged inputs (seq <= lastProcessedInput)
  while (
    pendingInputs.length > 0 &&
    pendingInputs[0].input.seq <= lastProcessedInput
  ) {
    pendingInputs.shift();
  }

  // Set position to server's authoritative position
  localX = serverPlayer.x;
  localY = serverPlayer.y;

  // Re-apply all remaining pending inputs
  for (const pending of pendingInputs) {
    const newPos = applyPhysicsToPosition(localX, localY, pending.input);
    localX = newPos.x;
    localY = newPos.y;
    // Update stored predicted position
    pending.predictedX = localX;
    pending.predictedY = localY;
  }
}

// ====== Entity Interpolation for Other Players ======

// Position snapshot with timestamp
interface PositionSnapshot {
  x: number;
  y: number;
  timestamp: number;
}

// Buffer of position history per player (keyed by player ID)
const playerBuffers: Map<string, PositionSnapshot[]> = new Map();

// How far in the past to render other players (ms)
const INTERPOLATION_DELAY = 100;

// Max buffer size per player
const MAX_BUFFER_SIZE = 20;

// Update position buffer for a player
export function updatePlayerBuffer(
  playerId: string,
  x: number,
  y: number,
  timestamp: number
): void {
  let buffer = playerBuffers.get(playerId);
  if (!buffer) {
    buffer = [];
    playerBuffers.set(playerId, buffer);
  }

  // Add new snapshot
  buffer.push({ x, y, timestamp });

  // Keep only last MAX_BUFFER_SIZE entries
  if (buffer.length > MAX_BUFFER_SIZE) {
    buffer.shift();
  }
}

// Remove player from buffer (on disconnect)
export function removePlayerBuffer(playerId: string): void {
  playerBuffers.delete(playerId);
}

// Clear all player buffers
export function clearPlayerBuffers(): void {
  playerBuffers.clear();
}

// Get interpolated position for a player (renders ~100ms in the past)
export function getInterpolatedPosition(
  playerId: string,
  currentTime: number
): { x: number; y: number } | null {
  const buffer = playerBuffers.get(playerId);
  if (!buffer || buffer.length === 0) {
    return null;
  }

  // Target render time is current time minus interpolation delay
  const renderTime = currentTime - INTERPOLATION_DELAY;

  // Find the two snapshots to interpolate between
  // We need one before renderTime and one after (or at) renderTime
  let before: PositionSnapshot | null = null;
  let after: PositionSnapshot | null = null;

  for (let i = 0; i < buffer.length; i++) {
    if (buffer[i].timestamp <= renderTime) {
      before = buffer[i];
    } else {
      after = buffer[i];
      break;
    }
  }

  // If we only have snapshots in the future, use the oldest one
  if (!before && after) {
    return { x: after.x, y: after.y };
  }

  // If we only have snapshots in the past, use the newest one
  if (before && !after) {
    return { x: before.x, y: before.y };
  }

  // If we have both, interpolate between them
  if (before && after) {
    const totalTime = after.timestamp - before.timestamp;
    if (totalTime === 0) {
      return { x: before.x, y: before.y };
    }

    const t = (renderTime - before.timestamp) / totalTime;
    return {
      x: before.x + (after.x - before.x) * t,
      y: before.y + (after.y - before.y) * t,
    };
  }

  return null;
}

// Get buffer size for a player (for testing)
export function getPlayerBufferSize(playerId: string): number {
  const buffer = playerBuffers.get(playerId);
  return buffer ? buffer.length : 0;
}

// Get all buffered player IDs (for testing)
export function getBufferedPlayerIds(): string[] {
  return Array.from(playerBuffers.keys());
}

// Expose for testing
(window as any).__networkTest = {
  getLocalPosition,
  getPendingInputs,
  getPendingInputCount,
  applyInput,
  initLocalPosition,
  clearPendingInputs,
  reconcile,
  updatePlayerBuffer,
  removePlayerBuffer,
  clearPlayerBuffers,
  getInterpolatedPosition,
  getPlayerBufferSize,
  getBufferedPlayerIds,
};
