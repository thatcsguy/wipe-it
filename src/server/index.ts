import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { Game } from './game';
import { PlayerInput } from '../shared/types';

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
});

httpServer.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

export { io, game };
