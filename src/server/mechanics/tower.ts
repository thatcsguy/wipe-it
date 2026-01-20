import { Player } from '../player';
import { StatusEffectManager } from '../statusEffectManager';
import { BaseMechanic, MechanicResolutionResult } from './types';
import { TowerMechanicState, TowerResolutionEvent } from '../../shared/types';
import { MechanicResult } from '../encounters/types';

export class TowerMechanic implements BaseMechanic {
  id: string;
  x: number;
  y: number;
  radius: number;
  startTime: number;
  endTime: number;
  requiredPlayers: number;

  constructor(
    id: string,
    x: number,
    y: number,
    radius: number,
    startTime: number,
    endTime: number,
    requiredPlayers: number
  ) {
    this.id = id;
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.startTime = startTime;
    this.endTime = endTime;
    this.requiredPlayers = requiredPlayers;
  }

  tick(now: number): void {
    // Tower has no per-tick behavior, just waits until expiration
  }

  isExpired(now: number): boolean {
    return now >= this.endTime;
  }

  resolve(players: Map<string, Player>, statusManager?: StatusEffectManager): MechanicResolutionResult {
    // No-op: scripts handle effects via getResult()
    const playersInsideList: string[] = [];
    for (const player of players.values()) {
      const dx = player.x - this.x;
      const dy = player.y - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= this.radius) {
        playersInsideList.push(player.id);
      }
    }

    const success = playersInsideList.length >= this.requiredPlayers;

    const result: TowerResolutionEvent = {
      mechanicId: this.id,
      success,
      playersInside: playersInsideList.length,
      required: this.requiredPlayers,
      x: this.x,
      y: this.y,
    };

    return result;
  }

  getResult(players: Map<string, Player>): MechanicResult {
    const playersInside: string[] = [];
    for (const player of players.values()) {
      const dx = player.x - this.x;
      const dy = player.y - this.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance <= this.radius) {
        playersInside.push(player.id);
      }
    }

    const success = playersInside.length >= this.requiredPlayers;

    return {
      mechanicId: this.id,
      type: 'tower',
      data: { success, playersInside },
    };
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
    };
  }
}
