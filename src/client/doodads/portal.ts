import { DoodadState } from '../../shared/types';

// Portal animation constants
const ROTATION_SPEED = 0.002; // radians per ms
const PULSE_SPEED = 0.003;    // pulse frequency per ms
const PULSE_MIN = 0.7;        // minimum opacity during pulse
const PULSE_MAX = 1.0;        // maximum opacity during pulse
const NUM_SPIRAL_ARMS = 4;    // number of spiral arms in vortex
const SPIRAL_TWIST = 2.5;     // how many rotations spiral makes from edge to center
const CORE_RATIO = 0.15;      // size of bright core relative to portal size

// Render an animated swirling portal vortex
export function renderPortal(
  ctx: CanvasRenderingContext2D,
  doodad: DoodadState,
  pos: { x: number; y: number },
  serverTime: number
): void {
  const { width, height, rotation, startTime, color, opacity } = doodad;

  // Time since portal spawned (for consistent animation across clients)
  const elapsed = serverTime - startTime;

  // Base rotation from doodad + animated rotation
  const animRotation = rotation + elapsed * ROTATION_SPEED;

  // Pulsing opacity
  const pulsePhase = elapsed * PULSE_SPEED;
  const pulseFactor = (Math.sin(pulsePhase) + 1) / 2; // 0 to 1
  const pulseOpacity = PULSE_MIN + pulseFactor * (PULSE_MAX - PULSE_MIN);
  const finalOpacity = (opacity ?? 1) * pulseOpacity;

  // Portal dimensions (use average for radius in circular rendering)
  const radius = Math.min(width, height) / 2;

  ctx.save();
  ctx.translate(pos.x, pos.y);
  ctx.rotate(animRotation);
  ctx.globalAlpha = finalOpacity;

  // Parse base color for gradient variations
  const baseColor = parseColor(color);

  // Outer glow
  const outerGlow = ctx.createRadialGradient(0, 0, radius * 0.5, 0, 0, radius * 1.3);
  outerGlow.addColorStop(0, `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, 0)`);
  outerGlow.addColorStop(0.7, `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, 0.2)`);
  outerGlow.addColorStop(1, `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, 0)`);
  ctx.fillStyle = outerGlow;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 1.3, 0, Math.PI * 2);
  ctx.fill();

  // Main vortex body with radial gradient
  const vortexGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
  vortexGradient.addColorStop(0, `rgba(255, 255, 255, 0.9)`);
  vortexGradient.addColorStop(CORE_RATIO, `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, 0.8)`);
  vortexGradient.addColorStop(0.5, `rgba(${baseColor.r * 0.7}, ${baseColor.g * 0.7}, ${baseColor.b * 0.7}, 0.5)`);
  vortexGradient.addColorStop(1, `rgba(${baseColor.r * 0.3}, ${baseColor.g * 0.3}, ${baseColor.b * 0.3}, 0.1)`);

  ctx.fillStyle = vortexGradient;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();

  // Draw spiral arms
  ctx.strokeStyle = `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, 0.6)`;
  ctx.lineWidth = 2;

  for (let arm = 0; arm < NUM_SPIRAL_ARMS; arm++) {
    const armOffset = (arm / NUM_SPIRAL_ARMS) * Math.PI * 2;
    ctx.beginPath();

    for (let r = radius * CORE_RATIO; r <= radius; r += 2) {
      const t = (r - radius * CORE_RATIO) / (radius * (1 - CORE_RATIO)); // 0 to 1
      const angle = armOffset + t * SPIRAL_TWIST * Math.PI * 2;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;

      if (r === radius * CORE_RATIO) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.stroke();
  }

  // Bright core
  const coreGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * CORE_RATIO * 1.5);
  coreGradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  coreGradient.addColorStop(0.5, `rgba(255, 255, 255, 0.8)`);
  coreGradient.addColorStop(1, `rgba(255, 255, 255, 0)`);

  ctx.fillStyle = coreGradient;
  ctx.beginPath();
  ctx.arc(0, 0, radius * CORE_RATIO * 1.5, 0, Math.PI * 2);
  ctx.fill();

  // Edge ring
  ctx.strokeStyle = `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, 0.8)`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

// Parse hex or named color to RGB
function parseColor(color: string): { r: number; g: number; b: number } {
  // Default to purple if parsing fails
  const defaultColor = { r: 128, g: 0, b: 255 };

  if (color.startsWith('#')) {
    const hex = color.slice(1);
    if (hex.length === 3) {
      return {
        r: parseInt(hex[0] + hex[0], 16),
        g: parseInt(hex[1] + hex[1], 16),
        b: parseInt(hex[2] + hex[2], 16),
      };
    } else if (hex.length === 6) {
      return {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
      };
    }
  }

  // Named colors (basic support)
  const namedColors: Record<string, { r: number; g: number; b: number }> = {
    purple: { r: 128, g: 0, b: 255 },
    blue: { r: 0, g: 128, b: 255 },
    cyan: { r: 0, g: 255, b: 255 },
    green: { r: 0, g: 255, b: 128 },
    yellow: { r: 255, g: 255, b: 0 },
    orange: { r: 255, g: 165, b: 0 },
    red: { r: 255, g: 0, b: 0 },
    pink: { r: 255, g: 105, b: 180 },
    white: { r: 255, g: 255, b: 255 },
  };

  return namedColors[color.toLowerCase()] ?? defaultColor;
}
