import React from 'react';
import { X, Grid, AlertTriangle, CheckCircle, RotateCw, Trophy, Target } from 'lucide-react';

const RulesModal = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden relative">
        
        <div className="flex justify-between items-center p-6 border-b border-slate-800 bg-slate-900/50">
          <h2 className="text-2xl font-black text-white uppercase tracking-widest flex items-center gap-3">
            <Grid className="text-indigo-400" size={28} /> How to Play
          </h2>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all"
          >
            <X size={24} />
          </button>
        </div>

        <div className="overflow-y-auto p-6 flex flex-col gap-8 custom-scrollbar">
          
          <div className="text-slate-300 text-lg leading-relaxed">
            Welcome to <span className="font-black text-indigo-400">Block Battles</span>. 
            The goal is simple: place as many of your 21 pieces on the board as possible. 
            Every single square block you place earns you 1 point. The player with the highest score wins!
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-black text-white uppercase tracking-widest border-b border-slate-800 pb-2">The 3 Golden Rules</h3>
            
            <div className="flex gap-4 items-start bg-slate-800/50 p-4 rounded-xl border border-slate-700">
              <div className="bg-blue-500/20 text-blue-400 p-3 rounded-lg"><Target size={24} /></div>
              <div>
                <h4 className="font-bold text-white text-lg">1. The First Move</h4>
                <p className="text-slate-400 mt-1">Your very first piece <strong className="text-slate-200">MUST</strong> be placed so that it covers your assigned starting position. You will see a <strong className="text-white">pulsing dot matching your color</strong> on the board telling you where to start.</p>
              </div>
            </div>

            <div className="flex gap-4 items-start bg-slate-800/50 p-4 rounded-xl border border-slate-700">
              <div className="bg-green-500/20 text-green-400 p-3 rounded-lg"><CheckCircle size={24} /></div>
              <div>
                <h4 className="font-bold text-white text-lg">2. Corner-to-Corner Only</h4>
                <p className="text-slate-400 mt-1">Every subsequent piece you play <strong className="text-green-400">MUST touch at least one corner</strong> of another piece of your own color.</p>
              </div>
            </div>

            <div className="flex gap-4 items-start bg-slate-800/50 p-4 rounded-xl border border-slate-700">
              <div className="bg-red-500/20 text-red-400 p-3 rounded-lg"><AlertTriangle size={24} /></div>
              <div>
                <h4 className="font-bold text-white text-lg">3. Never Touch Flat Edges</h4>
                <p className="text-slate-400 mt-1">Your pieces can <strong className="text-red-400">NEVER touch the flat sides/edges</strong> of your own pieces. (However, it is perfectly fine to touch the flat edges of your opponents' pieces!).</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-xl font-black text-white uppercase tracking-widest border-b border-slate-800 pb-2">Controls & UI</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/50">
                <RotateCw className="text-yellow-400 mb-2" size={24} />
                <h4 className="font-bold text-white">Rotating Pieces</h4>
                <p className="text-sm text-slate-400 mt-1">Select a piece from your inventory, then press the <kbd className="bg-slate-700 px-2 py-0.5 rounded text-yellow-400 font-mono font-bold mx-1">R</kbd> key on your keyboard to rotate it 90 degrees.</p>
              </div>
              <div className="bg-slate-800/30 p-4 rounded-xl border border-slate-700/50">
                <Grid className="text-cyan-400 mb-2" size={24} />
                <h4 className="font-bold text-white">Placement Guides</h4>
                <p className="text-sm text-slate-400 mt-1">When hovering over the board, a <strong className="text-green-400">Green</strong> outline means the move is valid. A <strong className="text-red-400">Red</strong> outline means you are breaking a rule.</p>
              </div>
            </div>
          </div>

          <div className="bg-indigo-900/20 border border-indigo-500/30 p-6 rounded-2xl text-center">
            <Trophy className="text-indigo-400 mx-auto mb-3" size={32} />
            <h3 className="text-lg font-black text-white uppercase tracking-widest mb-2">Game Over</h3>
            <p className="text-indigo-200/80 text-sm">
              If you run out of valid moves, you must click <strong className="text-red-400">Skip Turn</strong>. 
              The game ends when NO player has any valid moves left. The highest score wins! You have 30 seconds per turn.
            </p>
          </div>

        </div>

        <div className="p-6 border-t border-slate-800 bg-slate-900/80">
          <button 
            onClick={onClose}
            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black uppercase tracking-widest transition-all active:scale-95 shadow-lg"
          >
            I'm Ready to Play
          </button>
        </div>

      </div>
    </div>
  );
};

export default RulesModal;