import { Player } from '../player';
import { BaseMechanic, MechanicResolutionResult } from './types';
import { TetherEndpoint, TetherMechanicState } from '../../shared/types';
import { MechanicResult } from '../encounters/types';

export class TetherMechanic implements BaseMechanic {
  id: string;
  endpointA: TetherEndpoint;
  endpointB: TetherEndpoint;
  requiredDistance: number;
  startTime: number;
  endTime: number;

  constructor(
    endpointA: TetherEndpoint,
    endpointB: TetherEndpoint,
    requiredDistance: number,
    duration: number
  ) {
    this.id = `tether-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.endpointA = endpointA;
    this.endpointB = endpointB;
    this.requiredDistance = requiredDistance;
    this.startTime = Date.now();
    this.endTime = this.startTime + duration;
  }

  tick(now: number): void {
    // Tether has no per-tick behavior
  }

  isExpired(now: number): boolean {
    return now >= this.endTime;
  }

  resolve(_players: Map<string, Player>): MechanicResolutionResult {
    // No-op: effects are handled by scripts via getResult()
    return {
      mechanicId: this.id,
      success: true,
      affectedPlayerIds: [],
    };
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

  toState(): TetherMechanicState {
    return {
      type: 'tether',
      id: this.id,
      endpointA: this.endpointA,
      endpointB: this.endpointB,
      requiredDistance: this.requiredDistance,
      startTime: this.startTime,
      endTime: this.endTime,
    };
  }

  getResult(players: Map<string, Player>): MechanicResult {
    // Resolve endpoint positions
    const posA = this.resolveEndpointPosition(this.endpointA, players);
    const posB = this.resolveEndpointPosition(this.endpointB, players);

    // Calculate distance and stretched status
    let distance = 0;
    if (posA && posB) {
      const dx = posB.x - posA.x;
      const dy = posB.y - posA.y;
      distance = Math.sqrt(dx * dx + dy * dy);
    }
    const stretched = distance >= this.requiredDistance;

    // Build player1 and player2 result objects
    const player1 = this.endpointA.type === 'player'
      ? { id: this.endpointA.playerId, position: posA || { x: 0, y: 0 } }
      : { id: null, position: posA || { x: 0, y: 0 } };

    const player2 = this.endpointB.type === 'player'
      ? { id: this.endpointB.playerId, position: posB || { x: 0, y: 0 } }
      : { id: null, position: posB || { x: 0, y: 0 } };

    return {
      mechanicId: this.id,
      type: 'tether',
      data: {
        player1,
        player2,
        stretched,
      },
    };
  }
}
