import React, { useState } from 'react';
import { X, ChevronRight, ChevronLeft, CheckCircle, Info } from 'lucide-react';

const RulesModal = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const steps = [
    {
      title: "The Objective",
      description: "Mitrrio is a game of risk and reward. The goal is to reach +50 points to win the match. If your score drops to -50, you are eliminated!",
      image: "/tutorial/step1.png" // Placeholder path for your highlighted image
    },
    {
      title: "Rolling the Dice",
      description: "On your turn, roll the dice to build your 'Turn Bank'. You can roll as many times as you want! But beware: if you roll a 1, your bank is wiped to 0 and your turn ends immediately.",
      image: "/tutorial/step2.png"
    },
    {
      title: "Holding (Tug-o-War)",
      description: "When you have enough points in your bank, click 'Hold'. These points are ADDED to your score, and SUBTRACTED from the next player's score! Tug their health down to eliminate them.",
      image: "/tutorial/step3.png"
    }
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onClose();
      setCurrentStep(0); // Reset for next time
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep(prev => prev - 1);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl overflow-hidden w-full max-w-2xl shadow-2xl relative flex flex-col">
        
        {/* HEADER */}
        <div className="flex justify-between items-center p-6 border-b border-slate-800 bg-slate-900/50">
          <h2 className="text-xl font-black text-white uppercase tracking-widest flex items-center gap-3">
            <Info className="text-cyan-400" /> How to Play
          </h2>
          <button onClick={() => { onClose(); setCurrentStep(0); }} className="text-slate-500 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        {/* CONTENT */}
        <div className="p-8 flex-1 flex flex-col items-center text-center">
          {/* SQUARISH IMAGE BOX */}
          <div className="w-150 h-128 bg-slate-800 border-2 border-slate-700 rounded-2xl mb-6 shrink-0 overflow-hidden flex items-center justify-center relative shadow-inner mx-auto">
            <img 
              src={steps[currentStep].image} 
              alt={steps[currentStep].title}
              className="w-full h-full object-cover opacity-90"
              onError={(e) => {
                e.target.style.display = 'none';
                e.target.parentElement.innerHTML = `<span class="text-slate-500 font-bold uppercase tracking-widest text-sm text-center px-4">Add ${steps[currentStep].image}</span>`;
              }}
            />
          </div>

          <h3 className="text-2xl font-black text-cyan-400 uppercase tracking-widest mb-3">
            {steps[currentStep].title}
          </h3>
          <p className="text-slate-300 font-medium leading-relaxed max-w-lg">
            {steps[currentStep].description}
          </p>
        </div>

        {/* FOOTER CONTROLS */}
        <div className="p-6 border-t border-slate-800 bg-slate-950/50 flex items-center justify-between">
          <div className="flex gap-2">
            {steps.map((_, idx) => (
              <div key={idx} className={`w-2.5 h-2.5 rounded-full transition-all ${idx === currentStep ? 'bg-cyan-400 scale-125' : 'bg-slate-700'}`} />
            ))}
          </div>

          <div className="flex gap-3">
            <button 
              onClick={handlePrev}
              disabled={currentStep === 0}
              className="p-3 rounded-xl font-bold bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-30 disabled:hover:bg-slate-800 transition-all"
            >
              <ChevronLeft size={20} />
            </button>
            <button 
              onClick={handleNext}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-black uppercase tracking-widest text-white transition-all active:scale-95 shadow-lg ${
                currentStep === steps.length - 1 ? 'bg-green-600 hover:bg-green-500 shadow-green-500/20' : 'bg-cyan-600 hover:bg-cyan-500 shadow-cyan-500/20'
              }`}
            >
              {currentStep === steps.length - 1 ? <><CheckCircle size={20}/> Got it!</> : <>Next <ChevronRight size={20}/></>}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default RulesModal;