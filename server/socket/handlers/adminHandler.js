const os = require('os');
const activeGames = require('../state/activeGames');

const registerAdminHandler = (socket, io) => {
  socket.on('join_admin_room', () => socket.join('admin_room'));
  socket.on('leave_admin_room', () => socket.leave('admin_room'));
};

const startAdminMetricsLoop = (io) => {
  setInterval(() => {
    const memoryData = process.memoryUsage();
    const usedMemoryMB = Math.round(memoryData.heapUsed / 1024 / 1024);
    
    const uptimeSeconds = process.uptime();
    const hours = Math.floor(uptimeSeconds / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);

    const healthMetrics = {
        ramUsage: usedMemoryMB,
        cpuLoad: os.loadavg()[0].toFixed(2),
        uptime: `${hours}h ${minutes}m`,
        connectedUsers: io.engine.clientsCount,
        activeMatches: activeGames.size,
        timestamp: Date.now()
    };

    const adminRoom = io.sockets.adapter.rooms.get('admin_room');
    if (adminRoom && adminRoom.size > 0) {
        io.to('admin_room').emit('admin_metrics_update', healthMetrics);
    }
  }, 3000); // Emits every 3 seconds
};

module.exports = { registerAdminHandler, startAdminMetricsLoop };