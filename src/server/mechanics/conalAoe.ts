import { Player } from '../player';
import { BaseMechanic, MechanicState } from './types';
import { ConalAoeMechanicState } from '../../shared/types';
import { MechanicResult } from '../encounters/types';

export class ConalAoeMechanic implements BaseMechanic {
  id: string;
  centerX: number;
  centerY: number;
  endpointX: number;
  endpointY: number;
  angle: number;
  radius: number;
  startTime: number;
  endTime: number;

  constructor(
    centerX: number,
    centerY: number,
    endpointX: number,
    endpointY: number,
    angle: number,
    duration: number
  ) {
    this.id = `conalAoe-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.centerX = centerX;
    this.centerY = centerY;
    this.endpointX = endpointX;
    this.endpointY = endpointY;
    this.angle = angle;
    // Compute radius as distance from center to endpoint
    this.radius = Math.sqrt(
      (endpointX - centerX) ** 2 + (endpointY - centerY) ** 2
    );
    this.startTime = Date.now();
    this.endTime = this.startTime + duration;
  }

  tick(now: number): void {
    // Conal AOE has no per-tick behavior, just waits until expiration
  }

  isExpired(now: number): boolean {
    return now >= this.endTime;
  }

  /**
   * Normalize angle to [-PI, PI] range
   */
  private normalizeAngle(angle: number): number {
    while (angle > Math.PI) angle -= 2 * Math.PI;
    while (angle < -Math.PI) angle += 2 * Math.PI;
    return angle;
  }

  /**
   * Check if a point is inside the cone sector.
   * 1) Distance from center must be <= radius
   * 2) Angle from center to point must be within +/-(angle/2) of direction to endpoint
   */
  private isPointInSector(px: number, py: number): boolean {
    // Check distance
    const dx = px - this.centerX;
    const dy = py - this.centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > this.radius) return false;

    // Handle edge case: point at center is always inside
    if (dist === 0) return true;

    // Direction from center to endpoint (the cone's facing direction)
    const coneDirection = Math.atan2(
      this.endpointY - this.centerY,
      this.endpointX - this.centerX
    );

    // Direction from center to player
    const playerDirection = Math.atan2(dy, dx);

    // Angular difference, normalized to [-PI, PI]
    const angleDiff = this.normalizeAngle(playerDirection - coneDirection);

    // Check if within half-angle on either side
    const halfAngle = this.angle / 2;
    return angleDiff >= -halfAngle && angleDiff <= halfAngle;
  }

  resolve(_players: Map<string, Player>): void {
    // No-op: effects are now applied by scripts via waitForResolve + runner.damage()
  }

  getResult(players: Map<string, Player>): MechanicResult {
    // Find players hit by this mechanic
    const playersHit: string[] = [];
    for (const player of players.values()) {
      if (this.isPointInSector(player.x, player.y)) {
        playersHit.push(player.id);
      }
    }
    return {
      mechanicId: this.id,
      type: 'conalAoe',
      data: { playersHit },
    };
  }

  toState(): MechanicState {
    const state: ConalAoeMechanicState = {
      type: 'conalAoe',
      id: this.id,
      centerX: this.centerX,
      centerY: this.centerY,
      endpointX: this.endpointX,
      endpointY: this.endpointY,
      angle: this.angle,
      startTime: this.startTime,
      endTime: this.endTime,
    };
    return state;
  }
}
