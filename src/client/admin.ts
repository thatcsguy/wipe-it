import { Socket } from 'socket.io-client';

let adminSocket: Socket | null = null;

export function initAdmin(socket: Socket): void {
  adminSocket = socket;

  const spawnChariotBtn = document.getElementById('spawn-chariot-btn');
  if (spawnChariotBtn) {
    spawnChariotBtn.addEventListener('click', () => {
      if (adminSocket) {
        adminSocket.emit('admin:spawnMechanic', { type: 'chariot' });
      }
    });
  }
}

// Expose for testing
(window as any).__adminTest = {
  getSocket: () => adminSocket,
  emitSpawnChariot: () => {
    if (adminSocket) {
      adminSocket.emit('admin:spawnMechanic', { type: 'chariot' });
    }
  }
};
