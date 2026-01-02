import React from 'react';
import { BoardSpace, Player, SpaceType } from '../types';
import { COLORS } from '../constants';

interface BoardProps {
  spaces: BoardSpace[];
  players: Player[];
  currentPlayerId: number;
}

const getSpaceColor = (type: SpaceType) => {
  switch (type) {
    case SpaceType.COIN: return 'bg-blue-500 border-blue-700';
    case SpaceType.TRAP: return 'bg-red-600 border-red-800';
    case SpaceType.CHAOS: return 'bg-purple-600 border-purple-800';
    case SpaceType.DUEL: return 'bg-orange-500 border-orange-700';
    case SpaceType.STAR: return 'bg-yellow-400 border-yellow-600 animate-pulse ring-4 ring-yellow-200';
    default: return 'bg-gray-600 border-gray-800';
  }
};

const getSpaceIcon = (type: SpaceType) => {
  switch (type) {
    case SpaceType.COIN: return '🪙';
    case SpaceType.TRAP: return '💣';
    case SpaceType.CHAOS: return '🎁';
    case SpaceType.DUEL: return '⚔️';
    case SpaceType.STAR: return '👑';
    default: return '';
  }
};

export const Board: React.FC<BoardProps> = ({ spaces, players, currentPlayerId }) => {
  return (
    <div className="relative w-full h-full perspective-board">
      {/* Render Connections */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none board-path opacity-50" style={{ transform: 'translateZ(-10px)' }}>
        {spaces.map(space => 
           space.next.map(nextId => {
               const nextSpace = spaces.find(s => s.id === nextId);
               if (!nextSpace) return null;
               return (
                   <line 
                    key={`${space.id}-${nextId}`}
                    x1={`${space.x}%`} 
                    y1={`${space.y}%`} 
                    x2={`${nextSpace.x}%`} 
                    y2={`${nextSpace.y}%`} 
                    stroke="white" 
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray="10, 10"
                   />
               );
           })
        )}
      </svg>

      {/* Render Spaces */}
      {spaces.map((space) => (
        <div
          key={space.id}
          className={`absolute w-12 h-12 -ml-6 -mt-6 rounded-full border-b-4 shadow-2xl flex items-center justify-center text-xl transform transition-transform hover:scale-110 z-0 ${getSpaceColor(space.type)}`}
          style={{ 
              left: `${space.x}%`, 
              top: `${space.y}%` 
            }}
        >
          {getSpaceIcon(space.type)}
        </div>
      ))}

      {/* Render Players */}
      {players.map((player, index) => {
        const space = spaces[player.position];
        // Offset slightly if multiple players on same space
        const offset = (index * 5); 
        const isCurrent = player.id === currentPlayerId;

        return (
          <div
            key={player.id}
            className={`absolute w-14 h-14 -ml-7 -mt-10 transition-all duration-500 ease-in-out z-10`}
            style={{ 
              left: `calc(${space.x}% + ${offset}px)`, 
              top: `calc(${space.y}% - ${offset}px)`,
              zIndex: isCurrent ? 50 : 10
            }}
          >
            <div className={`w-full h-full relative`}>
                <div className={`absolute bottom-0 w-full h-full rounded-full border-4 bg-white flex items-center justify-center text-3xl shadow-lg ${isCurrent ? 'animate-bounce ring-4 ring-white' : ''}`}
                     style={{ borderColor: player.color }}>
                    {player.avatar}
                </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};