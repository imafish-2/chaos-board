import { BoardSpace, SpaceType, MinigameDef } from './types';

export const COLORS = [
  { name: 'Red', hex: '#ef4444', text: 'text-red-500', bg: 'bg-red-500', avatar: '🦁' },
  { name: 'Blue', hex: '#3b82f6', text: 'text-blue-500', bg: 'bg-blue-500', avatar: '🦈' },
  { name: 'Green', hex: '#22c55e', text: 'text-green-500', bg: 'bg-green-500', avatar: '🐸' },
  { name: 'Yellow', hex: '#eab308', text: 'text-yellow-500', bg: 'bg-yellow-500', avatar: '🐝' },
];

export const MINIGAMES: MinigameDef[] = [
  {
    id: 'turbo_taps',
    name: 'Turbo Taps',
    description: 'Mash the button as fast as you can!',
    instructions: 'Tap A repeatedly!',
    type: 'MASH'
  },
  {
    id: 'cosmic_count',
    name: 'Cosmic Count',
    description: 'Stop the timer at exactly 5.00 seconds.',
    instructions: 'Tap A to stop. Timer hides at 3s!',
    type: 'TIMING'
  },
  {
    id: 'neon_reflex',
    name: 'Neon Reflex',
    description: 'Wait for the screen to turn GREEN, then tap!',
    instructions: 'Don\'t tap too early!',
    type: 'REACTION'
  }
];

// Generate a simple circular board loop
const generateBoard = (): BoardSpace[] => {
  const spaces: BoardSpace[] = [];
  const totalSpaces = 24;
  const width = 80;
  const height = 60;
  
  for (let i = 0; i < totalSpaces; i++) {
    // Elliptical path
    const angle = (i / totalSpaces) * 2 * Math.PI;
    const x = 50 + 40 * Math.cos(angle);
    const y = 50 + 40 * Math.sin(angle);

    let type = SpaceType.EMPTY;
    if (i % 6 === 0) type = SpaceType.CHAOS;
    else if (i % 4 === 0) type = SpaceType.TRAP;
    else if (i % 2 === 0) type = SpaceType.COIN;
    else type = SpaceType.DUEL;

    // Hardcode space 0 as Start
    if (i === 0) type = SpaceType.EMPTY;
    // Hardcode space 12 as Star Shop (initial position)
    if (i === 12) type = SpaceType.STAR;

    spaces.push({
      id: i,
      type,
      x,
      y,
      next: [(i + 1) % totalSpaces]
    });
  }
  return spaces;
};

export const INITIAL_BOARD = generateBoard();

export const BOARD_BG_IMAGE = "https://picsum.photos/1920/1080?blur=5";
