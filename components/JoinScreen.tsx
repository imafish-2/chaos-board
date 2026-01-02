import React, { useState } from 'react';

interface JoinScreenProps {
  onJoin: (code: string, name: string) => void;
  onBack: () => void;
}

export const JoinScreen: React.FC<JoinScreenProps> = ({ onJoin, onBack }) => {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");

  const handleJoin = () => {
    if (code.length === 5 && name.length > 0) {
      onJoin(code, name);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col p-6">
      <button onClick={onBack} className="text-slate-400 mb-8 flex items-center gap-2 font-bold">
        ← BACK
      </button>
      
      <h1 className="text-4xl font-display text-white mb-2">JOIN GAME</h1>
      <p className="text-slate-400 mb-8">Enter the code shown on the TV.</p>

      <div className="space-y-6">
        <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Your Name</label>
            <input 
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value.toUpperCase().slice(0, 8))}
                placeholder="PLAYER"
                className="w-full bg-slate-800 text-white text-2xl font-bold p-4 rounded-xl border-2 border-slate-700 focus:border-green-500 outline-none placeholder-slate-600"
            />
        </div>

        <div>
            <label className="block text-xs font-bold uppercase text-slate-500 mb-2">Room Code</label>
            <input 
                type="number"
                value={code}
                onChange={(e) => setCode(e.target.value.slice(0, 5))}
                placeholder="00000"
                className="w-full bg-slate-800 text-white text-5xl font-mono text-center tracking-widest p-4 rounded-xl border-2 border-slate-700 focus:border-green-500 outline-none placeholder-slate-700"
            />
        </div>

        <button 
            onClick={handleJoin}
            disabled={code.length !== 5 || name.length === 0}
            className="w-full py-6 mt-4 bg-green-500 text-black font-black text-2xl rounded-xl shadow-lg disabled:opacity-50 disabled:shadow-none active:scale-95 transition-all"
        >
            CONNECT
        </button>
      </div>

      <div className="mt-auto text-center text-slate-600 text-xs">
          Open a new tab to simulate a phone connection.
      </div>
    </div>
  );
};