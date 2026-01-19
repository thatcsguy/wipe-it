import { LineAoeMechanicState } from '../../shared/types';
import { AOE_EDGE_GLOW_COLOR, AOE_EDGE_CORE_COLOR } from './shared';

// Track when each mechanic was first seen for spawn animation
const mechanicFirstSeen = new Map<string, number>();

// Animation constants
const SPAWN_ANIM_DURATION = 200; // ms
const SPAWN_WIDTH_START = 0.1;   // Start at 10% of final width
const SPAWN_LENGTH_START = 0.5;  // Start at 50% of final length

// Pulse animation constants
const PULSE_TRAVEL_MS = 500;      // Time for pulse to cross full AOE
const PULSE_CYCLE_MS = 1000;      // Pulse repeats every 1000ms
const PULSE_LEADING_EDGE = 20;    // Front of pulse, in direction of travel (px)
const PULSE_PEAK_WIDTH = 10;      // Width of brightest zone (px)
const PULSE_TRAILING_RATIO = 0.5; // Trailing edge is 50% of AOE distance

// Colors for pulse effect
const FILL_COLOR_BASE = { r: 255, g: 80, b: 40, a: 0.35 };
const FILL_COLOR_BRIGHT = { r: 255, g: 160, b: 60, a: 0.55 };

