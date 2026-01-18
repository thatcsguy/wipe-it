import { PlayerState, ARENA_WIDTH, ARENA_HEIGHT, PLAYER_RADIUS } from '../shared/types';

// Canvas and context (initialized on first render call)
let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;

// Initialize renderer with canvas element
export function initRenderer(): void {
  canvas = document.getElementById('game') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas element #game not found');
    return;
  }
  ctx = canvas.getContext('2d');
}

// Clear the canvas
function clear(): void {
  if (!ctx || !canvas) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// Draw the arena border
function drawArena(): void {
  if (!ctx) return;
  ctx.strokeStyle = '#4a4a6a';
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);
}

// Draw a single player (circle with name above)
function drawPlayer(player: PlayerState): void {
  if (!ctx) return;

  const { x, y, color, name } = player;

  // Draw circle
  ctx.beginPath();
  ctx.arc(x, y, PLAYER_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Draw name above circle
  ctx.fillStyle = '#ffffff';
  ctx.font = '14px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(name, x, y - PLAYER_RADIUS - 5);
}

// Draw a player at specific position (for local player with predicted position)
export function drawPlayerAt(
  x: number,
  y: number,
  color: string,
  name: string
): void {
  if (!ctx) return;

  // Draw circle
  ctx.beginPath();
  ctx.arc(x, y, PLAYER_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Draw name above circle
  ctx.fillStyle = '#ffffff';
  ctx.font = '14px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(name, x, y - PLAYER_RADIUS - 5);
}

// Main render function - draws entire frame
export function render(
  players: PlayerState[],
  localPlayerId: string | null,
  localPosition: { x: number; y: number } | null,
  interpolatedPositions?: Map<string, { x: number; y: number }>
): void {
  // Initialize if not already done
  if (!ctx) {
    initRenderer();
  }
  if (!ctx) return;

  // Clear canvas
  clear();

  // Draw arena border
  drawArena();

  // Draw all players
  for (const player of players) {
    if (localPlayerId && player.id === localPlayerId && localPosition) {
      // Draw local player at predicted position
      drawPlayerAt(localPosition.x, localPosition.y, player.color, player.name);
    } else {
      // Draw other players at interpolated position if available, else server position
      const interpolated = interpolatedPositions?.get(player.id);
      if (interpolated) {
        drawPlayerAt(interpolated.x, interpolated.y, player.color, player.name);
      } else {
        drawPlayer(player);
      }
    }
  }
}

// Expose for testing
(window as any).__rendererTest = {
  initRenderer,
  render,
  drawPlayerAt,
};
