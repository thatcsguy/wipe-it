// Game constants
export const TICK_RATE = 60;
export const BROADCAST_RATE = 20;
export const PLAYER_SPEED = 200;
export const PLAYER_RADIUS = 20;
export const ARENA_WIDTH = 800;
export const ARENA_HEIGHT = 800;
export const CANVAS_SIZE = 1000;
export const ARENA_OFFSET = 100;
export const MAX_PLAYERS = 4;
export const MAX_HP = 100;

// Input keys state
export interface InputKeys {
  w: boolean;
  a: boolean;
  s: boolean;
  d: boolean;
}

// Player input sent from client to server
export interface PlayerInput {
  seq: number;
  keys: InputKeys;
  dt: number;
}

// Status effect types
export type StatusEffectType = 'vulnerability';

export interface StatusEffectState {
  type: StatusEffectType;
  iconPath: string;
  startTime: number;
  duration: number;
  playerId: string;
}

// Effect type for mechanics to apply
export type Effect =
  | { type: 'damage'; amount: number }
  | { type: 'status'; statusType: StatusEffectType; duration: number };

// Player state
export interface PlayerState {
  id: string;
  name: string;
  x: number;
  y: number;
  color: string;
  hp: number;
  lastProcessedInput: number;
  statusEffects: StatusEffectState[];
}

// Mechanic types
export type MechanicType = 'chariot' | 'spread' | 'tether' | 'tower';

// Tether endpoint - either a player or a fixed point
export type TetherEndpoint =
  | { type: 'player'; playerId: string }
  | { type: 'point'; x: number; y: number };

// Chariot mechanic - fixed position AOE
export interface ChariotMechanicState {
  type: 'chariot';
  id: string;
  startTime: number;
  endTime: number;
  x: number;
  y: number;
  radius: number;
}

// Spread mechanic - follows a player, no x/y (position from player)
export interface SpreadMechanicState {
  type: 'spread';
  id: string;
  targetPlayerId: string;
  radius: number;
  startTime: number;
  endTime: number;
}

// Tether mechanic - connects two endpoints that must be stretched apart
export interface TetherMechanicState {
  type: 'tether';
  id: string;
  endpointA: TetherEndpoint;
  endpointB: TetherEndpoint;
  requiredDistance: number;
  damage: number;
  startTime: number;
  endTime: number;
}

// Tower mechanic - circle AOE requiring N players inside when it expires
export interface TowerMechanicState {
  type: 'tower';
  id: string;
  x: number;
  y: number;
  radius: number;
  startTime: number;
  endTime: number;
  requiredPlayers: number;
  failureEffects: Effect[];
  successEffects: Effect[];
}

// Union of all mechanic states
export type MechanicState = ChariotMechanicState | SpreadMechanicState | TetherMechanicState | TowerMechanicState;

// Tether resolution event - emitted when a tether mechanic resolves
export interface TetherResolutionEvent {
  mechanicId: string;
  success: boolean; // true if stretched enough, false if snapped
  affectedPlayerIds: string[]; // players who took damage (empty if success=true)
}

// Tower resolution event - emitted when a tower mechanic resolves
export interface TowerResolutionEvent {
  mechanicId: string;
  success: boolean; // true if enough players inside, false otherwise
  playersInside: number;
  required: number;
  x: number; // tower position for explosion animation
  y: number;
}

// Game state broadcast from server to clients
export interface GameState {
  players: PlayerState[];
  mechanics: MechanicState[];
  statusEffects: StatusEffectState[];
  timestamp: number;
}
