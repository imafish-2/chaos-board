import React, { useState, useEffect, useRef } from 'react';
import { Player, MinigameDef, GamePhase, MinigameResult, CpuDifficulty } from '../types';

interface MinigameProps {
  players: Player[];
  minigame: MinigameDef;
  phase: GamePhase;
  onComplete: (results: MinigameResult[]) => void;
  onReady: () => void; // Call when cutscene ends
  lastAction: { playerId: number, action: string } | null;
}

export const Minigame: React.FC<MinigameProps> = ({ 
  players, 
  minigame, 
  phase, 
  onComplete, 
  onReady, 
  lastAction 
}) => {
  // --- SUB-GAME LOGIC HOOKS ---
  const [scores, setScores] = useState<Record<number, number>>({});
  const [statusText, setStatusText] = useState("");
  const [visualFlash, setVisualFlash] = useState<number | null>(null); // Player ID to flash
  
  // MASH STATE
  const [timeLeft, setTimeLeft] = useState(10);
  
  // TIMING STATE
  const [stopwatch, setStopwatch] = useState(0);
  const [stoppedTimes, setStoppedTimes] = useState<Record<number, number>>({});
  
  // REACTION STATE
  const [reactionState, setReactionState] = useState<'WAIT' | 'READY' | 'GO' | 'FINISHED'>('WAIT');
  const [reactionTime, setReactionTime] = useState<Record<number, number>>({}); // -1 for false start

  const gameLoopRef = useRef<any | null>(null);
  const startTimeRef = useRef<number>(0);

  // --- INITIALIZATION ---
  useEffect(() => {
    if (phase === GamePhase.MINIGAME_PLAY) {
      // Reset State based on game type
      const initialScores: Record<number, number> = {};
      players.forEach(p => initialScores[p.id] = 0);
      setScores(initialScores);

      if (minigame.type === 'MASH') {
        startMashGame();
      } else if (minigame.type === 'TIMING') {
        startTimingGame();
      } else if (minigame.type === 'REACTION') {
        startReactionGame();
      }
    }

    return () => {
      if (gameLoopRef.current) clearInterval(gameLoopRef.current);
    };
  }, [phase, minigame]);

  // --- CPU AI SIMULATION ---
  useEffect(() => {
    if (phase !== GamePhase.MINIGAME_PLAY) return;

    const cpuPlayers = players.filter(p => p.isCpu);
    const intervals: any[] = [];

    cpuPlayers.forEach(cpu => {
      // Difficulty Parameters
      const diff = cpu.cpuDifficulty || CpuDifficulty.EASY;

      // AI: MASH
      if (minigame.type === 'MASH') {
        // EASY: Random 250-400ms (Slow)
        // MEDIUM: Random 150-250ms (Decent)
        // HARD: Random 80-120ms (Super Human)
        
        let minSpeed = 300;
        let maxSpeed = 500;
        
        if (diff === CpuDifficulty.MEDIUM) {
             minSpeed = 150;
             maxSpeed = 250;
        } else if (diff === CpuDifficulty.HARD) {
             minSpeed = 80;
             maxSpeed = 120;
        }

        const speed = minSpeed + Math.random() * (maxSpeed - minSpeed);
        const interval = setInterval(() => {
           triggerScoreUpdate(cpu.id);
        }, speed);
        intervals.push(interval);
      } 
      
      // AI: TIMING (Target 5000ms)
      else if (minigame.type === 'TIMING') {
        const target = 5000;
        let accuracyRange = 1500; // Easy: +/- 1.5s
        
        if (diff === CpuDifficulty.MEDIUM) accuracyRange = 500; // Medium: +/- 0.5s
        if (diff === CpuDifficulty.HARD) accuracyRange = 100; // Hard: +/- 0.1s

        // 10% chance for Easy/Medium to "forget" to press or press way too late?
        // Let's keep it simple: press within range
        const error = (Math.random() - 0.5) * 2 * accuracyRange; 
        const pressTime = Math.max(1000, target + error);
        
        const timeout = setTimeout(() => {
          setStoppedTimes(prev => {
            if (prev[cpu.id]) return prev; 
            return { ...prev, [cpu.id]: pressTime };
          });
          setVisualFlash(cpu.id);
        }, pressTime);
        intervals.push(timeout);
      }

      // AI: REACTION (Handled in reaction state effect)
    });

    return () => intervals.forEach(i => clearInterval(i));
  }, [phase, minigame, players]);

  // AI Logic for Reaction specifically monitoring state
  useEffect(() => {
    if (minigame.type === 'REACTION' && reactionState === 'GO') {
       const cpuPlayers = players.filter(p => p.isCpu);
       const timeouts: any[] = [];
       
       cpuPlayers.forEach(cpu => {
           const diff = cpu.cpuDifficulty || CpuDifficulty.EASY;
           
           // Reaction Delay logic
           let minDelay = 500;
           let maxDelay = 1000;
           
           if (diff === CpuDifficulty.MEDIUM) {
               minDelay = 300;
               maxDelay = 500;
           } else if (diff === CpuDifficulty.HARD) {
               minDelay = 180;
               maxDelay = 250;
           }

           const reactionDelay = minDelay + Math.random() * (maxDelay - minDelay);

           const t = setTimeout(() => {
               setReactionTime(prev => {
                   if (prev[cpu.id]) return prev;
                   return { ...prev, [cpu.id]: Date.now() - startTimeRef.current };
               });
               setVisualFlash(cpu.id);
           }, reactionDelay);
           timeouts.push(t);
       });
       return () => timeouts.forEach(t => clearTimeout(t));
    }
  }, [reactionState, minigame.type, players]);

  // --- GAME LOGIC IMPLEMENTATIONS ---

  const triggerScoreUpdate = (pid: number) => {
      setScores(prev => ({...prev, [pid]: (prev[pid] || 0) + 1}));
      setVisualFlash(pid);
      setTimeout(() => setVisualFlash(null), 100);
  };

  const startMashGame = () => {
    setTimeLeft(10);
    gameLoopRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) return 0;
        return prev - 1;
      });
    }, 1000);
  };

  const startTimingGame = () => {
    setStopwatch(0);
    setStoppedTimes({});
    const startTime = Date.now();
    startTimeRef.current = startTime;
    
    gameLoopRef.current = setInterval(() => {
      const now = Date.now();
      const elapsed = now - startTime;
      setStopwatch(elapsed);
    }, 10);
  };

  const startReactionGame = () => {
    setReactionState('WAIT');
    setReactionTime({});
    setStatusText("WAIT...");
    
    const delay = 2000 + Math.random() * 4000;
    
    setTimeout(() => {
        setReactionState('GO');
        setStatusText("TAP!");
        startTimeRef.current = Date.now();
        
        setTimeout(() => {
            // Force end if too slow
            setReactionState('FINISHED');
        }, 5000);
    }, delay);
  };

  // --- INPUT HANDLING ---
  useEffect(() => {
    if (!lastAction || phase !== GamePhase.MINIGAME_PLAY) return;
    const { playerId, action } = lastAction;

    if (minigame.type === 'MASH') {
      triggerScoreUpdate(playerId);
    } 
    
    else if (minigame.type === 'TIMING') {
       if (!stoppedTimes[playerId]) {
           setStoppedTimes(prev => ({...prev, [playerId]: stopwatch}));
           setVisualFlash(playerId);
       }
    }

    else if (minigame.type === 'REACTION') {
        if (reactionState === 'WAIT') {
            setReactionTime(prev => ({...prev, [playerId]: -1})); // Penalty
            setVisualFlash(playerId);
        } else if (reactionState === 'GO') {
            if (!reactionTime[playerId]) {
                const time = Date.now() - startTimeRef.current;
                setReactionTime(prev => ({...prev, [playerId]: time}));
                setVisualFlash(playerId);
            }
        }
    }
  }, [lastAction]);

  // --- RESULTS CALCULATION ---
  
  useEffect(() => {
      if (phase !== GamePhase.MINIGAME_PLAY) return;

      // CHECK END CONDITIONS
      let isFinished = false;
      let results: MinigameResult[] = [];

      if (minigame.type === 'MASH' && timeLeft === 0) {
          isFinished = true;
          // Sort by clicks desc
          const sorted = players.map(p => ({
              playerId: p.id,
              score: scores[p.id] || 0
          })).sort((a, b) => b.score - a.score);
          
          results = sorted.map((entry, idx) => ({ ...entry, rank: idx + 1 }));
      }

      if (minigame.type === 'TIMING') {
          const allStopped = players.every(p => stoppedTimes[p.id] !== undefined);
          if (allStopped || stopwatch >= 9900) {
             // Delay slightly to show final visual
             if (stopwatch >= 10500 || allStopped) {
                 isFinished = true;
                 // Sort by closeness to 5000
                 const sorted = players.map(p => {
                     const t = stoppedTimes[p.id];
                     const score = t ? Math.abs(5000 - t) : 99999;
                     return { playerId: p.id, score };
                 }).sort((a, b) => a.score - b.score);
                 results = sorted.map((entry, idx) => ({ ...entry, rank: idx + 1 }));
             }
          }
      }

      if (minigame.type === 'REACTION') {
          const allReacted = players.every(p => reactionTime[p.id] !== undefined);
          if (allReacted || reactionState === 'FINISHED') {
              isFinished = true;
              // Sort by time asc (exclude -1 penalty pushes to end)
              const sorted = players.map(p => {
                  const t = reactionTime[p.id];
                  // If -1 (false start) or undefined (too slow), huge penalty
                  const score = (t === -1 || t === undefined) ? 99999 : t;
                  return { playerId: p.id, score };
              }).sort((a, b) => a.score - b.score);
              results = sorted.map((entry, idx) => ({ ...entry, rank: idx + 1 }));
          }
      }

      if (isFinished) {
          if (gameLoopRef.current) clearInterval(gameLoopRef.current);
          setTimeout(() => onComplete(results), 1500); // 1.5s delay to see result
      }

  }, [timeLeft, stoppedTimes, reactionTime, stopwatch, minigame.type, phase, players, scores, reactionState]);


  // --- RENDER ---

  if (phase === GamePhase.MINIGAME_INTRO) {
    return (
      <div className="absolute inset-0 z-50 bg-slate-900 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500 overflow-hidden">
         {/* Animated Background */}
         <div className="absolute inset-0 opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-900 via-gray-900 to-black animate-pulse"></div>
         
         <div className="z-10 bg-black/50 backdrop-blur-xl p-12 rounded-3xl border border-white/10 shadow-2xl transform transition-all hover:scale-105">
            <h1 className="text-7xl font-display text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-500 mb-6 drop-shadow-lg tracking-widest uppercase">
                {minigame.name}
            </h1>
            <p className="text-3xl text-blue-200 mb-10 font-light italic">"{minigame.description}"</p>
            
            <div className="bg-white/10 p-8 rounded-2xl border-l-8 border-green-500 mb-12 text-left">
                <h3 className="text-sm font-bold text-green-400 uppercase tracking-widest mb-2">How To Play</h3>
                <p className="text-5xl font-black text-white">{minigame.instructions}</p>
            </div>
            
            <button 
                onClick={onReady}
                className="w-full py-6 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-black text-4xl rounded-xl shadow-[0_0_40px_rgba(34,197,94,0.5)] hover:shadow-[0_0_60px_rgba(34,197,94,0.8)] transition-all active:scale-95">
                START
            </button>
         </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 bg-slate-900/95 z-40 flex flex-col items-center justify-between pointer-events-auto overflow-hidden">
      
      {/* Game Header */}
      <div className="w-full bg-black/40 backdrop-blur-md p-6 border-b border-white/10 flex justify-between items-center z-10">
          <h2 className="text-3xl font-display text-white/70 tracking-widest uppercase">{minigame.name}</h2>
          {minigame.type === 'MASH' && <div className="text-5xl font-mono text-red-500 font-bold drop-shadow-glow">{timeLeft}</div>}
          {minigame.type === 'TIMING' && <div className="text-xl text-yellow-400 font-mono">TARGET: 5.00s</div>}
      </div>
      
      {/* Main Game Visuals */}
      <div className="flex-1 w-full flex flex-col items-center justify-center relative">
          
          {minigame.type === 'MASH' && (
              <div className="text-center relative">
                  <div className="text-8xl font-black text-white/20 animate-pulse absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap">
                      FASTER!
                  </div>
                  <div className="relative z-10 grid grid-cols-2 gap-8">
                     {/* Particles could go here */}
                  </div>
              </div>
          )}

          {minigame.type === 'TIMING' && (
              <div className="text-center flex flex-col items-center">
                  <div className={`text-9xl font-mono mb-4 transition-all duration-300 ${stopwatch > 3000 ? 'blur-xl opacity-20 text-red-500 scale-150' : 'text-white scale-100'}`}>
                      {(stopwatch / 1000).toFixed(2)}s
                  </div>
                  {stopwatch > 3000 && <div className="text-4xl font-bold text-red-500 animate-bounce">???</div>}
              </div>
          )}

          {minigame.type === 'REACTION' && (
             <div className={`w-full h-full absolute inset-0 transition-colors duration-0 flex items-center justify-center ${reactionState === 'GO' ? 'bg-green-600' : 'bg-transparent'}`}>
                 <div className={`text-9xl font-black uppercase tracking-tighter transition-all duration-200 ${reactionState === 'GO' ? 'text-white scale-125' : 'text-white/30 scale-100'}`}>
                    {statusText}
                 </div>
             </div>
          )}
      </div>

      {/* Players HUD */}
      <div className="w-full bg-black/60 backdrop-blur-lg p-8 pb-12 z-20 border-t border-white/10">
          <div className="max-w-7xl mx-auto flex gap-6 items-end h-40">
            {players.map(p => {
                let displayValue = "";
                let barHeight = "10%";
                const isFlashed = visualFlash === p.id;
                
                if (minigame.type === 'MASH') {
                    displayValue = (scores[p.id] || 0).toString();
                    barHeight = `${Math.min((scores[p.id] || 0) * 2 + 5, 100)}%`;
                } else if (minigame.type === 'TIMING') {
                    const t = stoppedTimes[p.id];
                    displayValue = t ? `${(t/1000).toFixed(2)}s` : "Waiting...";
                    barHeight = t ? '100%' : '20%';
                } else if (minigame.type === 'REACTION') {
                    const t = reactionTime[p.id];
                    if (t === -1) displayValue = "FAULT!";
                    else displayValue = t ? `${t}ms` : "...";
                    barHeight = t === -1 ? '0%' : (t ? '100%' : '50%');
                }

                return (
                    <div key={p.id} className="flex-1 flex flex-col items-center gap-3 group">
                        <div className={`text-3xl font-black font-mono transition-all ${isFlashed ? 'text-white scale-125' : 'text-white/70'}`}>
                            {displayValue}
                        </div>
                        
                        <div className="w-full h-full relative flex items-end">
                            <div 
                                className={`w-full rounded-t-xl transition-all duration-200 shadow-[0_0_20px_rgba(0,0,0,0.5)] border-t-4 ${isFlashed ? 'brightness-150' : ''}`}
                                style={{ 
                                    height: barHeight,
                                    backgroundColor: p.color,
                                    borderColor: 'rgba(255,255,255,0.3)'
                                }}
                            ></div>
                        </div>

                        <div className="flex flex-col items-center">
                            <span className="text-4xl drop-shadow-md transform transition group-hover:scale-110">{p.avatar}</span>
                            <span className="text-xs font-bold uppercase text-white/50 tracking-wider mt-1">{p.name}</span>
                        </div>
                    </div>
                );
            })}
          </div>
      </div>
    </div>
  );
};