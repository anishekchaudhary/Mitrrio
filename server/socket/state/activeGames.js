// In-memory storage for active game sessions
// Key: roomCode (String)
// Value: { 
//    startTime: Date, 
//    players: [{ id, username, color }], 
//    finished: [{ id, username, color, rank, time }] 
// }
const activeGames = new Map();

module.exports = activeGames;