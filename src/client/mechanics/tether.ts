import { TetherMechanicState } from '../../shared/types';
import {
  TETHER_UNSTRETCHED_COLOR,
  TETHER_STRETCHED_COLOR,
  PlayerPositionData,
  getEndpointPosition,
} from './shared';

// Render a tether mechanic - line between two endpoints with visual state based on distance
export function renderTether(
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
