// server/utils/polyominoes.js
const POLYOMINOES = {
  1: { id: 1, size: 1 }, 2: { id: 2, size: 2 }, 3: { id: 3, size: 3 }, 
  4: { id: 4, size: 3 }, 5: { id: 5, size: 4 }, 6: { id: 6, size: 4 }, 
  7: { id: 7, size: 4 }, 8: { id: 8, size: 4 }, 9: { id: 9, size: 4 }, 
  10: { id: 10, size: 5 }, 11: { id: 11, size: 5 }, 12: { id: 12, size: 5 }, 
  13: { id: 13, size: 5 }, 14: { id: 14, size: 5 }, 15: { id: 15, size: 5 }, 
  16: { id: 16, size: 5 }, 17: { id: 17, size: 5 }, 18: { id: 18, size: 5 }, 
  19: { id: 19, size: 5 }, 20: { id: 20, size: 5 }, 21: { id: 21, size: 5 },
};

const generateStartingInventory = () => Object.keys(POLYOMINOES).map(id => parseInt(id));
module.exports = { POLYOMINOES, generateStartingInventory };