import { GameState, PlayerState, StatusEffectType, DoodadType, DoodadLayer, DoodadAnchorOffset } from '../../shared/types';

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
  | { type: 'chariot'; x: number; y: number; radius?: number; duration?: number; triggerAt?: number }
  | { type: 'spread'; targetPlayerId: string; radius?: number; duration?: number; triggerAt?: number }
  | { type: 'tether'; endpointA: { type: 'player'; playerId: string } | { type: 'point'; x: number; y: number }; endpointB: { type: 'player'; playerId: string } | { type: 'point'; x: number; y: number }; requiredDistance?: number; duration?: number; triggerAt?: number }
  | { type: 'tower'; x: number; y: number; radius?: number; duration?: number; requiredPlayers?: number; triggerAt?: number }
  | { type: 'radialKnockback'; originX: number; originY: number; delay?: number; knockbackDistance?: number; knockbackDuration?: number; triggerAt?: number }
  | { type: 'linearKnockback'; lineStartX: number; lineStartY: number; lineEndX: number; lineEndY: number; width?: number; delay?: number; knockbackDistance?: number; knockbackDuration?: number; triggerAt?: number }
  | { type: 'lineAoe'; startX: number; startY: number; endX: number; endY: number; width?: number; duration?: number; triggerAt?: number }
  | { type: 'conalAoe'; centerX: number; centerY: number; endpointX: number; endpointY: number; angle?: number; duration?: number; triggerAt?: number }
  | { type: 'stack'; targetPlayerId: string; radius?: number; duration?: number; triggerAt?: number };

/**
 * Parameters for spawning doodads via scripts
 */
export interface DoodadParams {
  type: DoodadType;
  width: number;
  height: number;
  rotation?: number;
  duration: number;
  opacity?: number;
  layer?: DoodadLayer;
  color?: string;
  data?: Record<string, unknown>;
  // Position: either fixed (x, y) or anchored to player
  x?: number;
  y?: number;
  anchorPlayerId?: string;
  anchorOffset?: DoodadAnchorOffset;
}

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

  /**
   * Spawn a visual-only doodad and return its ID
   */
  spawnDoodad(params: DoodadParams): string;

  /**
   * Remove a doodad by ID before its natural expiration
   */
  removeDoodad(id: string): boolean;

  /**
   * Schedule a callback to execute at an absolute time from script start.
   * Does not execute immediately - queues for runTimeline().
   */
  at(time: number, fn: () => void | Promise<void>): void;

  /**
   * Execute all scheduled at() callbacks in time order.
   * Supports dynamic scheduling (at() calls during execution).
   */
  runTimeline(): Promise<void>;
}
