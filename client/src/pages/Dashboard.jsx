import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { socket } from '../utils/socket';
import ChatWidget from '../components/ChatWidget';
import ProfileWidget from '../components/ProfileWidget';
import PartyWidget from '../components/PartyWidget';
import GamePanel from '../components/GamePanel';
import AuthModal from '../components/AuthModal';
import SessionReplaceModal from '../components/SessionReplaceModal';

const Dashboard = () => {
  const navigate = useNavigate();

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('signin');
  const [showSessionModal, setShowSessionModal] = useState(false);

  const [partyState, setPartyState] = useState('menu');
  const [partyCode, setPartyCode] = useState("");
  const [partyError, setPartyError] = useState("");
  const [memberCount, setMemberCount] = useState(1);
  const [maxSize, setMaxSize] = useState(10);
  const [myColor, setMyColor] = useState("#94a3b8");

  // ---------------------------
  // USER INITIALIZATION
  // ---------------------------
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');

    if (savedUser && savedUser !== "undefined") {
      const parsed = JSON.parse(savedUser);
      return {
        ...parsed,
        name: parsed.username,
        isLoggedIn: !!token
      };
    }

    // create persistent guest
    const gid = Math.floor(1000 + Math.random() * 9000);
    const guestUser = {
      name: `Guest_${gid}`,
      username: `Guest_${gid}`,
      id: `guest_${gid}`,
      isLoggedIn: false,
      elo: 1000,
      xp: 0
    };

    localStorage.setItem('user', JSON.stringify(guestUser));
    return guestUser;
  });

  // ---------------------------
  // SOCKET CONNECTION
  // ---------------------------
  useEffect(() => {
    if (!socket.connected) socket.connect();

    const identifyUser = () => {
      const userId = user.id || user._id;
      if (userId) {
        console.log("Identifying as:", userId);
        socket.emit("identify", userId);
      }
    };

    // identify when connected
    socket.on("connect", identifyUser);

    // --- session replaced ---
    const onSessionReplaced = () => {
      setShowSessionModal(true);
    };

    // --- session denied (extra protection) ---
    const onSessionDenied = () => {
      setShowSessionModal(true);
    };

    // --- elo updates ---
    const onEloUpdate = (data) => {
      setUser((prevUser) => {
        const updatedUser = {
          ...prevUser,
          elo: data.elo,
          xp: data.xp || prevUser.xp
        };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        return updatedUser;
      });
    };

    // --- party join ---
    const onJoinedParty = (data) => {
      setPartyCode(data.roomName);
      setPartyState("active");
      setMemberCount(data.memberCount || 1);
      setMaxSize(data.maxSize || 10);
      setPartyError("");
      if (data.myColor) setMyColor(data.myColor);
    };

    const onLeftParty = () => {
      setPartyCode("");
      setPartyState("menu");
      setMemberCount(1);
      setMyColor("#94a3b8");
    };

    const onPartyError = (err) => setPartyError(err);

    const onPartyUpdate = (data) => {
      setMemberCount(data.memberCount);
      setMaxSize(data.maxSize);
    };

    // listeners
    socket.on("session_denied", onSessionDenied);
    socket.on("session_replaced", onSessionReplaced);
    socket.on("joined_party", onJoinedParty);
    socket.on("left_party", onLeftParty);
    socket.on("party_error", onPartyError);
    socket.on("party_update", onPartyUpdate);
    socket.on("elo_update", onEloUpdate);

    return () => {
      socket.off("connect", identifyUser);
      socket.off("session_denied", onSessionDenied);
      socket.off("session_replaced", onSessionReplaced);
      socket.off("joined_party", onJoinedParty);
      socket.off("left_party", onLeftParty);
      socket.off("party_error", onPartyError);
      socket.off("party_update", onPartyUpdate);
      socket.off("elo_update", onEloUpdate);
    };
  }, [user]);

  // ---------------------------
  // AUTH
  // ---------------------------
  const handleLogout = () => {
    localStorage.clear();
    window.location.reload();
  };

  const handleAuthSuccess = (userData, token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));

    setUser({
      ...userData,
      name: userData.username,
      isLoggedIn: true,
      token
    });

    socket.emit('identify', userData._id);
  };

  // ---------------------------
  // PARTY ACTIONS
  // ---------------------------
  const handleCreate = () => socket.emit('create_party', user);

  const handleJoin = (code) => {
    setPartyError("");
    if (code) socket.emit('join_private', { code, user });
  };

  const handleLeave = () => {
    socket.emit('leave_party', { user, roomCode: partyCode });
  };

  const handlePlay = () => {
    if (partyState === 'menu') {
      socket.emit('join_public', user);
    }
    navigate('/game');
  };

  // ---------------------------
  // SESSION MODAL ACTION
  // ---------------------------
  const handleCloseTab = () => {
    window.location.href = "about:blank";
  };

  // ---------------------------
  // UI
  // ---------------------------
  return (
    <div className="relative w-full h-screen bg-slate-950 font-sans text-slate-200 overflow-hidden">

      <SessionReplaceModal
        isOpen={showSessionModal}
        onCloseTab={handleCloseTab}
      />

      <div
        className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transition-opacity duration-1000"
        style={{
          backgroundImage: "url('/Background.png')",
          opacity: 0.7
        }}
      ></div>

      <div className="absolute inset-0 z-0 bg-gradient-to-t from-slate-950 via-slate-900/60 to-transparent"></div>

      <AuthModal
        isOpen={showAuthModal}
        initialMode={authMode}
        onClose={() => setShowAuthModal(false)}
        onLogin={handleAuthSuccess}
        guestData={user}
      />

      <div className="relative z-10 w-full h-full md:overflow-hidden flex flex-col md:block p-4 md:p-0">

        <div className="order-1 md:fixed md:top-6 md:right-6 md:z-30 w-full md:w-96 mb-4 md:mb-0 h-48 md:h-auto">
          <ProfileWidget
            user={user}
            onLogout={handleLogout}
            onNavigate={(m) => {
              setAuthMode(m);
              setShowAuthModal(true);
            }}
          />
        </div>

        <div className="order-2 md:fixed md:inset-0 md:z-10 md:pointer-events-none flex items-center justify-center py-4 md:py-0">
          <GamePanel
            username={user.username || user.name}
            color={myColor}
            onPlay={handlePlay}
            onSpectate={() => navigate('/spectate')}
          />
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
            myColor={myColor}
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
