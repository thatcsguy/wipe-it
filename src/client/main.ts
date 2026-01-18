import { io, Socket } from 'socket.io-client';
import { getInputState, createInput, getSequenceNumber, hasInput } from './input';
import { startGame } from './game';
import { initAdmin } from './admin';

// DOM elements
const modal = document.getElementById('modal') as HTMLDivElement;
const nameInput = document.getElementById('name-input') as HTMLInputElement;
const joinBtn = document.getElementById('join-btn') as HTMLButtonElement;
const errorMessage = document.getElementById('error-message') as HTMLParagraphElement;

// Socket connection
const socket: Socket = io();

// Initialize admin panel
initAdmin(socket);

// Local player ID (assigned on successful join)
let localPlayerId: string | null = null;

// Join button click handler
joinBtn.addEventListener('click', () => {
  const name = nameInput.value.trim();
  if (!name) {
    showError('Please enter a name');
    return;
  }

  // Disable button while waiting for response
  joinBtn.disabled = true;
  errorMessage.classList.add('hidden');

  socket.emit('join', { name });
});

// Allow Enter key to submit
nameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    joinBtn.click();
  }
});

// Handle join response from server
socket.on('joinResponse', (response: { success: boolean; playerId?: string; error?: string }) => {
  if (response.success && response.playerId) {
    // Success - hide modal and initialize game
    localPlayerId = response.playerId;
    modal.classList.add('hidden');
    console.log('Joined game with ID:', localPlayerId);
    // Start the game loop
    startGame(socket, localPlayerId, nameInput.value.trim());
  } else {
    // Failed - show error
    showError(response.error || 'Failed to join');
    joinBtn.disabled = false;
  }
});

function showError(message: string): void {
  errorMessage.textContent = message;
  errorMessage.classList.remove('hidden');
}

// Export for use by other client modules
export { socket, localPlayerId };
export function getLocalPlayerId(): string | null {
  return localPlayerId;
}

// Expose input functions for testing/debugging
(window as any).__inputTest = {
  getInputState,
  createInput,
  getSequenceNumber,
  hasInput,
};
