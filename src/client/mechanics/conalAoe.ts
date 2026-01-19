import { ConalAoeMechanicState } from '../../shared/types';
import { AOE_EDGE_GLOW_COLOR, AOE_EDGE_CORE_COLOR } from './shared';

// Track when each mechanic was first seen for spawn animation
const mechanicFirstSeen = new Map<string, number>();

// Animation constants
const SPAWN_ANIM_DURATION = 200; // ms
const SPAWN_RADIUS_START = 0.1;  // Start at 10% of final radius

// Pulse animation constants
const PULSE_TRAVEL_MS = 500;      // Time for pulse to cross full AOE
const PULSE_CYCLE_MS = 1000;      // Pulse repeats every 1000ms
const PULSE_LEADING_EDGE = 20;    // Front of pulse, in direction of travel (px)
const PULSE_PEAK_WIDTH = 10;      // Width of brightest zone (px)
const PULSE_TRAILING_RATIO = 0.5; // Trailing edge is 50% of AOE distance

// Colors for pulse effect
const FILL_COLOR_BASE = { r: 255, g: 80, b: 40, a: 0.35 };
const FILL_COLOR_BRIGHT = { r: 255, g: 160, b: 60, a: 0.55 };

// Render a conal AOE mechanic - pie slice/sector from center point
export function renderConalAoe(
  ctx: CanvasRenderingContext2D,
  mechanic: ConalAoeMechanicState
): void {
  const { centerX, centerY, endpointX, endpointY, angle, id } = mechanic;

  // Calculate radius as distance from center to endpoint
  const dx = endpointX - centerX;
  const dy = endpointY - centerY;
  const radius = Math.sqrt(dx * dx + dy * dy);

  if (radius === 0) return;

  // Direction angle from center to endpoint
  const direction = Math.atan2(dy, dx);

  // Start and end angles for the arc (centered on direction)
  const startAngle = direction - angle / 2;
  const endAngle = direction + angle / 2;

  // Track first-seen time for animation
  const now = performance.now();
  if (!mechanicFirstSeen.has(id)) {
    mechanicFirstSeen.set(id, now);
  }
  const firstSeen = mechanicFirstSeen.get(id)!;
  const elapsed = now - firstSeen;

  // Calculate spawn animation progress (0 to 1)
  const spawnProgress = Math.min(elapsed / SPAWN_ANIM_DURATION, 1);

  // Interpolate radius multiplier and opacity (angle stays fixed)
  const radiusMult = SPAWN_RADIUS_START + (1 - SPAWN_RADIUS_START) * spawnProgress;
  const opacity = spawnProgress;

  // Apply animated radius
  const animRadius = radius * radiusMult;

  if (animRadius === 0) return;

  // Calculate pulse position (radiating outward from center)
  // Speed scales with radius so pulse crosses full AOE in PULSE_TRAVEL_MS
  const pulseSpeed = animRadius / PULSE_TRAVEL_MS;
  const cycleTime = now % PULSE_CYCLE_MS;
  const pulsePos = cycleTime * pulseSpeed; // Distance from center in pixels

  // Pulse gradient stop positions (radial distance from center)
  const trailingEdge = animRadius * PULSE_TRAILING_RATIO;
  const pulseStart = pulsePos - trailingEdge - PULSE_PEAK_WIDTH / 2;
  const pulsePeakStart = pulsePos - PULSE_PEAK_WIDTH / 2;
  const pulsePeakEnd = pulsePos + PULSE_PEAK_WIDTH / 2;
  const pulseEnd = pulsePos + PULSE_LEADING_EDGE + PULSE_PEAK_WIDTH / 2;

  // Calculate brightness (0-1) at a given radial distance
  const getBrightness = (dist: number): number => {
    if (dist <= pulseStart || dist >= pulseEnd) return 0;
    if (dist >= pulsePeakStart && dist <= pulsePeakEnd) return 1;
    if (dist < pulsePeakStart) {
      // In trailing edge (before peak)
      return (dist - pulseStart) / (pulsePeakStart - pulseStart);
    } else {
      // In leading edge (after peak)
      return (pulseEnd - dist) / (pulseEnd - pulsePeakEnd);
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

  // Create radial gradient for fill with pulse effect
  const bleed = 2;
  const fillRadius = animRadius + bleed;
  const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, fillRadius);

  // Convert radial distance to gradient ratio (0-1)
  const toRatio = (dist: number) => Math.max(0, Math.min(1, dist / fillRadius));

  // Add gradient stops
  gradient.addColorStop(0, lerpColor(getBrightness(0)));

  const stops = [pulseStart, pulsePeakStart, pulsePeakEnd, pulseEnd];
  for (const stop of stops) {
    if (stop > 0 && stop < fillRadius) {
      gradient.addColorStop(toRatio(stop), lerpColor(getBrightness(stop)));
    }
  }

  gradient.addColorStop(1, lerpColor(getBrightness(fillRadius)));

  // Fill sector with gradient (expanded for 2px bleed)
  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.arc(centerX, centerY, fillRadius, startAngle, endAngle);
  ctx.closePath();
  ctx.fillStyle = gradient;
  ctx.fill();

  // Draw the sector path (edge boundary at actual radius)
  const drawSector = () => {
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, animRadius, startAngle, endAngle);
    ctx.closePath();
  };

  // Glowing edge effect - outer glow layer
  drawSector();
  ctx.shadowColor = AOE_EDGE_GLOW_COLOR;
  ctx.shadowBlur = 6;
  ctx.strokeStyle = AOE_EDGE_GLOW_COLOR;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Bright white core edge
  drawSector();
  ctx.strokeStyle = AOE_EDGE_CORE_COLOR;
  ctx.lineWidth = 0.75;
  ctx.stroke();

  ctx.restore();
}

// Clean up tracking for mechanics that no longer exist
export function cleanupConalAoeTracking(activeIds: Set<string>): void {
  for (const id of mechanicFirstSeen.keys()) {
    if (!activeIds.has(id)) {
      mechanicFirstSeen.delete(id);
    }
  }
}
