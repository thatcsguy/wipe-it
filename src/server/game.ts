import { EventEmitter } from 'events';
import { Server } from 'socket.io';
import { Player } from './player';
import { GameState, PlayerInput, TICK_RATE, BROADCAST_RATE, MAX_PLAYERS, MAX_HP, TetherResolutionEvent, TowerResolutionEvent, PLAYER_RADIUS, ARENA_WIDTH, ARENA_HEIGHT } from '../shared/types';
import { getKnockbackPosition } from '../shared/knockback';
import { MechanicManager } from './mechanics/manager';
import { ChariotMechanic } from './mechanics/chariot';
import { SpreadMechanic } from './mechanics/spread';
import { TetherMechanic } from './mechanics/tether';
import { TowerMechanic } from './mechanics/tower';
import { RadialKnockbackMechanic } from './mechanics/radialKnockback';
import { LinearKnockbackMechanic } from './mechanics/linearKnockback';
import { LineAoeMechanic } from './mechanics/lineAoe';
import { ConalAoeMechanic } from './mechanics/conalAoe';
import { StackMechanic } from './mechanics/stack';
import { TetherEndpoint } from '../shared/types';
import { StatusEffectManager } from './statusEffectManager';
import { MechanicResult, Script } from './encounters/types';
import { DoodadManager } from './doodads/manager';

// Color pool for players
const COLOR_POOL = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12'];

export class Game extends EventEmitter {
  private players: Map<string, Player> = new Map();
  private availableColors: string[] = [...COLOR_POOL];
  private inputQueues: Map<string, PlayerInput[]> = new Map();
  private io: Server;
  private tickInterval: ReturnType<typeof setInterval> | null = null;
  private broadcastInterval: ReturnType<typeof setInterval> | null = null;
  private mechanicManager: MechanicManager = new MechanicManager();
  private statusEffectManager: StatusEffectManager = new StatusEffectManager();
  private doodadManager: DoodadManager = new DoodadManager();
  private playerCounter: number = 0;
  godMode: boolean = true;
  wipeInProgress: boolean = false;
  readyPlayers: Set<string> = new Set();
  activeScript: Script | null = null;

  constructor(io: Server) {
    super();
    this.io = io;

    // Register callback for mechanic resolution events (legacy socket.io events)
    this.mechanicManager.onResolution((result) => {
      if (result && 'mechanicId' in result) {
        // Check for TowerResolutionEvent (has 'required' field)
        if ('required' in result) {
          this.io.emit('tower:resolved', result as TowerResolutionEvent);
        } else if ('affectedPlayerIds' in result) {
          // TetherResolutionEvent
          this.io.emit('tether:resolved', result as TetherResolutionEvent);
        }
      }
    });

    // Register callback for generic mechanic result events (for encounter scripts)
    this.mechanicManager.onMechanicResult((result: MechanicResult) => {
      this.emit('mechanicResolved', result);
    });
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

  broadcastDamage(playerId: string, playerName: string, dealt: number, overkill: number): void {
    this.io.emit('player:damaged', { playerId, playerName, dealt, overkill });
  }

  private tick(): void {
    const now = Date.now();

    // Process all queued inputs for each player
    for (const [socketId, player] of this.players) {
      const queue = this.inputQueues.get(socketId);
      if (queue) {
        while (queue.length > 0) {
          const input = queue.shift()!;
          player.processInput(input, now);
        }
      }
    }

    // Update knockback positions for all players (60Hz updates even without inputs)
    for (const player of this.players.values()) {
      if (player.knockback) {
        const result = getKnockbackPosition(player.knockback, now);
        player.x = result.x;
        player.y = result.y;

        // Clamp to arena bounds
        player.x = Math.max(PLAYER_RADIUS, Math.min(ARENA_WIDTH - PLAYER_RADIUS, player.x));
        player.y = Math.max(PLAYER_RADIUS, Math.min(ARENA_HEIGHT - PLAYER_RADIUS, player.y));

        // Clear knockback when complete
        if (!result.active) {
          player.knockback = undefined;
        }
      }
    }

    // Update mechanics (tick + resolve expired)
    this.mechanicManager.tick(now, this.players, this.statusEffectManager);

    // Update status effects
    this.statusEffectManager.tick(now, this.players);

    // Update doodads (remove expired)
    this.doodadManager.tick(now);

    // Death detection: check if any player has hp <= 0 (only if god mode off and wipe not in progress)
    if (!this.godMode && !this.wipeInProgress) {
      for (const player of this.players.values()) {
        if (player.hp <= 0 && !player.dead) {
          player.setDead(true);
          this.triggerWipe();
          break; // Only trigger once per tick
        }
      }
    }
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
      doodads: this.doodadManager.getStates(),
      timestamp: Date.now(),
      godMode: this.godMode,
      wipeInProgress: this.wipeInProgress,
      readyPlayerIds: Array.from(this.readyPlayers),
    };
    this.io.emit('state', state);
  }

