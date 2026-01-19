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
  socket.on('join', (data: { name: string }) => {
    const player = game.addPlayer(socket.id, data.name);

    if (player) {
      console.log(`Player joined: ${data.name} (${socket.id})`);
      socket.emit('joinResponse', {
        success: true,
        playerId: socket.id,
      });
    } else {
      console.log(`Join rejected for ${data.name}: game full`);
      socket.emit('joinResponse', {
        success: false,
        error: 'Game is full',
      });
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
    } else if (data.type === 'spread') {
      const players = Array.from(game.getPlayers().keys());
      if (players.length > 0) {
        const targetId = players[Math.floor(Math.random() * players.length)];
        const radius = ARENA_HEIGHT * 0.15;
        const duration = 3000;
        const effects = [{ type: 'damage' as const, amount: 25 }];
        game.spawnSpread(targetId, radius, duration, effects);
        console.log(`Admin spawned spread on player ${targetId}`);
      } else {
        console.log('Admin tried to spawn spread but no players in game');
      }
    }
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
