# Wipe-It: Multiplayer Raiding Game Foundation

## Architecture Overview

```
┌─────────────────┐     Socket.IO      ┌─────────────────┐
│     Client      │◄──────────────────►│     Server      │
│  (Browser/Canvas)                    │   (Node.js)     │
│                 │                    │                 │
│ - Input capture │  inputs[]          │ - Game loop     │
│ - Prediction    │ ────────────────►  │ - Physics       │
│ - Interpolation │                    │ - State mgmt    │
│ - Rendering     │  ◄──────────────── │ - Validation    │
│                 │  gameState{}       │                 │
└─────────────────┘                    └─────────────────┘
```

## File Structure (TypeScript)

```
/
├── package.json
├── tsconfig.json           # Server TS config
├── tsconfig.client.json    # Client TS config (ES modules)
├── src/
│   ├── server/
│   │   ├── index.ts        # Express + Socket.IO setup
│   │   ├── game.ts         # Game loop, state, physics
│   │   └── player.ts       # Player class
│   ├── client/
│   │   ├── main.ts         # Entry, socket connection
│   │   ├── game.ts         # Client game loop
│   │   ├── input.ts        # WASD capture + sequencing
│   │   ├── renderer.ts     # Canvas drawing
│   │   └── network.ts      # Prediction/reconciliation/interpolation
│   └── shared/
│       └── types.ts        # Shared interfaces (PlayerState, Input, etc.)
└── public/
    ├── index.html          # Entry point + name prompt
    └── css/
        └── style.css
```

Build outputs:
- Server: `dist/server/` (CommonJS)
- Client: `public/js/` (ES modules, bundled via esbuild)

## Shared Types (`src/shared/types.ts`)

```ts
export interface PlayerState {
  id: string;
  name: string;
  x: number;
  y: number;
  color: string;
  lastProcessedInput: number;
}

export interface GameState {
  players: PlayerState[];
  timestamp: number;
}

export interface PlayerInput {
  seq: number;
  keys: InputKeys;
  dt: number;  // delta time for this input
}

export interface InputKeys {
  w: boolean;
  a: boolean;
  s: boolean;
  d: boolean;
}

export interface JoinRequest {
  name: string;
}

export interface JoinResponse {
  success: boolean;
  playerId?: string;
  error?: string;
}
```

## Implementation Tasks

### 1. Project Setup
- `package.json`: express, socket.io, typescript, esbuild, ts-node-dev
- `tsconfig.json` for server (target ES2020, module commonjs)
- `tsconfig.client.json` for client (target ES2020, module ESNext)
- npm scripts: `dev`, `build`, `start`

### 2. Shared Types (`src/shared/types.ts`)
- PlayerState, GameState, PlayerInput, InputKeys
- JoinRequest, JoinResponse
- Constants: TICK_RATE, PLAYER_SPEED, ARENA_SIZE, etc.

### 3. Server (`src/server/`)
- **index.ts**: Express static serving, Socket.IO setup
- **player.ts**: Player class with position, velocity, input processing
- **game.ts**: Game singleton - players map, game loop, input queue processing
- Fixed timestep loop (60Hz), broadcast at 20Hz
- Socket events: `join`, `input`, `disconnect`

### 4. Client Entry (`public/index.html`, `src/client/main.ts`)
- HTML: name modal, canvas element (800x600)
- main.ts: socket connect, join flow, init game on success

### 5. Input System (`src/client/input.ts`)
- Keyboard listener, tracks WASD state
- Generates sequenced inputs
- Sends inputs to server + stores for reconciliation

### 6. Network Layer (`src/client/network.ts`)
- **Prediction**: apply input to local player immediately
- **Reconciliation**: on state update, set to server pos, replay pending inputs
- **Interpolation**: buffer other players' positions, lerp with 100ms delay

### 7. Renderer (`src/client/renderer.ts`)
- Clear + draw arena border
- Draw each player: circle + name above
- Self uses predicted position, others use interpolated

### 8. Client Game Loop (`src/client/game.ts`)
- requestAnimationFrame loop
- Process input, update prediction, render

## Constants

```ts
export const TICK_RATE = 60;
export const BROADCAST_RATE = 20;
export const PLAYER_SPEED = 200;
export const PLAYER_RADIUS = 20;
export const ARENA_WIDTH = 800;
export const ARENA_HEIGHT = 600;
export const INTERPOLATION_DELAY = 100;
export const MAX_PLAYERS = 4;
export const COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12'];
```

## Future Considerations

- **Abilities**: `abilities: Ability[]` on player, cooldowns server-side
- **HP**: `hp: number`, `maxHp: number` on PlayerState
- **Boss**: new entity type, AI runs server-side, included in GameState
- **Mechanics**: server event system for stack/spread damage checks

## Verification

1. `npm install && npm run dev`
2. Open `localhost:3000` in 4 browser tabs
3. Enter different names, verify all see each other
4. Movement should feel responsive despite network
5. 5th tab should show "game full" error
6. Open devtools Network tab, throttle to 3G, confirm prediction still smooth
