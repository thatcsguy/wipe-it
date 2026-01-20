import { Player } from '../player';
import { BaseMechanic, Effect, MechanicState } from './types';
import { MechanicResult } from '../encounters/types';

export class ChariotMechanic implements BaseMechanic {
  id: string;
  x: number;
  y: number;
  radius: number;
  startTime: number;
  endTime: number;
  effects: Effect[];

  constructor(
    x: number,
    y: number,
    radius: number,
    duration: number,
    effects: Effect[]
  ) {
    this.id = `chariot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.startTime = Date.now();
    this.endTime = this.startTime + duration;
    this.effects = effects;
  }

  tick(now: number): void {
    // Chariot has no per-tick behavior, just waits until expiration
  }

  isExpired(now: number): boolean {
    return now >= this.endTime;
  }

  resolve(players: Map<string, Player>): void {
    // Apply damage to all players within radius
    for (const player of players.values()) {
      const dx = player.x - this.x;
      const dy = player.y - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= this.radius) {
        // Player is inside the AOE - apply all effects
        for (const effect of this.effects) {
          if (effect.type === 'damage') {
            player.takeDamage(effect.amount);
          }
        }
      }
    }
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
    const hitPlayerIds: string[] = [];
    for (const player of players.values()) {
      const dx = player.x - this.x;
      const dy = player.y - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance <= this.radius) {
        hitPlayerIds.push(player.id);
      }
    }

    return {
      mechanicId: this.id,
      type: 'chariot',
      data: {
        position: { x: this.x, y: this.y },
        hitPlayerIds,
      },
    };
  }
}
