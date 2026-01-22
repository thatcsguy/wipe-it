import { ArenaSkinId, ARENA_WIDTH, ARENA_HEIGHT, ARENA_OFFSET } from '../shared/types';

const GRID_INTERVAL = 200;

/**
 * Render the 4x4 grid skin - faint gridlines at 200px intervals
 */
function render4x4GridSkin(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.translate(ARENA_OFFSET, ARENA_OFFSET);

  ctx.strokeStyle = 'rgba(100, 150, 200, 0.3)';
  ctx.lineWidth = 1;

  // Vertical lines at x = 200, 400, 600
  for (let x = GRID_INTERVAL; x < ARENA_WIDTH; x += GRID_INTERVAL) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, ARENA_HEIGHT);
    ctx.stroke();
  }

  // Horizontal lines at y = 200, 400, 600
  for (let y = GRID_INTERVAL; y < ARENA_HEIGHT; y += GRID_INTERVAL) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(ARENA_WIDTH, y);
    ctx.stroke();
  }

  ctx.restore();
}

/**
 * Render arena skin overlay based on skin ID
 */
export function renderArenaSkin(ctx: CanvasRenderingContext2D, skinId: ArenaSkinId): void {
  switch (skinId) {
    case '4x4-grid':
      render4x4GridSkin(ctx);
      break;
    case 'default':
    default:
      // No overlay for default skin
      break;
  }
}
