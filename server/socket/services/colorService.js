// server/socket/services/colorService.js
const PLAYER_COLORS = [
  '#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7',
  '#f97316', '#06b6d4', '#ec4899', '#84cc16', '#14b8a6'
];
const getAssignedColor = (index) => PLAYER_COLORS[index % PLAYER_COLORS.length];

// Returns the first color not already used by existing party members
const getUniqueColor = (existingMembers) => {
  const usedColors = new Set(existingMembers.map(m => m.color));
  const available = PLAYER_COLORS.find(c => !usedColors.has(c));
  return available || PLAYER_COLORS[existingMembers.length % PLAYER_COLORS.length];
};

module.exports = { getAssignedColor, getUniqueColor, PLAYER_COLORS };
// Note: The getUniqueColor function is designed to assign a color that hasn't been taken by existing party members. If all colors are taken, it will fallback to a deterministic assignment based on the number of members, ensuring that every player gets a color even in large parties.