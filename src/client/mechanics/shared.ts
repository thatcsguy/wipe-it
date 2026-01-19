import { TetherEndpoint, PlayerState } from '../../shared/types';

// Chariot color (orange-yellow)
export const CHARIOT_COLOR = '#ff9f40';
export const CHARIOT_FILL_ALPHA = 0.3;
export const CHARIOT_INNER_ALPHA = 0.5;

// Line/Conal AOE colors
export const AOE_FILL_COLOR = 'rgba(255, 80, 40, 0.35)';      // Semi-transparent red-orange fill
export const AOE_EDGE_GLOW_COLOR = 'rgba(255, 200, 50, 0.8)'; // Orange-yellow glow
export const AOE_EDGE_CORE_COLOR = '#fffef8';                  // Very bright white-yellow core

// Spread colors (FFXIV-style pink/purple)
export const SPREAD_OUTER_COLOR = 'rgba(255, 128, 255, 0.3)';
export const SPREAD_BORDER_COLOR = 'rgba(200, 100, 200, 0.8)';

// Tether colors
export const TETHER_UNSTRETCHED_COLOR = '#ff66aa'; // Pink/magenta when close
export const TETHER_STRETCHED_COLOR = '#ffcc00';   // Orange/yellow when stretched

// Tower colors (yellow-orange)
export const TOWER_COLOR = '#ffaa00';
export const TOWER_FILL_ALPHA = 0.3;
export const TOWER_STROKE_ALPHA = 0.8;

// Position lookup data for spread mechanics
export interface PlayerPositionData {
  players: PlayerState[];
  localPlayerId: string | null;
  localPosition: { x: number; y: number } | null;
  interpolatedPositions?: Map<string, { x: number; y: number }>;
}

// Get player position considering prediction and interpolation
export function getPlayerPosition(playerId: string, posData: PlayerPositionData): { x: number; y: number } | null {
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

// Get endpoint position (player or fixed point)
export function getEndpointPosition(endpoint: TetherEndpoint, posData: PlayerPositionData): { x: number; y: number } | null {
  if (endpoint.type === 'point') {
    return { x: endpoint.x, y: endpoint.y };
  }
  return getPlayerPosition(endpoint.playerId, posData);
}
