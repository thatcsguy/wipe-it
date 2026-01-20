import { StatusEffectState } from '../shared/types';

// Local player ID for filtering status effects
let localPlayerId: string | null = null;

// Local player's status effects (synced from server state)
let localStatuses: StatusEffectState[] = [];

// Set local player ID (called when joining game)
export function setLocalPlayerId(id: string): void {
  localPlayerId = id;
}

// Update local player's status effects from server state
export function updateLocalStatuses(statuses: StatusEffectState[]): void {
  localStatuses = statuses;
}

// Check if local player has rooted status effect
export function isRooted(): boolean {
  return localStatuses.some((s) => s.type === 'rooted');
}

// Get all local statuses (for testing)
export function getLocalStatuses(): StatusEffectState[] {
  return [...localStatuses];
}

// Get local player ID (for testing)
export function getLocalPlayerId(): string | null {
  return localPlayerId;
}

// Expose for testing
(window as any).__localStatusTest = {
  setLocalPlayerId,
  updateLocalStatuses,
  isRooted,
  getLocalStatuses,
  getLocalPlayerId,
};
