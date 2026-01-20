import { Player } from '../player';
import { BaseMechanic, MechanicState } from './types';
import { MechanicResult } from '../encounters/types';

export class ChariotMechanic implements BaseMechanic {
  id: string;
  x: number;
  y: number;
  radius: number;
  startTime: number;
  endTime: number;

  constructor(
    x: number,
    y: number,
    radius: number,
    duration: number
  ) {
    this.id = `chariot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.startTime = Date.now();
    this.endTime = this.startTime + duration;
  }

  tick(now: number): void {
    // Chariot has no per-tick behavior, just waits until expiration
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
      type: 'chariot',
      startTime: this.startTime,
      endTime: this.endTime,
      x: this.x,
      y: this.y,
      radius: this.radius,
    };
  }

  getResult(players: Map<string, Player>): MechanicResult {
    // Find players hit by this mechanic
    const playersHit: string[] = [];
    for (const player of players.values()) {
      const dx = player.x - this.x;
      const dy = player.y - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance <= this.radius) {
        playersHit.push(player.id);
      }
    }

    return {
      mechanicId: this.id,
      type: 'chariot',
      data: { playersHit },
    };
  }
}
