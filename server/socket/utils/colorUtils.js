const PLAYER_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#84cc16", "#10b981", 
  "#06b6d4", "#3b82f6", "#8b5cf6", "#d946ef", "#f43f5e"
];

const getUniqueColor = (members) => {
  const usedColors = members.map(m => m.color);
  return PLAYER_COLORS.find(c => !usedColors.includes(c)) || '#94a3b8';
};

module.exports = { PLAYER_COLORS, getUniqueColor };
