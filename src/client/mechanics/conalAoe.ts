import { ConalAoeMechanicState } from '../../shared/types';
import { CHARIOT_COLOR, CHARIOT_FILL_ALPHA, CHARIOT_INNER_ALPHA } from './shared';

// Render a conal AOE mechanic - pie slice/sector from center point
export function renderConalAoe(
  ctx: CanvasRenderingContext2D,
  mechanic: ConalAoeMechanicState
): void {
  const { centerX, centerY, endpointX, endpointY, angle } = mechanic;

  // Calculate radius as distance from center to endpoint
  const dx = endpointX - centerX;
  const dy = endpointY - centerY;
  const radius = Math.sqrt(dx * dx + dy * dy);

  if (radius === 0) return;

  // Direction angle from center to endpoint
  const direction = Math.atan2(dy, dx);

  // Start and end angles for the arc (centered on direction)
  const startAngle = direction - angle / 2;
  const endAngle = direction + angle / 2;

  // Draw the sector (pie slice)
  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.arc(centerX, centerY, radius, startAngle, endAngle);
  ctx.closePath();

  // Fill with semi-transparent chariot orange
  ctx.fillStyle = `rgba(255, 159, 64, ${CHARIOT_FILL_ALPHA})`;
  ctx.fill();

  // Inner glow - smaller sector
  const innerRadius = radius * 0.7;
  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.arc(centerX, centerY, innerRadius, startAngle, endAngle);
  ctx.closePath();

  ctx.fillStyle = `rgba(255, 159, 64, ${CHARIOT_INNER_ALPHA})`;
  ctx.fill();

  // Border stroke
  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.arc(centerX, centerY, radius, startAngle, endAngle);
  ctx.closePath();
  ctx.strokeStyle = CHARIOT_COLOR;
  ctx.lineWidth = 2;
  ctx.stroke();
}
