import { SpreadMechanicState } from '../../shared/types';
import { SPREAD_BORDER_COLOR, PlayerPositionData, getPlayerPosition } from './shared';

// Render a spread mechanic - FFXIV-style pink/purple circle following a player
export function renderSpread(
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
