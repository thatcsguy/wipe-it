import { Player } from '../player';

// Effect applied when mechanic resolves
export interface Effect {
  type: 'damage';
  amount: number;
}

// State sent to clients for rendering
export interface MechanicState {
  id: string;
  type: string;
  startTime: number;
  endTime: number;
  x: number;
  y: number;
  radius: number;
}

// Base interface all mechanics implement
export interface BaseMechanic {
  id: string;
  tick(now: number): void;
  isExpired(now: number): boolean;
  resolve(players: Map<string, Player>): void;
  toState(): MechanicState;
}
