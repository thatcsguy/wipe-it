import { io, Socket } from 'socket.io-client';
import { getInputState, createInput, getSequenceNumber, hasInput } from './input';
import { startGame } from './game';
import { initAdmin, setChangeNameCallback } from './admin';
import './toast'; // Initialize toast system

// DOM elements
const modal = document.getElementById('modal') as HTMLDivElement;
const modalTitle = modal.querySelector('h2') as HTMLHeadingElement;
const nameInput = document.getElementById('name-input') as HTMLInputElement;
const joinBtn = document.getElementById('join-btn') as HTMLButtonElement;
const errorMessage = document.getElementById('error-message') as HTMLParagraphElement;

// Socket connection
const socket: Socket = io();

// Local player ID (assigned on successful join)
let localPlayerId: string | null = null;
let localPlayerName: string = '';
let isChangingName = false;

// Initialize admin panel
initAdmin(socket);

// Join button click handler (also used for name change)
joinBtn.addEventListener('click', () => {
  const name = nameInput.value.trim();
  if (!name) {
    showError('Please enter a name');
    return;
  }

  // Disable button while waiting for response
  joinBtn.disabled = true;
  errorMessage.classList.add('hidden');

  if (isChangingName) {
    // Send name change request
    socket.emit('changeName', { name });
    localPlayerName = name;
    modal.classList.add('hidden');
    joinBtn.disabled = false;
    isChangingName = false;
  } else {
    // Initial join
    socket.emit('join', { name });
  }
});

// Allow Enter key to submit
nameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    joinBtn.click();
  }
});

// Handle join response from server
socket.on('joinResponse', (response: { success: boolean; playerId?: string; playerNumber?: number; error?: string }) => {
  if (response.success && response.playerId) {
    // Success - hide modal and initialize game
    localPlayerId = response.playerId;
    localPlayerName = `Player ${response.playerNumber}`;
    modal.classList.add('hidden');
    console.log('Joined game with ID:', localPlayerId, 'as', localPlayerName);
    // Start the game loop
    startGame(socket, localPlayerId, localPlayerName);
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

// Show name change modal
function showNameChangeModal(): void {
  if (!localPlayerId) return;

  isChangingName = true;
  modalTitle.textContent = 'Change Name';
  joinBtn.textContent = 'Update';
  nameInput.value = localPlayerName;
  nameInput.placeholder = 'Enter new name';
  errorMessage.classList.add('hidden');
  modal.classList.remove('hidden');
  nameInput.focus();
  nameInput.select();
}

// Register the callback for admin panel
setChangeNameCallback(showNameChangeModal);

// Auto-join on page load
socket.emit('join', {});

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
