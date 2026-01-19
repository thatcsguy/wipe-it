import { Player } from '../player';
import { StatusEffectManager } from '../statusEffectManager';
import { MechanicState, Effect } from '../../shared/types';

// Re-export for convenience
export { MechanicState, Effect };

// Base interface all mechanics implement
export interface BaseMechanic {
  id: string;
  tick(now: number): void;
  isExpired(now: number): boolean;
  resolve(players: Map<string, Player>, statusManager?: StatusEffectManager): void;
  toState(): MechanicState;
}
