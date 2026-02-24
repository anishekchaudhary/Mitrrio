import React, { useState, useEffect, useRef } from 'react';
import { Users, Send, Globe } from 'lucide-react';
import { socket } from '../utils/socket';

const ChatWidget = ({ isPartyMode, partyCode, username, myColor }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);

  const activeRoom = isPartyMode ? partyCode : "global";

  useEffect(() => {
    if (activeRoom) {
      setMessages((prev) => {
        const updated = [
          ...prev, 
          { 
            id: 'sys_' + Date.now(), 
            user: "System", 
            text: `Joined ${isPartyMode ? 'Party' : 'Global'} Chat`, 
            type: "system" 
          }
        ];
        return updated.slice(-150);
      });
    }
  }, [activeRoom, isPartyMode]);

  useEffect(() => {
    const handleMessage = (data) => {
      setMessages((prev) => {
        const updated = [...prev, { ...data, id: Date.now() + Math.random() }];
        return updated.slice(-150); 
      });
    };

    socket.on('receive_message', handleMessage);
    
    return () => {
      socket.off('receive_message', handleMessage);
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Use passed color if in Party Mode, otherwise Grey for Global
    const colorToSend = isPartyMode ? myColor : '#94a3b8';

    const messageData = {
      room: activeRoom,
      user: username || "Guest",
      text: input,
      type: "user",
      color: colorToSend // Send color with message
    };

    socket.emit('send_message', messageData);
    setInput("");
  };

  return (
    <div className="h-full flex flex-col bg-slate-900/90 backdrop-blur-md border border-slate-700 rounded-2xl shadow-2xl overflow-hidden font-sans transition-all">
      {/* Header */}
      <div className={`px-6 py-4 text-xs font-black uppercase tracking-widest flex items-center gap-3 text-white shrink-0 border-b border-slate-800 ${isPartyMode ? 'bg-blue-600/20' : 'bg-slate-800/30'}`}>
        {isPartyMode ? <Users size={18} className="text-blue-400" /> : <Globe size={18} className="text-emerald-400" />}
        <span>{isPartyMode ? `Party: ${partyCode}` : "Global Arena"}</span>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2 scrollbar-hide flex flex-col">
        <div className="flex-grow" />
        {messages.map((msg) => (
          <div key={msg.id} className={`text-sm animate-fade-in-up ${msg.type === 'system' ? 'text-blue-400 italic text-center text-[10px] py-2 opacity-70' : 'text-slate-200'}`}>
            {msg.type !== 'system' && (
              <span 
                className="font-black uppercase text-[10px] italic mr-2"
                style={{ color: msg.color || '#94a3b8' }} // Use message color or fallback to grey
              >
                {msg.user}:
              </span>
            )}
            <span className="font-medium break-words">{msg.text}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-4 bg-slate-950/30 border-t border-slate-800 flex gap-2 shrink-0">
        <input 
          type="text" 
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Message ${isPartyMode ? 'Party' : 'Global'}...`} 
          className="flex-1 bg-slate-900 text-white text-sm px-4 py-3 rounded-xl border border-slate-700 focus:outline-none focus:border-blue-500 transition-all placeholder:text-slate-600"
        />
        <button type="submit" className="bg-blue-600 p-3 rounded-xl hover:bg-blue-500 text-white transition-all active:scale-95 shadow-lg">
          <Send size={18} />
        </button>
      </form>
    </div>
  );
};

export default ChatWidget;