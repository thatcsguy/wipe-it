import { Socket } from 'socket.io-client';
import { GameState, PlayerState } from '../shared/types';
import { hasInput, createInput } from './input';
import {
  applyInput,
  getLocalPosition,
  reconcile,
  initLocalPosition,
  updatePlayerBuffer,
  getInterpolatedPosition,
} from './network';
import { render, initRenderer } from './renderer';

// Game state
let socket: Socket | null = null;
let localPlayerId: string | null = null;
let localPlayerName: string = '';
let localPlayerColor: string = '';
let gameRunning = false;

// Current game state from server
let currentGameState: GameState = { players: [], mechanics: [], statusEffects: [], timestamp: 0 };

// Timing
let lastFrameTime = 0;

// Start the game loop
export function startGame(
  socketInstance: Socket,
  playerId: string,
  playerName: string
): void {
  socket = socketInstance;
  localPlayerId = playerId;
  localPlayerName = playerName;
  gameRunning = true;

  // Initialize renderer
  initRenderer();

  // Set up state listener
  socket.on('state', (state: GameState) => {
    currentGameState = state;

    // Buffer positions for all players (used for interpolation)
    const timestamp = performance.now();
    for (const player of state.players) {
      updatePlayerBuffer(player.id, player.x, player.y, timestamp);
    }

    // Initialize local position from first state if not set
    const myPlayer = state.players.find((p) => p.id === localPlayerId);
    if (myPlayer) {
      // Store color for rendering
      localPlayerColor = myPlayer.color;
      // Reconcile with server state
      reconcile(state, localPlayerId!);
    }
  });

  // Start the game loop
  lastFrameTime = performance.now();
  requestAnimationFrame(gameLoop);
}

// Main game loop
function gameLoop(currentTime: number): void {
  if (!gameRunning) return;

  // Calculate delta time in seconds
  const dt = (currentTime - lastFrameTime) / 1000;
  lastFrameTime = currentTime;

  // Process input
  if (hasInput()) {
    const input = createInput(dt);

    // Apply input locally (client-side prediction)
    applyInput(input);

    // Send input to server
    if (socket) {
      socket.emit('input', input);
    }
  }

  // Render frame
  const localPos = getLocalPosition();

  // Build interpolated positions for other players
  const interpolatedPositions = new Map<string, { x: number; y: number }>();
  for (const player of currentGameState.players) {
    if (player.id !== localPlayerId) {
      const interpolated = getInterpolatedPosition(player.id, currentTime);
      if (interpolated) {
        interpolatedPositions.set(player.id, interpolated);
      }
    }
  }

  // Render with local player at predicted position, others at interpolated positions
  // Pass mechanics and server timestamp for mechanic rendering
  render(
    currentGameState.players,
    localPlayerId,
    localPos,
    interpolatedPositions,
    currentGameState.mechanics,
    currentGameState.timestamp
  );

  // Schedule next frame
  requestAnimationFrame(gameLoop);
}

// Stop the game loop
export function stopGame(): void {
  gameRunning = false;
}

// Get current game state (for testing)
export function getGameState(): GameState {
  return currentGameState;
}

// Check if game is running
export function isGameRunning(): boolean {
  return gameRunning;
}

// Expose for testing
(window as any).__gameTest = {
  startGame,
  stopGame,
  getGameState,
  isGameRunning,
};
