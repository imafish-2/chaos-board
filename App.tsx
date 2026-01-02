import React, { useState, useEffect, useRef } from 'react';
import { GameState, GamePhase, Player, TurnPhase, SpaceType, MinigameDef, GameMode, MinigameResult, GameViewMode, CpuDifficulty } from './types';
import { COLORS, INITIAL_BOARD, MINIGAMES } from './constants';
import { Board } from './components/Board';
import { MobileController } from './components/MobileController';
import { Minigame } from './components/Minigame';
import { StartScreen } from './components/StartScreen';
import { JoinScreen } from './components/JoinScreen';
import { network, generateRoomCode } from './services/networking';

const App: React.FC = () => {
  // --- STATE ---
  const [gameState, setGameState] = useState<GameState>({
    viewMode: 'MENU', // Default to Menu
    roomCode: '',
    phase: GamePhase.START_SCREEN,
    turnPhase: TurnPhase.START,
    gameMode: GameMode.BOARD_GAME,
    players: [],
    currentPlayerIndex: 0,
    board: INITIAL_BOARD,
    round: 1,
    maxRounds: 10,
    chaosMessage: null,
    currentMinigame: null,
    clientPlayerId: null
  });

  const [diceRoll, setDiceRoll] = useState<number | null>(null);
  const [announcement, setAnnouncement] = useState<string>("Welcome to Chaos Board!");
  const [minigameAction, setMinigameAction] = useState<{playerId: number, action: string} | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // --- NETWORK LISTENERS ---
  useEffect(() => {
    const unsubscribe = network.subscribe((msg) => {
        // --- HOST LOGIC ---
        if (gameState.viewMode === 'HOST') {
            if (msg.type === 'JOIN_REQUEST') {
                if (gameState.players.length >= 4 || gameState.phase !== GamePhase.LOBBY) return;
                
                const newPlayerId = gameState.players.length;
                const newPlayer: Player = {
                    id: newPlayerId,
                    name: msg.payload.name,
                    color: COLORS[newPlayerId].hex,
                    avatar: COLORS[newPlayerId].avatar,
                    coins: 10,
                    stars: 0,
                    position: 0,
                    items: [],
                    isCpu: false
                };

                setGameState(prev => ({
                    ...prev,
                    players: [...prev.players, newPlayer]
                }));

                // Send Ack
                network.send('JOIN_ACK', gameState.roomCode, { playerId: newPlayerId, status: 'OK' });
            }

            if (msg.type === 'CLIENT_INPUT') {
                 // Handle remote input
                 handleRemoteInput(msg.payload.playerId, msg.payload.action);
            }
        }

        // --- CLIENT LOGIC ---
        if (gameState.viewMode === 'CLIENT') {
            if (msg.type === 'JOIN_ACK') {
                setIsConnecting(false);
                if (msg.payload.status === 'OK') {
                    setGameState(prev => ({ ...prev, clientPlayerId: msg.payload.playerId, phase: GamePhase.LOBBY }));
                } else {
                    alert("Failed to join room.");
                    setGameState(prev => ({ ...prev, viewMode: 'CLIENT', phase: GamePhase.START_SCREEN }));
                }
            }

            if (msg.type === 'GAME_UPDATE') {
                // Sync important state to client for UI
                setGameState(prev => ({
                    ...prev,
                    phase: msg.payload.phase,
                    turnPhase: msg.payload.turnPhase,
                    players: msg.payload.players,
                    currentPlayerIndex: msg.payload.currentPlayerIndex,
                    currentMinigame: msg.payload.currentMinigame
                }));
            }
        }
    });

    return unsubscribe;
  }, [gameState.viewMode, gameState.roomCode, gameState.players, gameState.phase]);

  // Sync Host State to Clients
  useEffect(() => {
    if (gameState.viewMode === 'HOST') {
        network.send('GAME_UPDATE', gameState.roomCode, {
            phase: gameState.phase,
            turnPhase: gameState.turnPhase,
            players: gameState.players,
            currentPlayerIndex: gameState.currentPlayerIndex,
            currentMinigame: gameState.currentMinigame
        });
    }
  }, [gameState.phase, gameState.turnPhase, gameState.players, gameState.currentPlayerIndex, gameState.currentMinigame, gameState.viewMode]);


  // --- INPUT HANDLERS ---
  const handleRemoteInput = (playerId: number, action: string) => {
      // Route input based on phase
      if (gameState.phase === GamePhase.BOARD && action === 'ROLL') {
          if (gameState.currentPlayerIndex === playerId && gameState.turnPhase === TurnPhase.START) {
              handleRollDice();
          }
      } else if (gameState.phase === GamePhase.MINIGAME_PLAY) {
          setMinigameAction({ playerId, action });
          setTimeout(() => setMinigameAction(null), 50);
      }
  };


  // --- HOST ACTIONS ---
  const startHost = async () => {
      setIsConnecting(true);
      const code = generateRoomCode();
      const success = await network.host(code);
      setIsConnecting(false);
      
      if (success) {
        setGameState(prev => ({ 
            ...prev, 
            viewMode: 'HOST', 
            phase: GamePhase.LOBBY,
            roomCode: code 
        }));
      } else {
        alert("Failed to connect to network. Try again.");
      }
  };

  const startClient = () => {
      setGameState(prev => ({ ...prev, viewMode: 'CLIENT', phase: GamePhase.START_SCREEN }));
  };

  const submitJoin = async (code: string, name: string) => {
      setIsConnecting(true);
      const success = await network.join(code);
      
      if (success) {
        setGameState(prev => ({ ...prev, roomCode: code }));
        network.send('JOIN_REQUEST', code, { name });
      } else {
        setIsConnecting(false);
        alert("Could not find room. Check code!");
      }
  };

  const addPlayer = (isCpu: boolean = false) => {
    if (gameState.players.length >= 4) return;
    const idx = gameState.players.length;
    const newPlayer: Player = {
      id: idx,
      name: isCpu ? `CPU ${idx + 1}` : `Player ${idx + 1}`,
      color: COLORS[idx].hex,
      avatar: isCpu ? '🤖' : COLORS[idx].avatar,
      coins: 10,
      stars: 0,
      position: 0,
      items: [],
      isCpu,
      cpuDifficulty: isCpu ? CpuDifficulty.EASY : undefined
    };
    setGameState(prev => ({ ...prev, players: [...prev.players, newPlayer] }));
  };

  const cycleCpuDifficulty = (playerId: number) => {
      setGameState(prev => {
          const players = [...prev.players];
          const p = players[playerId];
          if (!p.isCpu) return prev;

          // Cycle: EASY -> MEDIUM -> HARD -> EASY
          let nextDiff = CpuDifficulty.EASY;
          if (p.cpuDifficulty === CpuDifficulty.EASY) nextDiff = CpuDifficulty.MEDIUM;
          else if (p.cpuDifficulty === CpuDifficulty.MEDIUM) nextDiff = CpuDifficulty.HARD;
          
          players[playerId] = { ...p, cpuDifficulty: nextDiff };
          return { ...prev, players };
      });
  };

  const updateSettings = (rounds: number) => {
      setGameState(prev => ({ ...prev, maxRounds: rounds }));
  };
  
  const toggleGameMode = () => {
      setGameState(prev => ({ 
          ...prev, 
          gameMode: prev.gameMode === GameMode.BOARD_GAME ? GameMode.MINIGAME_ONLY : GameMode.BOARD_GAME 
      }));
  };

  const startGame = () => {
    if (gameState.players.length < 1) return; 
    
    if (gameState.gameMode === GameMode.MINIGAME_ONLY) {
        const randomGame = MINIGAMES[Math.floor(Math.random() * MINIGAMES.length)];
        setGameState(prev => ({ 
            ...prev, 
            phase: GamePhase.MINIGAME_INTRO,
            currentMinigame: randomGame
        }));
        setAnnouncement("PURE MINIGAME MODE!");
    } else {
        setGameState(prev => ({ ...prev, phase: GamePhase.BOARD }));
        setAnnouncement("Let the Chaos Begin!");
    }
  };

  // --- GAMEPLAY LOGIC (HOST ONLY) ---
  // CPU Automation
  useEffect(() => {
    if (gameState.viewMode !== 'HOST') return;
    if (gameState.phase === GamePhase.BOARD && gameState.turnPhase === TurnPhase.START) {
        const currentPlayer = gameState.players[gameState.currentPlayerIndex];
        if (currentPlayer.isCpu) {
            const delay = setTimeout(() => {
                handleRollDice();
            }, 1500); 
            return () => clearTimeout(delay);
        }
    }
  }, [gameState.phase, gameState.turnPhase, gameState.currentPlayerIndex, gameState.players, gameState.viewMode]);


  const handleRollDice = async () => {
    if (gameState.turnPhase !== TurnPhase.START) return;
    
    setGameState(prev => ({ ...prev, turnPhase: TurnPhase.ROLLING }));
    let rolls = 0;
    const rollInterval = setInterval(() => {
        setDiceRoll(Math.floor(Math.random() * 10) + 1);
        rolls++;
        if (rolls > 10) {
            clearInterval(rollInterval);
            const finalRoll = Math.floor(Math.random() * 10) + 1; 
            setDiceRoll(finalRoll);
            movePlayer(finalRoll);
        }
    }, 100);
  };

  const movePlayer = (steps: number) => {
    setGameState(prev => ({ ...prev, turnPhase: TurnPhase.MOVING }));
    let stepsLeft = steps;
    
    const moveInterval = setInterval(() => {
      setGameState(prev => {
        const player = prev.players[prev.currentPlayerIndex];
        const currentSpace = prev.board[player.position];
        const nextSpaceId = currentSpace.next[0]; 

        const updatedPlayers = [...prev.players];
        updatedPlayers[prev.currentPlayerIndex].position = nextSpaceId;

        return { ...prev, players: updatedPlayers };
      });

      stepsLeft--;
      if (stepsLeft <= 0) {
        clearInterval(moveInterval);
        handleLanding();
      }
    }, 400);
  };

  const handleLanding = async () => {
    setGameState(prev => {
        const player = prev.players[prev.currentPlayerIndex];
        const space = prev.board[player.position];
        
        let newPhase = TurnPhase.LANDED;
        let newAnnouncement = "";
        const updatedPlayers = [...prev.players];
        
        if (space.type === SpaceType.COIN) {
            updatedPlayers[prev.currentPlayerIndex].coins += 3;
            newAnnouncement = "+3 Coins!";
        } else if (space.type === SpaceType.TRAP) {
            updatedPlayers[prev.currentPlayerIndex].coins = Math.max(0, updatedPlayers[prev.currentPlayerIndex].coins - 5);
            newAnnouncement = "It's a Trap! -5 Coins";
        } else if (space.type === SpaceType.STAR) {
            if (updatedPlayers[prev.currentPlayerIndex].coins >= 50) {
                 updatedPlayers[prev.currentPlayerIndex].coins -= 50;
                 updatedPlayers[prev.currentPlayerIndex].stars += 1;
                 newAnnouncement = "CROWN BOUGHT! -50 COINS";
            } else {
                newAnnouncement = "Crown costs 50! Get rich first!";
            }
        } else if (space.type === SpaceType.CHAOS) {
            newAnnouncement = "CHAOS EVENT TRIGGERED!";
        }

        setAnnouncement(newAnnouncement);

        return { 
            ...prev, 
            players: updatedPlayers,
            turnPhase: newPhase
        };
    });
    
    setTimeout(() => {
        endTurn();
    }, 2000);
  };

  const endTurn = () => {
    setGameState(prev => {
        const nextIndex = (prev.currentPlayerIndex + 1) % prev.players.length;
        if (nextIndex === 0) {
            const randomGame = MINIGAMES[Math.floor(Math.random() * MINIGAMES.length)];
            return {
                ...prev,
                currentPlayerIndex: 0,
                phase: GamePhase.MINIGAME_INTRO, 
                currentMinigame: randomGame,
                turnPhase: TurnPhase.START
            };
        }
        return {
            ...prev,
            currentPlayerIndex: nextIndex,
            turnPhase: TurnPhase.START
        };
    });
    setDiceRoll(null);
  };

  const startMinigame = () => {
      setGameState(prev => ({ ...prev, phase: GamePhase.MINIGAME_PLAY }));
  };

  const handleMinigameComplete = (results: MinigameResult[]) => {
      setGameState(prev => {
          const updatedPlayers = [...prev.players];
          results.forEach(res => {
              const reward = Math.max(0, 50 - (res.rank * 10)); 
              updatedPlayers[res.playerId].coins += reward;
          });
          
          const winner = results[0];
          setAnnouncement(`Winner: ${updatedPlayers[winner.playerId].name}! (+40 Coins)`);

          if (prev.gameMode === GameMode.MINIGAME_ONLY) {
              const randomGame = MINIGAMES[Math.floor(Math.random() * MINIGAMES.length)];
              return {
                  ...prev,
                  players: updatedPlayers,
                  phase: GamePhase.MINIGAME_INTRO, 
                  currentMinigame: randomGame,
                  round: prev.round + 1
              };
          } else {
              return {
                  ...prev,
                  players: updatedPlayers,
                  phase: GamePhase.BOARD,
                  round: prev.round + 1,
                  turnPhase: TurnPhase.START
              };
          }
      });
  };

  // --- RENDER ROUTING ---
  
  if (gameState.viewMode === 'MENU') {
      return (
        <>
            {isConnecting && (
                <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center text-white font-bold">
                    CONNECTING TO NETWORK...
                </div>
            )}
            <StartScreen onHost={startHost} onJoin={startClient} />
        </>
      );
  }

  // 2. CLIENT (PHONE)
  if (gameState.viewMode === 'CLIENT') {
      if (gameState.clientPlayerId === null) {
          // Phones start directly at Join Screen
          return (
            <>
                {isConnecting && (
                    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center text-white font-bold">
                        SEARCHING FOR ROOM...
                    </div>
                )}
                <JoinScreen onJoin={submitJoin} onBack={() => setGameState(prev => ({...prev, viewMode: 'MENU'}))} />
            </>
          );
      }
      
      const myPlayer = gameState.players[gameState.clientPlayerId];
      if (!myPlayer) return <div className="p-8 text-white">Lobby joined! Wait for host...</div>;

      const isMyTurn = gameState.currentPlayerIndex === gameState.clientPlayerId;

      return (
          <div className="h-screen w-screen bg-black">
              <MobileController 
                  player={myPlayer}
                  isActive={isMyTurn}
                  gamePhase={gameState.phase}
                  turnPhase={gameState.turnPhase}
                  onRoll={() => network.send('CLIENT_INPUT', gameState.roomCode, { playerId: gameState.clientPlayerId, action: 'ROLL' })}
                  onMinigameAction={(action) => network.send('CLIENT_INPUT', gameState.roomCode, { playerId: gameState.clientPlayerId, action })}
              />
          </div>
      );
  }

  // 3. HOST (TV) - LOBBY
  if (gameState.phase === GamePhase.LOBBY) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
        {/* ROOM CODE DISPLAY */}
        <div className="absolute top-8 right-8 bg-black/50 p-4 rounded-xl backdrop-blur border border-white/20 text-right">
            <div className="text-sm text-slate-400 uppercase tracking-widest">Room Code</div>
            <div className="text-6xl font-mono text-white font-bold tracking-[0.2em]">{gameState.roomCode}</div>
        </div>

        <h1 className="text-6xl md:text-8xl font-display text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 mb-8">
            LOBBY
        </h1>
        
        {/* SETTINGS */}
        <div className="bg-slate-800 p-6 rounded-2xl mb-8 flex flex-col gap-4 items-center border border-slate-700 w-96">
            <div className="flex justify-between w-full items-center">
                <span className="text-white font-bold uppercase tracking-wider">Mode</span>
                <button 
                    onClick={toggleGameMode}
                    className={`px-4 py-2 rounded-lg font-bold text-sm transition-colors ${gameState.gameMode === GameMode.BOARD_GAME ? 'bg-blue-500 text-white' : 'bg-purple-500 text-white'}`}>
                    {gameState.gameMode === GameMode.BOARD_GAME ? '🎲 Board Game' : '🎮 Minigame Only'}
                </button>
            </div>
            
            <div className="flex justify-between w-full items-center">
                <span className="text-white font-bold uppercase tracking-wider">Rounds</span>
                <div className="flex items-center gap-4">
                    <button onClick={() => updateSettings(Math.max(5, gameState.maxRounds - 5))} className="bg-slate-700 w-8 h-8 rounded text-white hover:bg-slate-600">-</button>
                    <span className="text-xl font-mono text-blue-400 w-8 text-center">{gameState.maxRounds}</span>
                    <button onClick={() => updateSettings(gameState.maxRounds + 5)} className="bg-slate-700 w-8 h-8 rounded text-white hover:bg-slate-600">+</button>
                </div>
            </div>
        </div>

        <div className="flex gap-4 mb-12 flex-wrap justify-center w-full max-w-4xl">
            {gameState.players.map(p => (
                <div key={p.id} className="w-40 h-52 bg-slate-800 rounded-2xl flex flex-col items-center justify-center border-4 relative animate-in zoom-in duration-300 transition-all hover:scale-105" style={{borderColor: p.color}}>
                    {p.isCpu && (
                        <button 
                            onClick={() => cycleCpuDifficulty(p.id)}
                            className="absolute top-2 right-2 text-[10px] bg-slate-600 px-2 py-1 rounded hover:bg-slate-500 cursor-pointer border border-white/20 uppercase font-bold"
                        >
                            {p.cpuDifficulty}
                        </button>
                    )}
                    <span className="text-6xl mb-2">{p.avatar}</span>
                    <span className="font-bold text-white text-lg">{p.name}</span>
                    {p.isCpu && <span className="text-xs text-slate-400 mt-2">Tap to change difficulty</span>}
                </div>
            ))}
            {gameState.players.length < 4 && (
                <div className="flex flex-col gap-2">
                    <div className="w-40 h-32 border-4 border-dashed border-slate-600 rounded-2xl flex flex-col items-center justify-center text-slate-500">
                        <span className="text-2xl mb-2">📱</span>
                        <span className="text-xs font-bold uppercase text-center">Join with<br/>Phone</span>
                    </div>
                    <button onClick={() => addPlayer(true)} className="w-40 h-16 bg-slate-800 rounded-xl border border-slate-600 flex flex-col items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition">
                         <span className="text-xs font-bold uppercase">+ Add CPU</span>
                         <span className="text-[10px] opacity-50">(Starts Easy)</span>
                    </button>
                </div>
            )}
        </div>

        <button 
            onClick={startGame}
            disabled={gameState.players.length === 0}
            className="px-12 py-6 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-black text-2xl rounded-full shadow-[0_0_30px_rgba(34,197,94,0.6)] disabled:opacity-50 disabled:shadow-none transition-all transform hover:scale-105 active:scale-95 border-b-4 border-green-800 active:border-b-0 active:translate-y-1">
            START GAME
        </button>
      </div>
    );
  }

  // 4. HOST (TV) - GAME
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const isMinigamePhase = [GamePhase.MINIGAME_INTRO, GamePhase.MINIGAME_PLAY, GamePhase.MINIGAME_RESULTS].includes(gameState.phase);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-900 font-sans">
      
      {/* --- MAIN TV VIEW (Full Screen) --- */}
      <div className="flex-1 relative bg-gray-900 shadow-2xl overflow-hidden flex flex-col">
        
        {/* TOP HUD (Persistent Stats) */}
        <div className="h-24 bg-slate-900/90 backdrop-blur border-b border-white/10 flex items-center justify-between px-8 z-50">
            <div className="flex gap-4 w-full justify-center">
                {gameState.players.map(p => (
                    <div key={p.id} className="flex-1 max-w-[200px] bg-slate-800 rounded-xl p-2 border-2 relative overflow-hidden" style={{borderColor: p.color}}>
                        {p.id === currentPlayer.id && !isMinigamePhase && gameState.gameMode === GameMode.BOARD_GAME && (
                            <div className="absolute inset-0 bg-white/10 animate-pulse"></div>
                        )}
                        <div className="flex items-center gap-3 relative z-10">
                            <div className="text-3xl bg-black/30 rounded-full w-12 h-12 flex items-center justify-center">{p.avatar}</div>
                            <div className="flex flex-col w-full">
                                <div className="text-xs font-bold text-white/50 uppercase">{p.name}</div>
                                <div className="flex justify-between items-center pr-2">
                                    <span className="text-yellow-400 font-bold flex items-center gap-1">🪙 {p.coins}</span>
                                    <span className="text-purple-400 font-bold flex items-center gap-1 text-lg">👑 {p.stars}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
            
            <div className="absolute right-8 top-1/2 -translate-y-1/2 bg-black/50 px-4 py-2 rounded-lg border border-white/10">
                <span className="text-xs text-gray-400 uppercase mr-2">Round</span>
                <span className="text-xl font-bold text-white">{gameState.round}/{gameState.maxRounds}</span>
            </div>
        </div>

        {/* GAME AREA */}
        <div className="flex-1 relative w-full h-full">
            {gameState.phase === GamePhase.BOARD && (
                <>
                    <div className="absolute inset-0 z-0">
                        <Board 
                            spaces={gameState.board} 
                            players={gameState.players} 
                            currentPlayerId={currentPlayer.id}
                        />
                    </div>
                    {/* Announcement Overlay */}
                    <div className="absolute top-8 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md px-12 py-4 rounded-full border-2 border-white/20 shadow-2xl z-20">
                        <h2 className="text-2xl font-display text-white text-center whitespace-nowrap">
                            {announcement}
                        </h2>
                    </div>
                </>
            )}

            {isMinigamePhase && gameState.currentMinigame && (
                <Minigame 
                    players={gameState.players} 
                    minigame={gameState.currentMinigame}
                    phase={gameState.phase}
                    onReady={startMinigame}
                    onComplete={handleMinigameComplete}
                    lastAction={minigameAction} 
                />
            )}

            {/* Dice Overlay */}
            {diceRoll && (
                <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none bg-black/50 backdrop-blur-sm">
                    <div className="w-48 h-48 bg-white rounded-3xl flex items-center justify-center shadow-[0_0_50px_rgba(255,255,255,0.5)] transform rotate-12 animate-bounce">
                        <span className="text-9xl font-black text-slate-900">{diceRoll}</span>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default App;