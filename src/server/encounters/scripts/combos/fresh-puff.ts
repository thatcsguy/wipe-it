import { Script } from '../../types';
import { all } from '../../targeting';

// === Timing Gaps (adjust these to tune pacing) ===
const TETHER_DELAY = 3000; // after orb spawn → tethers appear
const TETHER_DURATION = 15000; // how long tethers last before resolving
const ORB_MOVE_DURATION = 750; // orb travel time
const CHARIOT_DELAY_INTO_MOVE = 250; // after orb starts moving → chariot spawns
const CHARIOT_DURATION = 500; // chariot telegraph time
const AOE_DELAY_AFTER_LANDING = 5000; // after orbs land → AOEs fire
const AOE_DURATION = 2000; // AOE telegraph time

// === Computed Absolute Times (don't edit directly) ===
const ORB_SPAWN = 0;
const TETHER_START = TETHER_DELAY;
const TETHER_END = TETHER_START + TETHER_DURATION;
const ORB_MOVE_START = TETHER_END;
const CHARIOT_START = ORB_MOVE_START + CHARIOT_DELAY_INTO_MOVE;
const ORB_LANDING = ORB_MOVE_START + ORB_MOVE_DURATION;
const AOE_START = ORB_LANDING + AOE_DELAY_AFTER_LANDING;
const AOE_END = AOE_START + AOE_DURATION;
const SCRIPT_DURATION = AOE_END;

// === Derived Durations (auto-align with timeline) ===
const ORB_VISUAL_DURATION = SCRIPT_DURATION; // orbs visible until script ends

// === Mechanic Constants ===
const ORB_MOVE_DISTANCE = 200;
const CHARIOT_RADIUS = 50;
const CHARIOT_DAMAGE = 100;
const AOE_DAMAGE = 100;
const LINE_AOE_WIDTH = 200;
const LINE_AOE_LENGTH = 800;
const CONE_AOE_ANGLE = Math.PI / 6; // 30 degrees
const DYNAMO_INNER_RADIUS = 100;
const DYNAMO_OUTER_RADIUS = 600;

// === Position Constants ===
const CARDINAL_POSITIONS = [
  { x: 400, y: 200 }, // N
  { x: 600, y: 400 }, // E
  { x: 400, y: 600 }, // S
  { x: 200, y: 400 }, // W
];

const INTERCARDINAL_POSITIONS = [
  { x: 200, y: 200 }, // NW
  { x: 600, y: 200 }, // NE
  { x: 600, y: 600 }, // SE
  { x: 200, y: 600 }, // SW
];

const MIDDLE_POSITION = { x: 400, y: 400 };

/**
 * Fresh Puff:
 * Spawns 5 magic-orb doodads in either cardinal or intercardinal pattern.
 * Outer 4 orbs: alternating ice/lightning (opposite orbs same element).
 * Middle orb: 50/50 ice or wind.
 */
