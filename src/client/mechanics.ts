import { MechanicState, ChariotMechanicState } from '../shared/types';

// Chariot color (orange-yellow)
const CHARIOT_COLOR = '#ff9f40';
const CHARIOT_FILL_ALPHA = 0.3;
const CHARIOT_INNER_ALPHA = 0.5;

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

// Render all mechanics
export function renderMechanics(
  ctx: CanvasRenderingContext2D,
  mechanics: MechanicState[],
  serverTime: number
): void {
  for (const mechanic of mechanics) {
    if (mechanic.type === 'chariot') {
      renderChariot(ctx, mechanic, serverTime);
    }
  }
}

// Export for testing
(window as any).__mechanicsTest = {
  renderMechanics,
};
