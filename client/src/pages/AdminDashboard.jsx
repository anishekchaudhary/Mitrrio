import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { socket } from '../utils/socket';
import { Activity, Users, Server, Trophy, Cpu, Clock, ChevronLeft, Swords, Target, History, Trash2 } from 'lucide-react';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [dbStats, setDbStats] = useState({ totalUsers: 0, totalXp: 0, totalGames: 0 });
  const [leaderboard, setLeaderboard] = useState([]);
  const [matchHistory, setMatchHistory] = useState([]);
  const [health, setHealth] = useState({
    ramUsage: 0, cpuLoad: 0, uptime: '0h 0m', connectedUsers: 0, activeMatches: 0
  });

  const token = localStorage.getItem('token');
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  const fetchAdminData = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${token}` };
      
      const [statsRes, boardRes, matchesRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/stats`, { headers }),
        fetch(`${API_URL}/api/admin/leaderboard`, { headers }),
        fetch(`${API_URL}/api/admin/matches`, { headers })
      ]);

      if (statsRes.ok) setDbStats(await statsRes.json());
      if (boardRes.ok) setLeaderboard(await boardRes.json());
      if (matchesRes.ok) setMatchHistory(await matchesRes.json());
    } catch (err) {
      console.error("Failed to load admin data", err);
    }
  };

  useEffect(() => {
    if (!token) { navigate('/'); return; }

    fetchAdminData();

    if (!socket.connected) socket.connect();
    socket.emit('join_admin_room');
    socket.on('admin_metrics_update', (data) => setHealth(data));

    return () => {
      socket.emit('leave_admin_room');
      socket.off('admin_metrics_update');
    };
  }, [token, navigate]);

  const handleResetMatches = async () => {
    const confirm = window.confirm("Are you sure? This will wipe the server match history. (Player individual stats will NOT be affected).");
    if (!confirm) return;

    try {
      const res = await fetch(`${API_URL}/api/admin/matches`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        alert("Match history reset!");
        fetchAdminData(); // Refresh the UI (Total Games will drop to 0)
      }
    } catch (err) {
      console.error("Failed to reset matches", err);
    }
  };

  const StatCard = ({ icon: Icon, label, value, color }) => (
    <div className={`bg-slate-900/80 backdrop-blur-md border border-slate-800 p-6 rounded-3xl flex items-center gap-6 relative overflow-hidden group`}>
      <div className={`absolute -right-6 -top-6 w-32 h-32 bg-${color}-500/10 rounded-full blur-3xl group-hover:bg-${color}-500/20 transition-all`}></div>
      <div className={`p-4 rounded-2xl bg-${color}-500/10 border border-${color}-500/30 text-${color}-400 shadow-[0_0_15px_rgba(0,0,0,0.2)]`}>
        <Icon size={32} />
      </div>
      <div>
        <p className="text-sm font-black text-slate-500 uppercase tracking-widest">{label}</p>
        <h3 className="text-4xl font-black text-white tracking-tight drop-shadow-md">{value}</h3>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans overflow-x-hidden p-6 relative">
      <div className="absolute inset-0 z-0 bg-cover bg-center opacity-20" style={{ backgroundImage: "url('/Background.png')" }}></div>
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-slate-950 via-slate-900/90 to-slate-950"></div>

      <div className="relative z-10 max-w-7xl mx-auto space-y-8">
        
        {/* HEADER */}
        <div className="flex items-center justify-between pb-6 border-b border-slate-800">
          <div>
            <h1 className="text-3xl font-black text-white uppercase tracking-widest flex items-center gap-3">
              <Activity className="text-indigo-400" /> Command Center
            </h1>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-sm mt-1">Real-time Platform Analytics</p>
          </div>
          <button 
            onClick={() => navigate('/')}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-xl font-bold transition-all border border-slate-600"
          >
            <ChevronLeft size={20} /> Back to Game
          </button>
        </div>

        {/* LIVE SERVER HEALTH GRID */}
        <div>
          <h2 className="text-lg font-black text-slate-400 uppercase tracking-widest mb-4">Live Server Health</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard icon={Server} label="Connected Sockets" value={health.connectedUsers} color="emerald" />
            <StatCard icon={Swords} label="Active Matches" value={health.activeMatches} color="indigo" />
            <StatCard icon={Cpu} label="RAM Usage (MB)" value={health.ramUsage} color="cyan" />
            <StatCard icon={Clock} label="Server Uptime" value={health.uptime} color="amber" />
          </div>
        </div>

        {/* GLOBAL DATABASE STATS GRID */}
        <div>
          <h2 className="text-lg font-black text-slate-400 uppercase tracking-widest mb-4">Global Database Stats</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard icon={Users} label="Registered Players" value={dbStats.totalUsers} color="blue" />
            <StatCard icon={Target} label="Total Server Matches" value={dbStats.totalGames} color="pink" />
            <StatCard icon={Trophy} label="Total XP Earned" value={dbStats.totalXp} color="yellow" />
          </div>
        </div>

        {/* TWO-COLUMN LAYOUT: MATCH HISTORY & LEADERBOARD */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* RECENT MATCH HISTORY */}
          <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[600px]">
            <div className="p-6 border-b border-slate-800 bg-slate-900/50 flex justify-between items-center">
              <h2 className="text-xl font-black text-white uppercase tracking-widest flex items-center gap-3">
                <History className="text-pink-500" /> Match History
              </h2>
              <button 
                onClick={handleResetMatches} 
                className="bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 border border-red-500/30"
              >
                <Trash2 size={16} /> Reset
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-4 space-y-4">
              {matchHistory.length === 0 ? (
                <p className="text-center text-slate-500 font-bold mt-10 uppercase tracking-widest">No recent matches found.</p>
              ) : (
                matchHistory.map((match) => {
                  const winner = match.players.find(p => p.rank === 1);
                  return (
                    <div key={match._id} className="bg-slate-950/50 border border-slate-800 rounded-2xl p-4">
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-xs font-black text-slate-500 tracking-widest uppercase">Arena: {match.roomCode}</span>
                        <span className="text-xs font-bold text-slate-600">{new Date(match.createdAt).toLocaleTimeString()}</span>
                      </div>
                      <div className="flex flex-col gap-2">
                        {match.players.sort((a,b) => a.rank - b.rank).map(p => (
                          <div key={p.username} className={`flex justify-between items-center p-2 rounded-lg ${p.rank === 1 ? 'bg-green-500/10 border border-green-500/20' : 'bg-slate-900'}`}>
                            <span className={`font-bold ${p.rank === 1 ? 'text-green-400' : 'text-slate-300'}`}>
                              #{p.rank} {p.username}
                            </span>
                            <span className={`font-black ${p.score > 0 ? 'text-green-400' : 'text-red-400'}`}>{p.score}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* LEADERBOARD TABLE */}
          <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[600px]">
            <div className="p-6 border-b border-slate-800 bg-slate-900/50">
              <h2 className="text-xl font-black text-white uppercase tracking-widest flex items-center gap-3">
                <Trophy className="text-yellow-500" /> Top 50 Leaderboard
              </h2>
            </div>
            <div className="overflow-y-auto flex-1">
              <table className="w-full text-left">
                <thead className="bg-slate-950/50 text-slate-500 text-xs uppercase font-black tracking-widest sticky top-0 z-10">
                  <tr>
                    <th className="p-4 pl-8">Rank</th>
                    <th className="p-4">Player</th>
                    <th className="p-4 text-center">Elo</th>
                    <th className="p-4 text-center">Matches</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {leaderboard.map((player, index) => (
                    <tr key={player._id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="p-4 pl-8 font-black text-slate-400">#{index + 1}</td>
                      <td className="p-4 font-bold text-white flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-black">
                          {player.username.charAt(0).toUpperCase()}
                        </div>
                        {player.username}
                      </td>
                      <td className="p-4 text-center font-black text-indigo-400">{player.elo}</td>
                      <td className="p-4 text-center font-bold text-slate-300">{player.gamesPlayed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;