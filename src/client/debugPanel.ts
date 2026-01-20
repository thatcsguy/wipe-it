import { GameState, PlayerState, MechanicState, TetherMechanicState, TetherEndpoint, TowerMechanicState, RadialKnockbackMechanicState, LinearKnockbackMechanicState, DoodadState } from '../shared/types';

let debugPanelElement: HTMLDivElement | null = null;
let playersSection: HTMLDivElement | null = null;
let mechanicsSection: HTMLDivElement | null = null;
let doodadsSection: HTMLDivElement | null = null;
let isDebugEnabled = false;

export function initDebugPanel(): void {
  debugPanelElement = document.getElementById('debug-panel') as HTMLDivElement;
  if (!debugPanelElement) return;

  const urlParams = new URLSearchParams(window.location.search);
  isDebugEnabled = urlParams.get('debug') === '1';

  // Create sections for players, mechanics, and doodads
  debugPanelElement.innerHTML = `
    <h3>Debug Panel</h3>
    <div id="debug-players" class="debug-section">
      <h4>Players</h4>
    </div>
    <div id="debug-mechanics" class="debug-section">
      <h4>Mechanics</h4>
    </div>
    <div id="debug-doodads" class="debug-section">
      <h4>Doodads</h4>
    </div>
  `;

  playersSection = document.getElementById('debug-players') as HTMLDivElement;
  mechanicsSection = document.getElementById('debug-mechanics') as HTMLDivElement;
  doodadsSection = document.getElementById('debug-doodads') as HTMLDivElement;
}

export function updateDebugPanel(gameState: GameState, localPlayerId: string | null): void {
  if (!debugPanelElement || !playersSection || !mechanicsSection || !doodadsSection) return;

  // Update players
  updatePlayersSection(gameState.players, localPlayerId);

  // Update mechanics
  updateMechanicsSection(gameState.mechanics, gameState.timestamp);

  // Update doodads
  updateDoodadsSection(gameState.doodads, gameState.players, gameState.timestamp);
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

    // Knockback state - KB-020
    if (player.knockback) {
      playerDiv.setAttribute('data-knockback-active', 'true');
    } else {
      playerDiv.removeAttribute('data-knockback-active');
    }

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
    } else if (mechanic.type === 'radialKnockback') {
      const radial = mechanic as RadialKnockbackMechanicState;
      mechanicDiv.setAttribute('data-origin-x', String(radial.originX));
      mechanicDiv.setAttribute('data-origin-y', String(radial.originY));
      mechanicDiv.setAttribute('data-kb-distance', String(radial.knockbackDistance));
      mechanicDiv.setAttribute('data-kb-duration', String(radial.knockbackDuration));
    } else if (mechanic.type === 'linearKnockback') {
      const linear = mechanic as LinearKnockbackMechanicState;
      mechanicDiv.setAttribute('data-line-start-x', String(linear.lineStartX));
      mechanicDiv.setAttribute('data-line-start-y', String(linear.lineStartY));
      mechanicDiv.setAttribute('data-line-end-x', String(linear.lineEndX));
      mechanicDiv.setAttribute('data-line-end-y', String(linear.lineEndY));
      mechanicDiv.setAttribute('data-kb-distance', String(linear.knockbackDistance));
      mechanicDiv.setAttribute('data-kb-duration', String(linear.knockbackDuration));
    }

    // Calculate time remaining
    const timeRemaining = Math.max(0, mechanic.endTime - serverTimestamp);
    mechanicDiv.textContent = `${mechanic.type} - expires ${Math.round(timeRemaining)}ms`;
  }
}

function updateDoodadsSection(doodads: DoodadState[], players: PlayerState[], serverTimestamp: number): void {
  if (!doodadsSection) return;

  const existingDoodads = doodadsSection.querySelectorAll('.debug-doodad');
  const currentDoodadIds = new Set(doodads.map(d => d.id));

  // Remove doodads no longer present
  existingDoodads.forEach(el => {
    const id = el.getAttribute('data-doodad-id');
    if (id && !currentDoodadIds.has(id)) {
      el.remove();
    }
  });

  // Build player position lookup
  const playerPositions = new Map<string, { x: number; y: number }>();
  for (const player of players) {
    playerPositions.set(player.id, { x: player.x, y: player.y });
  }

  // Update or add doodads
  for (const doodad of doodads) {
    let doodadDiv = doodadsSection.querySelector(`.debug-doodad[data-doodad-id="${doodad.id}"]`) as HTMLDivElement;

    if (!doodadDiv) {
      doodadDiv = document.createElement('div');
      doodadDiv.className = 'debug-doodad';
      doodadDiv.setAttribute('data-doodad-id', doodad.id);
      doodadsSection.appendChild(doodadDiv);
    }

    // Required attributes
    doodadDiv.setAttribute('data-type', doodad.type);
    doodadDiv.setAttribute('data-expires', String(doodad.endTime));

    // Resolve position
    let resolvedX: number | undefined;
    let resolvedY: number | undefined;

    if (doodad.anchorPlayerId && doodad.anchorOffset) {
      // Anchored doodad - resolve from player position
      const playerPos = playerPositions.get(doodad.anchorPlayerId);
      if (playerPos) {
        resolvedX = playerPos.x + doodad.anchorOffset.x;
        resolvedY = playerPos.y + doodad.anchorOffset.y;
      }
      doodadDiv.setAttribute('data-anchor-player', doodad.anchorPlayerId);
      doodadDiv.removeAttribute('data-x');
      doodadDiv.removeAttribute('data-y');
    } else if (doodad.x !== undefined && doodad.y !== undefined) {
      // Fixed position doodad
      resolvedX = doodad.x;
      resolvedY = doodad.y;
      doodadDiv.setAttribute('data-x', String(Math.round(doodad.x)));
      doodadDiv.setAttribute('data-y', String(Math.round(doodad.y)));
      doodadDiv.removeAttribute('data-anchor-player');
    }

    // Calculate time remaining
    const timeRemaining = Math.max(0, doodad.endTime - serverTimestamp);
    const posInfo = resolvedX !== undefined && resolvedY !== undefined
      ? ` at (${Math.round(resolvedX)}, ${Math.round(resolvedY)})`
      : '';
    doodadDiv.textContent = `${doodad.type}${posInfo} - expires ${Math.round(timeRemaining)}ms`;
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
