import { Player } from '../player';
import { StatusEffectManager } from '../statusEffectManager';
import { StatusEffect } from '../statusEffect';
import { BaseMechanic, MechanicResolutionResult } from './types';
import { Effect, TowerMechanicState, TowerResolutionEvent } from '../../shared/types';

export class TowerMechanic implements BaseMechanic {
  id: string;
  x: number;
  y: number;
  radius: number;
  startTime: number;
  endTime: number;
  requiredPlayers: number;
  failureEffects: Effect[];
  successEffects: Effect[];

  constructor(
    id: string,
    x: number,
    y: number,
    radius: number,
    startTime: number,
    endTime: number,
    requiredPlayers: number,
    failureEffects: Effect[],
    successEffects: Effect[]
  ) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.startTime = startTime;
    this.endTime = endTime;
    this.requiredPlayers = requiredPlayers;
    this.failureEffects = failureEffects;
    this.successEffects = successEffects;
  }

  tick(now: number): void {
    // Tower has no per-tick behavior, just waits until expiration
  }

  isExpired(now: number): boolean {
    return now >= this.endTime;
  }

  resolve(players: Map<string, Player>, statusManager?: StatusEffectManager): MechanicResolutionResult {
    // Count players within radius
    const playersInside: Player[] = [];
    for (const player of players.values()) {
      const dx = player.x - this.x;
      const dy = player.y - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= this.radius) {
        playersInside.push(player);
      }
    }

    const success = playersInside.length >= this.requiredPlayers;

    if (success) {
      // Apply success effects to players inside the tower
      for (const player of playersInside) {
        this.applyEffects(player, this.successEffects, statusManager);
      }
    } else {
      // Apply failure effects to ALL players regardless of position
      for (const player of players.values()) {
        this.applyEffects(player, this.failureEffects, statusManager);
      }
    }

    const result: TowerResolutionEvent = {
      mechanicId: this.id,
      success,
      playersInside: playersInside.length,
      required: this.requiredPlayers,
      x: this.x,
      y: this.y,
    };

    return result;
  }

  private applyEffects(player: Player, effects: Effect[], statusManager?: StatusEffectManager): void {
    for (const effect of effects) {
      if (effect.type === 'damage') {
        player.takeDamage(effect.amount);
      } else if (effect.type === 'status' && statusManager) {
        const status = new StatusEffect(
          effect.statusType,
          player.id,
          effect.duration
        );
        statusManager.add(status);
      }
    }
  }

  toState(): TowerMechanicState {
    return {
      type: 'tower',
      id: this.id,
      x: this.x,
      y: this.y,
      radius: this.radius,
      startTime: this.startTime,
      endTime: this.endTime,
      requiredPlayers: this.requiredPlayers,
      failureEffects: this.failureEffects,
      successEffects: this.successEffects,
    };
  }
}
