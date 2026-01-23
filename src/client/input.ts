import { InputKeys, PlayerInput } from '../shared/types';

// Current state of WASD keys
const keyState: InputKeys = {
  w: false,
  a: false,
  s: false,
  d: false,
};

// Sequence number for inputs (starts at 1, increments each input)
let sequenceNumber = 0;

// Set up keyboard event listeners
function setupInputListeners(): void {
  document.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    if (key === 'w') keyState.w = true;
    else if (key === 'a') keyState.a = true;
    else if (key === 's') keyState.s = true;
    else if (key === 'd') keyState.d = true;
  });

  document.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    if (key === 'w') keyState.w = false;
    else if (key === 'a') keyState.a = false;
    else if (key === 's') keyState.s = false;
    else if (key === 'd') keyState.d = false;
  });

  // Clear all keys when tab loses focus (prevents stuck keys on tab switch)
  window.addEventListener('blur', () => {
    keyState.w = false;
    keyState.a = false;
    keyState.s = false;
    keyState.d = false;
  });
}

// Get current input state (returns copy to avoid mutation)
export function getInputState(): InputKeys {
  return { ...keyState };
}

// Check if any movement key is pressed
export function hasInput(): boolean {
  return keyState.w || keyState.a || keyState.s || keyState.d;
}

// Create a PlayerInput with incrementing sequence number
export function createInput(dt: number): PlayerInput {
  sequenceNumber++;
  return {
    seq: sequenceNumber,
    keys: getInputState(),
    dt,
  };
}

// Get current sequence number (for testing/debugging)
export function getSequenceNumber(): number {
  return sequenceNumber;
}

// Initialize input system
setupInputListeners();
