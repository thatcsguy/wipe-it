import { PlayerState, MechanicState, StatusEffectState, DoodadState, ARENA_WIDTH, ARENA_HEIGHT, PLAYER_RADIUS, MAX_HP, CANVAS_SIZE, ARENA_OFFSET } from '../shared/types';
import { renderMechanics, PlayerPositionData } from './mechanics/index';
import { renderStatusEffects } from './statusEffects';
import { renderTowerExplosions } from './mechanics/towerExplosion';
import { renderDoodads, DoodadPositionData } from './doodads/index';

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

// Clear the canvas - dark grey margin, darker arena
function clear(): void {
  if (!ctx || !canvas) return;
  // Fill entire canvas with dark grey (margin area)
  ctx.fillStyle = '#2a2a2a';
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  // Fill arena area with darker background
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(ARENA_OFFSET, ARENA_OFFSET, ARENA_WIDTH, ARENA_HEIGHT);
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

// Draw translucent bubble around player (for bubbled status)
// Bubble encloses player circle (radius 20) and name text above it
function drawBubble(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  // Bubble needs to encompass:
  // - Player circle at y (radius PLAYER_RADIUS = 20)
  // - Name text at y - PLAYER_RADIUS - 10 (approx 12-14px tall)
  // - Health bar at y - PLAYER_RADIUS - 8 (6px tall)
  // Center the bubble between player center and name, radius ~45-50
  const bubbleRadius = 48;
  const bubbleCenterY = y - 15; // Offset up to center around player+name

  // Main bubble fill - semi-transparent cyan
  ctx.beginPath();
  ctx.arc(x, bubbleCenterY, bubbleRadius, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(100, 200, 255, 0.25)';
  ctx.fill();

  // Soft white/light border
  ctx.strokeStyle = 'rgba(200, 230, 255, 0.6)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Highlight arc on upper-left for 3D bubble effect
  ctx.beginPath();
  ctx.arc(x, bubbleCenterY, bubbleRadius - 5, Math.PI * 1.1, Math.PI * 1.6);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.lineWidth = 3;
  ctx.stroke();

  // Smaller inner highlight for extra shine
  ctx.beginPath();
  ctx.arc(x - bubbleRadius * 0.3, bubbleCenterY - bubbleRadius * 0.3, bubbleRadius * 0.15, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.fill();
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

// Draw skull emoji over player (for dead players)
function drawDeadSkull(x: number, y: number): void {
  if (!ctx) return;
  ctx.font = '32px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('💀', x, y);
}

// Draw a player at specific position (for local player with predicted position)
export function drawPlayerAt(
  x: number,
  y: number,
  color: string,
  name: string,
  hp: number,
  statusEffects?: StatusEffectState[],
  dead?: boolean
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
  serverTime?: number,
  doodads?: DoodadState[]
): void {
  // Initialize if not already done
  if (!ctx) {
    initRenderer();
  }
  if (!ctx) return;

  // Clear canvas
  clear();

  // Translate context to arena offset for all arena content
  ctx.save();
  ctx.translate(ARENA_OFFSET, ARENA_OFFSET);

  // Draw arena border
  drawArena();

  // Build position data for mechanics and doodads
  const posData: PlayerPositionData = {
    players,
    localPlayerId,
    localPosition,
    interpolatedPositions,
  };

  // Draw background doodads (after arena, before mechanics)
  if (doodads && serverTime !== undefined) {
    renderDoodads(ctx, doodads, 'background', serverTime, posData);
  }

  // Draw mechanics before players (so they appear below)
  if (mechanics && serverTime !== undefined) {
    renderMechanics(ctx, mechanics, serverTime, posData);
  }

  // Draw all players (body, health bar, name)
  for (const player of players) {
    // Determine player position
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

    // Draw bubble BEFORE player if bubbled (so player appears inside)
    const isBubbled = player.statusEffects?.some(s => s.type === 'bubbled');
    if (isBubbled) {
      drawBubble(ctx, px, py);
    }

    // Draw the player
    if (localPlayerId && player.id === localPlayerId && localPosition) {
      drawPlayerAt(localPosition.x, localPosition.y, player.color, player.name, player.hp, player.statusEffects, player.dead);
    } else if (interpolatedPositions?.get(player.id)) {
      const interpolated = interpolatedPositions.get(player.id)!;
      drawPlayerAt(interpolated.x, interpolated.y, player.color, player.name, player.hp, player.statusEffects, player.dead);
    } else {
      drawPlayerAt(player.x, player.y, player.color, player.name, player.hp, player.statusEffects, player.dead);
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

  // Draw skulls for dead players AFTER status effects (so they appear on top)
  for (const player of players) {
    if (player.dead) {
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
      drawDeadSkull(px, py);
    }
  }

  // Draw foreground doodads (after players)
  if (doodads && serverTime !== undefined) {
    renderDoodads(ctx, doodads, 'foreground', serverTime, posData);
  }

  // Draw tower explosions on top of everything
  if (serverTime !== undefined) {
    renderTowerExplosions(ctx, serverTime);
  }

  ctx.restore();
}

// Expose for testing
(window as any).__rendererTest = {
  initRenderer,
  render,
  drawPlayerAt,
};
