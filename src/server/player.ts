import {
  PlayerState,
  PlayerInput,
  InputKeys,
  KnockbackState,
  PLAYER_SPEED,
  PLAYER_RADIUS,
  ARENA_WIDTH,
  ARENA_HEIGHT,
  MAX_HP,
} from '../shared/types';
import { calculateKnockbackEndpoint, getKnockbackPosition } from '../shared/knockback';
import { StatusEffectManager } from './statusEffectManager';

export class Player {
  id: string;
  name: string;
  x: number;
  y: number;
  color: string;
  hp: number;
  dead: boolean;
  lastProcessedInput: number;
  knockback: KnockbackState | undefined;
  private statusEffectManager: StatusEffectManager | null = null;

  constructor(id: string, name: string, color: string) {
    this.id = id;
    this.name = name;
    this.color = color;
    this.hp = MAX_HP;
    this.dead = false;
    // Start in center of arena
    this.x = ARENA_WIDTH / 2;
    this.y = ARENA_HEIGHT / 2;
    this.lastProcessedInput = 0;
  }

  setStatusEffectManager(manager: StatusEffectManager): void {
    this.statusEffectManager = manager;
  }

  setDead(dead: boolean): void {
    this.dead = dead;
  }

  processInput(input: PlayerInput, now: number): void {
    const { keys, dt, seq } = input;

    // ALWAYS update lastProcessedInput for reconciliation (even during knockback)
    this.lastProcessedInput = seq;

    // During knockback: update position via knockback physics, ignore WASD
    if (this.knockback) {
      const result = getKnockbackPosition(this.knockback, now);
      this.x = result.x;
      this.y = result.y;

      // Clear knockback when complete
      if (!result.active) {
        this.knockback = undefined;
      }

      // Skip normal WASD movement during knockback
      return;
    }

    // Rooted: freeze position, ignore WASD input
    if (this.statusEffectManager) {
      const statuses = this.statusEffectManager.getStatusesForPlayer(this.id);
      const isRooted = statuses.some((s) => s.type === 'rooted');
      if (isRooted) {
        return;
      }
    }

    // Bubbled: freeze position, ignore WASD input (but knockback still applies)
    if (this.statusEffectManager) {
      const statuses = this.statusEffectManager.getStatusesForPlayer(this.id);
      const isBubbled = statuses.some((s) => s.type === 'bubbled');
      if (isBubbled) {
        return;
      }
    }

    // Calculate velocity based on input keys
    let dx = 0;
    let dy = 0;

    if (keys.w) dy -= 1;
    if (keys.s) dy += 1;
    if (keys.a) dx -= 1;
    if (keys.d) dx += 1;

    // Normalize diagonal movement
    if (dx !== 0 && dy !== 0) {
      const len = Math.sqrt(dx * dx + dy * dy);
      dx /= len;
      dy /= len;
    }

    // Apply movement
    this.x += dx * PLAYER_SPEED * dt;
    this.y += dy * PLAYER_SPEED * dt;

    // Clamp to arena bounds
    this.x = Math.max(PLAYER_RADIUS, Math.min(ARENA_WIDTH - PLAYER_RADIUS, this.x));
    this.y = Math.max(PLAYER_RADIUS, Math.min(ARENA_HEIGHT - PLAYER_RADIUS, this.y));
  }

  takeDamage(amount: number): { dealt: number; overkill: number } {
    let finalAmount = amount;

    // Check for vulnerability status - multiplies damage by 10
    if (this.statusEffectManager) {
      const statuses = this.statusEffectManager.getStatusesForPlayer(this.id);
      const hasVulnerability = statuses.some((s) => s.type === 'vulnerability');
      if (hasVulnerability) {
        finalAmount = amount * 10;
      }
    }

    const overkill = Math.max(0, finalAmount - this.hp);
    this.hp = Math.max(0, this.hp - finalAmount);

    return { dealt: finalAmount, overkill };
  }

  /**
   * Apply knockback to this player
   * @param dirX Normalized knockback direction X
   * @param dirY Normalized knockback direction Y
   * @param distance Knockback distance in pixels
   * @param duration Knockback duration in ms
   * @param now Current timestamp
   */
  applyKnockback(
    dirX: number,
    dirY: number,
    distance: number,
    duration: number,
    now: number
  ): void {
    // Rooted players are immune to knockback
    if (this.statusEffectManager) {
      const statuses = this.statusEffectManager.getStatusesForPlayer(this.id);
      const isRooted = statuses.some((s) => s.type === 'rooted');
      if (isRooted) {
        return;
      }
    }

    // Ignore if already being knocked back
    if (this.knockback) {
      return;
    }

    // Pre-calculate wall-clamped endpoint
    const endpoint = calculateKnockbackEndpoint(this.x, this.y, dirX, dirY, distance);

    this.knockback = {
      startTime: now,
      startX: this.x,
      startY: this.y,
      endX: endpoint.x,
      endY: endpoint.y,
      duration,
    };
  }

  toState(): PlayerState {
    return {
      id: this.id,
      name: this.name,
      x: this.x,
      y: this.y,
      color: this.color,
      hp: this.hp,
      dead: this.dead,
      lastProcessedInput: this.lastProcessedInput,
      statusEffects: [], // Populated by StatusEffectManager
      knockback: this.knockback,
    };
  }
}
