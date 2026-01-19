import { MechanicState } from '../../shared/types';
import { renderChariot } from './chariot';
import { renderSpread } from './spread';
import { renderTether } from './tether';
import { renderTower } from './tower';
import { renderRadialKnockback } from './radialKnockback';
import { renderLinearKnockback } from './linearKnockback';
import { renderLineAoe } from './lineAoe';
import { renderConalAoe } from './conalAoe';
export { PlayerPositionData } from './shared';
import type { PlayerPositionData } from './shared';

// Render all mechanics
export function renderMechanics(
  ctx: CanvasRenderingContext2D,
  mechanics: MechanicState[],
  serverTime: number,
  posData?: PlayerPositionData
): void {
  for (const mechanic of mechanics) {
    if (mechanic.type === 'chariot') {
      renderChariot(ctx, mechanic, serverTime);
    } else if (mechanic.type === 'spread' && posData) {
      renderSpread(ctx, mechanic, serverTime, posData);
    } else if (mechanic.type === 'tether' && posData) {
      renderTether(ctx, mechanic, posData);
    } else if (mechanic.type === 'tower') {
      renderTower(ctx, mechanic, serverTime);
    } else if (mechanic.type === 'radialKnockback') {
      renderRadialKnockback(ctx, mechanic, serverTime);
    } else if (mechanic.type === 'linearKnockback') {
      renderLinearKnockback(ctx, mechanic, serverTime);
    } else if (mechanic.type === 'lineAoe') {
      renderLineAoe(ctx, mechanic);
    } else if (mechanic.type === 'conalAoe') {
      renderConalAoe(ctx, mechanic);
    }
  }
}

// Export for testing
(window as any).__mechanicsTest = {
  renderMechanics,
};
