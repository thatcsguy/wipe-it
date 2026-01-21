import { DoodadState } from '../../shared/types';

// Render a crystal doodad - a gemstone brick with faceted shiny appearance
export function renderCrystal(
  ctx: CanvasRenderingContext2D,
  doodad: DoodadState,
  pos: { x: number; y: number },
  _serverTime: number
): void {
  const { width, height, rotation, opacity } = doodad;

  ctx.save();
  ctx.translate(pos.x, pos.y);
  ctx.rotate(rotation);
  ctx.globalAlpha = opacity ?? 1;

  const hw = width / 2;
  const hh = height / 2;

  // Base crystal color - light blue
  const baseColor = '#7dd3fc'; // sky-300
  const darkColor = '#0284c7'; // sky-600
  const lightColor = '#e0f2fe'; // sky-100
  const highlightColor = '#ffffff';

  // Outer border/shadow
  ctx.fillStyle = darkColor;
  ctx.fillRect(-hw, -hh, width, height);

  // Main crystal body (inset slightly)
  const inset = 2;
  ctx.fillStyle = baseColor;
  ctx.fillRect(-hw + inset, -hh + inset, width - inset * 2, height - inset * 2);

  // Facet lines - create gemstone brick appearance
  // Top-left to bottom-right diagonal facet
  const facetInset = width * 0.15;

  ctx.strokeStyle = darkColor;
  ctx.lineWidth = 1.5;

  // Draw facet pattern - diamond shape in center
  ctx.beginPath();
  // Top edge facet
  ctx.moveTo(-hw + facetInset, -hh + inset);
  ctx.lineTo(0, -hh + height * 0.2);
  ctx.lineTo(hw - facetInset, -hh + inset);
  // Bottom edge facet
  ctx.moveTo(-hw + facetInset, hh - inset);
  ctx.lineTo(0, hh - height * 0.2);
  ctx.lineTo(hw - facetInset, hh - inset);
  // Left edge facet
  ctx.moveTo(-hw + inset, -hh + facetInset);
  ctx.lineTo(-hw + width * 0.25, 0);
  ctx.lineTo(-hw + inset, hh - facetInset);
  // Right edge facet
  ctx.moveTo(hw - inset, -hh + facetInset);
  ctx.lineTo(hw - width * 0.25, 0);
  ctx.lineTo(hw - inset, hh - facetInset);
  ctx.stroke();

  // Center highlight - lighter facet
  ctx.fillStyle = lightColor;
  ctx.globalAlpha = (opacity ?? 1) * 0.6;
  ctx.beginPath();
  ctx.moveTo(0, -hh + height * 0.2);
  ctx.lineTo(hw - width * 0.25, 0);
  ctx.lineTo(0, hh - height * 0.2);
  ctx.lineTo(-hw + width * 0.25, 0);
  ctx.closePath();
  ctx.fill();

  // Shine highlight - top-left corner
  ctx.fillStyle = highlightColor;
  ctx.globalAlpha = (opacity ?? 1) * 0.7;
  ctx.beginPath();
  ctx.moveTo(-hw + inset, -hh + inset);
  ctx.lineTo(-hw + facetInset, -hh + inset);
  ctx.lineTo(-hw + width * 0.25, 0);
  ctx.lineTo(-hw + inset, -hh + facetInset);
  ctx.closePath();
  ctx.fill();

  // Small sparkle
  ctx.globalAlpha = (opacity ?? 1) * 0.9;
  ctx.fillStyle = highlightColor;
  const sparkleX = -hw + width * 0.25;
  const sparkleY = -hh + height * 0.25;
  ctx.beginPath();
  ctx.arc(sparkleX, sparkleY, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
