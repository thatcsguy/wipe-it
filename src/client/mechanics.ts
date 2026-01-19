import { MechanicState, ChariotMechanicState, SpreadMechanicState, TetherMechanicState, TetherEndpoint, PlayerState } from '../shared/types';

// Chariot color (orange-yellow)
const CHARIOT_COLOR = '#ff9f40';
const CHARIOT_FILL_ALPHA = 0.3;
const CHARIOT_INNER_ALPHA = 0.5;

// Spread colors (FFXIV-style pink/purple)
const SPREAD_OUTER_COLOR = 'rgba(255, 128, 255, 0.3)';
const SPREAD_BORDER_COLOR = 'rgba(200, 100, 200, 0.8)';

// Tether colors
const TETHER_UNSTRETCHED_COLOR = '#ff66aa'; // Pink/magenta when close
const TETHER_STRETCHED_COLOR = '#ffcc00';   // Orange/yellow when stretched

// Position lookup data for spread mechanics
export interface PlayerPositionData {
  players: PlayerState[];
  localPlayerId: string | null;
  localPosition: { x: number; y: number } | null;
  interpolatedPositions?: Map<string, { x: number; y: number }>;
}

// Get player position considering prediction and interpolation
function getPlayerPosition(playerId: string, posData: PlayerPositionData): { x: number; y: number } | null {
  // Local player with prediction
  if (posData.localPlayerId === playerId && posData.localPosition) {
    return posData.localPosition;
  }
  // Interpolated position
  const interpolated = posData.interpolatedPositions?.get(playerId);
  if (interpolated) {
    return interpolated;
  }
  // Server position fallback
  const player = posData.players.find(p => p.id === playerId);
  if (player) {
    return { x: player.x, y: player.y };
  }
  return null;
}

// Render a chariot mechanic - expanding inner circle shows progress
function renderChariot(
  ctx: CanvasRenderingContext2D,
  mechanic: ChariotMechanicState,
  serverTime: number
): void {
  const { x, y, radius, startTime, endTime } = mechanic;

  // Calculate progress (0 to 1)
  const duration = endTime - startTime;
  const elapsed = serverTime - startTime;
  const progress = Math.max(0, Math.min(1, elapsed / duration));

  // Outer circle (full radius, semi-transparent fill)
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(255, 159, 64, ${CHARIOT_FILL_ALPHA})`;
  ctx.fill();
  ctx.strokeStyle = CHARIOT_COLOR;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Inner circle (expanding based on progress)
  const innerRadius = radius * progress;
  if (innerRadius > 0) {
    ctx.beginPath();
    ctx.arc(x, y, innerRadius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 159, 64, ${CHARIOT_INNER_ALPHA})`;
    ctx.fill();
  }
}

