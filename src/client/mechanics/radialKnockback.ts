import { RadialKnockbackMechanicState, ARENA_WIDTH, ARENA_HEIGHT } from '../../shared/types';

// Radial knockback colors (cyan/blue for movement effect)
export const RADIAL_KB_COLOR = '#00ccff';
const CHEVRONS_PER_RING = 10;
const NUM_RINGS = 4;
const CHEVRON_BASE_SIZE = 15;
const CHEVRON_MAX_SIZE = 40;

// Draw a single chevron (>> shape) pointing outward
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

// Render radial knockback with animated chevron rings
export function renderRadialKnockback(
  ctx: CanvasRenderingContext2D,
  mechanic: RadialKnockbackMechanicState,
  serverTime: number
): void {
  const { originX, originY, startTime, endTime } = mechanic;

  // Only visible during active time
  if (serverTime < startTime || serverTime > endTime) {
    return;
  }

  // Calculate animation progress (0 to 1)
  const duration = endTime - startTime;
  const elapsed = serverTime - startTime;
  const progress = Math.max(0, Math.min(1, elapsed / duration));

  // Max radius to fill arena from origin
  const maxRadius = Math.max(
    Math.sqrt(originX * originX + originY * originY),
    Math.sqrt((ARENA_WIDTH - originX) ** 2 + originY ** 2),
    Math.sqrt(originX ** 2 + (ARENA_HEIGHT - originY) ** 2),
    Math.sqrt((ARENA_WIDTH - originX) ** 2 + (ARENA_HEIGHT - originY) ** 2)
  );

  // Draw multiple rings at different phases
  for (let ring = 0; ring < NUM_RINGS; ring++) {
    // Stagger rings - each ring is offset in the animation cycle
    const ringPhase = (progress + ring / NUM_RINGS) % 1;

    // Ring radius expands outward
    const radius = ringPhase * maxRadius;

    // Skip rings that are too small
    if (radius < 20) continue;

    // Size increases with radius
    const sizeFactor = radius / maxRadius;
    const chevronSize = CHEVRON_BASE_SIZE + (CHEVRON_MAX_SIZE - CHEVRON_BASE_SIZE) * sizeFactor;

    // Fade out as rings expand (more transparent at edges)
    const alpha = 0.8 * (1 - sizeFactor * 0.7);

    // Draw chevrons around the ring
    for (let i = 0; i < CHEVRONS_PER_RING; i++) {
      const angle = (i / CHEVRONS_PER_RING) * Math.PI * 2;

      const chevronX = originX + Math.cos(angle) * radius;
      const chevronY = originY + Math.sin(angle) * radius;

      // Skip chevrons outside visible area (with margin)
      if (chevronX < -50 || chevronX > ARENA_WIDTH + 50 ||
          chevronY < -50 || chevronY > ARENA_HEIGHT + 50) {
        continue;
      }

      // Chevron points outward (angle matches radial direction)
      drawChevron(ctx, chevronX, chevronY, angle, chevronSize, alpha);
    }
  }
}
