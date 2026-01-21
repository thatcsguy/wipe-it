import { StatusEffectState } from '../shared/types';

// Local player ID for filtering status effects
let localPlayerId: string | null = null;

// Local player's status effects (synced from server state)
let localStatuses: StatusEffectState[] = [];

// Local player's dead state (synced from server state)
let localDead: boolean = false;

// Set local player ID (called when joining game)
export function setLocalPlayerId(id: string): void {
  localPlayerId = id;
}

// Update local player's status effects from server state
export function updateLocalStatuses(statuses: StatusEffectState[]): void {
  localStatuses = statuses;
}

// Update local player's dead state from server state
export function updateLocalDead(dead: boolean): void {
  localDead = dead;
}

// Check if local player is dead
export function isLocalDead(): boolean {
  return localDead;
}

// Check if local player has rooted status effect
export function isRooted(): boolean {
  return localStatuses.some((s) => s.type === 'rooted');
}

// Check if local player has bubbled status effect
export function isBubbled(): boolean {
  return localStatuses.some((s) => s.type === 'bubbled');
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
  updateLocalDead,
  isRooted,
  isBubbled,
  isLocalDead,
  getLocalStatuses,
  getLocalPlayerId,
};
