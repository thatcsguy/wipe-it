import { StatusEffectState, PLAYER_RADIUS } from '../shared/types';

// Image cache for status effect icons
const iconCache = new Map<string, HTMLImageElement>();

// Load and cache an icon
function getIcon(iconPath: string): HTMLImageElement | null {
  if (iconCache.has(iconPath)) {
    const img = iconCache.get(iconPath)!;
    return img.complete ? img : null;
  }

  const img = new Image();
  img.src = iconPath;
  iconCache.set(iconPath, img);
  return null; // Return null until loaded
}

// Render status effect icons centered in the player's body (circle)
export function renderStatusEffects(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  statuses: StatusEffectState[]
): void {
  if (statuses.length === 0) return;

  // Max size that fits inside the player circle
  const maxSize = PLAYER_RADIUS * 1.2;

  // For multiple statuses, arrange in a small grid centered on the player
  // For now, just show the first status centered
  const status = statuses[0];

  // Try to draw the icon if loaded
  const icon = getIcon(status.iconPath);
  if (icon) {
    // Preserve aspect ratio: scale to fit within maxSize
    const aspectRatio = icon.naturalWidth / icon.naturalHeight;
    let drawWidth: number;
    let drawHeight: number;
    if (aspectRatio > 1) {
      // Wider than tall
      drawWidth = maxSize;
      drawHeight = maxSize / aspectRatio;
    } else {
      // Taller than wide (or square)
      drawHeight = maxSize;
      drawWidth = maxSize * aspectRatio;
    }
    const iconX = x - drawWidth / 2;
    const iconY = y - drawHeight / 2;
    ctx.drawImage(icon, iconX, iconY, drawWidth, drawHeight);
  } else {
    // Draw fallback square while loading
    const iconX = x - maxSize / 2;
    const iconY = y - maxSize / 2;
    ctx.fillStyle = '#ff4444';
    ctx.fillRect(iconX, iconY, maxSize, maxSize);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(iconX, iconY, maxSize, maxSize);
  }
}
