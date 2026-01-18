import { Player } from '../player';
import { MechanicState } from '../../shared/types';

// Effect applied when mechanic resolves
export interface Effect {
  type: 'damage';
  amount: number;
}

// Re-export for convenience
export { MechanicState };

// Base interface all mechanics implement
export interface BaseMechanic {
  id: string;
  tick(now: number): void;
  isExpired(now: number): boolean;
  resolve(players: Map<string, Player>): void;
  toState(): MechanicState;
}
