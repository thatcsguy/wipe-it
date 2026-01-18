import { StatusEffect } from './statusEffect';
import { Player } from './player';
import { StatusEffectState } from '../shared/types';

export class StatusEffectManager {
  private statuses: Map<string, StatusEffect> = new Map();

  add(status: StatusEffect): void {
    this.statuses.set(status.id, status);
  }

  tick(now: number, players: Map<string, Player>): void {
    for (const [id, status] of this.statuses) {
      const player = players.get(status.playerId);
      if (!player) {
        // Player disconnected, remove status
        this.statuses.delete(id);
        continue;
      }

      if (status.isExpired(now)) {
        status.onExpire(player);
        this.statuses.delete(id);
      } else {
        status.tick(player);
      }
    }
  }

  getStates(): StatusEffectState[] {
    return Array.from(this.statuses.values()).map((s) => s.toState());
  }

  getStatusesForPlayer(playerId: string): StatusEffect[] {
    return Array.from(this.statuses.values()).filter(
      (s) => s.playerId === playerId
    );
  }

  remove(id: string): boolean {
    return this.statuses.delete(id);
  }
}
