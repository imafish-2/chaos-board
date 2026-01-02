import React, { useState, useEffect } from 'react';
import { TurnPhase, Player, GamePhase } from '../types';

interface MobileControllerProps {
  player: Player;
  isActive: boolean;
  gamePhase: GamePhase;
  turnPhase: TurnPhase;
  onRoll: () => void;
  onMinigameAction: (action: string) => void;
}

export const MobileController: React.FC<MobileControllerProps> = ({
  player,
  isActive,
  gamePhase,
  turnPhase,
  onRoll,
  onMinigameAction
}) => {
  const [shaking, setShaking] = useState(false);

  // Simulate shake detection
  const handleShake = () => {
    setShaking(true);
    setTimeout(() => setShaking(false), 500);
    if (isActive && turnPhase === TurnPhase.START) {
      onRoll();
    }
    if (gamePhase === GamePhase.MINIGAME_PLAY) {
        onMinigameAction('SHAKE');
    }
  };

  return (
    <div className={`h-full w-full flex flex-col items-center justify-between p-6 rounded-3xl border-8 ${isActive ? 'border-white animate-pulse' : 'border-gray-700 opacity-50'} transition-all duration-300 relative overflow-hidden`}
         style={{ backgroundColor: player.color }}>
      
      {/* Phone Notion Header */}
      <div className="absolute top-0 w-32 h-6 bg-black rounded-b-xl z-10"></div>

      <div className="mt-8 text-center text-white">
        <div className="text-4xl mb-2">{player.avatar}</div>
        <h2 className="text-2xl font-bold font-display uppercase">{player.name}</h2>
        <div className="flex justify-center gap-4 mt-2 font-mono bg-black/30 p-2 rounded-lg">
          <span>🪙 {player.coins}</span>
          <span>⭐ {player.stars}</span>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center w-full">
        {gamePhase === GamePhase.LOBBY && (
          <div className="text-white/80 text-center animate-bounce">
            Waiting for host...
          </div>
        )}

        {gamePhase === GamePhase.BOARD && isActive && turnPhase === TurnPhase.START && (
          <button
            onClick={handleShake}
            className={`w-32 h-32 rounded-full bg-white text-black font-bold text-xl shadow-xl flex items-center justify-center transform transition active:scale-95 ${shaking ? 'animate-shake' : 'animate-pulse'}`}
          >
            TAP TO<br/>ROLL
          </button>
        )}

        {gamePhase === GamePhase.BOARD && !isActive && (
            <div className="text-white/60 text-lg font-display">Wait your turn...</div>
        )}

        {gamePhase === GamePhase.MINIGAME_PLAY && (
            <div className="grid grid-cols-2 gap-4 w-full">
                <button 
                    onPointerDown={() => onMinigameAction('A')}
                    className="aspect-square bg-red-500 rounded-full border-b-4 border-red-700 shadow-lg text-white font-black text-2xl active:translate-y-1 active:border-b-0">
                    A
                </button>
                <button 
                     onPointerDown={() => onMinigameAction('B')}
                    className="aspect-square bg-blue-500 rounded-full border-b-4 border-blue-700 shadow-lg text-white font-black text-2xl active:translate-y-1 active:border-b-0">
                    B
                </button>
            </div>
        )}
      </div>

      {isActive && <div className="absolute bottom-4 text-xs text-white/50 uppercase tracking-widest">Controller Active</div>}
    </div>
  );
};