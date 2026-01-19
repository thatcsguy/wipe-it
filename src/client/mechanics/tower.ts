import { TowerMechanicState } from '../../shared/types';
import { TOWER_COLOR, TOWER_FILL_ALPHA, TOWER_STROKE_ALPHA } from './shared';

// Render a tower mechanic - circle AOE requiring N players
export function renderTower(
  ctx: CanvasRenderingContext2D,
  mechanic: TowerMechanicState,
  serverTime: number
): void {
  const { x, y, radius, requiredPlayers } = mechanic;

  // Parse TOWER_COLOR (#ffaa00) to RGB for alpha variants
  const r = parseInt(TOWER_COLOR.slice(1, 3), 16);
  const g = parseInt(TOWER_COLOR.slice(3, 5), 16);
  const b = parseInt(TOWER_COLOR.slice(5, 7), 16);

  // Outer circle with semi-transparent fill
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${TOWER_FILL_ALPHA})`;
  ctx.fill();
  ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${TOWER_STROKE_ALPHA})`;
  ctx.lineWidth = 3;
  ctx.stroke();

  // 6 rotating tick marks around perimeter
  const rotationAngle = serverTime * 0.002;
  const tickCount = 6;
  const tickLength = radius * 0.15;
  const tickWidth = radius * 0.08;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotationAngle);

  for (let i = 0; i < tickCount; i++) {
    const angle = (i / tickCount) * Math.PI * 2;
    ctx.save();
    ctx.rotate(angle);

    // Draw triangle tick mark pointing inward
    ctx.beginPath();
    ctx.moveTo(radius - tickLength, -tickWidth / 2);
    ctx.lineTo(radius, 0);
    ctx.lineTo(radius - tickLength, tickWidth / 2);
    ctx.closePath();
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${TOWER_STROKE_ALPHA})`;
    ctx.fill();

    ctx.restore();
  }

  ctx.restore();

  // Large centered number showing requiredPlayers
  const fontSize = radius * 0.45;
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Dark stroke outline for readability
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 4;
  ctx.strokeText(String(requiredPlayers), x, y);

  // White fill
  ctx.fillStyle = '#ffffff';
  ctx.fillText(String(requiredPlayers), x, y);
}
