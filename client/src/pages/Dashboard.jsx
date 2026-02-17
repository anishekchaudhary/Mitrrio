import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { socket } from '../utils/socket';
import ChatWidget from '../components/ChatWidget';
import ProfileWidget from '../components/ProfileWidget';
import PartyWidget from '../components/PartyWidget';
import GamePanel from '../components/GamePanel';
import AuthModal from '../components/AuthModal';

const Dashboard = () => {
  const navigate = useNavigate();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('signin');
  
  const [partyState, setPartyState] = useState('menu'); 
  const [partyCode, setPartyCode] = useState("");
  const [partyError, setPartyError] = useState("");
  const [memberCount, setMemberCount] = useState(1);
  const [maxSize, setMaxSize] = useState(10);

  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    if (saved && saved !== "undefined") {
      return JSON.parse(saved);
    }
    const gid = Math.floor(1000 + Math.random() * 9000);
    return { name: `Guest_${gid}`, username: `Guest_${gid}`, id: `guest_${gid}`, isLoggedIn: false, elo: 1000, xp: 0 };
  });

  useEffect(() => {
    socket.connect();
    if (user.id || user._id) socket.emit('identify', user.id || user._id);

    const onJoinedParty = (data) => {
      setPartyCode(data.roomName);
      setPartyState('active');
      setMemberCount(data.memberCount || 1);
      setMaxSize(data.maxSize || 10);
      setPartyError("");
    };

    const onLeftParty = () => {
      setPartyCode("");
      setPartyState('menu');
      setMemberCount(1);
      // Explicitly tell chat widget we are back in global
      // Note: socketManager automatically joins 'global' on leave_party, 
      // but this helps frontend logic sync up if needed.
    };

    const onPartyError = (err) => setPartyError(err);

    const onPartyUpdate = (data) => {
      setMemberCount(data.memberCount);
      setMaxSize(data.maxSize);
    };

    socket.on('joined_party', onJoinedParty);
    socket.on('left_party', onLeftParty);
    socket.on('party_error', onPartyError);
    socket.on('party_update', onPartyUpdate);

    return () => {
      socket.off('joined_party', onJoinedParty);
      socket.off('left_party', onLeftParty);
      socket.off('party_error', onPartyError);
      socket.off('party_update', onPartyUpdate);
    };
  }, [user]);

  const [nickname, setNickname] = useState(user.name);
  const [color, setColor] = useState("#3b82f6");

  useEffect(() => setNickname(user.name), [user.name]);

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

  // FIX: Send partyCode so backend knows exactly which room to leave
  const handleLeave = () => { 
    socket.emit('leave_party', { user, roomCode: partyCode }); 
  };
  
  const handlePlay = () => {
    if (partyState === 'menu') {
      socket.emit('join_public', user);
    }
    navigate('/game');
  };

  return (
    <div className="relative w-full h-screen bg-slate-950 font-sans text-slate-200 overflow-hidden">
      <div className="absolute inset-0 z-0 opacity-40 bg-cover bg-center" style={{ backgroundImage: "url('https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=2070&auto=format&fit=crop')" }}></div>
      <div className="absolute inset-0 z-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-transparent"></div>

      <AuthModal isOpen={showAuthModal} initialMode={authMode} onClose={() => setShowAuthModal(false)} onLogin={handleAuthSuccess} guestData={user} />

      <div className="relative z-10 w-full h-full md:overflow-hidden flex flex-col md:block p-4 md:p-0">
        <div className="order-1 md:fixed md:top-6 md:right-6 md:z-30 w-full md:w-96 mb-4 md:mb-0 h-48 md:h-auto">
          <ProfileWidget user={user} onLogout={handleLogout} onNavigate={(m) => { setAuthMode(m); setShowAuthModal(true); }} />
        </div>

        <div className="order-2 md:fixed md:inset-0 md:z-10 md:pointer-events-none flex items-center justify-center py-4 md:py-0">
          <GamePanel nickname={nickname} setNickname={setNickname} color={color} setColor={setColor} onPlay={handlePlay} onSpectate={() => navigate('/spectate')} />
        </div>

        <div className="order-3 md:fixed md:bottom-6 md:right-6 md:z-30 w-full md:w-96 mt-4 md:mt-0 h-64 md:h-auto">
          <PartyWidget 
            partyState={partyState} 
            partyCode={partyCode} 
            setPartyState={setPartyState} 
            onCreateParty={handleCreate} 
            onJoinPrivate={handleJoin} 
            onLeaveParty={handleLeave}
            memberCount={memberCount}
            maxSize={maxSize}
            error={partyError}
          />
        </div>

        <div className="order-4 md:fixed md:top-6 md:bottom-6 md:left-6 w-full md:w-96 md:z-20 mt-4 md:mt-0 h-64 md:h-auto">
           <ChatWidget 
             isPartyMode={partyState === 'active'} 
             partyCode={partyCode} 
             username={user.username || user.name} 
           />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;