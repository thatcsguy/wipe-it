import { Server } from 'socket.io';
import { Player } from './player';
import { GameState, PlayerInput, TICK_RATE, BROADCAST_RATE, MAX_PLAYERS, MAX_HP } from '../shared/types';
import { MechanicManager } from './mechanics/manager';
import { ChariotMechanic } from './mechanics/chariot';
import { SpreadMechanic } from './mechanics/spread';
import { Effect } from './mechanics/types';
import { StatusEffectManager } from './statusEffectManager';

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
  private statusEffectManager: StatusEffectManager = new StatusEffectManager();
  private playerCounter: number = 0;

  constructor(io: Server) {
    this.io = io;
  }

  getNextPlayerNumber(): number {
    return this.playerCounter + 1;
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

  addPlayer(socketId: string, name: string): { player: Player; playerNumber: number } | null {
    // Reject if game is full
    if (this.players.size >= MAX_PLAYERS) {
      return null;
    }

    // Assign color from pool
    const color = this.availableColors.shift();
    if (!color) {
      return null;
    }

    this.playerCounter++;
    const playerNumber = this.playerCounter;

    const player = new Player(socketId, name, color);
    player.setStatusEffectManager(this.statusEffectManager);
    this.players.set(socketId, player);
    this.inputQueues.set(socketId, []);

    return { player, playerNumber };
  }

  updatePlayerName(socketId: string, name: string): boolean {
    const player = this.players.get(socketId);
    if (player) {
      player.name = name;
      return true;
    }
    return false;
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
    this.mechanicManager.tick(now, this.players, this.statusEffectManager);

    // Update status effects
    this.statusEffectManager.tick(now, this.players);
  }

  private broadcast(): void {
    const allStatusEffects = this.statusEffectManager.getStates();
    const state: GameState = {
      players: Array.from(this.players.values()).map(p => {
        const playerState = p.toState();
        // Populate player-specific status effects for rendering
        playerState.statusEffects = allStatusEffects.filter(s => s.playerId === p.id);
        return playerState;
      }),
      mechanics: this.mechanicManager.getStates(),
      statusEffects: allStatusEffects,
      timestamp: Date.now(),
    };
    this.io.emit('state', state);
  }

  spawnChariot(x: number, y: number, radius: number, duration: number, effects: Effect[]): void {
    const mechanic = new ChariotMechanic(x, y, radius, duration, effects);
    this.mechanicManager.add(mechanic);
  }

  spawnSpread(playerId: string, radius: number, duration: number, effects: Effect[]): void {
    const mechanic = new SpreadMechanic(playerId, radius, duration, effects);
    this.mechanicManager.add(mechanic);
  }

  getStatusEffectManager(): StatusEffectManager {
    return this.statusEffectManager;
  }

  getPlayers(): Map<string, Player> {
    return this.players;
  }

  healAllPlayers(): void {
    for (const player of this.players.values()) {
      player.hp = MAX_HP;
    }
  }
}
