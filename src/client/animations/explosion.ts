// Layered explosion animation
// Inner flash + particle burst + outer ring

interface Particle {
  angle: number;      // direction in radians
  speed: number;      // pixels per second
  size: number;       // initial size
  hue: number;        // color variation (0-60 for red-yellow range)
}

interface Explosion {
  centerX: number;
  centerY: number;
  startTime: number;
  particles: Particle[];
}

// Active explosions
const explosions: Explosion[] = [];

// Animation constants
const EXPLOSION_DURATION = 500; // ms

// Layer 1: Inner flash
const FLASH_DURATION = 150; // ms - quick bright flash
const FLASH_MAX_RADIUS = 120; // bigger initial impact

// Layer 2: Particle burst
const PARTICLE_COUNT = 36;
const PARTICLE_MIN_SPEED = 800; // px/sec - fast enough to reach arena edges
const PARTICLE_MAX_SPEED = 1800;
const PARTICLE_MIN_SIZE = 5;
const PARTICLE_MAX_SIZE = 14;

// Layer 3: Outer ring - covers entire arena
const RING_MAX_RADIUS = 1200; // large enough to engulf full arena
const RING_STROKE_WIDTH = 24; // thicker for more presence

// Generate particles with random properties
function generateParticles(): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push({
      angle: (Math.PI * 2 * i) / PARTICLE_COUNT + (Math.random() - 0.5) * 0.3,
      speed: PARTICLE_MIN_SPEED + Math.random() * (PARTICLE_MAX_SPEED - PARTICLE_MIN_SPEED),
      size: PARTICLE_MIN_SIZE + Math.random() * (PARTICLE_MAX_SIZE - PARTICLE_MIN_SIZE),
      hue: Math.random() * 60, // 0 = red, 60 = yellow
    });
  }
  return particles;
}

// Add a new explosion at the given position
export function addExplosion(x: number, y: number, serverTime: number): void {
  explosions.push({
    centerX: x,
    centerY: y,
    startTime: serverTime,
    particles: generateParticles(),
  });
}

// Render all active explosions
export function renderExplosions(
  ctx: CanvasRenderingContext2D,
  serverTime: number
): void {
  // Process explosions in reverse so we can splice while iterating
  for (let i = explosions.length - 1; i >= 0; i--) {
    const explosion = explosions[i];
    const elapsed = serverTime - explosion.startTime;

    // Remove expired explosions
    if (elapsed >= EXPLOSION_DURATION) {
      explosions.splice(i, 1);
      continue;
    }

    const progress = elapsed / EXPLOSION_DURATION; // 0 to 1

    // === Layer 1: Inner Flash ===
    if (elapsed < FLASH_DURATION) {
      const flashProgress = elapsed / FLASH_DURATION;
      // Ease out - starts big and bright, shrinks and fades
      const flashRadius = FLASH_MAX_RADIUS * (1 - flashProgress * 0.5);
      const flashAlpha = 1 - flashProgress;

      // Radial gradient from white center to orange edge
      const gradient = ctx.createRadialGradient(
        explosion.centerX, explosion.centerY, 0,
        explosion.centerX, explosion.centerY, flashRadius
      );
      gradient.addColorStop(0, `rgba(255, 255, 255, ${flashAlpha})`);
      gradient.addColorStop(0.3, `rgba(255, 200, 50, ${flashAlpha})`);
      gradient.addColorStop(1, `rgba(255, 80, 0, ${flashAlpha * 0.5})`);

      ctx.beginPath();
      ctx.arc(explosion.centerX, explosion.centerY, flashRadius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();
    }

    // === Layer 2: Particle Burst ===
    const particleAlpha = 1 - progress;
    const elapsedSec = elapsed / 1000;

    for (const particle of explosion.particles) {
      // Calculate particle position
      const distance = particle.speed * elapsedSec;
      const px = explosion.centerX + Math.cos(particle.angle) * distance;
      const py = explosion.centerY + Math.sin(particle.angle) * distance;

      // Particles shrink as they travel
      const currentSize = particle.size * (1 - progress * 0.7);

      // Color: red to yellow based on particle's hue
      const r = 255;
      const g = Math.floor(particle.hue + 80 * (1 - progress)); // gets more orange as it fades
      const b = 0;

      ctx.beginPath();
      ctx.arc(px, py, currentSize, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${particleAlpha})`;
      ctx.fill();
    }

    // === Layer 3: Outer Ring ===
    // Eased expansion - fast start, slows down
    const ringProgress = 1 - Math.pow(1 - progress, 2); // ease out quad
    const ringRadius = ringProgress * RING_MAX_RADIUS;
    const ringAlpha = (1 - progress) * 0.8;

    // Draw main ring
    ctx.beginPath();
    ctx.arc(explosion.centerX, explosion.centerY, ringRadius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 60, 0, ${ringAlpha})`;
    ctx.lineWidth = RING_STROKE_WIDTH;
    ctx.stroke();

    // Inner glow ring (slightly smaller, brighter)
    if (ringRadius > 10) {
      ctx.beginPath();
      ctx.arc(explosion.centerX, explosion.centerY, ringRadius - 4, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 150, 50, ${ringAlpha * 0.6})`;
      ctx.lineWidth = 3;
      ctx.stroke();
    }
  }
}

// Clear all explosions (for cleanup)
export function clearExplosions(): void {
  explosions.length = 0;
}
