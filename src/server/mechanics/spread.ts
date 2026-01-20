import { Player } from '../player';
import { StatusEffectManager } from '../statusEffectManager';
import { StatusEffect } from '../statusEffect';
import { Effect, SpreadMechanicState } from '../../shared/types';
import { MechanicResult } from '../encounters/types';

export class SpreadMechanic {
  id: string;
  targetPlayerId: string;
  radius: number;
  startTime: number;
  endTime: number;
  effects: Effect[];

  constructor(
    targetPlayerId: string,
    radius: number,
    duration: number,
    effects: Effect[]
  ) {
    this.id = `spread-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.targetPlayerId = targetPlayerId;
    this.radius = radius;
    this.startTime = Date.now();
    this.endTime = this.startTime + duration;
    this.effects = effects;
  }

  tick(now: number): void {
    // Spread has no per-tick behavior - position comes from target player
  }

  isExpired(now: number): boolean {
    return now >= this.endTime;
  }

  resolve(players: Map<string, Player>, statusManager: StatusEffectManager): void {
    // Get target player position
    const targetPlayer = players.get(this.targetPlayerId);
    if (!targetPlayer) {
      return; // Target disconnected
    }

    const centerX = targetPlayer.x;
    const centerY = targetPlayer.y;

    // Apply effects to all players within radius
    for (const player of players.values()) {
      const dx = player.x - centerX;
      const dy = player.y - centerY;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= this.radius) {
        // Player is inside the AOE - apply all effects
        for (const effect of this.effects) {
          if (effect.type === 'damage') {
            player.takeDamage(effect.amount);
          } else if (effect.type === 'status') {
            const status = new StatusEffect(
              effect.statusType,
              player.id,
              effect.duration
            );
            statusManager.add(status);
          }
        }

        // Apply vulnerability status (1000ms duration) per PRD
        const vulnerability = new StatusEffect('vulnerability', player.id, 1000);
        statusManager.add(vulnerability);
      }
    }
  }

  toState(): SpreadMechanicState {
    return {
      type: 'spread',
      id: this.id,
      targetPlayerId: this.targetPlayerId,
      radius: this.radius,
      startTime: this.startTime,
      endTime: this.endTime,
    };
  }

  getResult(players: Map<string, Player>): MechanicResult {
    const targetPlayer = players.get(this.targetPlayerId);
    const position = targetPlayer
      ? { x: targetPlayer.x, y: targetPlayer.y }
      : null;

    // Find players hit by this spread
    const hitPlayerIds: string[] = [];
    if (targetPlayer) {
      for (const player of players.values()) {
        const dx = player.x - targetPlayer.x;
        const dy = player.y - targetPlayer.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance <= this.radius) {
          hitPlayerIds.push(player.id);
        }
      }
    }

    return {
      mechanicId: this.id,
      type: 'spread',
      data: {
        targetPlayerId: this.targetPlayerId,
        position,
        hitPlayerIds,
      },
    };
  }
}
