import { Player } from '../player';
import { BaseMechanic, MechanicState } from './types';
import { TetherEndpoint, TetherMechanicState } from '../../shared/types';

export class TetherMechanic implements BaseMechanic {
  id: string;
  endpointA: TetherEndpoint;
  endpointB: TetherEndpoint;
  requiredDistance: number;
  damage: number;
  startTime: number;
  endTime: number;

  constructor(
    endpointA: TetherEndpoint,
    endpointB: TetherEndpoint,
    requiredDistance: number,
    damage: number,
    duration: number
  ) {
    this.id = `tether-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.endpointA = endpointA;
    this.endpointB = endpointB;
    this.requiredDistance = requiredDistance;
    this.damage = damage;
    this.startTime = Date.now();
    this.endTime = this.startTime + duration;
  }

  tick(now: number): void {
    // Tether has no per-tick behavior
  }

  isExpired(now: number): boolean {
    return now >= this.endTime;
  }

  resolve(players: Map<string, Player>): void {
    // Resolve endpoint positions
    const posA = this.resolveEndpointPosition(this.endpointA, players);
    const posB = this.resolveEndpointPosition(this.endpointB, players);

    if (!posA || !posB) {
      return; // Player disconnected
    }

    // Calculate Euclidean distance
    const dx = posB.x - posA.x;
    const dy = posB.y - posA.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // If distance < requiredDistance, apply damage to connected players
    if (distance < this.requiredDistance) {
      this.applyDamageToConnectedPlayers(players);
    }
  }

  private resolveEndpointPosition(
    endpoint: TetherEndpoint,
    players: Map<string, Player>
  ): { x: number; y: number } | null {
    if (endpoint.type === 'point') {
      return { x: endpoint.x, y: endpoint.y };
    } else {
      const player = players.get(endpoint.playerId);
      if (!player) {
        return null;
      }
      return { x: player.x, y: player.y };
    }
  }

  private applyDamageToConnectedPlayers(players: Map<string, Player>): void {
    // Apply damage to all players connected to this tether
    if (this.endpointA.type === 'player') {
      const player = players.get(this.endpointA.playerId);
      if (player) {
        player.takeDamage(this.damage);
      }
    }
    if (this.endpointB.type === 'player') {
      const player = players.get(this.endpointB.playerId);
      if (player) {
        player.takeDamage(this.damage);
      }
    }
  }

  toState(): TetherMechanicState {
    return {
      type: 'tether',
      id: this.id,
      endpointA: this.endpointA,
      endpointB: this.endpointB,
      requiredDistance: this.requiredDistance,
      damage: this.damage,
      startTime: this.startTime,
      endTime: this.endTime,
    };
  }
}
