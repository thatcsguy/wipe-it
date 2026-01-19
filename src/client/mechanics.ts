import { MechanicState, ChariotMechanicState, SpreadMechanicState, PlayerState } from '../shared/types';

// Chariot color (orange-yellow)
const CHARIOT_COLOR = '#ff9f40';
const CHARIOT_FILL_ALPHA = 0.3;
const CHARIOT_INNER_ALPHA = 0.5;

// Spread colors (FFXIV-style pink/purple)
const SPREAD_OUTER_COLOR = 'rgba(255, 128, 255, 0.3)';
const SPREAD_BORDER_COLOR = 'rgba(200, 100, 200, 0.8)';

// Position lookup data for spread mechanics
export interface PlayerPositionData {
  players: PlayerState[];
  localPlayerId: string | null;
  localPosition: { x: number; y: number } | null;
  interpolatedPositions?: Map<string, { x: number; y: number }>;
}

// Get player position considering prediction and interpolation
function getPlayerPosition(playerId: string, posData: PlayerPositionData): { x: number; y: number } | null {
  // Local player with prediction
  if (posData.localPlayerId === playerId && posData.localPosition) {
    return posData.localPosition;
  }
  // Interpolated position
  const interpolated = posData.interpolatedPositions?.get(playerId);
  if (interpolated) {
    return interpolated;
  }
  // Server position fallback
  const player = posData.players.find(p => p.id === playerId);
  if (player) {
    return { x: player.x, y: player.y };
  }
  return null;
}

// Render a chariot mechanic - expanding inner circle shows progress
function renderChariot(
  ctx: CanvasRenderingContext2D,
  mechanic: ChariotMechanicState,
  serverTime: number
): void {
  const { x, y, radius, startTime, endTime } = mechanic;

  // Calculate progress (0 to 1)
  const duration = endTime - startTime;
  const elapsed = serverTime - startTime;
  const progress = Math.max(0, Math.min(1, elapsed / duration));

  // Outer circle (full radius, semi-transparent fill)
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255, 159, 64, ${CHARIOT_FILL_ALPHA})`;
  ctx.fill();
  ctx.strokeStyle = CHARIOT_COLOR;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Inner circle (expanding based on progress)
  const innerRadius = radius * progress;
  if (innerRadius > 0) {
    ctx.beginPath();
    ctx.arc(x, y, innerRadius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 159, 64, ${CHARIOT_INNER_ALPHA})`;
    ctx.fill();
  }
}

// Render a spread mechanic - FFXIV-style pink/purple circle following a player
function renderSpread(
  ctx: CanvasRenderingContext2D,
  mechanic: SpreadMechanicState,
  serverTime: number,
  posData: PlayerPositionData
): void {
  const { targetPlayerId, radius } = mechanic;

  // Get target player position
  const pos = getPlayerPosition(targetPlayerId, posData);
  if (!pos) return; // Player not found

  const { x, y } = pos;

  // Edge gradient (transparent center, pink at edge)
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, 'rgba(255, 128, 255, 0)');
  gradient.addColorStop(0.7, 'rgba(255, 128, 255, 0)');
  gradient.addColorStop(1, 'rgba(255, 128, 255, 0.4)');

  // Draw filled circle with gradient
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();

  // Outer border
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.strokeStyle = SPREAD_BORDER_COLOR;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Radiating pulse wave (1 second cycle, 500ms travel time)
  const cycleTime = serverTime % 1000;
  if (cycleTime < 500) {
    const pulseProgress = cycleTime / 500; // 0 to 1 over 500ms
    const pulseRadius = radius * pulseProgress;
    const pulseAlpha = 0.5 * (1 - pulseProgress); // fade out as it expands

    ctx.beginPath();
    ctx.arc(x, y, pulseRadius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 180, 255, ${pulseAlpha})`;
    ctx.lineWidth = 4;
    ctx.stroke();
  }
}

// Render all mechanics
export function renderMechanics(
  ctx: CanvasRenderingContext2D,
  mechanics: MechanicState[],
  serverTime: number,
  posData?: PlayerPositionData
): void {
  for (const mechanic of mechanics) {
    if (mechanic.type === 'chariot') {
      renderChariot(ctx, mechanic, serverTime);
    } else if (mechanic.type === 'spread' && posData) {
      renderSpread(ctx, mechanic, serverTime, posData);
    }
  }
}

// Export for testing
(window as any).__mechanicsTest = {
  renderMechanics,
};
