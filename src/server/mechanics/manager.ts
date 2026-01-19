import { Player } from '../player';
import { StatusEffectManager } from '../statusEffectManager';
import { BaseMechanic, MechanicState, MechanicResolutionResult } from './types';

export type ResolutionCallback = (result: MechanicResolutionResult) => void;

export class MechanicManager {
  private mechanics: Map<string, BaseMechanic> = new Map();
  private resolutionCallback: ResolutionCallback | null = null;

  add(mechanic: BaseMechanic): void {
    this.mechanics.set(mechanic.id, mechanic);
  }

  onResolution(callback: ResolutionCallback): void {
    this.resolutionCallback = callback;
  }

  tick(now: number, players: Map<string, Player>, statusManager: StatusEffectManager): void {
    for (const [id, mechanic] of this.mechanics) {
      mechanic.tick(now);

      if (mechanic.isExpired(now)) {
        const result = mechanic.resolve(players, statusManager);
        if (result && this.resolutionCallback) {
          this.resolutionCallback(result);
        }
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
