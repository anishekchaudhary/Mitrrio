// We use PLAYER_COLORS to ensure other files don't break when importing
const PLAYER_COLORS = [
  '#3b82f6', // Blue
  '#f59e0b', // Amber/Yellow
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#eab308', // Yellow
  '#d946ef', // Fuchsia
  '#6366f1', // Indigo
  '#84cc16', // Lime (safe green alternative)
  '#f97316'  // Orange
];

const getUniqueColor = (members) => {
  const usedColors = members.map(m => m.color);
  return PLAYER_COLORS.find(c => !usedColors.includes(c)) || '#94a3b8';
};

module.exports = { PLAYER_COLORS, getUniqueColor };