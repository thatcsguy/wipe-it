// Tower failure explosion animation
// Expanding ring from center outward when tower fails

interface Explosion {
  centerX: number;
  centerY: number;
  startTime: number;
}

// Active explosions
const explosions: Explosion[] = [];

// Animation constants
const EXPLOSION_DURATION = 500; // ms
const EXPLOSION_MAX_RADIUS = 1000; // px (arena diagonal)
const EXPLOSION_STROKE_WIDTH = 20;

// Add a new explosion at the given position
export function addTowerExplosion(x: number, y: number, serverTime: number): void {
  explosions.push({
    centerX: x,
    centerY: y,
    startTime: serverTime
  });
}

// Render all active explosions
export function renderTowerExplosions(
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

    // Calculate progress 0-1
    const progress = elapsed / EXPLOSION_DURATION;

    // Radius expands linearly
    const radius = progress * EXPLOSION_MAX_RADIUS;

    // Alpha fades as ring expands (1 -> 0)
    const alpha = 1 - progress;

    // Draw expanding ring - red/orange gradient effect
    ctx.beginPath();
    ctx.arc(explosion.centerX, explosion.centerY, radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, ${Math.floor(100 * (1 - progress))}, 0, ${alpha})`;
    ctx.lineWidth = EXPLOSION_STROKE_WIDTH;
    ctx.stroke();
  }
}

// Clear all explosions (for cleanup)
export function clearExplosions(): void {
  explosions.length = 0;
}