  spawnChariot(x: number, y: number, radius: number, duration: number): string {
    const mechanic = new ChariotMechanic(x, y, radius, duration);
    this.mechanicManager.add(mechanic);
    return mechanic.id;
  }

  spawnSpread(playerId: string, radius: number, duration: number): string {
    const mechanic = new SpreadMechanic(playerId, radius, duration);
    this.mechanicManager.add(mechanic);
    return mechanic.id;
  }

  spawnTether(
    endpointA: TetherEndpoint,
    endpointB: TetherEndpoint,
    requiredDistance: number,
    duration: number
  ): string {
    const mechanic = new TetherMechanic(
      endpointA,
      endpointB,
      requiredDistance,
      duration
    );
    this.mechanicManager.add(mechanic);
    return mechanic.id;
  }

  spawnTower(
    x: number,
    y: number,
    radius: number,
    duration: number,
    requiredPlayers: number
  ): string {
    const now = Date.now();
    const id = `tower-${now}-${Math.random().toString(36).substr(2, 9)}`;
    const mechanic = new TowerMechanic(
      id,
      x,
      y,
      radius,
      now,
      now + duration,
      requiredPlayers
    );
    this.mechanicManager.add(mechanic);
    return id;
  }

  spawnRadialKnockback(
    originX: number,
    originY: number,
    startDelay: number,
    knockbackDistance: number,
    knockbackDuration: number
  ): string {
    const mechanic = new RadialKnockbackMechanic(
      originX,
      originY,
      startDelay,
      knockbackDistance,
      knockbackDuration
    );
    this.mechanicManager.add(mechanic);
    return mechanic.id;
  }

  spawnLinearKnockback(
    lineStartX: number,
    lineStartY: number,
    lineEndX: number,
    lineEndY: number,
    width: number,
    startDelay: number,
    knockbackDistance: number,
    knockbackDuration: number
  ): string {
    const mechanic = new LinearKnockbackMechanic(
      lineStartX,
      lineStartY,
      lineEndX,
      lineEndY,
      width,
      startDelay,
      knockbackDistance,
      knockbackDuration
    );
    this.mechanicManager.add(mechanic);
    return mechanic.id;
  }

  spawnLineAoe(
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    width: number,
    duration: number
  ): string {
    const mechanic = new LineAoeMechanic(startX, startY, endX, endY, width, duration);
    this.mechanicManager.add(mechanic);
    return mechanic.id;
  }

  spawnConalAoe(
    centerX: number,
    centerY: number,
    endpointX: number,
    endpointY: number,
    angle: number,
    duration: number
  ): string {
    const mechanic = new ConalAoeMechanic(centerX, centerY, endpointX, endpointY, angle, duration);
    this.mechanicManager.add(mechanic);
    return mechanic.id;
  }

  spawnStack(targetPlayerId: string, radius: number, duration: number): string {
    const mechanic = new StackMechanic(targetPlayerId, radius, duration);
    this.mechanicManager.add(mechanic);
    return mechanic.id;
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

  getState(): GameState {
    const allStatusEffects = this.statusEffectManager.getStates();
    return {
      players: Array.from(this.players.values()).map(p => {
        const playerState = p.toState();
        playerState.statusEffects = allStatusEffects.filter(s => s.playerId === p.id);
        return playerState;
      }),
      mechanics: this.mechanicManager.getStates(),
      statusEffects: allStatusEffects,
      doodads: this.doodadManager.getStates(),
      timestamp: Date.now(),
      godMode: this.godMode,
      wipeInProgress: this.wipeInProgress,
      readyPlayerIds: Array.from(this.readyPlayers),
    };
  }

  getDoodadManager(): DoodadManager {
    return this.doodadManager;
  }

  toggleGodMode(): void {
    this.godMode = !this.godMode;
  }

  isWipeTriggered(): boolean {
    return this.wipeInProgress;
  }

  triggerWipe(): void {
    this.wipeInProgress = true;
    this.io.emit('wipe:started');
  }

  setPlayerReady(socketId: string): void {
    this.readyPlayers.add(socketId);
    // Check if all connected players are ready
    if (this.readyPlayers.size === this.players.size) {
      this.resetEncounter();
    }
  }

  resetEncounter(): void {
    // Heal all players to full HP
    for (const player of this.players.values()) {
      player.hp = MAX_HP;
      player.setDead(false);
    }

    // Clear ready state
    this.readyPlayers.clear();
    this.wipeInProgress = false;

    // Emit reset event to clients
    this.io.emit('wipe:reset');

    // Re-run active script if set
    if (this.activeScript) {
      // Import runEncounter dynamically to avoid circular dependency
      import('./encounters/script-runner').then(({ runEncounter }) => {
        runEncounter(this, this.activeScript!);
      });
    }
  }

  setActiveScript(script: Script | null): void {
    this.activeScript = script;
  }
}
