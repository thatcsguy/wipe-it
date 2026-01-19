import { Player } from '../player';
import { BaseMechanic, MechanicState } from './types';
import { getLinearKnockbackDirection, isOnKnockbackSide } from '../../shared/knockback';
import { LinearKnockbackMechanicState } from '../../shared/types';

export class LinearKnockbackMechanic implements BaseMechanic {
  id: string;
  lineStartX: number;
  lineStartY: number;
  lineEndX: number;
  lineEndY: number;
  startTime: number;
  endTime: number;
  knockbackDistance: number;
  knockbackDuration: number;

  constructor(
    lineStartX: number,
    lineStartY: number,
    lineEndX: number,
    lineEndY: number,
    delay: number,
    knockbackDistance: number,
    knockbackDuration: number
  ) {
    this.id = `linear-kb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.lineStartX = lineStartX;
    this.lineStartY = lineStartY;
    this.lineEndX = lineEndX;
    this.lineEndY = lineEndY;
    this.startTime = Date.now();
    this.endTime = this.startTime + delay;
    this.knockbackDistance = knockbackDistance;
    this.knockbackDuration = knockbackDuration;
  }

  tick(now: number): void {
    // Linear knockback has no per-tick behavior, just waits until expiration
  }

  isExpired(now: number): boolean {
    return now >= this.endTime;
  }

  resolve(players: Map<string, Player>): void {
    const now = Date.now();

    // Calculate knockback direction (perpendicular to line, same for all players)
    const dir = getLinearKnockbackDirection(
      this.lineStartX,
      this.lineStartY,
      this.lineEndX,
      this.lineEndY
    );

    // Apply knockback only to players on the knockback side (right side of line)
    for (const player of players.values()) {
      if (
        isOnKnockbackSide(
          this.lineStartX,
          this.lineStartY,
          this.lineEndX,
          this.lineEndY,
          player.x,
          player.y
        )
      ) {
        player.applyKnockback(
          dir.x,
          dir.y,
          this.knockbackDistance,
          this.knockbackDuration,
          now
        );
      }
    }
  }

  toState(): MechanicState {
    return {
      id: this.id,
      type: 'linearKnockback',
      startTime: this.startTime,
      endTime: this.endTime,
      lineStartX: this.lineStartX,
      lineStartY: this.lineStartY,
      lineEndX: this.lineEndX,
      lineEndY: this.lineEndY,
      knockbackDistance: this.knockbackDistance,
      knockbackDuration: this.knockbackDuration,
    } as LinearKnockbackMechanicState;
  }
}
