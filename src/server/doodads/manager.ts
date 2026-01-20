import { DoodadState, DoodadType, DoodadLayer, DoodadAnchorOffset } from '../../shared/types';

// Parameters for spawning a doodad
export interface SpawnDoodadParams {
  type: DoodadType;
  width: number;
  height: number;
  rotation?: number;
  duration: number;
  opacity?: number;
  layer?: DoodadLayer;
  color?: string;
  data?: Record<string, unknown>;
  // Position: either fixed (x, y) or anchored to player
  x?: number;
  y?: number;
  anchorPlayerId?: string;
  anchorOffset?: DoodadAnchorOffset;
}

export class DoodadManager {
  private doodads: Map<string, DoodadState> = new Map();
  private nextId = 1;

  /**
   * Spawn a new doodad with the given parameters
   * @returns The unique ID of the spawned doodad
   */
  spawn(params: SpawnDoodadParams): string {
    const now = Date.now();
    const id = `doodad-${this.nextId++}`;

    const doodad: DoodadState = {
      id,
      type: params.type,
      width: params.width,
      height: params.height,
      rotation: params.rotation ?? 0,
      startTime: now,
      endTime: now + params.duration,
      opacity: params.opacity,
      layer: params.layer ?? 'background',
      color: params.color ?? '#ffffff',
      data: params.data,
      x: params.x,
      y: params.y,
      anchorPlayerId: params.anchorPlayerId,
      anchorOffset: params.anchorOffset,
    };

    this.doodads.set(id, doodad);
    return id;
  }

  /**
   * Remove a doodad by ID before its natural expiration
   */
  remove(id: string): boolean {
    return this.doodads.delete(id);
  }

  /**
   * Tick the manager - removes expired doodads
   * @param now Current timestamp in milliseconds
   */
  tick(now: number): void {
    for (const [id, doodad] of this.doodads) {
      if (doodad.endTime < now) {
        this.doodads.delete(id);
      }
    }
  }

  /**
   * Get all current doodad states for broadcasting
   */
  getStates(): DoodadState[] {
    return Array.from(this.doodads.values());
  }
}
