import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { socket } from '../utils/socket';
import ChatWidget from '../components/ChatWidget';
import ProfileWidget from '../components/ProfileWidget';
import PartyWidget from '../components/PartyWidget';
import GamePanel from '../components/GamePanel';
import AuthModal from '../components/AuthModal';
import SessionReplaceModal from '../components/SessionReplaceModal';
import RulesModal from '../components/RulesModal'; 
import { Eye, X, HelpCircle } from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('signin');
  const [showSessionModal, setShowSessionModal] = useState(false);

  const [showSpectateModal, setShowSpectateModal] = useState(false);
  const [spectateCodeInput, setSpectateCodeInput] = useState("");

  const [partyState, setPartyState] = useState('menu');
  const [members, setMembers] = useState([]); 
  const [partyCode, setPartyCode] = useState("");
  const [partyError, setPartyError] = useState("");
  const [memberCount, setMemberCount] = useState(1);
  const [maxSize, setMaxSize] = useState(10);
  const [myColor, setMyColor] = useState("#94a3b8");
  
  const [isGameRunning, setIsGameRunning] = useState(false);
  const [showRulesModal, setShowRulesModal] = useState(false);

  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (savedUser && savedUser !== "undefined") {
      const parsed = JSON.parse(savedUser);
      return { ...parsed, name: parsed.username, isLoggedIn: !!token };
    }

    const gid = Math.floor(1000 + Math.random() * 9000);
    const guestUser = {
      name: `Guest_${gid}`, username: `Guest_${gid}`, id: `guest_${gid}`, isLoggedIn: false, elo: 1000, xp: 0
    };

    localStorage.setItem('user', JSON.stringify(guestUser));
    return guestUser;
  });

  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem('hasSeenTutorial');
    if (!hasSeenTutorial) {
      setShowRulesModal(true);
      localStorage.setItem('hasSeenTutorial', 'true');
    }
  }, []);

  useEffect(() => {
    if (!socket.connected) socket.connect();

    const identifyUser = () => {
      const userId = user.id || user._id;
      if (userId) {
        socket.emit("identify", userId);
        socket.emit("sync_party_state", user); 
      }
    };

    socket.on("connect", identifyUser);
    if (socket.connected) identifyUser();

    const onSessionReplaced = () => setShowSessionModal(true);
    const onSessionDenied = () => setShowSessionModal(true);

    const onEloUpdate = (data) => {
        setUser((prevUser) => {
            const currentUserId = prevUser.id || prevUser._id;
            if (String(data.userId) !== String(currentUserId)) return prevUser;

            const updatedUser = { ...prevUser, elo: data.elo, xp: data.xp, gamesPlayed: data.gamesPlayed };
            localStorage.setItem("user", JSON.stringify(updatedUser));
            return updatedUser;
        });
    };

    const onJoinedParty = (data) => {
      setPartyCode(data.roomName);
      setPartyState("active");
      setMemberCount(data.memberCount || 1);
      setMaxSize(data.maxSize || 10);
      setPartyError("");
      if (data.myColor) setMyColor(data.myColor);
      if (data.members) setMembers(data.members);
      setIsGameRunning(data.isGameRunning || false);
    };

    const onGameStart = ({ gameId }) => navigate(`/game/${gameId}`);

    const onLeftParty = () => {
      setPartyCode("");
      setPartyState("menu");
      setMembers([]);
      setMemberCount(1);
      setMyColor("#94a3b8");
      setIsGameRunning(false);
    };

    const onPartyError = (err) => setPartyError(err);
    const onPartyUpdate = (data) => {
      setMemberCount(data.memberCount);
      setMaxSize(data.maxSize);
      if (data.members) setMembers(data.members); 
      if (data.isGameRunning !== undefined) setIsGameRunning(data.isGameRunning);
    };

    socket.on("elo_update", onEloUpdate);
    socket.on("session_denied", onSessionDenied);
    socket.on("session_replaced", onSessionReplaced);
    socket.on("joined_party", onJoinedParty);
    socket.on("game_start", onGameStart);
    socket.on("left_party", onLeftParty);
    socket.on("party_error", onPartyError);
    socket.on("party_update", onPartyUpdate);

    return () => {
      socket.off("connect", identifyUser);
      socket.off("session_denied", onSessionDenied);
      socket.off("session_replaced", onSessionReplaced);
      socket.off("game_start", onGameStart);
      socket.off("joined_party", onJoinedParty);
      socket.off("left_party", onLeftParty);
      socket.off("party_error", onPartyError);
      socket.off("party_update", onPartyUpdate);
      socket.off("elo_update", onEloUpdate);
    };
  }, [user, navigate, user.id, user._id]);

  const handleLogout = () => {
    localStorage.clear();
    window.location.reload();
  };

  const handleAuthSuccess = (userData, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser({ ...userData, name: userData.username, isLoggedIn: true, token });
    socket.emit('identify', userData._id);
  };

  const handleCreate = () => socket.emit('create_party', user);
  const handleJoin = (code) => {
    setPartyError("");
    if (code) socket.emit('join_private', { code, user });
  };
  const handleLeave = () => socket.emit('leave_party', { user, roomCode: partyCode });
  
  const handlePlay = () => {
    if (partyState === 'active') {
       socket.emit('toggle_ready', { roomCode: partyCode, user });
    } else if (partyState === 'menu') {
      setPartyState('searching');
      socket.emit('find_match', user);
    }
  };

  const handleSpectate = () => {
    if (partyState === 'active') {
       socket.emit('set_spectator', { userId: user.id || user._id, roomCode: partyCode });
    } else {
       setSpectateCodeInput("");
       setShowSpectateModal(true);
    }
  };

  const submitSpectateCode = (e) => {
    e.preventDefault();
    if (spectateCodeInput.trim()) {
      setShowSpectateModal(false);
      navigate(`/game/${spectateCodeInput.trim().toUpperCase()}`);
    }
  };
  
  const handleCancelSearch = () => {
    setPartyState('menu');
    socket.emit('cancel_match', user);
  };

  const handleCloseTab = () => { window.location.href = "about:blank"; };

  const myMemberData = members.find(m => m.id === (user.id || user._id));
  const isReady = myMemberData?.isReady || false;
  const isSpectator = myMemberData?.isSpectator || false;

  return (
    <div className="relative w-full h-screen bg-slate-950 font-sans text-slate-200 overflow-hidden">
      <SessionReplaceModal isOpen={showSessionModal} onCloseTab={handleCloseTab} />
      
      <RulesModal isOpen={showRulesModal} onClose={() => setShowRulesModal(false)} />

      {/* --- ADDED SPACE HERE: right-[408px] -> right-[420px] --- */}
      <button 
        onClick={() => setShowRulesModal(true)}
        className="hidden md:flex absolute top-6 right-[420px] z-40 bg-slate-800/80 hover:bg-cyan-600 border border-slate-700 text-slate-300 hover:text-white p-3 rounded-2xl shadow-xl transition-all group backdrop-blur-md items-center justify-center"
        title="How to Play"
      >
        <HelpCircle size={24} className="group-hover:scale-110 transition-transform" />
      </button>

      {showSpectateModal && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in zoom-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-8 max-sm w-full shadow-2xl relative">
            
            <button 
              onClick={() => setShowSpectateModal(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>

            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-16 h-16 bg-cyan-500/10 border border-cyan-500/30 rounded-full flex items-center justify-center mb-4">
                <Eye size={32} className="text-cyan-400" />
              </div>
              <h3 className="text-2xl font-black text-white uppercase tracking-widest">Spectate Arena</h3>
              <p className="text-sm font-medium text-slate-400 mt-2">Enter an active lobby code to drop in and watch the match.</p>
            </div>

            <form onSubmit={submitSpectateCode} className="flex flex-col gap-4">
              <input 
                type="text" 
                placeholder="e.g., PUB_X7K9" 
                value={spectateCodeInput}
                onChange={(e) => setSpectateCodeInput(e.target.value.toUpperCase())}
                autoFocus
                className="w-full bg-slate-950 border-2 border-slate-700 focus:border-cyan-500 text-white font-black text-center text-xl tracking-widest uppercase rounded-2xl py-4 outline-none transition-colors"
              />
              <button 
                type="submit"
                disabled={!spectateCodeInput.trim()}
                className="w-full py-4 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-500 text-white rounded-2xl font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-cyan-500/20"
              >
                Join as Spectator
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000" style={{ backgroundImage: "url('/Background.png')", opacity: 0.9 }}></div>
      <div className="absolute inset-0 z-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-transparent"></div>

      {partyState === 'searching' && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-md">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-6"></div>
          <h2 className="text-3xl font-black text-white mb-8 tracking-widest uppercase">Searching for Opponents...</h2>
          <button onClick={handleCancelSearch} className="px-8 py-3 bg-red-500/10 text-red-500 font-bold tracking-widest uppercase rounded-xl border border-red-500/50 hover:bg-red-500 hover:text-white transition-all active:scale-95">Cancel Search</button>
        </div>
      )}

      <AuthModal isOpen={showAuthModal} initialMode={authMode} onClose={() => setShowAuthModal(false)} onLogin={handleAuthSuccess} guestData={user} />

      <div className="relative z-10 w-full h-full md:overflow-hidden flex flex-col md:block p-4 md:p-0">
        
        <div className="order-1 md:fixed md:top-6 md:right-6 md:z-30 w-full md:w-96 mb-4 md:mb-0 h-48 md:h-auto flex items-start gap-3 justify-end">
          
          <button 
            onClick={() => setShowRulesModal(true)}
            className="md:hidden bg-slate-800/80 hover:bg-cyan-600 border border-slate-700 text-slate-300 hover:text-white p-3 rounded-2xl shadow-xl transition-all group backdrop-blur-md flex items-center justify-center h-[72px] w-[72px]"
            title="How to Play"
          >
            <HelpCircle size={24} className="group-hover:scale-110 transition-transform" />
          </button>

          <div className="flex-1 md:w-full">
             <ProfileWidget user={user} onLogout={handleLogout} onNavigate={(m) => { setAuthMode(m); setShowAuthModal(true); }} />
          </div>
        </div>

        <div className="order-2 md:fixed md:inset-0 md:z-10 md:pointer-events-none flex items-center justify-center py-4 md:py-0">
          <GamePanel
            username={user.username || user.name}
            color={myColor}
            onPlay={handlePlay}
            onSpectate={handleSpectate}
            inParty={partyState === 'active'}
            isReady={isReady}
            isSpectator={isSpectator}
            isGameRunning={isGameRunning}
          />
        </div>

        <div className="order-3 md:fixed md:bottom-6 md:right-6 md:z-30 w-full md:w-96 mt-4 md:mt-0 h-64 md:h-auto">
          <PartyWidget
            partyState={partyState} partyCode={partyCode} setPartyState={setPartyState} onCreateParty={handleCreate} onJoinPrivate={handleJoin} onLeaveParty={handleLeave}
            members={members} currentUser={user} onToggleReady={() => socket.emit('toggle_ready', { roomCode: partyCode, user })}
            memberCount={memberCount} maxSize={maxSize} error={partyError} isGameRunning={isGameRunning}
          />
        </div>

        <div className="order-4 md:fixed md:top-6 md:bottom-6 md:left-6 w-full md:w-96 md:z-20 mt-4 md:mt-0 h-64 md:h-auto">
          <ChatWidget isPartyMode={partyState === 'active'} partyCode={partyCode} username={user.username || user.name} myColor={myColor} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;