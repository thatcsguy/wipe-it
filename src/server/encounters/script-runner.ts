import { Game } from '../game';
import { GameState, PlayerState, StatusEffectType, ARENA_WIDTH, ARENA_HEIGHT } from '../../shared/types';
import { Context, DoodadParams, MechanicParams, MechanicResult, Script, ScriptRunner, Selector } from './types';
import { createContext } from './context';
import { StatusEffect } from '../statusEffect';

// Default values for mechanics (mirroring admin handlers)
const DEFAULTS = {
  chariot: { radius: ARENA_HEIGHT * 0.2, duration: 3000 },
  spread: { radius: ARENA_HEIGHT * 0.15, duration: 3000 },
  tether: { requiredDistance: ARENA_WIDTH * 0.75, duration: 3000 },
  tower: { radius: 80, duration: 5000, requiredPlayers: 2 },
  radialKnockback: { delay: 2000, knockbackDistance: 150, knockbackDuration: 500 },
  linearKnockback: { width: 800, delay: 2000, knockbackDistance: 150, knockbackDuration: 500 },
  lineAoe: { width: 100, duration: 3000 },
  conalAoe: { angle: Math.PI / 2, duration: 3000 },
  stack: { radius: 80, duration: 3000 },
};

/**
 * Implementation of ScriptRunner that executes encounter scripts
 */
export class ScriptRunnerImpl implements ScriptRunner {
  private game: Game;
  private context: Context;
  private scriptStartTime: number;
  private timeline: Array<{ time: number; fn: () => void | Promise<void> }> = [];

  constructor(game: Game) {
    this.game = game;
    this.context = createContext();
    this.scriptStartTime = Date.now();
  }

  /**
   * Returns milliseconds elapsed since this script started
   */
  getElapsedTime(): number {
    return Date.now() - this.scriptStartTime;
  }

  /**
   * Converts triggerAt (absolute time from script start) to duration/delay.
   * @param triggerAt - Optional absolute time from script start when mechanic should trigger
   * @param timing - Optional explicit duration/delay value
   * @param defaultTiming - Default value if neither triggerAt nor timing specified
   * @param timingName - Name of timing param ('duration' or 'delay') for error messages
   * @returns The computed timing value to use
   * @throws Error if both triggerAt and timing are specified
   * @throws Error if triggerAt time has already passed
   */
  computeTiming(
    triggerAt: number | undefined,
    timing: number | undefined,
    defaultTiming: number,
    timingName: string
  ): number {
    if (triggerAt !== undefined && timing !== undefined) {
      throw new Error(`Cannot specify both triggerAt and ${timingName}`);
    }

    if (triggerAt === undefined) {
      return timing ?? defaultTiming;
    }

    const computed = triggerAt - this.getElapsedTime();
    if (computed < 0) {
      throw new Error(
        `triggerAt time has already passed: triggerAt=${triggerAt}, elapsed=${this.getElapsedTime()}`
      );
    }
    return computed;
  }

