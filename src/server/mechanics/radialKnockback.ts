import { Player } from '../player';
import { BaseMechanic, MechanicState } from './types';
import { getRadialKnockbackDirection } from '../../shared/knockback';
import { RadialKnockbackMechanicState } from '../../shared/types';

export class RadialKnockbackMechanic implements BaseMechanic {
  id: string;
  originX: number;
  originY: number;
  startTime: number;
  endTime: number;
  knockbackDistance: number;
  knockbackDuration: number;

  constructor(
    originX: number,
    originY: number,
    delay: number,
    knockbackDistance: number,
    knockbackDuration: number
  ) {
    this.id = `radial-kb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.originX = originX;
    this.originY = originY;
    this.startTime = Date.now();
    this.endTime = this.startTime + delay;
    this.knockbackDistance = knockbackDistance;
    this.knockbackDuration = knockbackDuration;
  }

  tick(now: number): void {
    // Radial knockback has no per-tick behavior, just waits until expiration
  }

  isExpired(now: number): boolean {
    return now >= this.endTime;
  }

  resolve(players: Map<string, Player>): void {
    const now = Date.now();

    // Apply knockback to ALL players
    for (const player of players.values()) {
      // Calculate direction from origin toward player
      const dir = getRadialKnockbackDirection(
        this.originX,
        this.originY,
        player.x,
        player.y
      );

      // Apply knockback
      player.applyKnockback(
        dir.x,
        dir.y,
        this.knockbackDistance,
        this.knockbackDuration,
        now
      );
    }
  }

  toState(): MechanicState {
    return {
      id: this.id,
      type: 'radialKnockback',
      startTime: this.startTime,
      endTime: this.endTime,
      originX: this.originX,
      originY: this.originY,
      knockbackDistance: this.knockbackDistance,
      knockbackDuration: this.knockbackDuration,
    } as RadialKnockbackMechanicState;
  }
}
