import { Player } from './player';
import { StatusEffectType, StatusEffectState, Effect } from '../shared/types';

// Icon paths for each status effect type
const STATUS_ICONS: Record<StatusEffectType, string> = {
  vulnerability: '/assets/vulnerability_icon.png',
  rooted: '/assets/rooted_icon.png',
};

export class StatusEffect {
  id: string;
  type: StatusEffectType;
  playerId: string;
  startTime: number;
  duration: number;
  ongoingEffects: Effect[];
  expirationEffects: Effect[];

  constructor(
    type: StatusEffectType,
    playerId: string,
    duration: number,
    ongoingEffects: Effect[] = [],
    expirationEffects: Effect[] = []
  ) {
    this.id = `status-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    this.type = type;
    this.playerId = playerId;
    this.startTime = Date.now();
    this.duration = duration;
    this.ongoingEffects = ongoingEffects;
    this.expirationEffects = expirationEffects;
  }

  tick(player: Player): void {
    // Apply ongoing effects each tick
    for (const effect of this.ongoingEffects) {
      if (effect.type === 'damage') {
        player.takeDamage(effect.amount);
      }
      // Status effects from ongoing don't nest (would cause infinite loop)
    }
  }

  isExpired(now: number): boolean {
    return now >= this.startTime + this.duration;
  }

  onExpire(player: Player): void {
    // Apply expiration effects when status ends
    for (const effect of this.expirationEffects) {
      if (effect.type === 'damage') {
        player.takeDamage(effect.amount);
      }
      // Status effects from expiration are handled by the manager
    }
  }

  toState(): StatusEffectState {
    return {
      type: this.type,
      iconPath: STATUS_ICONS[this.type],
      startTime: this.startTime,
      duration: this.duration,
      playerId: this.playerId,
    };
  }
}
