import { LinearKnockbackMechanicState, ARENA_WIDTH, ARENA_HEIGHT } from '../../shared/types';

// Linear knockback colors (cyan/blue for movement effect)
export const LINEAR_KB_COLOR = '#00ccff';
const CHEVRON_SPACING = 100; // ~100px between chevrons along line
const NUM_WAVES = 4;
const CHEVRON_SIZE = 25;

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

// Render linear knockback with animated chevrons moving perpendicular to line
export function renderLinearKnockback(
  ctx: CanvasRenderingContext2D,
  mechanic: LinearKnockbackMechanicState,
  serverTime: number
): void {
  const { lineStartX, lineStartY, lineEndX, lineEndY, startTime, endTime } = mechanic;

  // Only visible during active time
  if (serverTime < startTime || serverTime > endTime) {
    return;
  }

  // Calculate animation progress (0 to 1)
  const duration = endTime - startTime;
  const elapsed = serverTime - startTime;
  const progress = Math.max(0, Math.min(1, elapsed / duration));

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

  // Max distance to fill arena in knockback direction
  const maxDistance = Math.max(ARENA_WIDTH, ARENA_HEIGHT);

  // Calculate how many chevrons fit along the line
  const numChevronsAlongLine = Math.ceil(lineLength / CHEVRON_SPACING) + 1;

  // Draw multiple waves of chevrons
  for (let wave = 0; wave < NUM_WAVES; wave++) {
    // Stagger waves - each wave is offset in the animation cycle
    const wavePhase = (progress + wave / NUM_WAVES) % 1;

    // Wave distance from line (moves outward in knockback direction)
    const waveDistance = wavePhase * maxDistance;

    // Skip waves that haven't started
    if (waveDistance < 10) continue;

    // Fade out as waves move away from line
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

      // Skip chevrons outside visible area (with margin)
      if (chevronX < -50 || chevronX > ARENA_WIDTH + 50 ||
          chevronY < -50 || chevronY > ARENA_HEIGHT + 50) {
        continue;
      }

      // Draw chevron pointing in knockback direction (no size change)
      drawChevron(ctx, chevronX, chevronY, chevronAngle, CHEVRON_SIZE, alpha);
    }
  }
}
