import React from "react";
import { AlertTriangle, MonitorX } from "lucide-react";

const SessionReplaceModal = ({ isOpen, onCloseTab }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 backdrop-blur-sm">

      <div className="w-[420px] bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6">

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-red-500/10 p-3 rounded-xl border border-red-500/20">
            <AlertTriangle className="text-red-400" size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white leading-tight">
              Session active in another tab
            </h2>
            <p className="text-xs text-slate-400">
              This tab is now inactive
            </p>
          </div>
        </div>

        {/* Message */}
        <p className="text-slate-300 text-sm mb-6 leading-relaxed">
          Your Mitrrio session is currently running in another tab or window.
          <br />
          To continue playing, close this tab or return to the active one.
        </p>

        {/* Action */}
        <button
          onClick={onCloseTab}
          className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 font-bold py-3 rounded-xl transition-all text-sm uppercase tracking-wide flex items-center justify-center gap-2"
        >
          <MonitorX size={16} />
          Close this tab
        </button>

      </div>
    </div>
  );
};

export default SessionReplaceModal;
