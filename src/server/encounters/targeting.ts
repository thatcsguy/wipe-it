import { GameState, PlayerState } from '../../shared/types';
import { Context, Selector } from './types';

/**
 * Returns all living players (hp > 0)
 */
export function all(): Selector {
  return (state: GameState, _ctx: Context): PlayerState[] => {
    return state.players.filter(p => p.hp > 0);
  };
}

/**
 * Returns n random players from living players
 * If n > number of living players, returns all living players
 */
export function random(n: number): Selector {
  return (state: GameState, ctx: Context): PlayerState[] => {
    const living = all()(state, ctx);
    if (n >= living.length) {
      return living;
    }
    // Fisher-Yates shuffle and take first n
    const shuffled = [...living];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, n);
  };
}

/**
 * Returns the single player closest to the given point
 * Uses Euclidean distance
 */
export function closest(point: { x: number; y: number }): Selector {
  return (state: GameState, ctx: Context): PlayerState[] => {
    const living = all()(state, ctx);
    if (living.length === 0) {
      return [];
    }
    let nearestPlayer = living[0];
    let nearestDist = Infinity;
    for (const p of living) {
      const dx = p.x - point.x;
      const dy = p.y - point.y;
      const dist = dx * dx + dy * dy; // squared distance is fine for comparison
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestPlayer = p;
      }
    }
    return [nearestPlayer];
  };
}

/**
 * Returns the single player furthest from the given point
 * Uses Euclidean distance
 */
export function furthest(point: { x: number; y: number }): Selector {
  return (state: GameState, ctx: Context): PlayerState[] => {
    const living = all()(state, ctx);
    if (living.length === 0) {
      return [];
    }
    let farthestPlayer = living[0];
    let farthestDist = -Infinity;
    for (const p of living) {
      const dx = p.x - point.x;
      const dy = p.y - point.y;
      const dist = dx * dx + dy * dy;
      if (dist > farthestDist) {
        farthestDist = dist;
        farthestPlayer = p;
      }
    }
    return [farthestPlayer];
  };
}

/**
 * Returns n players closest to the given point, sorted by distance (ascending)
 * If n > number of living players, returns all living players
 */
export function nClosest(n: number, point: { x: number; y: number }): Selector {
  return (state: GameState, ctx: Context): PlayerState[] => {
    const living = all()(state, ctx);
    if (living.length === 0) {
      return [];
    }
    // Sort by distance ascending
    const sorted = [...living].sort((a, b) => {
      const distA = (a.x - point.x) ** 2 + (a.y - point.y) ** 2;
      const distB = (b.x - point.x) ** 2 + (b.y - point.y) ** 2;
      return distA - distB;
    });
    return sorted.slice(0, n);
  };
}

/**
 * Returns n players furthest from the given point, sorted by distance (descending)
 * If n > number of living players, returns all living players
 */
export function nFurthest(n: number, point: { x: number; y: number }): Selector {
  return (state: GameState, ctx: Context): PlayerState[] => {
    const living = all()(state, ctx);
    if (living.length === 0) {
      return [];
    }
    // Sort by distance descending
    const sorted = [...living].sort((a, b) => {
      const distA = (a.x - point.x) ** 2 + (a.y - point.y) ** 2;
      const distB = (b.x - point.x) ** 2 + (b.y - point.y) ** 2;
      return distB - distA;
    });
    return sorted.slice(0, n);
  };
}

/**
 * Returns living players that have the specified status effect
 */
export function withStatus(effect: string): Selector {
  return (state: GameState, ctx: Context): PlayerState[] => {
    const living = all()(state, ctx);
    return living.filter(p => p.statusEffects.some(s => s.type === effect));
  };
}

/**
 * Returns living players that do not have the specified status effect
 */
export function withoutStatus(effect: string): Selector {
  return (state: GameState, ctx: Context): PlayerState[] => {
    const living = all()(state, ctx);
    return living.filter(p => !p.statusEffects.some(s => s.type === effect));
  };
}