  spawn(mechanic: MechanicParams): string {
    switch (mechanic.type) {
      case 'chariot': {
        const radius = mechanic.radius ?? DEFAULTS.chariot.radius;
        const duration = this.computeTiming(
          mechanic.triggerAt,
          mechanic.duration,
          DEFAULTS.chariot.duration,
          'duration'
        );
        return this.game.spawnChariot(
          mechanic.x,
          mechanic.y,
          radius,
          duration
        );
      }

      case 'spread': {
        const radius = mechanic.radius ?? DEFAULTS.spread.radius;
        const duration = this.computeTiming(
          mechanic.triggerAt,
          mechanic.duration,
          DEFAULTS.spread.duration,
          'duration'
        );
        return this.game.spawnSpread(
          mechanic.targetPlayerId,
          radius,
          duration
        );
      }

      case 'tether': {
        const requiredDistance = mechanic.requiredDistance ?? DEFAULTS.tether.requiredDistance;
        const duration = this.computeTiming(
          mechanic.triggerAt,
          mechanic.duration,
          DEFAULTS.tether.duration,
          'duration'
        );
        return this.game.spawnTether(
          mechanic.endpointA,
          mechanic.endpointB,
          requiredDistance,
          duration
        );
      }

      case 'tower': {
        const radius = mechanic.radius ?? DEFAULTS.tower.radius;
        const duration = this.computeTiming(
          mechanic.triggerAt,
          mechanic.duration,
          DEFAULTS.tower.duration,
          'duration'
        );
        const requiredPlayers = mechanic.requiredPlayers ?? DEFAULTS.tower.requiredPlayers;
        return this.game.spawnTower(
          mechanic.x,
          mechanic.y,
          radius,
          duration,
          requiredPlayers
        );
      }

      case 'radialKnockback': {
        const delay = this.computeTiming(
          mechanic.triggerAt,
          mechanic.delay,
          DEFAULTS.radialKnockback.delay,
          'delay'
        );
        const knockbackDistance = mechanic.knockbackDistance ?? DEFAULTS.radialKnockback.knockbackDistance;
        const knockbackDuration = mechanic.knockbackDuration ?? DEFAULTS.radialKnockback.knockbackDuration;
        return this.game.spawnRadialKnockback(
          mechanic.originX,
          mechanic.originY,
          delay,
          knockbackDistance,
          knockbackDuration
        );
      }

      case 'linearKnockback': {
        const width = mechanic.width ?? DEFAULTS.linearKnockback.width;
        const delay = this.computeTiming(
          mechanic.triggerAt,
          mechanic.delay,
          DEFAULTS.linearKnockback.delay,
          'delay'
        );
        const knockbackDistance = mechanic.knockbackDistance ?? DEFAULTS.linearKnockback.knockbackDistance;
        const knockbackDuration = mechanic.knockbackDuration ?? DEFAULTS.linearKnockback.knockbackDuration;
        return this.game.spawnLinearKnockback(
          mechanic.lineStartX,
          mechanic.lineStartY,
          mechanic.lineEndX,
          mechanic.lineEndY,
          width,
          delay,
          knockbackDistance,
          knockbackDuration
        );
      }

      case 'lineAoe': {
        const width = mechanic.width ?? DEFAULTS.lineAoe.width;
        const duration = this.computeTiming(
          mechanic.triggerAt,
          mechanic.duration,
          DEFAULTS.lineAoe.duration,
          'duration'
        );
        return this.game.spawnLineAoe(
          mechanic.startX,
          mechanic.startY,
          mechanic.endX,
          mechanic.endY,
          width,
          duration
        );
      }

      case 'conalAoe': {
        const angle = mechanic.angle ?? DEFAULTS.conalAoe.angle;
        const duration = this.computeTiming(
          mechanic.triggerAt,
          mechanic.duration,
          DEFAULTS.conalAoe.duration,
          'duration'
        );
        return this.game.spawnConalAoe(
          mechanic.centerX,
          mechanic.centerY,
          mechanic.endpointX,
          mechanic.endpointY,
          angle,
          duration
        );
      }

      case 'stack': {
        const radius = mechanic.radius ?? DEFAULTS.stack.radius;
        const duration = this.computeTiming(
          mechanic.triggerAt,
          mechanic.duration,
          DEFAULTS.stack.duration,
          'duration'
        );
        return this.game.spawnStack(
          mechanic.targetPlayerId,
          radius,
          duration
        );
      }

      default:
        // TypeScript exhaustive check
        const _exhaustive: never = mechanic;
        throw new Error(`Unknown mechanic type: ${(_exhaustive as MechanicParams).type}`);
    }
  }

  wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  getState(): GameState {
    return this.game.getState();
  }

  select(selector: Selector): PlayerState[] {
    const state = this.getState();
    return selector(state, this.context);
  }

  waitForResolve(mechanicId: string): Promise<MechanicResult> {
    return new Promise((resolve) => {
      const handler = (result: MechanicResult) => {
        if (result.mechanicId === mechanicId) {
          this.game.off('mechanicResolved', handler);
          resolve(result);
        }
      };
      this.game.on('mechanicResolved', handler);
    });
  }

  async run(script: Script): Promise<void> {
    // Create new ScriptRunnerImpl for sub-script with its own scoped timeline
    // Sub-script's T=0 is when run() is called, not when parent started
    const subRunner = new ScriptRunnerImpl(this.game);
    const ctx = createContext();
    // Execute script with new runner, propagating any errors
    await script(subRunner, ctx);
  }

  applyStatus(playerId: string, statusType: StatusEffectType, duration: number): void {
    const status = new StatusEffect(statusType, playerId, duration);
    this.game.getStatusEffectManager().add(status);
  }

  damage(playerId: string, amount: number): void {
    const player = this.game.getPlayer(playerId);
    if (player) {
      const { dealt, overkill } = player.takeDamage(amount);
      this.game.broadcastDamage(playerId, player.name, dealt, overkill);
    }
  }

  spawnDoodad(params: DoodadParams): string {
    return this.game.getDoodadManager().spawn(params);
  }

  removeDoodad(id: string): boolean {
    return this.game.getDoodadManager().remove(id);
  }

  at(time: number, fn: () => void | Promise<void>): void {
    this.timeline.push({ time, fn });
  }

  async runTimeline(): Promise<void> {
    while (this.timeline.length > 0) {
      // Sort by time ascending each iteration to support dynamic scheduling
      this.timeline.sort((a, b) => a.time - b.time);

      const entry = this.timeline.shift()!;
      const waitTime = entry.time - this.getElapsedTime();

      if (waitTime > 0) {
        await this.wait(waitTime);
      }

      await entry.fn();
    }
  }

  async execute(script: Script): Promise<void> {
    // Create initial context for the encounter
    const ctx = createContext();
    try {
      await script(this, ctx);
    } catch (error) {
      console.error('Encounter script error:', error);
    }
  }
}

/**
 * Convenience function to create a ScriptRunner and execute an encounter script
 */
export function runEncounter(game: Game, script: Script): Promise<void> {
  const runner = new ScriptRunnerImpl(game);
  return runner.execute(script);
}
