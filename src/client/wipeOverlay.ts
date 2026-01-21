import { PlayerState } from '../shared/types';

// DOM element references
let overlayEl: HTMLElement | null = null;
let bannerEl: HTMLElement | null = null;
let readyCheckEl: HTMLElement | null = null;
let readyMessageEl: HTMLElement | null = null;
let readyListEl: HTMLElement | null = null;

// Track current players for ready list updates
let currentPlayers: PlayerState[] = [];

/**
 * Initialize the wipe overlay DOM structure.
 * Must be called once during game setup.
 */
export function initWipeOverlay(): void {
  const gameContainer = document.querySelector('.game-container');
  if (!gameContainer) {
    console.error('Cannot initialize wipe overlay: .game-container not found');
    return;
  }

  // Create overlay container
  overlayEl = document.createElement('div');
  overlayEl.id = 'wipe-overlay';
  overlayEl.classList.add('hidden');

  // Create banner
  bannerEl = document.createElement('div');
  bannerEl.className = 'wipe-banner';
  bannerEl.textContent = 'WIPE IT!';

  // Create ready check container
  readyCheckEl = document.createElement('div');
  readyCheckEl.className = 'ready-check';

  // Create ready message
  readyMessageEl = document.createElement('div');
  readyMessageEl.className = 'ready-message';
  readyMessageEl.textContent = 'Press R to ready up.';

  // Create ready list
  readyListEl = document.createElement('div');
  readyListEl.className = 'ready-list';

  // Assemble structure
  readyCheckEl.appendChild(readyMessageEl);
  readyCheckEl.appendChild(readyListEl);
  overlayEl.appendChild(bannerEl);
  overlayEl.appendChild(readyCheckEl);
  gameContainer.appendChild(overlayEl);
}

/**
 * Show the wipe overlay with player list.
 * @param players - Current player list to display
 */
export function showWipeOverlay(players: PlayerState[]): void {
  if (!overlayEl) return;

  currentPlayers = players;
  overlayEl.classList.remove('hidden');

  // Rebuild player list
  rebuildPlayerList(players, []);
}

/**
 * Hide the wipe overlay.
 */
export function hideWipeOverlay(): void {
  if (!overlayEl) return;
  overlayEl.classList.add('hidden');
}

/**
 * Update ready state indicators in the player list.
 * @param readyPlayerIds - Array of player IDs that are ready
 */
export function updateReadyState(readyPlayerIds: string[]): void {
  if (!readyListEl) return;

  // Update all player entries
  const entries = readyListEl.querySelectorAll('.player-entry');
  entries.forEach((entry) => {
    const playerId = entry.getAttribute('data-player-id');
    if (playerId && readyPlayerIds.includes(playerId)) {
      entry.classList.add('ready');
    } else {
      entry.classList.remove('ready');
    }
  });
}

/**
 * Rebuild the player list in the ready check UI.
 */
function rebuildPlayerList(players: PlayerState[], readyPlayerIds: string[]): void {
  if (!readyListEl) return;

  readyListEl.innerHTML = '';

  for (const player of players) {
    const entry = document.createElement('div');
    entry.className = 'player-entry';
    entry.setAttribute('data-player-id', player.id);
    entry.textContent = player.name;

    if (readyPlayerIds.includes(player.id)) {
      entry.classList.add('ready');
    }

    readyListEl.appendChild(entry);
  }
}

/**
 * Update the player list while preserving ready states.
 * Called when players join/leave during wipe.
 */
export function updatePlayerList(players: PlayerState[], readyPlayerIds: string[]): void {
  currentPlayers = players;
  rebuildPlayerList(players, readyPlayerIds);
}