// Render a spread mechanic - FFXIV-style pink/purple circle following a player
function renderSpread(
  ctx: CanvasRenderingContext2D,
  mechanic: SpreadMechanicState,
  serverTime: number,
  posData: PlayerPositionData
): void {
  const { targetPlayerId, radius } = mechanic;

  // Get target player position
  const pos = getPlayerPosition(targetPlayerId, posData);
  if (!pos) return; // Player not found

  const { x, y } = pos;

  // Edge gradient (transparent center, pink at edge)
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, 'rgba(255, 128, 255, 0)');
  gradient.addColorStop(0.7, 'rgba(255, 128, 255, 0)');
  gradient.addColorStop(1, 'rgba(255, 128, 255, 0.4)');

  // Draw filled circle with gradient
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();

  // Outer border
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.strokeStyle = SPREAD_BORDER_COLOR;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Radiating pulse wave (1 second cycle, 500ms travel time)
  const cycleTime = serverTime % 1000;
  if (cycleTime < 500) {
    const pulseProgress = cycleTime / 500; // 0 to 1 over 500ms
    const pulseRadius = radius * pulseProgress;
    const pulseAlpha = 0.5 * (1 - pulseProgress); // fade out as it expands

    ctx.beginPath();
    ctx.arc(x, y, pulseRadius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 180, 255, ${pulseAlpha})`;
    ctx.lineWidth = 4;
    ctx.stroke();
  }
}

// Get endpoint position (player or fixed point)
function getEndpointPosition(endpoint: TetherEndpoint, posData: PlayerPositionData): { x: number; y: number } | null {
  if (endpoint.type === 'point') {
    return { x: endpoint.x, y: endpoint.y };
  }
  return getPlayerPosition(endpoint.playerId, posData);
}

// Render a tether mechanic - line between two endpoints with visual state based on distance
function renderTether(
  ctx: CanvasRenderingContext2D,
  mechanic: TetherMechanicState,
  posData: PlayerPositionData
): void {
  const { endpointA, endpointB, requiredDistance } = mechanic;

  // Get positions for both endpoints
  const posA = getEndpointPosition(endpointA, posData);
  const posB = getEndpointPosition(endpointB, posData);
  if (!posA || !posB) return;

  // Calculate current distance
  const dx = posB.x - posA.x;
  const dy = posB.y - posA.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Determine if tether is stretched (safe) or unstretched (danger)
  const isStretched = distance >= requiredDistance;

  ctx.save();

  if (isStretched) {
    // STRETCHED STATE: thin orange/yellow line with glow
    ctx.strokeStyle = TETHER_STRETCHED_COLOR;
    ctx.lineWidth = 2;
    ctx.shadowColor = TETHER_STRETCHED_COLOR;
    ctx.shadowBlur = 15;

    ctx.beginPath();
    ctx.moveTo(posA.x, posA.y);
    ctx.lineTo(posB.x, posB.y);
    ctx.stroke();

    // Draw second pass for stronger glow
    ctx.shadowBlur = 25;
    ctx.stroke();
  } else {
    // UNSTRETCHED STATE: thick pink line with chevrons
    ctx.strokeStyle = TETHER_UNSTRETCHED_COLOR;
    ctx.lineWidth = 6;
    ctx.shadowColor = TETHER_UNSTRETCHED_COLOR;
    ctx.shadowBlur = 5;

    // Draw the main line
    ctx.beginPath();
    ctx.moveTo(posA.x, posA.y);
    ctx.lineTo(posB.x, posB.y);
    ctx.stroke();

    // Draw chevrons along the line pointing toward the closer endpoint
    ctx.shadowBlur = 0;
    ctx.fillStyle = TETHER_UNSTRETCHED_COLOR;

    // Normalize direction vector
    const len = distance || 1;
    const dirX = dx / len;
    const dirY = dy / len;

    // Perpendicular vector for chevron width
    const perpX = -dirY;
    const perpY = dirX;

    // Chevron properties - fixed count based on required stretch distance
    const chevronSideLength = 30;  // Length of each arm of the V
    const chevronHalfAngle = Math.PI / 8;  // Acute angle (22.5 degrees from center)
    const numChevrons = Math.max(1, Math.ceil(requiredDistance / 100));

    ctx.strokeStyle = TETHER_UNSTRETCHED_COLOR;
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let i = 1; i <= numChevrons; i++) {
      const t = i / (numChevrons + 1);
      const cx = posA.x + dx * t;
      const cy = posA.y + dy * t;

      // Chevron points toward the closer endpoint (A if t < 0.5, B if t > 0.5)
      const pointTowardA = t < 0.5;
      const chevronDir = pointTowardA ? -1 : 1;

      // Tip of the V
      const tipX = cx + dirX * chevronSideLength * 0.3 * chevronDir;
      const tipY = cy + dirY * chevronSideLength * 0.3 * chevronDir;

      // Calculate the two arms of the V
      // Rotate the direction vector by +/- the half angle
      const cosA = Math.cos(chevronHalfAngle);
      const sinA = Math.sin(chevronHalfAngle);

      // Arm 1: rotate direction by +halfAngle
      const arm1DirX = dirX * cosA - dirY * sinA;
      const arm1DirY = dirX * sinA + dirY * cosA;
      // Arm 2: rotate direction by -halfAngle
      const arm2DirX = dirX * cosA + dirY * sinA;
      const arm2DirY = -dirX * sinA + dirY * cosA;

      const end1X = tipX - arm1DirX * chevronSideLength * chevronDir;
      const end1Y = tipY - arm1DirY * chevronSideLength * chevronDir;
      const end2X = tipX - arm2DirX * chevronSideLength * chevronDir;
      const end2Y = tipY - arm2DirY * chevronSideLength * chevronDir;

      // Draw V shape
      ctx.beginPath();
      ctx.moveTo(end1X, end1Y);
      ctx.lineTo(tipX, tipY);
      ctx.lineTo(end2X, end2Y);
      ctx.stroke();
    }
  }

  ctx.restore();
}

// Render all mechanics
export function renderMechanics(
  ctx: CanvasRenderingContext2D,
  mechanics: MechanicState[],
  serverTime: number,
  posData?: PlayerPositionData
): void {
  for (const mechanic of mechanics) {
    if (mechanic.type === 'chariot') {
      renderChariot(ctx, mechanic, serverTime);
    } else if (mechanic.type === 'spread' && posData) {
      renderSpread(ctx, mechanic, serverTime, posData);
    } else if (mechanic.type === 'tether' && posData) {
      renderTether(ctx, mechanic, posData);
    }
  }
}

// Export for testing
(window as any).__mechanicsTest = {
  renderMechanics,
};
