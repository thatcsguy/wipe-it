import { DoodadState, DoodadLayer, PlayerState } from '../../shared/types';
import { easeOutCubic } from '../../shared/knockback';
import { renderPortal } from './portal';
import { renderRect } from './rect';
import { renderCircle } from './circle';
import { renderCrystal } from './crystal';
import { renderLimitCutMarker } from './limit-cut-marker';
import { renderMagicOrb } from './magic-orb';

// Position lookup data for doodad rendering (same pattern as mechanics)
export interface DoodadPositionData {
  players: PlayerState[];
  localPlayerId: string | null;
  localPosition: { x: number; y: number } | null;
  interpolatedPositions?: Map<string, { x: number; y: number }>;
}

// Resolve doodad position - either fixed, moving, or anchored to player
export function resolvePosition(
  doodad: DoodadState,
  posData: DoodadPositionData,
  serverTime: number
): { x: number; y: number } | null {
  // Movement animation takes priority
  if (doodad.moveStartTime !== undefined && doodad.moveEndTime !== undefined) {
    if (serverTime >= doodad.moveEndTime) {
      return { x: doodad.moveEndX!, y: doodad.moveEndY! };
    }
    const t = (serverTime - doodad.moveStartTime) / (doodad.moveEndTime - doodad.moveStartTime);
    const easedT = easeOutCubic(Math.max(0, Math.min(1, t)));
    return {
      x: doodad.moveStartX! + (doodad.moveEndX! - doodad.moveStartX!) * easedT,
      y: doodad.moveStartY! + (doodad.moveEndY! - doodad.moveStartY!) * easedT,
    };
  }

  // Fixed position
  if (doodad.x !== undefined && doodad.y !== undefined) {
    return { x: doodad.x, y: doodad.y };
  }

  // Player-anchored position
  if (doodad.anchorPlayerId) {
    const offset = doodad.anchorOffset ?? { x: 0, y: 0 };

    // Local player with prediction
    if (posData.localPlayerId === doodad.anchorPlayerId && posData.localPosition) {
      return {
        x: posData.localPosition.x + offset.x,
        y: posData.localPosition.y + offset.y,
      };
    }

    // Interpolated position
    const interpolated = posData.interpolatedPositions?.get(doodad.anchorPlayerId);
    if (interpolated) {
      return {
        x: interpolated.x + offset.x,
        y: interpolated.y + offset.y,
      };
    }

    // Server position fallback
    const player = posData.players.find(p => p.id === doodad.anchorPlayerId);
    if (player) {
      return {
        x: player.x + offset.x,
        y: player.y + offset.y,
      };
    }

    return null;
  }

  return null;
}

// Render all doodads for a specific layer
export function renderDoodads(
  ctx: CanvasRenderingContext2D,
  doodads: DoodadState[],
  layer: DoodadLayer,
  serverTime: number,
  posData: DoodadPositionData
): void {
  // Filter to requested layer
  const layerDoodads = doodads.filter(d => d.layer === layer);

  for (const doodad of layerDoodads) {
    // Resolve position
    const pos = resolvePosition(doodad, posData, serverTime);
    if (!pos) continue;

    // Dispatch to type-specific renderer
    switch (doodad.type) {
      case 'portal':
        renderPortal(ctx, doodad, pos, serverTime);
        break;
      case 'rect':
        renderRect(ctx, doodad, pos, serverTime);
        break;
      case 'circle':
        renderCircle(ctx, doodad, pos, serverTime);
        break;
      case 'crystal':
        renderCrystal(ctx, doodad, pos, serverTime);
        break;
      case 'limit-cut-marker':
        renderLimitCutMarker(ctx, doodad, pos, serverTime);
        break;
      case 'magic-orb':
        renderMagicOrb(ctx, doodad, pos, serverTime);
        break;
    }
  }
}

// Export for testing
(window as any).__doodadsTest = {
  renderDoodads,
  resolvePosition,
};
