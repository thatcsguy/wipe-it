import { Script } from '../../types';

// === Timing Gaps ===
const ORB_DURATION = 15000;

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

  // Wait for orbs to expire (placeholder - later phases will add more logic)
  await runner.wait(ORB_DURATION);
};
