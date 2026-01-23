import { Script } from '../../types';
import { all } from '../../targeting';

// === Timing Constants ===
const ORB_DURATION = 15000;
const TETHER_SPAWN_TIME = 3000;
const TETHER_DURATION = 5000;
const ORB_MOVE_DISTANCE = 200;
const ORB_MOVE_DURATION = 750;

// === Position Constants ===
// Cardinal positions: N, E, S, W
const CARDINAL_POSITIONS = [
  { x: 400, y: 200 },  // N
  { x: 600, y: 400 },  // E
  { x: 400, y: 600 },  // S
  { x: 200, y: 400 },  // W
];

// Intercardinal positions: NE, SE, SW, NW
const INTERCARDINAL_POSITIONS = [
  { x: 200, y: 200 },  // NW
  { x: 600, y: 200 },  // NE
  { x: 600, y: 600 },  // SE
  { x: 200, y: 600 },  // SW
];

const MIDDLE_POSITION = { x: 400, y: 400 };

// Element types for orbs
type OrbElement = 'wind' | 'lightning' | 'ice';

/**
 * Fresh Puff:
 * Spawns 5 magic-orb doodads in either cardinal or intercardinal pattern.
 * Outer 4 orbs: alternating ice/lightning (opposite orbs same element).
 * Middle orb: 50/50 ice or wind.
 */
export const freshPuff: Script = async (runner, ctx) => {
  // === Setup ===
  runner.setArenaSkin('8x8-grid');

  // Choose random pattern: cardinals or intercardinals
  const useCardinals = Math.random() < 0.5;
  const outerPositions = useCardinals ? CARDINAL_POSITIONS : INTERCARDINAL_POSITIONS;

  // Determine outer orb elements: alternating ice/lightning, opposite orbs same element
  // Random which element starts at index 0
  const startWithLightning = Math.random() < 0.5;
  const outerElements: OrbElement[] = startWithLightning
    ? ['lightning', 'ice', 'lightning', 'ice']
    : ['ice', 'lightning', 'ice', 'lightning'];

  // Middle orb: 50/50 ice or wind
  const middleElement: OrbElement = Math.random() < 0.5 ? 'ice' : 'wind';

  // Store in context for later phases
  ctx.outerPositions = outerPositions;
  ctx.outerElements = outerElements;
  ctx.middleElement = middleElement;

  // === Spawn orbs at T=0 ===
  const orbIds: string[] = [];

  // Spawn outer orbs
  for (let i = 0; i < 4; i++) {
    const pos = outerPositions[i];
    const element = outerElements[i];
    const orbId = runner.spawnDoodad({
      type: 'magic-orb',
      x: pos.x,
      y: pos.y,
      width: 80,
      height: 80,
      duration: ORB_DURATION,
      layer: 'foreground',
      data: { element },
    });
    orbIds.push(orbId);
  }

  // Spawn middle orb
  const middleOrbId = runner.spawnDoodad({
    type: 'magic-orb',
    x: MIDDLE_POSITION.x,
    y: MIDDLE_POSITION.y,
    width: 80,
    height: 80,
    duration: ORB_DURATION,
    layer: 'foreground',
    data: { element: middleElement },
  });
  orbIds.push(middleOrbId);

  // Store orb IDs for later phases
  ctx.orbIds = orbIds;
  ctx.middleOrbId = middleOrbId;

  // === T=3000ms: Tether phase ===
  runner.at(TETHER_SPAWN_TIME, () => {
    const players = runner.select(all());
    if (players.length === 0) return;

    // Shuffle players for random assignment
    const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);

    // Store tether assignments: orbIndex -> playerId, plus tetherId
    const tetherAssignments: {
      orbIndex: number;
      playerId: string;
      orbPos: { x: number; y: number };
      tetherId: string;
    }[] = [];

    // Assign each outer orb (indices 0-3) to a player
    for (let i = 0; i < 4; i++) {
      // With 4+ players: 1:1 assignment; with fewer: cycle through
      const playerIndex = i % shuffledPlayers.length;
      const player = shuffledPlayers[playerIndex];
      const orbPos = outerPositions[i];

      // Spawn point-to-player tether
      const tetherId = runner.spawn({
        type: 'tether',
        endpointA: { type: 'point', x: orbPos.x, y: orbPos.y },
        endpointB: { type: 'player', playerId: player.id },
        requiredDistance: 0, // Always stretched visual
        duration: TETHER_DURATION,
      });

      tetherAssignments.push({
        orbIndex: i,
        playerId: player.id,
        orbPos,
        tetherId,
      });
    }

    // Store for later phases (orb movement, etc.)
    ctx.tetherAssignments = tetherAssignments;

    // Wait for all tethers to resolve, then move orbs
    for (const assignment of tetherAssignments) {
      runner.waitForResolve(assignment.tetherId).then(result => {
        // Extract player position at resolve time
        const data = result.data as {
          player1: { id: string | null; position: { x: number; y: number } };
          player2: { id: string | null; position: { x: number; y: number } };
          stretched: boolean;
        };

        // player2 is the player endpoint (player1 is the point)
        const playerPos = data.player2.position;
        const orbPos = assignment.orbPos;

        // Calculate direction from orb to player
        const dx = playerPos.x - orbPos.x;
        const dy = playerPos.y - orbPos.y;
        const angle = Math.atan2(dy, dx);

        // Calculate destination: 200px toward player from orb position
        const destX = orbPos.x + Math.cos(angle) * ORB_MOVE_DISTANCE;
        const destY = orbPos.y + Math.sin(angle) * ORB_MOVE_DISTANCE;

        // Store movement angle for AOE phase
        if (!ctx.orbMovementAngles) {
          ctx.orbMovementAngles = {} as Record<number, number>;
        }
        (ctx.orbMovementAngles as Record<number, number>)[assignment.orbIndex] = angle;

        // Store destination for chariot phase
        if (!ctx.orbDestinations) {
          ctx.orbDestinations = {} as Record<number, { x: number; y: number }>;
        }
        (ctx.orbDestinations as Record<number, { x: number; y: number }>)[assignment.orbIndex] = {
          x: destX,
          y: destY,
        };

        // Move the orb
        const orbId = orbIds[assignment.orbIndex];
        runner.moveDoodad(orbId, destX, destY, ORB_MOVE_DURATION);
      });
    }
  });

  // Run the timeline
  await runner.runTimeline({ duration: ORB_DURATION });
};
