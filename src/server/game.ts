import { Server } from 'socket.io';
import { Player } from './player';
import { GameState, PlayerInput, TICK_RATE, BROADCAST_RATE, MAX_PLAYERS } from '../shared/types';
import { MechanicManager } from './mechanics/manager';

// Color pool for players
const COLOR_POOL = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12'];

export class Game {
  private players: Map<string, Player> = new Map();
  private availableColors: string[] = [...COLOR_POOL];
  private inputQueues: Map<string, PlayerInput[]> = new Map();
  private io: Server;
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private broadcastInterval: ReturnType<typeof setInterval> | null = null;
  private mechanicManager: MechanicManager = new MechanicManager();

  constructor(io: Server) {
    this.io = io;
  }

  start(): void {
    // Physics loop at 60Hz
    const tickMs = 1000 / TICK_RATE;
    this.tickInterval = setInterval(() => this.tick(), tickMs);

    // Broadcast loop at 20Hz
    const broadcastMs = 1000 / BROADCAST_RATE;
    this.broadcastInterval = setInterval(() => this.broadcast(), broadcastMs);
  }

  stop(): void {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    if (this.broadcastInterval) {
      clearInterval(this.broadcastInterval);
      this.broadcastInterval = null;
    }
  }

  addPlayer(socketId: string, name: string): Player | null {
    // Reject if game is full
    if (this.players.size >= MAX_PLAYERS) {
      return null;
    }

    // Assign color from pool
    const color = this.availableColors.shift();
    if (!color) {
      return null;
    }

    const player = new Player(socketId, name, color);
    this.players.set(socketId, player);
    this.inputQueues.set(socketId, []);

    return player;
  }

  removePlayer(socketId: string): void {
    const player = this.players.get(socketId);
    if (player) {
      // Return color to pool
      this.availableColors.push(player.color);
      this.players.delete(socketId);
      this.inputQueues.delete(socketId);
    }
  }

  queueInput(socketId: string, input: PlayerInput): void {
    const queue = this.inputQueues.get(socketId);
    if (queue) {
      queue.push(input);
    }
  }

  getPlayer(socketId: string): Player | undefined {
    return this.players.get(socketId);
  }

  private tick(): void {
    const now = Date.now();

    // Process all queued inputs for each player
    for (const [socketId, player] of this.players) {
      const queue = this.inputQueues.get(socketId);
      if (queue) {
        while (queue.length > 0) {
          const input = queue.shift()!;
          player.processInput(input);
        }
      }
    }

    // Update mechanics (tick + resolve expired)
    this.mechanicManager.tick(now, this.players);
  }

  private broadcast(): void {
    const state: GameState = {
      players: Array.from(this.players.values()).map(p => p.toState()),
      mechanics: this.mechanicManager.getStates(),
      timestamp: Date.now(),
    };
    this.io.emit('state', state);
  }
}
