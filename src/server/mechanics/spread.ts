import { Player } from '../player';
import { StatusEffectManager } from '../statusEffectManager';
import { SpreadMechanicState } from '../../shared/types';
import { MechanicResult } from '../encounters/types';

export class SpreadMechanic {
  id: string;
  targetPlayerId: string;
  radius: number;
  startTime: number;
  endTime: number;

  constructor(
    targetPlayerId: string,
    radius: number,
    duration: number
  ) {
    this.id = `spread-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.targetPlayerId = targetPlayerId;
    this.radius = radius;
    this.startTime = Date.now();
    this.endTime = this.startTime + duration;
  }

  tick(now: number): void {
    // Spread has no per-tick behavior - position comes from target player
  }

  isExpired(now: number): boolean {
    return now >= this.endTime;
  }

  resolve(_players: Map<string, Player>, _statusManager: StatusEffectManager): void {
    // No-op: effects are now applied by scripts via waitForResolve + runner.damage()
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
    const playersHit: string[] = [];
    if (targetPlayer) {
      for (const player of players.values()) {
        const dx = player.x - targetPlayer.x;
        const dy = player.y - targetPlayer.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance <= this.radius) {
          playersHit.push(player.id);
        }
      }
    }

    return {
      mechanicId: this.id,
      type: 'spread',
      data: {
        playersHit,
        position,
      },
    };
  }
}
