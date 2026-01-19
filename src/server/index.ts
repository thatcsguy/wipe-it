import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { Game } from './game';
import { PlayerInput, ARENA_WIDTH, ARENA_HEIGHT } from '../shared/types';
import { StatusEffect } from './statusEffect';

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
  socket.on('admin:spawnMechanic', (data: { type: string }) => {
    if (data.type === 'chariot') {
      const radius = ARENA_HEIGHT * 0.2;
      const padding = radius + 20;
      const x = padding + Math.random() * (ARENA_WIDTH - 2 * padding);
      const y = padding + Math.random() * (ARENA_HEIGHT - 2 * padding);
      const duration = 3000;
      const effects = [{ type: 'damage' as const, amount: 25 }];
      game.spawnChariot(x, y, radius, duration, effects);
      console.log(`Admin spawned chariot at (${x.toFixed(0)}, ${y.toFixed(0)})`);
    } else if (data.type === 'spreads') {
      const players = Array.from(game.getPlayers().keys());
      if (players.length > 0) {
        const radius = ARENA_HEIGHT * 0.15;
        const duration = 3000;
        const effects = [{ type: 'damage' as const, amount: 25 }];
        for (const targetId of players) {
          game.spawnSpread(targetId, radius, duration, effects);
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
        const damage = 100;
        const pointEndpoint = { type: 'point' as const, x: ARENA_WIDTH / 2, y: 0 };
        for (const playerId of players) {
          const playerEndpoint = { type: 'player' as const, playerId };
          game.spawnTether(playerEndpoint, pointEndpoint, requiredDistance, damage, duration);
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
        const damage = 100;
        // Pick 2 random different players
        const shuffled = [...players].sort(() => Math.random() - 0.5);
        const [playerA, playerB] = shuffled;
        const endpointA = { type: 'player' as const, playerId: playerA };
        const endpointB = { type: 'player' as const, playerId: playerB };
        game.spawnTether(endpointA, endpointB, requiredDistance, damage, duration);
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
      const startDelay = 2000;
      const knockbackDistance = 150;
      const knockbackDuration = 500;
      game.spawnLinearKnockback(lineStartX, lineStartY, lineEndX, lineEndY, startDelay, knockbackDistance, knockbackDuration);
      console.log(`Admin spawned linear knockback (horizontal line, southward knockback)`);
    }
  });

  // Handle admin tower spawn
  socket.on('admin:spawnTower', () => {
    // Test values: center of arena, radius 80, duration 5000ms, requires 2 players
    const x = ARENA_WIDTH / 2;
    const y = ARENA_HEIGHT / 2;
    const radius = 80;
    const duration = 5000;
    const requiredPlayers = 2;
    const failureEffects = [{ type: 'damage' as const, amount: 50 }];
    const successEffects: { type: 'damage'; amount: number }[] = [];
    game.spawnTower(x, y, radius, duration, requiredPlayers, failureEffects, successEffects);
    console.log(`Admin spawned tower at (${x}, ${y})`);
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
});

httpServer.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

export { io, game };
