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

// Render status effect icons centered above a player
export function renderStatusEffects(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  statuses: StatusEffectState[]
): void {
  if (statuses.length === 0) return;

  const iconSize = 24;
  const spacing = 4;
  const totalWidth = statuses.length * iconSize + (statuses.length - 1) * spacing;

  // Position icons above player name (name is at y - PLAYER_RADIUS - 10)
  const startX = x - totalWidth / 2;
  const iconY = y - PLAYER_RADIUS - 28; // Above the name

  for (let i = 0; i < statuses.length; i++) {
    const status = statuses[i];
    const iconX = startX + i * (iconSize + spacing);

    // Try to draw the icon if loaded
    const icon = getIcon(status.iconPath);
    if (icon) {
      ctx.drawImage(icon, iconX, iconY, iconSize, iconSize);
    } else {
      // Draw fallback colored square while loading
      ctx.fillStyle = '#ff4444'; // Red for vulnerability
      ctx.fillRect(iconX, iconY, iconSize, iconSize);
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.strokeRect(iconX, iconY, iconSize, iconSize);
    }
  }
}
