import {
  PlayerState,
  PlayerInput,
  InputKeys,
  PLAYER_SPEED,
  PLAYER_RADIUS,
  ARENA_WIDTH,
  ARENA_HEIGHT,
  MAX_HP,
} from '../shared/types';

export class Player {
  id: string;
  name: string;
  x: number;
  y: number;
  color: string;
  hp: number;
  lastProcessedInput: number;

  constructor(id: string, name: string, color: string) {
    this.id = id;
    this.name = name;
    this.color = color;
    this.hp = MAX_HP;
    // Start in center of arena
    this.x = ARENA_WIDTH / 2;
    this.y = ARENA_HEIGHT / 2;
    this.lastProcessedInput = 0;
  }

  processInput(input: PlayerInput): void {
    const { keys, dt, seq } = input;

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

    // Track last processed input for client reconciliation
    this.lastProcessedInput = seq;
  }

  takeDamage(amount: number): void {
    this.hp = Math.max(0, this.hp - amount);
  }

  toState(): PlayerState {
    return {
      id: this.id,
      name: this.name,
      x: this.x,
      y: this.y,
      color: this.color,
      hp: this.hp,
      lastProcessedInput: this.lastProcessedInput,
      statusEffects: [], // Populated by StatusEffectManager
    };
  }
}
