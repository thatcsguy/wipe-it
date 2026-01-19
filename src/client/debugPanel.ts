import { GameState, PlayerState, MechanicState, TetherMechanicState, TetherEndpoint, TowerMechanicState } from '../shared/types';

let debugPanelElement: HTMLDivElement | null = null;
let playersSection: HTMLDivElement | null = null;
let mechanicsSection: HTMLDivElement | null = null;
let isDebugEnabled = false;

export function initDebugPanel(): void {
  debugPanelElement = document.getElementById('debug-panel') as HTMLDivElement;
  if (!debugPanelElement) return;

  const urlParams = new URLSearchParams(window.location.search);
  isDebugEnabled = urlParams.get('debug') === '1';

  // Create sections for players and mechanics
  debugPanelElement.innerHTML = `
    <h3>Debug Panel</h3>
    <div id="debug-players" class="debug-section">
      <h4>Players</h4>
    </div>
    <div id="debug-mechanics" class="debug-section">
      <h4>Mechanics</h4>
    </div>
  `;

  playersSection = document.getElementById('debug-players') as HTMLDivElement;
  mechanicsSection = document.getElementById('debug-mechanics') as HTMLDivElement;
}

export function updateDebugPanel(gameState: GameState, localPlayerId: string | null): void {
  if (!debugPanelElement || !playersSection || !mechanicsSection) return;

  // Update players
  updatePlayersSection(gameState.players, localPlayerId);

  // Update mechanics
  updateMechanicsSection(gameState.mechanics, gameState.timestamp);
}

function updatePlayersSection(players: PlayerState[], localPlayerId: string | null): void {
  if (!playersSection) return;

  // Keep h4 header, clear player divs
  const existingPlayers = playersSection.querySelectorAll('.debug-player');
  const existingPlayerIds = new Set<string>();

  existingPlayers.forEach(el => {
    const id = el.getAttribute('data-player-id');
    if (id) existingPlayerIds.add(id);
  });

  const currentPlayerIds = new Set(players.map(p => p.id));

  // Remove players no longer present
  existingPlayers.forEach(el => {
    const id = el.getAttribute('data-player-id');
    if (id && !currentPlayerIds.has(id)) {
      el.remove();
    }
  });

  // Update or add players
  for (const player of players) {
    let playerDiv = playersSection.querySelector(`.debug-player[data-player-id="${player.id}"]`) as HTMLDivElement;

    if (!playerDiv) {
      playerDiv = document.createElement('div');
      playerDiv.className = 'debug-player';
      playerDiv.setAttribute('data-player-id', player.id);
      playersSection.appendChild(playerDiv);
    }

    // Update attributes
    playerDiv.setAttribute('data-hp', String(player.hp));
    playerDiv.setAttribute('data-x', String(Math.round(player.x)));
    playerDiv.setAttribute('data-y', String(Math.round(player.y)));

    // Build status effects HTML
    const statusHtml = player.statusEffects.map(effect =>
      `<span class="debug-status" data-effect="${effect.type}">${effect.type}</span>`
    ).join('');

    // Update content with health bar
    const hpPercent = (player.hp / 100) * 100;
    const isLocal = player.id === localPlayerId;
    playerDiv.innerHTML = `
      <div class="debug-player-info">
        <span class="debug-player-name">${player.name}${isLocal ? ' (you)' : ''}: ${player.hp}HP</span>
        <span class="debug-player-pos">(${Math.round(player.x)}, ${Math.round(player.y)})</span>
      </div>
      <div class="debug-health-bar">
        <div class="debug-health-fill" style="width: ${hpPercent}%"></div>
      </div>
      <div class="debug-status-effects">${statusHtml}</div>
    `;
  }
}

function formatEndpoint(endpoint: TetherEndpoint): string {
  if (endpoint.type === 'player') {
    return `player:${endpoint.playerId}`;
  }
  return `point:${endpoint.x},${endpoint.y}`;
}

function updateMechanicsSection(mechanics: MechanicState[], serverTimestamp: number): void {
  if (!mechanicsSection) return;

  const existingMechanics = mechanicsSection.querySelectorAll('.debug-mechanic');
  const currentMechanicIds = new Set(mechanics.map(m => m.id));

  // Remove mechanics no longer present
  existingMechanics.forEach(el => {
    const id = el.getAttribute('data-mechanic-id');
    if (id && !currentMechanicIds.has(id)) {
      el.remove();
    }
  });

  // Update or add mechanics
  for (const mechanic of mechanics) {
    let mechanicDiv = mechanicsSection.querySelector(`.debug-mechanic[data-mechanic-id="${mechanic.id}"]`) as HTMLDivElement;

    if (!mechanicDiv) {
      mechanicDiv = document.createElement('div');
      mechanicDiv.className = 'debug-mechanic';
      mechanicDiv.setAttribute('data-mechanic-id', mechanic.id);
      mechanicsSection.appendChild(mechanicDiv);
    }

    // Update attributes
    mechanicDiv.setAttribute('data-type', mechanic.type);
    mechanicDiv.setAttribute('data-expires', String(mechanic.endTime));

    // Add type-specific attributes
    if (mechanic.type === 'tether') {
      const tether = mechanic as TetherMechanicState;
      mechanicDiv.setAttribute('data-endpoint-a', formatEndpoint(tether.endpointA));
      mechanicDiv.setAttribute('data-endpoint-b', formatEndpoint(tether.endpointB));
      mechanicDiv.setAttribute('data-required-distance', String(tether.requiredDistance));
    } else if (mechanic.type === 'tower') {
      const tower = mechanic as TowerMechanicState;
      mechanicDiv.setAttribute('data-required-players', String(tower.requiredPlayers));
    }

    // Calculate time remaining
    const timeRemaining = Math.max(0, mechanic.endTime - serverTimestamp);
    mechanicDiv.textContent = `${mechanic.type} - expires ${Math.round(timeRemaining)}ms`;
  }
}

// Expose for testing - INTEGRATION-002
(window as any).__debugTest = {
  show: () => {
    if (debugPanelElement) {
      debugPanelElement.classList.remove('hidden');
      isDebugEnabled = true;
    }
  },
  hide: () => {
    if (debugPanelElement) {
      debugPanelElement.classList.add('hidden');
      isDebugEnabled = false;
    }
  },
  isVisible: () => {
    return debugPanelElement ? !debugPanelElement.classList.contains('hidden') : false;
  },
  getElement: () => debugPanelElement,
};
