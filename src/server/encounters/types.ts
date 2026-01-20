import { GameState, PlayerState, StatusEffectType } from '../../shared/types';

/**
 * Context passed to scripts for storing arbitrary data between phases
 */
export interface Context {
  [key: string]: unknown;
}

/**
 * Selector function that filters/selects players from game state
 */
export type Selector = (state: GameState, ctx: Context) => PlayerState[];

/**
 * Result returned when a mechanic resolves
 */
export interface MechanicResult {
  mechanicId: string;
  type: string;
  data: unknown;
}

/**
 * Script function that defines encounter logic
 */
export type Script = (runner: ScriptRunner, ctx: Context) => Promise<void>;

/**
 * Parameters for spawning mechanics - discriminated union by type
 */
export type MechanicParams =
  | { type: 'chariot'; x: number; y: number; radius?: number; duration?: number }
  | { type: 'spread'; targetPlayerId: string; radius?: number; duration?: number }
  | { type: 'tether'; endpointA: { type: 'player'; playerId: string } | { type: 'point'; x: number; y: number }; endpointB: { type: 'player'; playerId: string } | { type: 'point'; x: number; y: number }; requiredDistance?: number; duration?: number }
  | { type: 'tower'; x: number; y: number; radius?: number; duration?: number; requiredPlayers?: number }
  | { type: 'radialKnockback'; originX: number; originY: number; delay?: number; knockbackDistance?: number; knockbackDuration?: number }
  | { type: 'linearKnockback'; lineStartX: number; lineStartY: number; lineEndX: number; lineEndY: number; delay?: number; knockbackDistance?: number; knockbackDuration?: number }
  | { type: 'lineAoe'; startX: number; startY: number; endX: number; endY: number; width?: number; duration?: number }
  | { type: 'conalAoe'; centerX: number; centerY: number; endpointX: number; endpointY: number; angle?: number; duration?: number };

/**
 * ScriptRunner interface - the API available to encounter scripts
 */
export interface ScriptRunner {
  /**
   * Spawn a mechanic and return its ID
   */
  spawn(mechanic: MechanicParams): string;

  /**
   * Wait for a specified number of milliseconds
   */
  wait(ms: number): Promise<void>;

  /**
   * Get the current game state
   */
  getState(): GameState;

  /**
   * Select players using a selector function
   */
  select(selector: Selector): PlayerState[];

  /**
   * Wait for a mechanic to resolve and return its result
   */
  waitForResolve(mechanicId: string): Promise<MechanicResult>;

  /**
   * Run a sub-script
   */
  run(script: Script): Promise<void>;

  /**
   * Apply a status effect to a player
   */
  applyStatus(playerId: string, statusType: StatusEffectType, duration: number): void;

  /**
   * Deal damage to a player
   */
  damage(playerId: string, amount: number): void;
}
