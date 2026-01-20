import { Player } from '../player';
import { BaseMechanic, MechanicState } from './types';
import { LineAoeMechanicState } from '../../shared/types';
import { MechanicResult } from '../encounters/types';

export class LineAoeMechanic implements BaseMechanic {
  id: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  width: number;
  startTime: number;
  endTime: number;

  constructor(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    width: number,
    duration: number
  ) {
    this.id = `lineAoe-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.startX = startX;
    this.startY = startY;
    this.endX = endX;
    this.endY = endY;
    this.width = width;
    this.startTime = Date.now();
    this.endTime = this.startTime + duration;
  }

  tick(now: number): void {
    // Line AOE has no per-tick behavior, just waits until expiration
  }

  isExpired(now: number): boolean {
    return now >= this.endTime;
  }

  /**
   * Check if a point is inside the rotated rectangle defined by the line and width.
   * Transform point to rectangle's local coordinate space:
   * - Origin at startX, startY
   * - X-axis along line direction (start to end)
   * - Y-axis perpendicular to line
   * Then check if within [0, length] x [-width/2, width/2]
   */
  private isPointInRectangle(px: number, py: number): boolean {
    // Direction vector from start to end
    const dx = this.endX - this.startX;
    const dy = this.endY - this.startY;
    const length = Math.sqrt(dx * dx + dy * dy);

    if (length === 0) return false;

    // Unit vectors
    const ux = dx / length; // along line
    const uy = dy / length;
    // Perpendicular unit vector
    const vx = -uy;
    const vy = ux;

    // Vector from start to point
    const relX = px - this.startX;
    const relY = py - this.startY;

    // Project onto local axes
    const localX = relX * ux + relY * uy; // distance along line
    const localY = relX * vx + relY * vy; // distance perpendicular to line

    // Check bounds
    const halfWidth = this.width / 2;
    return localX >= 0 && localX <= length && localY >= -halfWidth && localY <= halfWidth;
  }

  resolve(): void {
    // Effects are handled by scripts via getResult()
  }

  getResult(players: Map<string, Player>): MechanicResult {
    const playersHit: string[] = [];
    for (const player of players.values()) {
      if (this.isPointInRectangle(player.x, player.y)) {
        playersHit.push(player.id);
      }
    }
    return {
      mechanicId: this.id,
      type: 'lineAoe',
      data: { playersHit },
    };
  }

  toState(): MechanicState {
    const state: LineAoeMechanicState = {
      type: 'lineAoe',
      id: this.id,
      startX: this.startX,
      startY: this.startY,
      endX: this.endX,
      endY: this.endY,
      width: this.width,
      startTime: this.startTime,
      endTime: this.endTime,
    };
    return state;
  }
}