export const freshPuff: Script = async (runner) => {
  // === Setup ===
  runner.setArenaSkin('8x8-grid');

  // Random pattern: cardinals or intercardinals
  const useCardinals = Math.random() < 0.5;
  const outerPositions = useCardinals ? CARDINAL_POSITIONS : INTERCARDINAL_POSITIONS;

  // Outer orb elements: alternating ice/lightning, opposite orbs same element
  const startWithLightning = Math.random() < 0.5;
  const outerElements: OrbElement[] = startWithLightning
    ? ['lightning', 'ice', 'lightning', 'ice']
    : ['ice', 'lightning', 'ice', 'lightning'];

  // Middle orb: 50/50 ice or wind
  const middleElement: OrbElement = Math.random() < 0.5 ? 'ice' : 'wind';

  // Shared state for handlers
  const orbIds: string[] = [];
  const orbMovementData: OrbMovementData[] = [];

  // === Timeline ===
  runner.at(ORB_SPAWN, spawnOrbs);
  runner.at(TETHER_START, spawnTethers);
  runner.at(CHARIOT_START, spawnChariots);
  runner.at(AOE_START, fireAoes);

  await runner.runTimeline({ duration: SCRIPT_DURATION });

  // === Handlers ===
  function spawnOrbs() {
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
        duration: ORB_VISUAL_DURATION,
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
      duration: ORB_VISUAL_DURATION,
      layer: 'foreground',
      data: { element: middleElement },
    });
    orbIds.push(middleOrbId);
  }

  function spawnTethers() {
    const players = runner.select(all());
    if (players.length === 0) return;

    // Shuffle players for random assignment
    const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);

    // Assign each outer orb to a player and spawn tether
    for (let i = 0; i < 4; i++) {
      const playerIndex = i % shuffledPlayers.length;
      const player = shuffledPlayers[playerIndex];
      const orbPos = outerPositions[i];

      const tetherId = runner.spawn({
        type: 'tether',
        endpointA: { type: 'point', x: orbPos.x, y: orbPos.y },
        endpointB: { type: 'player', playerId: player.id },
        requiredDistance: 0,
        duration: TETHER_DURATION,
      });

      // On resolve: compute movement data and move orb
      runner.waitForResolve(tetherId).then(result => {
        const data = result.data as TetherResult;
        const playerPos = data.player2.position;

        // Calculate direction and destination
        const dx = playerPos.x - orbPos.x;
        const dy = playerPos.y - orbPos.y;
        const angle = Math.atan2(dy, dx);
        const destX = orbPos.x + Math.cos(angle) * ORB_MOVE_DISTANCE;
        const destY = orbPos.y + Math.sin(angle) * ORB_MOVE_DISTANCE;

        // Store for chariot and AOE phases
        orbMovementData[i] = { angle, destX, destY };

        // Move the orb toward the player
        runner.moveDoodad(orbIds[i], destX, destY, ORB_MOVE_DURATION);
      });
    }
  }

  function spawnChariots() {
    for (let i = 0; i < 4; i++) {
      const data = orbMovementData[i];
      if (!data) continue;

      const chariotId = runner.spawn({
        type: 'chariot',
        x: data.destX,
        y: data.destY,
        radius: CHARIOT_RADIUS,
        duration: CHARIOT_DURATION,
      });

      runner.waitForResolve(chariotId).then(result => {
        const { playersHit } = result.data as { playersHit: string[] };
        for (const playerId of playersHit) {
          runner.damage(playerId, CHARIOT_DAMAGE);
        }
      });
    }
  }

  function fireAoes() {
    fireOuterOrbAoes();
    fireMiddleOrbAoe();
  }

  function fireOuterOrbAoes() {
    for (let i = 0; i < 4; i++) {
      const data = orbMovementData[i];
      const element = outerElements[i];
      if (!data) continue;

      if (element === 'ice') {
        spawnIceLines(data.destX, data.destY, data.angle);
      } else if (element === 'lightning') {
        spawnLightningCones(data.destX, data.destY, data.angle);
      }
    }
  }

  function fireMiddleOrbAoe() {
    if (middleElement === 'ice') {
      spawnMiddleIceLines();
    } else if (middleElement === 'wind') {
      spawnMiddleDynamo();
    }
  }

  // === Helpers ===
  function spawnIceLines(x: number, y: number, baseAngle: number) {
    // 4 line AOEs at cardinal directions relative to movement
    const cardinalOffsets = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];
    for (const offset of cardinalOffsets) {
      const lineAngle = baseAngle + offset;
      const endX = x + Math.cos(lineAngle) * LINE_AOE_LENGTH;
      const endY = y + Math.sin(lineAngle) * LINE_AOE_LENGTH;

      const lineId = runner.spawn({
        type: 'lineAoe',
        startX: x,
        startY: y,
        endX,
        endY,
        width: LINE_AOE_WIDTH,
        duration: AOE_DURATION,
      });

      runner.waitForResolve(lineId).then(result => {
        const { playersHit } = result.data as { playersHit: string[] };
        for (const playerId of playersHit) {
          runner.damage(playerId, AOE_DAMAGE);
        }
      });
    }
  }

  function spawnLightningCones(x: number, y: number, baseAngle: number) {
    // 4 conal AOEs at intercardinal directions relative to movement
    const intercardinalOffsets = [Math.PI / 4, (3 * Math.PI) / 4, (5 * Math.PI) / 4, (7 * Math.PI) / 4];
    for (const offset of intercardinalOffsets) {
      const coneAngle = baseAngle + offset;
      const endpointX = x + Math.cos(coneAngle) * LINE_AOE_LENGTH;
      const endpointY = y + Math.sin(coneAngle) * LINE_AOE_LENGTH;

      const coneId = runner.spawn({
        type: 'conalAoe',
        centerX: x,
        centerY: y,
        endpointX,
        endpointY,
        angle: CONE_AOE_ANGLE,
        duration: AOE_DURATION,
      });

      runner.waitForResolve(coneId).then(result => {
        const { playersHit } = result.data as { playersHit: string[] };
        for (const playerId of playersHit) {
          runner.damage(playerId, AOE_DAMAGE);
        }
      });
    }
  }

  function spawnMiddleIceLines() {
    // N-S vertical line
    const nsLineId = runner.spawn({
      type: 'lineAoe',
      startX: MIDDLE_POSITION.x,
      startY: 0,
      endX: MIDDLE_POSITION.x,
      endY: 800,
      width: LINE_AOE_WIDTH,
      duration: AOE_DURATION,
    });
    runner.waitForResolve(nsLineId).then(result => {
      const { playersHit } = result.data as { playersHit: string[] };
      for (const playerId of playersHit) {
        runner.damage(playerId, AOE_DAMAGE);
      }
    });

    // E-W horizontal line
    const ewLineId = runner.spawn({
      type: 'lineAoe',
      startX: 0,
      startY: MIDDLE_POSITION.y,
      endX: 800,
      endY: MIDDLE_POSITION.y,
      width: LINE_AOE_WIDTH,
      duration: AOE_DURATION,
    });
    runner.waitForResolve(ewLineId).then(result => {
      const { playersHit } = result.data as { playersHit: string[] };
      for (const playerId of playersHit) {
        runner.damage(playerId, AOE_DAMAGE);
      }
    });
  }

  function spawnMiddleDynamo() {
    const dynamoId = runner.spawn({
      type: 'dynamo',
      x: MIDDLE_POSITION.x,
      y: MIDDLE_POSITION.y,
      innerRadius: DYNAMO_INNER_RADIUS,
      outerRadius: DYNAMO_OUTER_RADIUS,
      duration: AOE_DURATION,
    });
    runner.waitForResolve(dynamoId).then(result => {
      const { playersHit } = result.data as { playersHit: string[] };
      for (const playerId of playersHit) {
        runner.damage(playerId, AOE_DAMAGE);
      }
    });
  }
};

// === Types ===
type OrbElement = 'wind' | 'lightning' | 'ice';

interface OrbMovementData {
  angle: number;
  destX: number;
  destY: number;
}

interface TetherResult {
  player1: { id: string | null; position: { x: number; y: number } };
  player2: { id: string | null; position: { x: number; y: number } };
  stretched: boolean;
}
