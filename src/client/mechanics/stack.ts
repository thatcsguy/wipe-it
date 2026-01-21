import { StackMechanicState } from '../../shared/types';
import { PlayerPositionData, getPlayerPosition } from './shared';

// Stack colors - yellow theme like FFXIV stack markers
export const STACK_COLOR = '#ffdd00';
export const STACK_CIRCLE_OPACITY = 0.6;
export const STACK_CIRCLE_WIDTH = 2;

// Arrow animation settings
const ARROW_COUNT = 8;
const ARROW_PULSE_CYCLE = 800; // ms
const ARROW_SIZE = 18; // base arrow size
const ARROW_OFFSET_RATIO = 1.15; // arrows positioned 15% outside radius

// Render a stack mechanic - yellow circle with 8 pulsing inward arrows
export function renderStack(
  ctx: CanvasRenderingContext2D,
  mechanic: StackMechanicState,
  serverTime: number,
  posData: PlayerPositionData
): void {
  const { targetPlayerId, radius } = mechanic;

  // Get target player position
  const pos = getPlayerPosition(targetPlayerId, posData);
  if (!pos) return; // Player not found

  const { x, y } = pos;

  // Draw static yellow radius circle
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.strokeStyle = STACK_COLOR;
  ctx.lineWidth = STACK_CIRCLE_WIDTH;
  ctx.globalAlpha = STACK_CIRCLE_OPACITY;
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Draw 8 pulsing arrows pointing inward
  const pulseProgress = (serverTime % ARROW_PULSE_CYCLE) / ARROW_PULSE_CYCLE;
  // Pulsing inward: scale goes from 1.2 to 0.8, opacity from 1 to 0.4
  const pulseScale = 1.2 - 0.4 * pulseProgress;
  const pulseAlpha = 1 - 0.6 * pulseProgress;

  const arrowDistance = radius * ARROW_OFFSET_RATIO;

  for (let i = 0; i < ARROW_COUNT; i++) {
    const angle = (i / ARROW_COUNT) * Math.PI * 2 - Math.PI / 2; // Start from top
    const arrowX = x + Math.cos(angle) * arrowDistance;
    const arrowY = y + Math.sin(angle) * arrowDistance;

    // Arrow points toward center
    const pointAngle = angle + Math.PI; // Flip to point inward

    drawArrow(ctx, arrowX, arrowY, pointAngle, ARROW_SIZE * pulseScale, pulseAlpha);
  }
}

// Draw an elongated arrow with tail pointing in direction of angle
function drawArrow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angle: number,
  size: number,
  alpha: number
): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.globalAlpha = alpha;

  // Elongated arrow shape - longer body with pointed head
  const headLength = size * 0.6;
  const headWidth = size * 0.5;
  const tailLength = size * 0.8;
  const tailWidth = size * 0.2;

  ctx.beginPath();
  // Arrow tip
  ctx.moveTo(headLength, 0);
  // Right side of head
  ctx.lineTo(0, headWidth / 2);
  // Right notch for tail
  ctx.lineTo(0, tailWidth / 2);
  // Tail end (back)
  ctx.lineTo(-tailLength, tailWidth / 2);
  ctx.lineTo(-tailLength, -tailWidth / 2);
  // Left notch for tail
  ctx.lineTo(0, -tailWidth / 2);
  // Left side of head
  ctx.lineTo(0, -headWidth / 2);
  // Back to tip
  ctx.closePath();

  ctx.fillStyle = STACK_COLOR;
  ctx.fill();

  // Subtle outline for definition
  ctx.strokeStyle = 'rgba(200, 180, 0, 0.8)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.restore();
}
