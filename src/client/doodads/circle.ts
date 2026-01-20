import { DoodadState } from '../../shared/types';

// Render a circle doodad with color, opacity, and rotation
export function renderCircle(
  ctx: CanvasRenderingContext2D,
  doodad: DoodadState,
  pos: { x: number; y: number },
  serverTime: number
): void {
  const { width, height, rotation, color, opacity } = doodad;

  // Use average of width/height as diameter for circle
  const radius = Math.min(width, height) / 2;

  ctx.save();
  ctx.translate(pos.x, pos.y);
  ctx.rotate(rotation); // Applied for consistency, even though circle is symmetric
  ctx.globalAlpha = opacity ?? 1;

  // Fill circle
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();

  // Optional border for visibility
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.restore();
}
