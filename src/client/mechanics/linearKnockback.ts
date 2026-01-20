import { LinearKnockbackMechanicState } from '../../shared/types';

// Linear knockback colors (cyan/blue for movement effect)
export const LINEAR_KB_COLOR = '#00ccff';
const CHEVRON_SPACING = 100; // ~100px between chevrons along line
const NUM_WAVES = 4;
const CHEVRON_SIZE = 25;
const CHEVRON_SPEED = 400; // pixels per second (constant)

// Rectangle outline colors (similar to lineAoe but cyan-tinted)
const RECT_EDGE_GLOW_COLOR = 'rgba(0, 200, 255, 0.6)';
const RECT_EDGE_CORE_COLOR = 'rgba(150, 230, 255, 0.8)';
const RECT_FILL_COLOR = 'rgba(0, 150, 200, 0.1)';

// Draw a single chevron (>> shape) pointing in direction
function drawChevron(
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

  ctx.strokeStyle = `rgba(0, 204, 255, ${alpha})`;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Draw double chevron >> pattern
  // First chevron >
  ctx.beginPath();
  ctx.moveTo(-size * 0.5, -size * 0.5);
  ctx.lineTo(0, 0);
  ctx.lineTo(-size * 0.5, size * 0.5);
  ctx.stroke();

  // Second chevron > (offset to the right)
  ctx.beginPath();
  ctx.moveTo(size * 0.1, -size * 0.5);
  ctx.lineTo(size * 0.6, 0);
  ctx.lineTo(size * 0.1, size * 0.5);
  ctx.stroke();

  ctx.restore();
}

// Render linear knockback with rectangle bounds and animated chevrons
export function renderLinearKnockback(
  ctx: CanvasRenderingContext2D,
  mechanic: LinearKnockbackMechanicState,
  serverTime: number
): void {
  const { lineStartX, lineStartY, lineEndX, lineEndY, width, startTime, endTime } = mechanic;

  // Only visible during active time
  if (serverTime < startTime || serverTime > endTime) {
    return;
  }

  // Calculate elapsed time in seconds
  const elapsed = (serverTime - startTime) / 1000;

  // Calculate line direction and length
  const lineDx = lineEndX - lineStartX;
  const lineDy = lineEndY - lineStartY;
  const lineLength = Math.sqrt(lineDx * lineDx + lineDy * lineDy);

  if (lineLength < 1) return; // Avoid division by zero

  // Normalized line direction
  const lineDirX = lineDx / lineLength;
  const lineDirY = lineDy / lineLength;

  // Perpendicular direction (knockback direction - right side of line)
  // Using (lineY/len, -lineX/len) formula from shared/knockback.ts
  const perpDirX = lineDirY;
  const perpDirY = -lineDirX;

  // Angle for chevrons (pointing in knockback direction)
  const chevronAngle = Math.atan2(perpDirY, perpDirX);

  // Half width for rectangle
  const halfWidth = width / 2;

  // Calculate four corners of the rectangle (centered on line)
  const corners = [
    { x: lineStartX + perpDirX * halfWidth, y: lineStartY + perpDirY * halfWidth },
    { x: lineEndX + perpDirX * halfWidth, y: lineEndY + perpDirY * halfWidth },
    { x: lineEndX - perpDirX * halfWidth, y: lineEndY - perpDirY * halfWidth },
    { x: lineStartX - perpDirX * halfWidth, y: lineStartY - perpDirY * halfWidth },
  ];

  // Draw rectangle path helper
  const drawRect = () => {
    ctx.beginPath();
    ctx.moveTo(corners[0].x, corners[0].y);
    ctx.lineTo(corners[1].x, corners[1].y);
    ctx.lineTo(corners[2].x, corners[2].y);
    ctx.lineTo(corners[3].x, corners[3].y);
    ctx.closePath();
  };

  ctx.save();

  // Draw faint fill
  drawRect();
  ctx.fillStyle = RECT_FILL_COLOR;
  ctx.fill();

  // Draw glowing edge - outer glow layer
  drawRect();
  ctx.shadowColor = RECT_EDGE_GLOW_COLOR;
  ctx.shadowBlur = 6;
  ctx.strokeStyle = RECT_EDGE_GLOW_COLOR;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Draw bright core edge
  drawRect();
  ctx.strokeStyle = RECT_EDGE_CORE_COLOR;
  ctx.lineWidth = 0.75;
  ctx.stroke();

  // Clip to rectangle for chevrons
  drawRect();
  ctx.clip();

  // Calculate how many chevrons fit along the line
  const numChevronsAlongLine = Math.ceil(lineLength / CHEVRON_SPACING) + 1;

  // Draw multiple waves of chevrons within the rectangle
  for (let wave = 0; wave < NUM_WAVES; wave++) {
    // Distance traveled at constant speed, offset per wave
    const distanceTraveled = elapsed * CHEVRON_SPEED + (wave / NUM_WAVES) * width;
    // Wrap within width to get phase (0 to 1)
    const wavePhase = (distanceTraveled % width) / width;

    // Wave distance from the opposite edge (moves across rectangle in knockback direction)
    // Start at -halfWidth (opposite edge) and move to +halfWidth (knockback edge)
    const waveDistance = -halfWidth + wavePhase * width;

    // Fade out as chevrons travel toward knockback edge
    const alpha = 0.8 * (1 - wavePhase * 0.7);

    // Draw chevrons along the line at this wave distance
    for (let i = 0; i < numChevronsAlongLine; i++) {
      // Position along the line
      const t = i / Math.max(1, numChevronsAlongLine - 1);
      const lineX = lineStartX + lineDx * t;
      const lineY = lineStartY + lineDy * t;

      // Offset perpendicular to line by wave distance
      const chevronX = lineX + perpDirX * waveDistance;
      const chevronY = lineY + perpDirY * waveDistance;

      // Draw chevron pointing in knockback direction
      drawChevron(ctx, chevronX, chevronY, chevronAngle, CHEVRON_SIZE, alpha);
    }
  }

  ctx.restore();
}
