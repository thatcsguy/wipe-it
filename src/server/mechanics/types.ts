import { Player } from '../player';
import { StatusEffectManager } from '../statusEffectManager';
import { MechanicState, Effect, TetherResolutionEvent, TowerResolutionEvent } from '../../shared/types';

// Re-export for convenience
export { MechanicState, Effect };

// Resolution result - tethers and towers return resolution events
export type MechanicResolutionResult = TetherResolutionEvent | TowerResolutionEvent | void;

// Base interface all mechanics implement
export interface BaseMechanic {
  id: string;
  tick(now: number): void;
  isExpired(now: number): boolean;
  resolve(players: Map<string, Player>, statusManager?: StatusEffectManager): MechanicResolutionResult;
  toState(): MechanicState;
}
