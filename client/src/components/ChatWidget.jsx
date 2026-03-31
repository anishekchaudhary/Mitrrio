import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send } from 'lucide-react';
import { socket } from '../utils/socket';

// --- PERSISTENT STATE ---
let persistentMessages = [];
let lastJoinedRoom = null;

// --- DEDUPLICATION STATE ---
let lastHandledMessageStr = null;
let lastHandledMessageTime = 0;

const ChatWidget = ({ isPartyMode, partyCode, username, myColor }) => {
  const [messages, setMessages] = useState(persistentMessages);
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Listener: Handles incoming messages from any room
  useEffect(() => {
    const handleMessage = (message) => {
      if (isPartyMode && message.room !== partyCode) return;
      if (!isPartyMode && message.room !== 'global') return;

      // PREVENT DOUBLE MESSAGES (When Mobile & Desktop widgets are both mounted)
      const msgStr = JSON.stringify(message);
      const now = Date.now();
      if (msgStr === lastHandledMessageStr && (now - lastHandledMessageTime) < 50) {
        return; // Ignore exact duplicate received in the same millisecond tick
      }
      
      lastHandledMessageStr = msgStr;
      lastHandledMessageTime = now;

      persistentMessages = [message, ...persistentMessages.slice(0, 149)];
      setMessages([...persistentMessages]);
    };

    socket.on('receive_message', handleMessage);
    return () => socket.off('receive_message', handleMessage);
  }, [isPartyMode, partyCode]);

  // Handle Room Joining & System Notifications
  // FIX: Only depend on isPartyMode and partyCode.
  // DO NOT depend on username, otherwise it reconnects when you edit your name.
  useEffect(() => {
    const room = isPartyMode ? partyCode : 'global';
    
    // Only join and announce if we are actually switching to a NEW room
    if (lastJoinedRoom !== room) {
      socket.emit(isPartyMode ? 'join_room' : 'join_global', room);

      const transitionMsg = {
        user: "System",
        text: isPartyMode ? `Joined Party Chat: ${partyCode}` : "Joined Global Chat",
        type: "system",
        room: room 
      };
      
      persistentMessages = [transitionMsg, ...persistentMessages.slice(0, 149)];
      setMessages([...persistentMessages]);
      lastJoinedRoom = room;
    }

  }, [isPartyMode, partyCode]);

  const sendMessage = (e) => {
    e.preventDefault();
    if (inputText.trim()) {
      const msgData = {
        room: isPartyMode ? partyCode : 'global',
        user: username, // Uses the fresh username passed down as a prop!
        text: inputText,
        color: myColor,
        type: "user"
      };
      socket.emit('send_message', msgData);
      setInputText("");
    }
  };

  return (
    <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700 rounded-2xl shadow-2xl h-full flex flex-col font-sans pointer-events-auto overflow-hidden">
      {/* HEADER */}
      <div className="p-4 border-b border-slate-700/50 flex items-center gap-3 bg-slate-800/50 rounded-t-2xl shrink-0">
        <div className={`p-2 rounded-lg ${isPartyMode ? 'bg-cyan-500/20 text-cyan-400' : 'bg-indigo-500/20 text-indigo-400'}`}>
          <MessageSquare size={20} />
        </div>
        <div>
          <h3 className="text-sm font-black text-white uppercase tracking-wider">
            {isPartyMode ? "Party Chat" : "Global Chat"}
          </h3>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            {isPartyMode ? `Room: ${partyCode}` : "Server: Main"}
          </p>
        </div>
      </div>

      {/* MESSAGES AREA */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col-reverse scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        <div ref={messagesEndRef} />
        
        {messages.map((msg, idx) => {
          const isSystem = msg.user === "System";
          const isGreen = msg.type === "system_green"; 
          const isRed = msg.type === "system_red";

          return (
            <div key={idx} className="text-sm break-words animate-in fade-in slide-in-from-bottom-2 duration-300 py-1.5">
              {isSystem ? (
                <span className={`font-bold uppercase text-[10px] tracking-widest ${
                  isGreen ? "text-green-400" : isRed ? "text-red-500" : "text-yellow-500/80"
                }`}>
                  <span className="mr-2 opacity-50">System:</span>
                  {msg.text}
                </span>
              ) : (
                <>
                  <span className="font-bold mr-2" style={{ color: msg.color || '#fff' }}>
                    {msg.user}:
                  </span>
                  <span className="text-slate-300 font-medium">
                    {msg.text}
                  </span>
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* INPUT AREA */}
      <form onSubmit={sendMessage} className="p-3 bg-slate-950/50 border-t border-slate-800 rounded-b-2xl shrink-0">
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-xl p-1 focus-within:border-indigo-500 transition-colors">
          <input
            className="flex-1 bg-transparent text-white text-xs font-bold px-3 py-2 outline-none placeholder:text-slate-600"
            placeholder={isPartyMode ? "Message party..." : "Message global..."}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />
          <button type="submit" className="p-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-all active:scale-95">
            <Send size={14} />
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatWidget;