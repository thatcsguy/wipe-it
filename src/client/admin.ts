import { Socket } from 'socket.io-client';
import { showToast } from './toast';

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
        showToast('Spawned chariot');
      }
    });
  }

  const spawnSpreadBtn = document.getElementById('spawn-spread-btn');
  if (spawnSpreadBtn) {
    spawnSpreadBtn.addEventListener('click', () => {
      if (adminSocket) {
        adminSocket.emit('admin:spawnMechanic', { type: 'spreads' });
        showToast('Spawned spreads');
      }
    });
  }

  const spawnPointTethersBtn = document.getElementById('spawn-point-tethers-btn');
  if (spawnPointTethersBtn) {
    spawnPointTethersBtn.addEventListener('click', () => {
      if (adminSocket) {
        adminSocket.emit('admin:spawnMechanic', { type: 'pointTethers' });
        showToast('Spawned point tethers');
      }
    });
  }

  const spawnPlayerTethersBtn = document.getElementById('spawn-player-tethers-btn');
  if (spawnPlayerTethersBtn) {
    spawnPlayerTethersBtn.addEventListener('click', () => {
      if (adminSocket) {
        adminSocket.emit('admin:spawnMechanic', { type: 'playerTethers' });
        showToast('Spawned player tethers');
      }
    });
  }

  const healAllBtn = document.getElementById('heal-all-btn');
  if (healAllBtn) {
    healAllBtn.addEventListener('click', () => {
      if (adminSocket) {
        adminSocket.emit('admin:healAll');
        showToast('Healed all players');
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
  emitSpawnPointTethers: () => {
    if (adminSocket) {
      adminSocket.emit('admin:spawnMechanic', { type: 'pointTethers' });
    }
  },
  emitSpawnPlayerTethers: () => {
    if (adminSocket) {
      adminSocket.emit('admin:spawnMechanic', { type: 'playerTethers' });
    }
  },
  emitHealAll: () => {
    if (adminSocket) {
      adminSocket.emit('admin:healAll');
    }
  }
};
