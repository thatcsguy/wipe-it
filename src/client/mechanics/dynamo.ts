import { DynamoMechanicState } from '../../shared/types';
import { AOE_EDGE_GLOW_COLOR, AOE_EDGE_CORE_COLOR } from './shared';

// Track when each mechanic was first seen for spawn animation
const mechanicFirstSeen = new Map<string, number>();

// Animation constants
const SPAWN_ANIM_DURATION = 300; // ms - slightly longer for contracting effect

// Pulse animation constants - outside-in shrinking ring
const PULSE_TRAVEL_MS = 500;      // Time for pulse to cross full AOE
const PULSE_CYCLE_MS = 1000;      // Pulse repeats every 1000ms
const PULSE_LEADING_EDGE = 20;    // Front of pulse, in direction of travel (px)
const PULSE_PEAK_WIDTH = 10;      // Width of brightest zone (px)
const PULSE_TRAILING_RATIO = 0.5; // Trailing edge is 50% of AOE distance

// Colors for pulse effect
const FILL_COLOR_BASE = { r: 255, g: 80, b: 40, a: 0.35 };
const FILL_COLOR_BRIGHT = { r: 255, g: 160, b: 60, a: 0.55 };

// Render a dynamo mechanic - donut AOE (safe inside inner radius)
export function renderDynamo(
  ctx: CanvasRenderingContext2D,
  mechanic: DynamoMechanicState,
  _serverTime: number
): void {
  const { x, y, innerRadius, outerRadius, id } = mechanic;

  // Track first-seen time for animation
  const now = performance.now();
  if (!mechanicFirstSeen.has(id)) {
    mechanicFirstSeen.set(id, now);
  }
  const firstSeen = mechanicFirstSeen.get(id)!;
  const elapsed = now - firstSeen;

  // Calculate spawn animation progress (0 to 1)
  const spawnProgress = Math.min(elapsed / SPAWN_ANIM_DURATION, 1);

  // Spawn animation: outer radius at full size, inner radius contracts from outer to inner
  // This creates a "closing in" effect where the safe zone shrinks
  const opacity = spawnProgress;
  const animOuterRadius = outerRadius; // Outer ring appears at full size immediately
  // Inner radius starts at outer radius and contracts to actual inner radius
  const animInnerRadius = outerRadius - (outerRadius - innerRadius) * spawnProgress;

  if (animOuterRadius === 0) return;

  // Donut width for pulse calculations
  const donutWidth = animOuterRadius - animInnerRadius;
  if (donutWidth <= 0) return;

  // Calculate pulse position (shrinking inward from outer edge)
  // Speed scales with donut width so pulse crosses full AOE in PULSE_TRAVEL_MS
  const pulseSpeed = donutWidth / PULSE_TRAVEL_MS;
  const cycleTime = now % PULSE_CYCLE_MS;
  // Pulse starts at outer edge (0) and moves toward inner edge (donutWidth)
  const pulseDistFromOuter = cycleTime * pulseSpeed;

  // Pulse gradient stop positions (distance from outer edge toward inner)
  const trailingEdge = donutWidth * PULSE_TRAILING_RATIO;
  const pulseStart = pulseDistFromOuter - trailingEdge - PULSE_PEAK_WIDTH / 2;
  const pulsePeakStart = pulseDistFromOuter - PULSE_PEAK_WIDTH / 2;
  const pulsePeakEnd = pulseDistFromOuter + PULSE_PEAK_WIDTH / 2;
  const pulseEnd = pulseDistFromOuter + PULSE_LEADING_EDGE + PULSE_PEAK_WIDTH / 2;

  // Calculate brightness (0-1) at a given distance from outer edge
  const getBrightness = (distFromOuter: number): number => {
    if (distFromOuter <= pulseStart || distFromOuter >= pulseEnd) return 0;
    if (distFromOuter >= pulsePeakStart && distFromOuter <= pulsePeakEnd) return 1;
    if (distFromOuter < pulsePeakStart) {
      // In trailing edge (before peak)
      return (distFromOuter - pulseStart) / (pulsePeakStart - pulseStart);
    } else {
      // In leading edge (after peak)
      return (pulseEnd - distFromOuter) / (pulseEnd - pulsePeakEnd);
    }
  };

  // Interpolate color based on brightness
  const lerpColor = (t: number) => {
    const r = FILL_COLOR_BASE.r + (FILL_COLOR_BRIGHT.r - FILL_COLOR_BASE.r) * t;
    const g = FILL_COLOR_BASE.g + (FILL_COLOR_BRIGHT.g - FILL_COLOR_BASE.g) * t;
    const b = FILL_COLOR_BASE.b + (FILL_COLOR_BRIGHT.b - FILL_COLOR_BASE.b) * t;
    const a = FILL_COLOR_BASE.a + (FILL_COLOR_BRIGHT.a - FILL_COLOR_BASE.a) * t;
    return `rgba(${r}, ${g}, ${b}, ${a})`;
  };

  // Apply global opacity for spawn animation
  ctx.save();
  ctx.globalAlpha = opacity;

  // Create radial gradient for the donut fill with pulse effect
  // Gradient goes from inner radius to outer radius (but we compute based on distance from outer)
  const bleed = 2;
  const fillInnerRadius = Math.max(0, animInnerRadius - bleed);
  const fillOuterRadius = animOuterRadius + bleed;

  // Create gradient from center outward
  const gradient = ctx.createRadialGradient(x, y, fillInnerRadius, x, y, fillOuterRadius);

  // Convert radial distance from center to gradient ratio (0 = inner edge, 1 = outer edge)
  const toRatio = (radiusFromCenter: number) => {
    const range = fillOuterRadius - fillInnerRadius;
    if (range === 0) return 0;
    return Math.max(0, Math.min(1, (radiusFromCenter - fillInnerRadius) / range));
  };

  // Convert distance from outer edge to radius from center
  const fromOuterToRadius = (distFromOuter: number) => animOuterRadius - distFromOuter;

  // Add gradient stops - we need to map pulse positions to radial positions
  // Inner edge of donut is at distFromOuter = donutWidth
  // Outer edge of donut is at distFromOuter = 0

  // Add stops for the pulse wave
  const stops = [0, pulseStart, pulsePeakStart, pulsePeakEnd, pulseEnd, donutWidth];
  const sortedStops = [...new Set(stops)].sort((a, b) => a - b);

  for (const distFromOuter of sortedStops) {
    if (distFromOuter >= 0 && distFromOuter <= donutWidth) {
      const radiusFromCenter = fromOuterToRadius(distFromOuter);
      const ratio = toRatio(radiusFromCenter);
      if (ratio >= 0 && ratio <= 1) {
        gradient.addColorStop(ratio, lerpColor(getBrightness(distFromOuter)));
      }
    }
  }

  // Draw the donut shape using clip path (avoids affecting other mechanics)
  // Create donut clip path: outer circle clockwise, inner circle counter-clockwise
  ctx.beginPath();
  ctx.arc(x, y, fillOuterRadius, 0, Math.PI * 2, false); // outer clockwise
  ctx.arc(x, y, fillInnerRadius, 0, Math.PI * 2, true);  // inner counter-clockwise (hole)
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  // Draw outer edge glow
  ctx.beginPath();
  ctx.arc(x, y, animOuterRadius, 0, Math.PI * 2);
  ctx.shadowColor = AOE_EDGE_GLOW_COLOR;
  ctx.shadowBlur = 6;
  ctx.strokeStyle = AOE_EDGE_GLOW_COLOR;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Draw outer edge white core
  ctx.beginPath();
  ctx.arc(x, y, animOuterRadius, 0, Math.PI * 2);
  ctx.strokeStyle = AOE_EDGE_CORE_COLOR;
  ctx.lineWidth = 0.75;
  ctx.stroke();

  // Draw inner edge glow
  ctx.beginPath();
  ctx.arc(x, y, animInnerRadius, 0, Math.PI * 2);
  ctx.shadowColor = AOE_EDGE_GLOW_COLOR;
  ctx.shadowBlur = 6;
  ctx.strokeStyle = AOE_EDGE_GLOW_COLOR;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Draw inner edge white core
  ctx.beginPath();
  ctx.arc(x, y, animInnerRadius, 0, Math.PI * 2);
  ctx.strokeStyle = AOE_EDGE_CORE_COLOR;
  ctx.lineWidth = 0.75;
  ctx.stroke();

  ctx.restore();
}

// Clean up tracking for mechanics that no longer exist
export function cleanupDynamoTracking(activeIds: Set<string>): void {
  for (const id of mechanicFirstSeen.keys()) {
    if (!activeIds.has(id)) {
      mechanicFirstSeen.delete(id);
    }
  }
}
