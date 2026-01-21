import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { Game } from './game';
import { PlayerInput, ARENA_WIDTH, ARENA_HEIGHT } from '../shared/types';
import { StatusEffect } from './statusEffect';
import { runEncounter } from './encounters/script-runner';
import { tetherLineCombo } from './encounters/scripts/combos/tether-line-combo';
import { orbitalOmen } from './encounters/scripts/combos/orbital-omen';
import { quadKnock } from './encounters/scripts/combos/quad-knock';
import { tutorialEncounter } from './encounters/scripts/encounters/tutorial-encounter';
import { scopedTimelineTest } from './encounters/scripts/tests/scoped-timeline-test';
import { triggerAtTest } from './encounters/scripts/tests/trigger-at-test';
import { dynamicSchedulingTest } from './encounters/scripts/tests/dynamic-scheduling-test';
import { subscriptTimelineIsolationTest } from './encounters/scripts/tests/subscript-timeline-isolation-test';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

const PORT = process.env.PORT || 3000;

// Create and start game instance
const game = new Game(io);
game.start();

// Serve static files from public/
app.use(express.static(path.join(__dirname, '../../public')));

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Handle join request
  socket.on('join', (data: { name?: string }) => {
    // Get player number first to generate default name if needed
    const playerNumber = game.getNextPlayerNumber();
    const name = data.name?.trim() || `Player ${playerNumber}`;
    const result = game.addPlayer(socket.id, name);

    if (result) {
      console.log(`Player joined: ${name} (${socket.id}) as Player ${result.playerNumber}`);
      socket.emit('joinResponse', {
        success: true,
        playerId: socket.id,
        playerNumber: result.playerNumber,
      });
    } else {
      console.log(`Join rejected for ${data.name}: game full`);
      socket.emit('joinResponse', {
        success: false,
        error: 'Game is full',
      });
    }
  });

  // Handle name change
  socket.on('changeName', (data: { name: string }) => {
    const success = game.updatePlayerName(socket.id, data.name);
    if (success) {
      console.log(`Player ${socket.id} changed name to: ${data.name}`);
    }
  });

  // Handle player input
  socket.on('input', (input: PlayerInput) => {
    game.queueInput(socket.id, input);
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    game.removePlayer(socket.id);
  });

  // Handle admin commands
  socket.on('admin:spawnChariot', (params?: { duration?: number }) => {
    const radius = ARENA_HEIGHT * 0.2;
    const padding = radius + 20;
    const x = padding + Math.random() * (ARENA_WIDTH - 2 * padding);
    const y = padding + Math.random() * (ARENA_HEIGHT - 2 * padding);
    const duration = params?.duration ?? 3000;
    game.spawnChariot(x, y, radius, duration);
    console.log(`Admin spawned chariot at (${x.toFixed(0)}, ${y.toFixed(0)})`);
  });

  socket.on('admin:spawnSpreads', (params?: { duration?: number }) => {
    const players = Array.from(game.getPlayers().keys());
    if (players.length > 0) {
      const radius = ARENA_HEIGHT * 0.15;
      const duration = params?.duration ?? 3000;
      for (const targetId of players) {
        game.spawnSpread(targetId, radius, duration);
      }
      console.log(`Admin spawned spreads on ${players.length} players`);
    } else {
      console.log('Admin tried to spawn spreads but no players in game');
    }
  });

  socket.on('admin:spawnStack', (params?: { duration?: number; radius?: number }) => {
    const players = Array.from(game.getPlayers().keys());
    if (players.length > 0) {
      // Pick a random player as target
      const targetId = players[Math.floor(Math.random() * players.length)];
      const radius = params?.radius ?? 80;
      const duration = params?.duration ?? 3000;
      game.spawnStack(targetId, radius, duration);
      console.log(`Admin spawned stack on player ${targetId} radius=${radius} duration=${duration}ms`);
    } else {
      console.log('Admin tried to spawn stack but no players in game');
    }
  });

  socket.on('admin:spawnRadialKnockback', (params?: { delay?: number, knockbackDuration?: number }) => {
    const originX = ARENA_WIDTH / 2;
    const originY = ARENA_HEIGHT / 2;
    const delay = params?.delay ?? 2000;
    const knockbackDistance = 150;
    const knockbackDuration = params?.knockbackDuration ?? 500;
    game.spawnRadialKnockback(originX, originY, delay, knockbackDistance, knockbackDuration);
    console.log(`Admin spawned radial knockback at (${originX}, ${originY}) delay=${delay}ms kbDuration=${knockbackDuration}ms`);
  });

  socket.on('admin:spawnLinearKnockback', (params?: { delay?: number, knockbackDuration?: number }) => {
    // Horizontal line through center, knockback southward
    const lineStartX = 0;
    const lineStartY = ARENA_HEIGHT / 2;
    const lineEndX = ARENA_WIDTH;
    const lineEndY = ARENA_HEIGHT / 2;
    const width = 800; // Full arena width for broad coverage
    const delay = params?.delay ?? 2000;
    const knockbackDistance = 150;
    const knockbackDuration = params?.knockbackDuration ?? 500;
    game.spawnLinearKnockback(lineStartX, lineStartY, lineEndX, lineEndY, width, delay, knockbackDistance, knockbackDuration);
    console.log(`Admin spawned linear knockback width=${width} delay=${delay}ms kbDuration=${knockbackDuration}ms`);
  });

  socket.on('admin:spawnPointTethers', (params?: { duration?: number }) => {
    const players = Array.from(game.getPlayers().keys());
    if (players.length > 0) {
      const requiredDistance = ARENA_WIDTH * 0.75;
      const duration = params?.duration ?? 3000;
      const pointEndpoint = { type: 'point' as const, x: ARENA_WIDTH / 2, y: 0 };
      for (const playerId of players) {
        const playerEndpoint = { type: 'player' as const, playerId };
        game.spawnTether(playerEndpoint, pointEndpoint, requiredDistance, duration);
      }
      console.log(`Admin spawned point tethers for ${players.length} players duration=${duration}ms`);
    } else {
      console.log('Admin tried to spawn point tethers but no players in game');
    }
  });

  socket.on('admin:spawnPlayerTethers', (params?: { duration?: number }) => {
    const players = Array.from(game.getPlayers().keys());
    if (players.length >= 2) {
      const requiredDistance = ARENA_WIDTH * 0.75;
      const duration = params?.duration ?? 3000;
      // Pick 2 random different players
      const shuffled = [...players].sort(() => Math.random() - 0.5);
      const [playerA, playerB] = shuffled;
      const endpointA = { type: 'player' as const, playerId: playerA };
      const endpointB = { type: 'player' as const, playerId: playerB };
      game.spawnTether(endpointA, endpointB, requiredDistance, duration);
      console.log(`Admin spawned player tether between ${playerA} and ${playerB} duration=${duration}ms`);
    } else {
      console.log('Admin tried to spawn player tethers but need at least 2 players');
    }
  });

  socket.on('admin:spawnMechanic', (data: { type: string }) => {
    if (data.type === 'chariot') {
      const radius = ARENA_HEIGHT * 0.2;
      const padding = radius + 20;
      const x = padding + Math.random() * (ARENA_WIDTH - 2 * padding);
      const y = padding + Math.random() * (ARENA_HEIGHT - 2 * padding);
      const duration = 3000;
      game.spawnChariot(x, y, radius, duration);
      console.log(`Admin spawned chariot at (${x.toFixed(0)}, ${y.toFixed(0)})`);
    } else if (data.type === 'spreads') {
      const players = Array.from(game.getPlayers().keys());
      if (players.length > 0) {
        const radius = ARENA_HEIGHT * 0.15;
        const duration = 3000;
        for (const targetId of players) {
          game.spawnSpread(targetId, radius, duration);
        }
        console.log(`Admin spawned spreads on ${players.length} players`);
      } else {
        console.log('Admin tried to spawn spreads but no players in game');
      }
    } else if (data.type === 'pointTethers') {
      const players = Array.from(game.getPlayers().keys());
      if (players.length > 0) {
        const requiredDistance = ARENA_WIDTH * 0.75;
        const duration = 3000;
        const pointEndpoint = { type: 'point' as const, x: ARENA_WIDTH / 2, y: 0 };
        for (const playerId of players) {
          const playerEndpoint = { type: 'player' as const, playerId };
          game.spawnTether(playerEndpoint, pointEndpoint, requiredDistance, duration);
        }
        console.log(`Admin spawned point tethers for ${players.length} players`);
      } else {
        console.log('Admin tried to spawn point tethers but no players in game');
      }
    } else if (data.type === 'playerTethers') {
      const players = Array.from(game.getPlayers().keys());
      if (players.length >= 2) {
        const requiredDistance = ARENA_WIDTH * 0.75;
        const duration = 3000;
        // Pick 2 random different players
        const shuffled = [...players].sort(() => Math.random() - 0.5);
        const [playerA, playerB] = shuffled;
        const endpointA = { type: 'player' as const, playerId: playerA };
        const endpointB = { type: 'player' as const, playerId: playerB };
        game.spawnTether(endpointA, endpointB, requiredDistance, duration);
        console.log(`Admin spawned player tether between ${playerA} and ${playerB}`);
      } else {
        console.log('Admin tried to spawn player tethers but need at least 2 players');
      }
    } else if (data.type === 'radialKnockback') {
      // Spawn radial knockback at arena center
      const originX = ARENA_WIDTH / 2;
      const originY = ARENA_HEIGHT / 2;
      const startDelay = 2000;
      const knockbackDistance = 150;
      const knockbackDuration = 500;
      game.spawnRadialKnockback(originX, originY, startDelay, knockbackDistance, knockbackDuration);
      console.log(`Admin spawned radial knockback at (${originX}, ${originY})`);
    } else if (data.type === 'linearKnockback') {
      // Spawn linear knockback: horizontal line through center, knockback southward
      const lineStartX = 0;
      const lineStartY = ARENA_HEIGHT / 2;
      const lineEndX = ARENA_WIDTH;
      const lineEndY = ARENA_HEIGHT / 2;
      const width = 800; // Full arena width for broad coverage
      const startDelay = 2000;
      const knockbackDistance = 150;
      const knockbackDuration = 500;
      game.spawnLinearKnockback(lineStartX, lineStartY, lineEndX, lineEndY, width, startDelay, knockbackDistance, knockbackDuration);
      console.log(`Admin spawned linear knockback (horizontal line, southward knockback, width=${width})`);
    }
  });

  // Handle admin line AOE spawn (no effects - use scripts for damage)
  socket.on('admin:spawnLineAoe', (params?: { duration?: number }) => {
    const startX = ARENA_WIDTH / 2;
    const startY = 0;
    const endX = ARENA_WIDTH / 2;
    const endY = ARENA_HEIGHT;
    const width = 100;
    const duration = params?.duration ?? 3000;
    game.spawnLineAoe(startX, startY, endX, endY, width, duration);
    console.log(`Admin spawned line AOE from (${startX}, ${startY}) to (${endX}, ${endY}) width=${width} duration=${duration}ms`);
  });

  // Handle admin conal AOE spawn
  socket.on('admin:spawnConalAoe', (params?: { duration?: number }) => {
    const centerX = ARENA_WIDTH / 2;
    const centerY = ARENA_HEIGHT / 2;
    const endpointX = centerX + 200;
    const endpointY = centerY;
    const angle = Math.PI / 2;
    const duration = params?.duration ?? 3000;
    game.spawnConalAoe(centerX, centerY, endpointX, endpointY, angle, duration);
    console.log(`Admin spawned conal AOE at (${centerX}, ${centerY}) endpoint=(${endpointX}, ${endpointY}) angle=${angle} duration=${duration}ms`);
  });

  // Handle admin tower spawn (no effects - use scripts for damage)
  socket.on('admin:spawnTower', (params?: { duration?: number }) => {
    // Test values: center of arena, radius 80, duration 5000ms, requires 2 players
    const x = ARENA_WIDTH / 2;
    const y = ARENA_HEIGHT / 2;
    const radius = 80;
    const duration = params?.duration ?? 5000;
    const requiredPlayers = 2;
    game.spawnTower(x, y, radius, duration, requiredPlayers);
    console.log(`Admin spawned tower at (${x}, ${y}) duration=${duration}ms`);
  });

  // Apply vulnerability to a random player (for testing)
  socket.on('admin:applyVulnerability', () => {
    const players = Array.from(game.getPlayers().keys());
    if (players.length > 0) {
      const targetId = players[Math.floor(Math.random() * players.length)];
      // 30 second duration for easier testing
      const status = new StatusEffect('vulnerability', targetId, 30000, [], []);
      game.getStatusEffectManager().add(status);
      console.log(`Admin applied vulnerability to player ${targetId} (status id: ${status.id})`);
    }
  });

  // Heal all players to max HP
  socket.on('admin:healAll', () => {
    game.healAllPlayers();
    console.log('Admin healed all players');
  });

  // Apply status effect to player (for testing)
  socket.on('admin:applyStatus', (params: { playerId?: string; statusType: string; duration: number }) => {
    const { statusType, duration } = params;
    const playerId = params.playerId ?? socket.id;
    const statusEffect = new StatusEffect(
      statusType as any,
      playerId,
      duration
    );
    game.getStatusEffectManager().add(statusEffect);
    console.log(`Admin applied ${statusType} to ${playerId} for ${duration}ms`);
  });

  // Spawn portal doodad at random arena edge
  socket.on('admin:spawnPortal', (params?: { duration?: number; x?: number; y?: number }) => {
    const duration = params?.duration ?? 5000;
    let x: number;
    let y: number;

    if (params?.x !== undefined && params?.y !== undefined) {
      // Use provided position
      x = params.x;
      y = params.y;
    } else {
      // Random edge position: pick a side (N, S, E, W) and random position along it
      const side = Math.floor(Math.random() * 4);
      const offset = -50; // How far outside the arena
      switch (side) {
        case 0: // North
          x = Math.random() * ARENA_WIDTH;
          y = offset;
          break;
        case 1: // South
          x = Math.random() * ARENA_WIDTH;
          y = ARENA_HEIGHT - offset;
          break;
        case 2: // East
          x = ARENA_WIDTH - offset;
          y = Math.random() * ARENA_HEIGHT;
          break;
        default: // West
          x = offset;
          y = Math.random() * ARENA_HEIGHT;
          break;
      }
    }

    game.getDoodadManager().spawn({
      type: 'portal',
      width: 80,
      height: 80,
      duration,
      layer: 'background',
      color: '#8844ff',
      x,
      y,
    });
    console.log(`Admin spawned portal at (${x.toFixed(0)}, ${y.toFixed(0)}) duration=${duration}ms`);
  });

  // Spawn anchored doodad for testing player-anchored behavior
  socket.on('admin:spawnAnchoredDoodad', (params: {
    type?: 'portal' | 'rect' | 'circle';
    anchorPlayerId: string;
    offsetX?: number;
    offsetY?: number;
    duration?: number;
    width?: number;
    height?: number;
    color?: string;
  }) => {
    const type = params.type ?? 'circle';
    const duration = params.duration ?? 10000;
    const width = params.width ?? 60;
    const height = params.height ?? 60;
    const color = params.color ?? '#00ff88';

    game.getDoodadManager().spawn({
      type,
      width,
      height,
      duration,
      layer: 'foreground',
      color,
      anchorPlayerId: params.anchorPlayerId,
      anchorOffset: {
        x: params.offsetX ?? 0,
        y: params.offsetY ?? 0,
      },
    });
    console.log(`Admin spawned ${type} doodad anchored to player ${params.anchorPlayerId}`);
  });

  // Run tether-line combo encounter
  socket.on('admin:runTetherLineCombo', () => {
    runEncounter(game, tetherLineCombo);
    console.log('Admin started tether-line combo');
  });

  // Run tutorial encounter
  socket.on('admin:runTutorialEncounter', () => {
    runEncounter(game, tutorialEncounter);
    console.log('Admin started tutorial encounter');
  });

  // Run orbital omen script
  socket.on('admin:runOrbitalOmen', () => {
    runEncounter(game, orbitalOmen);
    console.log('Admin started orbital omen');
  });

  // Run quad-knock script
  socket.on('admin:runQuadKnock', () => {
    runEncounter(game, quadKnock);
    console.log('Admin started quad-knock');
  });

  // Test scoped timeline for sub-scripts (TRIGGER-006a)
  socket.on('admin:runScopedTimelineTest', () => {
    runEncounter(game, scopedTimelineTest);
    console.log('Admin started scoped-timeline-test');
  });

  // Test triggerAt synchronizes mechanics to absolute time (TRIGGER-008)
  socket.on('admin:runTriggerAtTest', () => {
    runEncounter(game, triggerAtTest);
    console.log('Admin started trigger-at-test');
  });

  // Test dynamic scheduling during runTimeline() (TIMELINE-005)
  socket.on('admin:runDynamicSchedulingTest', () => {
    runEncounter(game, dynamicSchedulingTest);
    console.log('Admin started dynamic-scheduling-test');
  });

  // Test sub-script timeline isolation (TIMELINE-006)
  socket.on('admin:runSubscriptTimelineIsolationTest', () => {
    runEncounter(game, subscriptTimelineIsolationTest);
    console.log('Admin started subscript-timeline-isolation-test');
  });
});

httpServer.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

export { io, game };