// Render a line AOE mechanic - rectangular area defined by center line and width
export function renderLineAoe(
  ctx: CanvasRenderingContext2D,
  mechanic: LineAoeMechanicState
): void {
  const { startX, startY, endX, endY, width, id } = mechanic;

  // Track first-seen time for animation
  const now = performance.now();
  if (!mechanicFirstSeen.has(id)) {
    mechanicFirstSeen.set(id, now);
  }
  const firstSeen = mechanicFirstSeen.get(id)!;
  const elapsed = now - firstSeen;

  // Calculate animation progress (0 to 1)
  const progress = Math.min(elapsed / SPAWN_ANIM_DURATION, 1);

  // Interpolate width and length multipliers
  const widthMult = SPAWN_WIDTH_START + (1 - SPAWN_WIDTH_START) * progress;
  const lengthMult = SPAWN_LENGTH_START + (1 - SPAWN_LENGTH_START) * progress;
  const opacity = progress;

  // Apply animated width
  const animWidth = width * widthMult;

  // Apply animated length (anchored at start)
  const animEndX = startX + (endX - startX) * lengthMult;
  const animEndY = startY + (endY - startY) * lengthMult;

  // Calculate direction vector from start to animated end
  const dx = animEndX - startX;
  const dy = animEndY - startY;
  const length = Math.sqrt(dx * dx + dy * dy);

  if (length === 0) return;

  // Unit direction vector
  const ux = dx / length;
  const uy = dy / length;

  // Perpendicular vector (rotated 90 degrees)
  const px = -uy;
  const py = ux;

  // Half width for offset (using animated width)
  const hw = animWidth / 2;

  // Calculate four corners of the rectangle (edge boundary)
  const corners = [
    { x: startX + px * hw, y: startY + py * hw },
    { x: animEndX + px * hw, y: animEndY + py * hw },
    { x: animEndX - px * hw, y: animEndY - py * hw },
    { x: startX - px * hw, y: startY - py * hw },
  ];

  // Calculate expanded corners for fill (2px bleed outside edges)
  const bleed = 2;
  const hwExpanded = hw + bleed;
  const fillCorners = [
    { x: startX - ux * bleed + px * hwExpanded, y: startY - uy * bleed + py * hwExpanded },
    { x: animEndX + ux * bleed + px * hwExpanded, y: animEndY + uy * bleed + py * hwExpanded },
    { x: animEndX + ux * bleed - px * hwExpanded, y: animEndY + uy * bleed - py * hwExpanded },
    { x: startX - ux * bleed - px * hwExpanded, y: startY - uy * bleed - py * hwExpanded },
  ];

  // Draw the edge rectangle path
  const drawRect = () => {
    ctx.beginPath();
    ctx.moveTo(corners[0].x, corners[0].y);
    ctx.lineTo(corners[1].x, corners[1].y);
    ctx.lineTo(corners[2].x, corners[2].y);
    ctx.lineTo(corners[3].x, corners[3].y);
    ctx.closePath();
  };

  // Draw the expanded fill rectangle path
  const drawFillRect = () => {
    ctx.beginPath();
    ctx.moveTo(fillCorners[0].x, fillCorners[0].y);
    ctx.lineTo(fillCorners[1].x, fillCorners[1].y);
    ctx.lineTo(fillCorners[2].x, fillCorners[2].y);
    ctx.lineTo(fillCorners[3].x, fillCorners[3].y);
    ctx.closePath();
  };

  // Apply global opacity for spawn animation
  ctx.save();
  ctx.globalAlpha = opacity;

  // Calculate pulse position along the line
  // Speed scales with length so pulse crosses full AOE in PULSE_TRAVEL_MS
  const pulseSpeed = length / PULSE_TRAVEL_MS;
  const cycleTime = now % PULSE_CYCLE_MS;
  const pulsePos = cycleTime * pulseSpeed; // Distance from start in pixels

  // Create gradient for fill with pulse effect (using expanded fill rect)
  drawFillRect();
  const gradient = ctx.createLinearGradient(startX, startY, animEndX, animEndY);

  // Convert pulse position to gradient ratio (0-1 along line length)
  const toRatio = (px: number) => Math.max(0, Math.min(1, px / length));

  // Helper to create rgba string
  const rgba = (c: typeof FILL_COLOR_BASE) => `rgba(${c.r}, ${c.g}, ${c.b}, ${c.a})`;
  const baseColor = rgba(FILL_COLOR_BASE);
  const brightColor = rgba(FILL_COLOR_BRIGHT);

  // Calculate pulse gradient stop positions
  const trailingEdge = length * PULSE_TRAILING_RATIO;
  const pulseStart = pulsePos - trailingEdge - PULSE_PEAK_WIDTH / 2;
  const pulsePeakStart = pulsePos - PULSE_PEAK_WIDTH / 2;
  const pulsePeakEnd = pulsePos + PULSE_PEAK_WIDTH / 2;
  const pulseEnd = pulsePos + PULSE_LEADING_EDGE + PULSE_PEAK_WIDTH / 2;

  // Interpolate color based on position in the pulse
  const lerpColor = (t: number) => {
    const r = FILL_COLOR_BASE.r + (FILL_COLOR_BRIGHT.r - FILL_COLOR_BASE.r) * t;
    const g = FILL_COLOR_BASE.g + (FILL_COLOR_BRIGHT.g - FILL_COLOR_BASE.g) * t;
    const b = FILL_COLOR_BASE.b + (FILL_COLOR_BRIGHT.b - FILL_COLOR_BASE.b) * t;
    const a = FILL_COLOR_BASE.a + (FILL_COLOR_BRIGHT.a - FILL_COLOR_BASE.a) * t;
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  };

  // Calculate brightness (0-1) at a given pixel position
  const getBrightness = (pos: number): number => {
    if (pos <= pulseStart || pos >= pulseEnd) return 0;
    if (pos >= pulsePeakStart && pos <= pulsePeakEnd) return 1;
    if (pos < pulsePeakStart) {
      // In trailing edge (before peak)
      return (pos - pulseStart) / (pulsePeakStart - pulseStart);
    } else {
      // In leading edge (after peak)
      return (pulseEnd - pos) / (pulseEnd - pulsePeakEnd);
    }
  };

  // Add gradient stops, handling edge cases where pulse extends beyond line
  gradient.addColorStop(0, lerpColor(getBrightness(0)));

  const stops = [pulseStart, pulsePeakStart, pulsePeakEnd, pulseEnd];
  for (const stop of stops) {
    if (stop > 0 && stop < length) {
      gradient.addColorStop(toRatio(stop), lerpColor(getBrightness(stop)));
    }
  }

  gradient.addColorStop(1, lerpColor(getBrightness(length)));

  ctx.fillStyle = gradient;
  ctx.fill();

  // Glowing edge effect - outer glow layer
  drawRect();
  ctx.shadowColor = AOE_EDGE_GLOW_COLOR;
  ctx.shadowBlur = 6;
  ctx.strokeStyle = AOE_EDGE_GLOW_COLOR;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.shadowBlur = 0; // Reset shadow for core stroke

  // Bright white core edge
  drawRect();
  ctx.strokeStyle = AOE_EDGE_CORE_COLOR;
  ctx.lineWidth = 0.75;
  ctx.stroke();

  ctx.restore();
}

// Clean up tracking for mechanics that no longer exist
export function cleanupLineAoeTracking(activeIds: Set<string>): void {
  for (const id of mechanicFirstSeen.keys()) {
    if (!activeIds.has(id)) {
      mechanicFirstSeen.delete(id);
    }
  }
}
