# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Wipe-It is a browser-based 1-4 player real-time multiplayer raiding game with client-side prediction, server reconciliation, and entity interpolation. Full-stack TypeScript (Node.js backend + Web frontend).

## Commands

```bash
npm run dev      # Start dev server with hot-reload (localhost:3000)
npm run build    # Compile TypeScript + bundle client
npm start        # Run compiled production build
```

Build process: `tsc` (server) → `tsc -p tsconfig.client.json` (client) → `esbuild` bundles to `public/js/main.js`

## Architecture

### Server (`src/server/`)
- **index.ts**: Express + Socket.IO setup, handles `join`, `input`, `disconnect` events
- **game.ts**: Game singleton - 60Hz physics tick, 20Hz state broadcast to all clients
- **player.ts**: Player state, `processInput()` applies WASD with delta time, clamps to bounds

### Client (`src/client/`)
- **main.ts**: Socket.IO connection, join flow, calls `startGame()`
- **input.ts**: WASD keyboard capture, creates sequenced `PlayerInput` objects
- **network.ts**: Core netcode - prediction, reconciliation, interpolation
- **game.ts**: requestAnimationFrame loop - input → predict → send → reconcile → render
- **renderer.ts**: Canvas 2D drawing (arena, players with names)

### Shared (`src/shared/types.ts`)
- Contains constants and interfaces needed by both server and client.

## Key Netcode Patterns

1. **Client-Side Prediction**: Inputs applied locally immediately, stored in `pendingInputs[]`
2. **Server Reconciliation**: On state update, discard acknowledged inputs (seq ≤ lastProcessedInput), reset to server position, replay remaining inputs
3. **Entity Interpolation**: Other players rendered ~100ms in past using buffered position snapshots

## Testing

Run manually with Playwright:
1. `npm run dev`
2. Open multiple browser tabs
3. Test as needed

Test utilities exposed on window: `__inputTest`, `__gameTest`, `__networkTest`, `__rendererTest`
