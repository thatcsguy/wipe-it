import { Player } from '../player';
import { StatusEffectManager } from '../statusEffectManager';
import { MechanicState, TetherResolutionEvent, TowerResolutionEvent } from '../../shared/types';
import { MechanicResult } from '../encounters/types';

// Re-export for convenience
export { MechanicState };

// Legacy resolution result - tethers and towers return resolution events for socket.io
export type MechanicResolutionResult = TetherResolutionEvent | TowerResolutionEvent | void;

// Base interface all mechanics implement
export interface BaseMechanic {
  id: string;
  tick(now: number): void;
  isExpired(now: number): boolean;
  resolve(players: Map<string, Player>, statusManager?: StatusEffectManager): MechanicResolutionResult;
  toState(): MechanicState;
  /** Return mechanic-specific result data for encounter scripts */
  getResult?(players: Map<string, Player>): MechanicResult;
}
