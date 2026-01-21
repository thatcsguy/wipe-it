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
   * Get the current position of a doodad, accounting for any in-progress movement
   * @param doodad The doodad state
   * @param now Current timestamp in milliseconds
   * @returns Current position or null if doodad has no fixed position
   */
  getCurrentPosition(doodad: DoodadState, now: number): { x: number; y: number } | null {
    // If mid-move, interpolate position
    if (doodad.moveStartTime !== undefined && doodad.moveEndTime !== undefined) {
      if (now >= doodad.moveEndTime) {
        return { x: doodad.moveEndX!, y: doodad.moveEndY! };
      }
      const t = (now - doodad.moveStartTime) / (doodad.moveEndTime - doodad.moveStartTime);
      return {
        x: doodad.moveStartX! + (doodad.moveEndX! - doodad.moveStartX!) * t,
        y: doodad.moveStartY! + (doodad.moveEndY! - doodad.moveStartY!) * t,
      };
    }

    // Fixed position
    if (doodad.x !== undefined && doodad.y !== undefined) {
      return { x: doodad.x, y: doodad.y };
    }

    // Player-anchored - no fixed position
    return null;
  }

  /**
   * Move a doodad to a target position over a duration
   * @param id The doodad ID
   * @param targetX Target X position
   * @param targetY Target Y position
   * @param duration Duration in milliseconds
   * @returns true if move started, false if doodad not found or is player-anchored
   */
  moveDoodad(id: string, targetX: number, targetY: number, duration: number): boolean {
    const doodad = this.doodads.get(id);
    if (!doodad) {
      return false;
    }

    // Cannot move player-anchored doodads
    if (doodad.anchorPlayerId) {
      return false;
    }

    const now = Date.now();
    const currentPos = this.getCurrentPosition(doodad, now);
    if (!currentPos) {
      return false;
    }

    // Set movement fields
    doodad.moveStartX = currentPos.x;
    doodad.moveStartY = currentPos.y;
    doodad.moveEndX = targetX;
    doodad.moveEndY = targetY;
    doodad.moveStartTime = now;
    doodad.moveEndTime = now + duration;

    return true;
  }

  /**
   * Tick the manager - removes expired doodads and completes movements
   * @param now Current timestamp in milliseconds
   */
  tick(now: number): void {
    for (const [id, doodad] of this.doodads) {
      if (doodad.endTime < now) {
        this.doodads.delete(id);
        continue;
      }

      // Complete movements that have finished
      if (doodad.moveEndTime !== undefined && now >= doodad.moveEndTime) {
        doodad.x = doodad.moveEndX;
        doodad.y = doodad.moveEndY;
        // Clear movement fields
        delete doodad.moveStartX;
        delete doodad.moveStartY;
        delete doodad.moveEndX;
        delete doodad.moveEndY;
        delete doodad.moveStartTime;
        delete doodad.moveEndTime;
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
