export enum GamePhase {
  START_SCREEN = 'START_SCREEN',
  LOBBY = 'LOBBY',
  BOARD = 'BOARD',
  MINIGAME_INTRO = 'MINIGAME_INTRO',
  MINIGAME_PLAY = 'MINIGAME_PLAY',
  MINIGAME_RESULTS = 'MINIGAME_RESULTS',
  CHAOS_EVENT = 'CHAOS_EVENT',
  GAME_OVER = 'GAME_OVER'
}

export enum TurnPhase {
  START = 'START',
  ROLLING = 'ROLLING',
  MOVING = 'MOVING',
  LANDED = 'LANDED',
  SHOP = 'SHOP',
  END = 'END'
}

export enum SpaceType {
  EMPTY = 'EMPTY',
  COIN = 'COIN',
  TRAP = 'TRAP',
  CHAOS = 'CHAOS',
  DUEL = 'DUEL',
  STAR = 'STAR'
}

export enum GameMode {
  BOARD_GAME = 'BOARD_GAME',
  MINIGAME_ONLY = 'MINIGAME_ONLY'
}

export enum CpuDifficulty {
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD'
}

export type GameViewMode = 'MENU' | 'HOST' | 'CLIENT';

export interface Player {
  id: number;
  name: string;
  color: string;
  avatar: string; // Emoji
  coins: number;
  stars: number;
  position: number; // Index on board
  items: string[];
  isCpu: boolean;
  cpuDifficulty?: CpuDifficulty;
}

export interface BoardSpace {
  id: number;
  type: SpaceType;
  x: number;
  y: number;
  next: number[]; // Adjacency list for branching
}

export interface MinigameDef {
  id: string;
  name: string;
  description: string;
  instructions: string;
  type: 'MASH' | 'TIMING' | 'REACTION';
}

export interface GameState {
  viewMode: GameViewMode;
  roomCode: string;
  phase: GamePhase;
  turnPhase: TurnPhase;
  gameMode: GameMode;
  players: Player[];
  currentPlayerIndex: number;
  board: BoardSpace[];
  round: number;
  maxRounds: number;
  chaosMessage: string | null; // From AI
  currentMinigame: MinigameDef | null;
  // Client specific
  clientPlayerId: number | null;
}

export interface MinigameResult {
  playerId: number;
  score: number;
  rank: number;
}