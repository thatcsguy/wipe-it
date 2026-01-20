import { Player } from '../player';
import { StatusEffectManager } from '../statusEffectManager';
import { BaseMechanic, MechanicState, MechanicResolutionResult } from './types';
import { MechanicResult } from '../encounters/types';

export type ResolutionCallback = (result: MechanicResolutionResult) => void;
export type MechanicResultCallback = (result: MechanicResult) => void;

export class MechanicManager {
  private mechanics: Map<string, BaseMechanic> = new Map();
  private resolutionCallback: ResolutionCallback | null = null;
  private mechanicResultCallback: MechanicResultCallback | null = null;

  add(mechanic: BaseMechanic): void {
    this.mechanics.set(mechanic.id, mechanic);
  }

  onResolution(callback: ResolutionCallback): void {
    this.resolutionCallback = callback;
  }

  onMechanicResult(callback: MechanicResultCallback): void {
    this.mechanicResultCallback = callback;
  }

  tick(now: number, players: Map<string, Player>, statusManager: StatusEffectManager): void {
    for (const [id, mechanic] of this.mechanics) {
      mechanic.tick(now);

      if (mechanic.isExpired(now)) {
        // Get mechanic result before resolve() potentially modifies state
        if (this.mechanicResultCallback) {
          const state = mechanic.toState();
          let mechanicResult: MechanicResult;

          if (mechanic.getResult) {
            // Use mechanic-specific result data
            mechanicResult = mechanic.getResult(players);
          } else {
            // Default result with position for positional mechanics
            mechanicResult = {
              mechanicId: mechanic.id,
              type: state.type,
              data: 'x' in state && 'y' in state
                ? { position: { x: state.x, y: state.y } }
                : {}
            };
          }
          this.mechanicResultCallback(mechanicResult);
        }

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
