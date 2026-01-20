import { Socket } from 'socket.io-client';
import { logCombat } from './combatLog';

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
        logCombat('Spawned chariot');
      }
    });
  }

  const spawnSpreadBtn = document.getElementById('spawn-spread-btn');
  if (spawnSpreadBtn) {
    spawnSpreadBtn.addEventListener('click', () => {
      if (adminSocket) {
        adminSocket.emit('admin:spawnMechanic', { type: 'spreads' });
        logCombat('Spawned spreads');
      }
    });
  }

  const spawnPointTethersBtn = document.getElementById('spawn-point-tethers-btn');
  if (spawnPointTethersBtn) {
    spawnPointTethersBtn.addEventListener('click', () => {
      if (adminSocket) {
        adminSocket.emit('admin:spawnMechanic', { type: 'pointTethers' });
        logCombat('Spawned point tethers');
      }
    });
  }

  const spawnPlayerTethersBtn = document.getElementById('spawn-player-tethers-btn');
  if (spawnPlayerTethersBtn) {
    spawnPlayerTethersBtn.addEventListener('click', () => {
      if (adminSocket) {
        adminSocket.emit('admin:spawnMechanic', { type: 'playerTethers' });
        logCombat('Spawned player tethers');
      }
    });
  }

  const spawnTowerBtn = document.getElementById('spawn-tower-btn');
  if (spawnTowerBtn) {
    spawnTowerBtn.addEventListener('click', () => {
      if (adminSocket) {
        adminSocket.emit('admin:spawnTower');
        logCombat('Spawned tower');
      }
    });
  }

  const healAllBtn = document.getElementById('heal-all-btn');
  if (healAllBtn) {
    healAllBtn.addEventListener('click', () => {
      if (adminSocket) {
        adminSocket.emit('admin:healAll');
        logCombat('Healed all players');
      }
    });
  }

  const spawnRadialKbBtn = document.getElementById('spawn-radial-kb-btn');
  if (spawnRadialKbBtn) {
    spawnRadialKbBtn.addEventListener('click', () => {
      if (adminSocket) {
        adminSocket.emit('admin:spawnMechanic', { type: 'radialKnockback' });
        logCombat('Spawned radial knockback');
      }
    });
  }

  const spawnLinearKbBtn = document.getElementById('spawn-linear-kb-btn');
  if (spawnLinearKbBtn) {
    spawnLinearKbBtn.addEventListener('click', () => {
      if (adminSocket) {
        adminSocket.emit('admin:spawnMechanic', { type: 'linearKnockback' });
        logCombat('Spawned linear knockback');
      }
    });
  }

  const spawnLineAoeBtn = document.getElementById('spawn-line-aoe-btn');
  if (spawnLineAoeBtn) {
    spawnLineAoeBtn.addEventListener('click', () => {
      if (adminSocket) {
        adminSocket.emit('admin:spawnLineAoe');
        logCombat('Spawned line AOE');
      }
    });
  }

  const spawnConalAoeBtn = document.getElementById('spawn-conal-aoe-btn');
  if (spawnConalAoeBtn) {
    spawnConalAoeBtn.addEventListener('click', () => {
      if (adminSocket) {
        adminSocket.emit('admin:spawnConalAoe');
        logCombat('Spawned conal AOE');
      }
    });
  }

  const runTetherLineBtn = document.getElementById('run-tether-line-btn');
  if (runTetherLineBtn) {
    runTetherLineBtn.addEventListener('click', () => {
      if (adminSocket) {
        adminSocket.emit('admin:runTetherLineCombo');
        logCombat('Started tether-line combo');
      }
    });
  }

  const runTutorialBtn = document.getElementById('run-tutorial-btn');
  if (runTutorialBtn) {
    runTutorialBtn.addEventListener('click', () => {
      if (adminSocket) {
        adminSocket.emit('admin:runTutorialEncounter');
        logCombat('Started tutorial encounter');
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
  emitSpawnChariot: (params?: { duration?: number }) => {
    if (adminSocket) {
      adminSocket.emit('admin:spawnChariot', params);
    }
  },
  emitSpawnSpreads: (params?: { duration?: number }) => {
    if (adminSocket) {
      adminSocket.emit('admin:spawnSpreads', params);
    }
  },
  emitSpawnPointTethers: (params?: { duration?: number }) => {
    if (adminSocket) {
      adminSocket.emit('admin:spawnPointTethers', params);
    }
  },
  emitSpawnPlayerTethers: (params?: { duration?: number }) => {
    if (adminSocket) {
      adminSocket.emit('admin:spawnPlayerTethers', params);
    }
  },
  emitSpawnTower: (params?: { duration?: number }) => {
    if (adminSocket) {
      adminSocket.emit('admin:spawnTower', params);
    }
  },
  emitHealAll: () => {
    if (adminSocket) {
      adminSocket.emit('admin:healAll');
    }
  },
  emitSpawnRadialKnockback: (params?: { delay?: number, knockbackDuration?: number }) => {
    if (adminSocket) {
      adminSocket.emit('admin:spawnRadialKnockback', params);
    }
  },
  emitSpawnLinearKnockback: (params?: { delay?: number, knockbackDuration?: number }) => {
    if (adminSocket) {
      adminSocket.emit('admin:spawnLinearKnockback', params);
    }
  },
  emitSpawnLineAoe: (params?: { duration?: number }) => {
    if (adminSocket) {
      adminSocket.emit('admin:spawnLineAoe', params);
    }
  },
  emitSpawnConalAoe: (params?: { duration?: number }) => {
    if (adminSocket) {
      adminSocket.emit('admin:spawnConalAoe', params);
    }
  },
  emitRunTetherLineCombo: () => {
    if (adminSocket) {
      adminSocket.emit('admin:runTetherLineCombo');
    }
  },
  emitRunTutorialEncounter: () => {
    if (adminSocket) {
      adminSocket.emit('admin:runTutorialEncounter');
    }
  }
};
