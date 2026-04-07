// server/socket/services/colorService.js
const PLAYER_COLORS = [
  '#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', 
  '#f97316', '#06b6d4', '#ec4899', '#84cc16', '#14b8a6'
];
const getAssignedColor = (index) => PLAYER_COLORS[index % PLAYER_COLORS.length];
module.exports = { getAssignedColor, PLAYER_COLORS };