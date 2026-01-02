import React from 'react';

interface StartScreenProps {
  onHost: () => void;
  onJoin?: () => void; // Optional if we are reusing logic, but App passes it
}

export const StartScreen: React.FC<{ onHost: () => void; onJoin: () => void }> = ({ onHost, onJoin }) => {
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-[100px] animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-[100px] animate-pulse" style={{animationDelay: '1s'}}></div>
      </div>

      <div className="z-10 flex flex-col items-center text-center w-full max-w-5xl">
        <h1 className="text-8xl md:text-9xl font-display text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 via-orange-500 to-red-600 mb-2 transform -rotate-2 drop-shadow-lg">
            CHAOS BOARD
        </h1>
        <p className="text-xl text-blue-200 mb-12 tracking-widest uppercase font-bold">Party Game of Broken Friendships</p>

        <div className="flex flex-col md:flex-row gap-8 w-full justify-center px-4">
            
            {/* HOST CARD */}
            <button 
                onClick={onHost}
                className="group relative flex-1 bg-gradient-to-br from-slate-800 to-slate-900 p-8 rounded-3xl border-2 border-slate-700 hover:border-purple-500 transition-all hover:-translate-y-2 hover:shadow-[0_0_50px_rgba(168,85,247,0.4)] text-left flex flex-col justify-between h-80 min-w-[300px]"
            >
                <div>
                    <div className="text-6xl mb-4 group-hover:scale-110 transition-transform origin-left">📺</div>
                    <h2 className="text-4xl font-display text-white mb-2">HOST GAME</h2>
                    <p className="text-slate-400">Use this device as the TV / Board.</p>
                </div>
                <div className="flex items-center gap-2 text-purple-400 font-bold uppercase text-sm tracking-wider">
                    Create Room <span className="text-xl">→</span>
                </div>
            </button>

            {/* JOIN CARD */}
            <button 
                onClick={onJoin}
                className="group relative flex-1 bg-gradient-to-br from-slate-800 to-slate-900 p-8 rounded-3xl border-2 border-slate-700 hover:border-green-500 transition-all hover:-translate-y-2 hover:shadow-[0_0_50px_rgba(34,197,94,0.4)] text-left flex flex-col justify-between h-80 min-w-[300px]"
            >
                <div>
                    <div className="text-6xl mb-4 group-hover:scale-110 transition-transform origin-left">📱</div>
                    <h2 className="text-4xl font-display text-white mb-2">JOIN GAME</h2>
                    <p className="text-slate-400">Use this device as a Controller.</p>
                </div>
                <div className="flex items-center gap-2 text-green-400 font-bold uppercase text-sm tracking-wider">
                    Enter Code <span className="text-xl">→</span>
                </div>
            </button>
        </div>

        <div className="mt-16 text-slate-500 text-sm">
            v1.2.0 • Supports 1-4 Players
        </div>
      </div>
    </div>
  );
};