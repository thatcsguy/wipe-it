import { Socket } from 'socket.io-client';

let adminSocket: Socket | null = null;
let onChangeName: (() => void) | null = null;

export function initAdmin(socket: Socket): void {
  adminSocket = socket;

  const changeNameBtn = document.getElementById('change-name-btn');
  if (changeNameBtn) {
    changeNameBtn.addEventListener('click', () => {
      if (onChangeName) {
        onChangeName();
      }
    });
  }

  const spawnChariotBtn = document.getElementById('spawn-chariot-btn');
  if (spawnChariotBtn) {
    spawnChariotBtn.addEventListener('click', () => {
      if (adminSocket) {
        adminSocket.emit('admin:spawnMechanic', { type: 'chariot' });
      }
    });
  }

  const spawnSpreadBtn = document.getElementById('spawn-spread-btn');
  if (spawnSpreadBtn) {
    spawnSpreadBtn.addEventListener('click', () => {
      if (adminSocket) {
        adminSocket.emit('admin:spawnMechanic', { type: 'spreads' });
      }
    });
  }

  const healAllBtn = document.getElementById('heal-all-btn');
  if (healAllBtn) {
    healAllBtn.addEventListener('click', () => {
      if (adminSocket) {
        adminSocket.emit('admin:healAll');
      }
    });
  }
}

export function setChangeNameCallback(callback: () => void): void {
  onChangeName = callback;
}

// Expose for testing
(window as any).__adminTest = {
  getSocket: () => adminSocket,
  emitSpawnChariot: () => {
    if (adminSocket) {
      adminSocket.emit('admin:spawnMechanic', { type: 'chariot' });
    }
  },
  emitSpawnSpreads: () => {
    if (adminSocket) {
      adminSocket.emit('admin:spawnMechanic', { type: 'spreads' });
    }
  },
  emitHealAll: () => {
    if (adminSocket) {
      adminSocket.emit('admin:healAll');
    }
  }
};
