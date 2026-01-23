import { MechanicState } from '../../shared/types';
import { renderChariot, cleanupChariotTracking } from './chariot';
import { renderSpread } from './spread';
import { renderStack } from './stack';
import { renderTether } from './tether';
import { renderTower } from './tower';
import { renderRadialKnockback } from './radialKnockback';
import { renderLinearKnockback } from './linearKnockback';
import { renderLineAoe, cleanupLineAoeTracking } from './lineAoe';
import { renderConalAoe, cleanupConalAoeTracking } from './conalAoe';
import { renderDynamo, cleanupDynamoTracking } from './dynamo';
export { PlayerPositionData } from './shared';
import type { PlayerPositionData } from './shared';

// Render all mechanics
export function renderMechanics(
  ctx: CanvasRenderingContext2D,
  mechanics: MechanicState[],
  serverTime: number,
  posData?: PlayerPositionData
): void {
  // Collect active mechanic IDs for cleanup
  const activeChariotIds = new Set<string>();
  const activeLineAoeIds = new Set<string>();
  const activeConalAoeIds = new Set<string>();
  const activeDynamoIds = new Set<string>();

  for (const mechanic of mechanics) {
    if (mechanic.type === 'chariot') {
      activeChariotIds.add(mechanic.id);
      renderChariot(ctx, mechanic, serverTime);
    } else if (mechanic.type === 'spread' && posData) {
      renderSpread(ctx, mechanic, serverTime, posData);
    } else if (mechanic.type === 'stack' && posData) {
      renderStack(ctx, mechanic, serverTime, posData);
    } else if (mechanic.type === 'tether' && posData) {
      renderTether(ctx, mechanic, posData);
    } else if (mechanic.type === 'tower') {
      renderTower(ctx, mechanic, serverTime);
    } else if (mechanic.type === 'radialKnockback') {
      renderRadialKnockback(ctx, mechanic, serverTime);
    } else if (mechanic.type === 'linearKnockback') {
      renderLinearKnockback(ctx, mechanic, serverTime);
    } else if (mechanic.type === 'lineAoe') {
      activeLineAoeIds.add(mechanic.id);
      renderLineAoe(ctx, mechanic);
    } else if (mechanic.type === 'conalAoe') {
      activeConalAoeIds.add(mechanic.id);
      renderConalAoe(ctx, mechanic);
    } else if (mechanic.type === 'dynamo') {
      activeDynamoIds.add(mechanic.id);
      renderDynamo(ctx, mechanic, serverTime);
    }
  }

  // Clean up tracking for removed mechanics
  cleanupChariotTracking(activeChariotIds);
  cleanupLineAoeTracking(activeLineAoeIds);
  cleanupConalAoeTracking(activeConalAoeIds);
  cleanupDynamoTracking(activeDynamoIds);
}

// Export for testing
(window as any).__mechanicsTest = {
  renderMechanics,
};
