import { DoodadState } from '../../shared/types';

// Render a rectangle doodad with color, opacity, and rotation
export function renderRect(
  ctx: CanvasRenderingContext2D,
  doodad: DoodadState,
  pos: { x: number; y: number },
  serverTime: number
): void {
  const { width, height, rotation, color, opacity } = doodad;

  ctx.save();
  ctx.translate(pos.x, pos.y);
  ctx.rotate(rotation);
  ctx.globalAlpha = opacity ?? 1;

  // Fill rectangle centered on position
  ctx.fillStyle = color;
  ctx.fillRect(-width / 2, -height / 2, width, height);

  // Optional border for visibility
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.lineWidth = 1;
  ctx.strokeRect(-width / 2, -height / 2, width, height);

  ctx.restore();
}
