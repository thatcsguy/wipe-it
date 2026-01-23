import { Player } from '../player';
import { BaseMechanic, MechanicState } from './types';
import { MechanicResult } from '../encounters/types';

export class DynamoMechanic implements BaseMechanic {
  id: string;
  x: number;
  y: number;
  innerRadius: number;
  outerRadius: number;
  startTime: number;
  endTime: number;

  constructor(
    x: number,
    y: number,
    innerRadius: number,
    outerRadius: number,
    duration: number
  ) {
    this.id = `dynamo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.x = x;
    this.y = y;
    this.innerRadius = innerRadius;
    this.outerRadius = outerRadius;
    this.startTime = Date.now();
    this.endTime = this.startTime + duration;
  }

  tick(now: number): void {
    // Dynamo has no per-tick behavior, just waits until expiration
  }

  isExpired(now: number): boolean {
    return now >= this.endTime;
  }

  resolve(_players: Map<string, Player>): void {
    // No-op: effects are now applied by scripts via waitForResolve + runner.damage()
  }

  toState(): MechanicState {
    return {
      id: this.id,
      type: 'dynamo',
      startTime: this.startTime,
      endTime: this.endTime,
      x: this.x,
      y: this.y,
      innerRadius: this.innerRadius,
      outerRadius: this.outerRadius,
    };
  }

  getResult(players: Map<string, Player>): MechanicResult {
    // Find players hit by this mechanic (between inner and outer radius)
    const playersHit: string[] = [];
    for (const player of players.values()) {
      const dx = player.x - this.x;
      const dy = player.y - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      // Player is hit if they are in the donut zone (between radii)
      if (distance >= this.innerRadius && distance <= this.outerRadius) {
        playersHit.push(player.id);
      }
    }

    return {
      mechanicId: this.id,
      type: 'dynamo',
      data: { playersHit },
    };
  }
}
