import { PlayerState, MechanicState, StatusEffectState, ARENA_WIDTH, ARENA_HEIGHT, PLAYER_RADIUS, MAX_HP } from '../shared/types';
import { renderMechanics, PlayerPositionData } from './mechanics';
import { renderStatusEffects } from './statusEffects';

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

// Get health bar color based on hp percentage
function getHealthColor(hpPercent: number): string {
  if (hpPercent > 0.5) return '#4ade80'; // green
  if (hpPercent > 0.25) return '#facc15'; // yellow
  return '#ef4444'; // red
}

// Draw health bar at position
function drawHealthBar(x: number, y: number, hp: number): void {
  if (!ctx) return;

  const barWidth = PLAYER_RADIUS * 2;
  const barHeight = 6;
  const hpPercent = hp / MAX_HP;

  // Bar position: above circle, below name
  const barX = x - PLAYER_RADIUS;
  const barY = y - PLAYER_RADIUS - barHeight - 2;

  // Background (dark)
  ctx.fillStyle = '#1f2937';
  ctx.fillRect(barX, barY, barWidth, barHeight);

  // Health fill
  ctx.fillStyle = getHealthColor(hpPercent);
  ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight);

  // Border
  ctx.strokeStyle = '#374151';
  ctx.lineWidth = 1;
  ctx.strokeRect(barX, barY, barWidth, barHeight);
}

// Draw a single player (circle with name and health bar above)
function drawPlayer(player: PlayerState): void {
  if (!ctx) return;

  const { x, y, color, name, hp } = player;

  // Draw circle
  ctx.beginPath();
  ctx.arc(x, y, PLAYER_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Draw health bar above circle
  drawHealthBar(x, y, hp);

  // Draw name above health bar
  ctx.fillStyle = '#ffffff';
  ctx.font = '14px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(name, x, y - PLAYER_RADIUS - 10);
}

// Draw a player at specific position (for local player with predicted position)
export function drawPlayerAt(
  x: number,
  y: number,
  color: string,
  name: string,
  hp: number,
  statusEffects?: StatusEffectState[]
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

  // Draw health bar above circle
  drawHealthBar(x, y, hp);

  // Draw name above health bar
  ctx.fillStyle = '#ffffff';
  ctx.font = '14px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(name, x, y - PLAYER_RADIUS - 10);
}

// Main render function - draws entire frame
export function render(
  players: PlayerState[],
  localPlayerId: string | null,
  localPosition: { x: number; y: number } | null,
  interpolatedPositions?: Map<string, { x: number; y: number }>,
  mechanics?: MechanicState[],
  serverTime?: number
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

  // Draw mechanics before players (so they appear below)
  if (mechanics && serverTime !== undefined) {
    const posData: PlayerPositionData = {
      players,
      localPlayerId,
      localPosition,
      interpolatedPositions,
    };
    renderMechanics(ctx, mechanics, serverTime, posData);
  }

  // Draw all players (body, health bar, name)
  for (const player of players) {
    if (localPlayerId && player.id === localPlayerId && localPosition) {
      // Draw local player at predicted position
      drawPlayerAt(localPosition.x, localPosition.y, player.color, player.name, player.hp, player.statusEffects);
    } else {
      // Draw other players at interpolated position if available, else server position
      const interpolated = interpolatedPositions?.get(player.id);
      if (interpolated) {
        drawPlayerAt(interpolated.x, interpolated.y, player.color, player.name, player.hp, player.statusEffects);
      } else {
        drawPlayer(player);
      }
    }
  }

  // Draw status effect icons AFTER all players (so they appear on top)
  for (const player of players) {
    if (player.statusEffects && player.statusEffects.length > 0) {
      // Get the position used for this player
      let px = player.x;
      let py = player.y;
      if (localPlayerId && player.id === localPlayerId && localPosition) {
        px = localPosition.x;
        py = localPosition.y;
      } else {
        const interpolated = interpolatedPositions?.get(player.id);
        if (interpolated) {
          px = interpolated.x;
          py = interpolated.y;
        }
      }
      renderStatusEffects(ctx, px, py, player.statusEffects);
    }
  }
}

// Expose for testing
(window as any).__rendererTest = {
  initRenderer,
  render,
  drawPlayerAt,
};
