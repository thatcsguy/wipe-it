import { TowerMechanicState } from '../../shared/types';
import { TOWER_COLOR, TOWER_STROKE_ALPHA } from './shared';

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

  // Ring outline only (no fill)
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${TOWER_STROKE_ALPHA})`;
  ctx.lineWidth = 3;
  ctx.stroke();

  // Black ribbon spiral effect - rotates with sine wave speed
  // Speed fluctuates so max speed = 2x min speed
  const cycleDuration = 2500; // 2.5 seconds per rotation (40% of original speed)
  const t = (serverTime % cycleDuration) / cycleDuration; // 0 to 1
  // Integral of speed = 2π*(1 + (1/3)*sin(2πt)) gives position
  const rotationAngle = 2 * Math.PI * t - (1/3) * Math.cos(2 * Math.PI * t) + 1/3;

  // Dashed black ribbon around the circumference
  const circumference = 2 * Math.PI * radius;
  const dashLength = circumference / 24; // 12 dashes, 12 gaps
  const dashOffset = (rotationAngle / (2 * Math.PI)) * circumference;

  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.setLineDash([dashLength, dashLength]);
  ctx.lineDashOffset = -dashOffset;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.85)';
  ctx.lineWidth = 6;
  ctx.stroke();

  // Reset line dash for subsequent drawing
  ctx.setLineDash([]);
  ctx.lineDashOffset = 0;

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
