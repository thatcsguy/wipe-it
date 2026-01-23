import { DoodadState } from '../../shared/types';

// Element colors for magic orb glow
const ELEMENT_COLORS: Record<string, string> = {
  wind: '#00ff88',
  lightning: '#ffff00',
  ice: '#00ccff',
};

// Render a magic orb doodad with element-colored pulsing glow
export function renderMagicOrb(
  ctx: CanvasRenderingContext2D,
  doodad: DoodadState,
  pos: { x: number; y: number },
  serverTime: number
): void {
  const element = (doodad.data?.element as string) ?? 'ice';
  const color = ELEMENT_COLORS[element] ?? ELEMENT_COLORS.ice;
  const radius = 40;

  // Pulsing glow intensity: oscillate between 0.4 and 1.0 over ~1.5s
  const pulsePhase = (serverTime % 1500) / 1500;
  const pulseIntensity = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(pulsePhase * Math.PI * 2));

  ctx.save();
  ctx.translate(pos.x, pos.y);

  // Outer glow (larger, softer)
  const outerGlow = ctx.createRadialGradient(0, 0, radius * 0.5, 0, 0, radius * 2);
  outerGlow.addColorStop(0, color);
  outerGlow.addColorStop(1, 'transparent');
  ctx.globalAlpha = 0.3 * pulseIntensity;
  ctx.fillStyle = outerGlow;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 2, 0, Math.PI * 2);
  ctx.fill();

  // Inner glow
  const innerGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
  innerGlow.addColorStop(0, 'white');
  innerGlow.addColorStop(0.3, color);
  innerGlow.addColorStop(1, 'transparent');
  ctx.globalAlpha = 0.7 * pulseIntensity;
  ctx.fillStyle = innerGlow;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();

  // Core orb
  ctx.globalAlpha = pulseIntensity;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.4, 0, Math.PI * 2);
  ctx.fill();

  // Bright center
  ctx.globalAlpha = pulseIntensity;
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.15, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
