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
export type StatusEffectType = 'vulnerability' | 'rooted' | 'root-warning';

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

// Knockback state on a player
export interface KnockbackState {
  startTime: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  duration: number;
}

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
  knockback?: KnockbackState;
}

// Mechanic types
export type MechanicType = 'chariot' | 'spread' | 'tether' | 'tower' | 'radialKnockback' | 'linearKnockback' | 'lineAoe' | 'conalAoe';

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
}

// Radial knockback mechanic - pushes all players away from origin
export interface RadialKnockbackMechanicState {
  type: 'radialKnockback';
  id: string;
  originX: number;
  originY: number;
  startTime: number;
  endTime: number;
  knockbackDistance: number;
  knockbackDuration: number;
}

// Linear knockback mechanic - pushes players inside rectangle perpendicular to line
export interface LinearKnockbackMechanicState {
  type: 'linearKnockback';
  id: string;
  lineStartX: number;
  lineStartY: number;
  lineEndX: number;
  lineEndY: number;
  width: number;
  startTime: number;
  endTime: number;
  knockbackDistance: number;
  knockbackDuration: number;
}

// Line AOE mechanic - rectangular AOE defined by center line and width
export interface LineAoeMechanicState {
  type: 'lineAoe';
  id: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  width: number;
  startTime: number;
  endTime: number;
}

// Conal AOE mechanic - pie slice/sector AOE from center point
export interface ConalAoeMechanicState {
  type: 'conalAoe';
  id: string;
  centerX: number;
  centerY: number;
  endpointX: number;
  endpointY: number;
  angle: number;
  startTime: number;
  endTime: number;
}

// Union of all mechanic states
export type MechanicState = ChariotMechanicState | SpreadMechanicState | TetherMechanicState | TowerMechanicState | RadialKnockbackMechanicState | LinearKnockbackMechanicState | LineAoeMechanicState | ConalAoeMechanicState;

// Doodad types - visual-only elements with no gameplay effect
export type DoodadType = 'portal' | 'rect' | 'circle';
export type DoodadLayer = 'background' | 'foreground';

// Doodad anchor offset for player-anchored doodads
export interface DoodadAnchorOffset {
  x: number;
  y: number;
}

// Doodad state - visual elements that can be fixed or player-anchored
export interface DoodadState {
  id: string;
  type: DoodadType;
  width: number;
  height: number;
  rotation: number;
  startTime: number;
  endTime: number;
  opacity?: number;
  layer: DoodadLayer;
  color: string;
  data?: Record<string, unknown>;
  // Position: either fixed (x, y) or anchored to player
  x?: number;
  y?: number;
  anchorPlayerId?: string;
  anchorOffset?: DoodadAnchorOffset;
}

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
  doodads: DoodadState[];
  timestamp: number;
}
