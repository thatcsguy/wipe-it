import { Player } from '../player';
import { StatusEffectManager } from '../statusEffectManager';
import { BaseMechanic, MechanicState } from './types';

export class MechanicManager {
  private mechanics: Map<string, BaseMechanic> = new Map();

  add(mechanic: BaseMechanic): void {
    this.mechanics.set(mechanic.id, mechanic);
  }

  tick(now: number, players: Map<string, Player>, statusManager: StatusEffectManager): void {
    for (const [id, mechanic] of this.mechanics) {
      mechanic.tick(now);

      if (mechanic.isExpired(now)) {
        mechanic.resolve(players, statusManager);
        this.mechanics.delete(id);
      }
    }
  }

  getStates(): MechanicState[] {
    const states: MechanicState[] = [];
    for (const mechanic of this.mechanics.values()) {
      states.push(mechanic.toState());
    }
    return states;
  }
}
