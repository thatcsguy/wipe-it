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
  linearKnockback: { delay: 2000, knockbackDistance: 150, knockbackDuration: 500 },
  lineAoe: { width: 100, duration: 3000 },
  conalAoe: { angle: Math.PI / 2, duration: 3000 },
};

/**
 * Implementation of ScriptRunner that executes encounter scripts
 */
export class ScriptRunnerImpl implements ScriptRunner {
  private game: Game;
  private context: Context;

  constructor(game: Game) {
    this.game = game;
    this.context = createContext();
  }

  spawn(mechanic: MechanicParams): string {
    switch (mechanic.type) {
      case 'chariot': {
        const radius = mechanic.radius ?? DEFAULTS.chariot.radius;
        const duration = mechanic.duration ?? DEFAULTS.chariot.duration;
        return this.game.spawnChariot(
          mechanic.x,
          mechanic.y,
          radius,
          duration
        );
      }

      case 'spread': {
        const radius = mechanic.radius ?? DEFAULTS.spread.radius;
        const duration = mechanic.duration ?? DEFAULTS.spread.duration;
        return this.game.spawnSpread(
          mechanic.targetPlayerId,
          radius,
          duration
        );
      }

      case 'tether': {
        const requiredDistance = mechanic.requiredDistance ?? DEFAULTS.tether.requiredDistance;
        const duration = mechanic.duration ?? DEFAULTS.tether.duration;
        return this.game.spawnTether(
          mechanic.endpointA,
          mechanic.endpointB,
          requiredDistance,
          duration
        );
      }

      case 'tower': {
        const radius = mechanic.radius ?? DEFAULTS.tower.radius;
        const duration = mechanic.duration ?? DEFAULTS.tower.duration;
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
        const delay = mechanic.delay ?? DEFAULTS.radialKnockback.delay;
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
        const delay = mechanic.delay ?? DEFAULTS.linearKnockback.delay;
        const knockbackDistance = mechanic.knockbackDistance ?? DEFAULTS.linearKnockback.knockbackDistance;
        const knockbackDuration = mechanic.knockbackDuration ?? DEFAULTS.linearKnockback.knockbackDuration;
        return this.game.spawnLinearKnockback(
          mechanic.lineStartX,
          mechanic.lineStartY,
          mechanic.lineEndX,
          mechanic.lineEndY,
          delay,
          knockbackDistance,
          knockbackDuration
        );
      }

      case 'lineAoe': {
        const width = mechanic.width ?? DEFAULTS.lineAoe.width;
        const duration = mechanic.duration ?? DEFAULTS.lineAoe.duration;
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
        const duration = mechanic.duration ?? DEFAULTS.conalAoe.duration;
        return this.game.spawnConalAoe(
          mechanic.centerX,
          mechanic.centerY,
          mechanic.endpointX,
          mechanic.endpointY,
          angle,
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
    // Create fresh context for sub-script execution
    const ctx = createContext();
    // Execute script, propagating any errors
    await script(this, ctx);
  }

  applyStatus(playerId: string, statusType: StatusEffectType, duration: number): void {
    const status = new StatusEffect(statusType, playerId, duration);
    this.game.getStatusEffectManager().add(status);
  }

  damage(playerId: string, amount: number): void {
    const player = this.game.getPlayer(playerId);
    if (player) {
      player.takeDamage(amount);
    }
  }

  spawnDoodad(params: DoodadParams): string {
    return this.game.getDoodadManager().spawn(params);
  }

  removeDoodad(id: string): boolean {
    return this.game.getDoodadManager().remove(id);
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
