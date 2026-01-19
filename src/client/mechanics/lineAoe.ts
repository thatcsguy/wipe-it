import { LineAoeMechanicState } from '../../shared/types';
import { CHARIOT_COLOR, CHARIOT_FILL_ALPHA, CHARIOT_INNER_ALPHA } from './shared';

// Render a line AOE mechanic - rectangular area defined by center line and width
export function renderLineAoe(
  ctx: CanvasRenderingContext2D,
  mechanic: LineAoeMechanicState
): void {
  const { startX, startY, endX, endY, width } = mechanic;

  // Calculate direction vector from start to end
  const dx = endX - startX;
  const dy = endY - startY;
  const length = Math.sqrt(dx * dx + dy * dy);

  if (length === 0) return;

  // Unit direction vector
  const ux = dx / length;
  const uy = dy / length;

  // Perpendicular vector (rotated 90 degrees)
  const px = -uy;
  const py = ux;

  // Half width for offset
  const hw = width / 2;

  // Calculate four corners of the rectangle
  const corners = [
    { x: startX + px * hw, y: startY + py * hw },
    { x: endX + px * hw, y: endY + py * hw },
    { x: endX - px * hw, y: endY - py * hw },
    { x: startX - px * hw, y: startY - py * hw },
  ];

  // Draw the rectangle
  ctx.beginPath();
  ctx.moveTo(corners[0].x, corners[0].y);
  ctx.lineTo(corners[1].x, corners[1].y);
  ctx.lineTo(corners[2].x, corners[2].y);
  ctx.lineTo(corners[3].x, corners[3].y);
  ctx.closePath();

  // Fill with semi-transparent chariot orange
  ctx.fillStyle = `rgba(255, 159, 64, ${CHARIOT_FILL_ALPHA})`;
  ctx.fill();

  // Inner glow - slightly smaller rectangle
  const innerHw = hw * 0.7;
  const innerCorners = [
    { x: startX + px * innerHw, y: startY + py * innerHw },
    { x: endX + px * innerHw, y: endY + py * innerHw },
    { x: endX - px * innerHw, y: endY - py * innerHw },
    { x: startX - px * innerHw, y: startY - py * innerHw },
  ];

  ctx.beginPath();
  ctx.moveTo(innerCorners[0].x, innerCorners[0].y);
  ctx.lineTo(innerCorners[1].x, innerCorners[1].y);
  ctx.lineTo(innerCorners[2].x, innerCorners[2].y);
  ctx.lineTo(innerCorners[3].x, innerCorners[3].y);
  ctx.closePath();

  ctx.fillStyle = `rgba(255, 159, 64, ${CHARIOT_INNER_ALPHA})`;
  ctx.fill();

  // Border stroke
  ctx.beginPath();
  ctx.moveTo(corners[0].x, corners[0].y);
  ctx.lineTo(corners[1].x, corners[1].y);
  ctx.lineTo(corners[2].x, corners[2].y);
  ctx.lineTo(corners[3].x, corners[3].y);
  ctx.closePath();
  ctx.strokeStyle = CHARIOT_COLOR;
  ctx.lineWidth = 2;
  ctx.stroke();
}
