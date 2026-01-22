import { DoodadState } from '../../shared/types';

// Colors from reference image
const BABY_BLUE = '#5bcefa'; // Odds (1, 3)
const PINK = '#f5a9b8'; // Evens (2, 4)

// Pulse animation
const PULSE_PERIOD = 1500; // ms

// Pip positions for each count (normalized -1 to 1 range)
const PIP_POSITIONS: Record<number, { x: number; y: number }[]> = {
  1: [{ x: 0, y: 0 }],
  2: [
    { x: -0.5, y: 0 },
    { x: 0.5, y: 0 },
  ],
  3: [
    { x: 0, y: -0.5 },
    { x: -0.45, y: 0.4 },
    { x: 0.45, y: 0.4 },
  ],
  4: [
    { x: -0.45, y: -0.45 },
    { x: 0.45, y: -0.45 },
    { x: -0.45, y: 0.45 },
    { x: 0.45, y: 0.45 },
  ],
};

// Draw a 4-pointed star pip with glow
function drawPip(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  color: string,
  pulseIntensity: number
): void {
  // Outer glow - intensity affected by pulse
  const glowRadius = size * (1.5 + 0.5 * pulseIntensity);
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, glowRadius);
  const glowAlpha = Math.floor(128 + 64 * pulseIntensity).toString(16).padStart(2, '0');
  gradient.addColorStop(0, color);
  gradient.addColorStop(0.5, color + glowAlpha);
  gradient.addColorStop(1, 'transparent');

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, glowRadius, 0, Math.PI * 2);
  ctx.fill();

  // 4-pointed star shape
  const innerRadius = size * 0.3;
  const outerRadius = size;

  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const outerAngle = (i * Math.PI) / 2 - Math.PI / 2;
    const innerAngle2 = outerAngle + Math.PI / 4;

    if (i === 0) {
      ctx.moveTo(x + Math.cos(outerAngle) * outerRadius, y + Math.sin(outerAngle) * outerRadius);
    } else {
      ctx.lineTo(x + Math.cos(outerAngle) * outerRadius, y + Math.sin(outerAngle) * outerRadius);
    }
    ctx.lineTo(x + Math.cos(innerAngle2) * innerRadius, y + Math.sin(innerAngle2) * innerRadius);
  }
  ctx.closePath();
  ctx.fill();

  // Bright center dot - brighter during pulse
  const centerAlpha = 0.8 + 0.2 * pulseIntensity;
  ctx.fillStyle = `rgba(255, 255, 255, ${centerAlpha})`;
  ctx.beginPath();
  ctx.arc(x, y, size * (0.2 + 0.05 * pulseIntensity), 0, Math.PI * 2);
  ctx.fill();
}

// Render a limit-cut-marker doodad
export function renderLimitCutMarker(
  ctx: CanvasRenderingContext2D,
  doodad: DoodadState,
  pos: { x: number; y: number },
  serverTime: number
): void {
  const count = (doodad.data?.count as number) ?? 1;
  const clampedCount = Math.max(1, Math.min(4, count));

  // Calculate pulse intensity (0 to 1) using sine wave
  const pulsePhase = (serverTime % PULSE_PERIOD) / PULSE_PERIOD;
  const pulseIntensity = (Math.sin(pulsePhase * Math.PI * 2) + 1) / 2;

  // Use width as the marker diameter
  const radius = doodad.width / 2;
  const pipSize = radius * 0.28;

  ctx.save();
  ctx.globalAlpha = doodad.opacity ?? 1;

  // Dark circular background
  ctx.fillStyle = 'rgba(30, 30, 40, 0.7)';
  ctx.beginPath();
  ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
  ctx.fill();

  // Subtle border
  ctx.strokeStyle = 'rgba(60, 60, 80, 0.8)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Color: odds = baby blue, evens = pink
  const color = clampedCount % 2 === 1 ? BABY_BLUE : PINK;

  // Draw pips
  const positions = PIP_POSITIONS[clampedCount];
  for (const pipPos of positions) {
    const pipX = pos.x + pipPos.x * radius * 0.8;
    const pipY = pos.y + pipPos.y * radius * 0.8;
    drawPip(ctx, pipX, pipY, pipSize, color, pulseIntensity);
  }

  ctx.restore();
}
