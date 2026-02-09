import React, { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// CONFIGURATION
// ============================================================================

const ROWS = 5;
const COLS = 6;
const BRICKS_PER_LEVEL = ROWS * COLS;

const BRICK_COLORS = [
  { bg: '#ef4444', light: '#fca5a5', dark: '#991b1b' },
  { bg: '#f97316', light: '#fdba74', dark: '#9a3412' },
  { bg: '#eab308', light: '#fde047', dark: '#854d0e' },
  { bg: '#22c55e', light: '#86efac', dark: '#166534' },
  { bg: '#3b82f6', light: '#93c5fd', dark: '#1e40af' },
  { bg: '#8b5cf6', light: '#c4b5fd', dark: '#5b21b6' },
  { bg: '#ec4899', light: '#f9a8d4', dark: '#9d174d' },
];

const WORD_POOL = {
  letters: 'asdfghjkl'.split(''),
  easy: [
    'cat', 'dog', 'hat', 'sun', 'cup', 'run', 'big', 'fun', 'red', 'sit',
    'hop', 'the', 'and', 'for', 'not', 'you', 'all', 'can', 'get', 'has',
    'how', 'new', 'see', 'two', 'who', 'did', 'got', 'say', 'too', 'use',
  ],
  medium: [
    'fish', 'jump', 'star', 'moon', 'tree', 'book', 'game', 'home', 'play',
    'work', 'time', 'good', 'long', 'just', 'over', 'like', 'back', 'look',
    'make', 'from', 'that', 'this', 'with', 'have', 'will', 'been', 'each',
  ],
  hard: [
    'break', 'light', 'water', 'music', 'happy', 'dance', 'cloud', 'dream',
    'brave', 'quick', 'after', 'about', 'could', 'every', 'first', 'great',
    'never', 'other', 'right', 'small', 'think', 'where', 'would', 'found',
  ],
};

function getLevelConfig(level) {
  if (level <= 2) return { pool: 'letters', time: 60 };
  if (level <= 4) return { pool: 'easy', time: 55 };
  if (level <= 6) return { pool: 'medium', time: 50 };
  return { pool: 'hard', time: 45 };
}

function getWarmupPool(level) {
  if (level <= 2) return 'letters';
  if (level <= 4) return 'letters';
  if (level <= 6) return 'easy';
  return 'medium';
}

function generateBricks(level) {
  const config = getLevelConfig(level);
  const warmupPool = getWarmupPool(level);
  const bricks = [];

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const index = row * COLS + col;
      // First 5 bricks (bottom row) use warmup pool on harder levels
      const linearFromBottom = (ROWS - 1 - row) * COLS + col;
      const isWarmup = linearFromBottom < 5 && level > 2;
      const poolName = isWarmup ? warmupPool : config.pool;
      const pool = WORD_POOL[poolName];
      const text = pool[Math.floor(Math.random() * pool.length)];
      const color = BRICK_COLORS[(row + col) % BRICK_COLORS.length];

      bricks.push({
        id: index,
        row,
        col,
        text,
        color,
        state: 'intact', // intact | breaking | broken
      });
    }
  }

  return bricks;
}

// ============================================================================
// SOUND
// ============================================================================

const playSound = (type) => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const configs = {
      hit: { freq: 660, dur: 0.06, vol: 0.08 },
      miss: { freq: 180, dur: 0.1, vol: 0.06 },
      levelUp: { freq: 1040, dur: 0.25, vol: 0.12 },
    };
    const c = configs[type] || configs.hit;
    osc.frequency.value = c.freq;
    gain.gain.value = c.vol;
    osc.start();
    osc.stop(ctx.currentTime + c.dur);
  } catch (e) {}
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function TypeBreakout({
  progressData,
  onRecordKeystroke,
  onEndSession,
  onUpdateGameProgress,
  onNavigate,
}) {
  const [screen, setScreen] = useState('ready');
  const [level, setLevel] = useState(1);
  const [bricks, setBricks] = useState([]);
  const [targetIndex, setTargetIndex] = useState(0);
  const [typedChars, setTypedChars] = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [totalBroken, setTotalBroken] = useState(0);
  const [particles, setParticles] = useState([]);
  const [wrongFlash, setWrongFlash] = useState(false);
  const [sessionStart, setSessionStart] = useState(null);
  const [totalKeys, setTotalKeys] = useState(0);
  const [correctKeys, setCorrectKeys] = useState(0);

  const inputRef = useRef(null);
  const bricksRef = useRef(bricks);
  const targetIndexRef = useRef(targetIndex);
  const screenRef = useRef(screen);
  const levelRef = useRef(level);
  bricksRef.current = bricks;
  targetIndexRef.current = targetIndex;
  screenRef.current = screen;
  levelRef.current = level;

  // Focus
  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, [screen]);

  // Timer
  useEffect(() => {
    if (screen !== 'playing') return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setScreen('gameOver');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [screen]);

  // Find next intact brick (bottom-to-top, left-to-right)
  const findNextTarget = useCallback((brickList, afterLinear) => {
    // Convert to bottom-up ordering
    for (let li = afterLinear; li < brickList.length; li++) {
      const row = ROWS - 1 - Math.floor(li / COLS);
      const col = li % COLS;
      const idx = row * COLS + col;
      if (brickList[idx] && brickList[idx].state === 'intact') return idx;
    }
    return -1;
  }, []);

  // Convert brick index to bottom-up linear index
  const toLinear = useCallback((idx) => {
    const row = Math.floor(idx / COLS);
    const col = idx % COLS;
    return (ROWS - 1 - row) * COLS + col;
  }, []);

  // Start game
  const startGame = useCallback(() => {
    const newBricks = generateBricks(1);
    setBricks(newBricks);
    const firstTarget = findNextTarget(newBricks, 0);
    setTargetIndex(firstTarget);
    setTypedChars(0);
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setTimeLeft(getLevelConfig(1).time);
    setLevel(1);
    setTotalBroken(0);
    setParticles([]);
    setSessionStart(Date.now());
    setTotalKeys(0);
    setCorrectKeys(0);
    setScreen('playing');
  }, [findNextTarget]);

  // Start level
  const startLevel = useCallback(
    (lvl) => {
      const newBricks = generateBricks(lvl);
      setBricks(newBricks);
      const firstTarget = findNextTarget(newBricks, 0);
      setTargetIndex(firstTarget);
      setTypedChars(0);
      setTimeLeft(getLevelConfig(lvl).time);
      setLevel(lvl);
      setParticles([]);
      setScreen('playing');
    },
    [findNextTarget]
  );

  // Report session
  const reportSession = useCallback(() => {
    const durationMs = sessionStart ? Date.now() - sessionStart : 0;
    const accuracy =
      totalKeys > 0 ? Math.round((correctKeys / totalKeys) * 100) : 0;
    const wpm =
      durationMs >= 5000
        ? Math.round((correctKeys / 5) / (durationMs / 60000))
        : 0;

    onUpdateGameProgress('breakout', (prev) => ({
      ...prev,
      highScore: Math.max(prev.highScore || 0, score),
      bestLevel: Math.max(prev.bestLevel || 0, level),
      bestCombo: Math.max(prev.bestCombo || 0, maxCombo),
      totalSessions: (prev.totalSessions || 0) + 1,
    }));

    onEndSession({
      game: 'breakout',
      durationMs,
      wpm,
      accuracy,
      exerciseCount: totalBroken,
      keysUsed: [],
    });
  }, [
    sessionStart, totalKeys, correctKeys, score, level, maxCombo,
    totalBroken, onUpdateGameProgress, onEndSession,
  ]);

  // Auto-report on game over
  useEffect(() => {
    if (screen === 'gameOver') reportSession();
  }, [screen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle key
  const handleKeyDown = useCallback(
    (e) => {
      if (screenRef.current === 'ready') {
        if (e.key.length === 1 || e.key === 'Enter') {
          if (e.preventDefault) e.preventDefault();
          startGame();
        }
        return;
      }

      if (screenRef.current === 'levelEnd') {
        if (e.key === 'Enter' || e.key === ' ') {
          if (e.preventDefault) e.preventDefault();
          startLevel(levelRef.current + 1);
        }
        return;
      }

      if (screenRef.current === 'gameOver') {
        if (e.key === 'Enter' || e.key === ' ') {
          if (e.preventDefault) e.preventDefault();
          startGame();
        }
        return;
      }

      if (screenRef.current !== 'playing') return;
      if (e.key.length !== 1) return;
      if (e.preventDefault) e.preventDefault();

      const currentBricks = bricksRef.current;
      const idx = targetIndexRef.current;
      if (idx < 0 || idx >= currentBricks.length) return;

      const brick = currentBricks[idx];
      if (!brick || brick.state !== 'intact') return;

      const expectedChar = brick.text[typedChars];
      const typed = e.key.toLowerCase();

      setTotalKeys((prev) => prev + 1);

      if (typed === expectedChar) {
        setCorrectKeys((prev) => prev + 1);
        onRecordKeystroke(
          expectedChar,
          true,
          150,
          typedChars > 0 ? brick.text[typedChars - 1] : null
        );

        const newTyped = typedChars + 1;

        if (newTyped >= brick.text.length) {
          // Brick fully typed - BREAK IT
          playSound('hit');

          setBricks((prev) => {
            const updated = [...prev];
            updated[idx] = { ...brick, state: 'breaking' };
            return updated;
          });

          setTimeout(() => {
            setBricks((prev) =>
              prev.map((b, i) =>
                i === idx ? { ...b, state: 'broken' } : b
              )
            );
          }, 400);

          setTypedChars(0);
          setCombo((prev) => {
            const newCombo = prev + 1;
            setMaxCombo((mc) => Math.max(mc, newCombo));
            return newCombo;
          });

          const comboMultiplier = 1 + Math.floor(combo / 5) * 0.25;
          const points = Math.round(
            (brick.text.length * 10 + 5) * comboMultiplier
          );
          setScore((prev) => prev + points);
          setTotalBroken((prev) => prev + 1);

          // Particles
          setParticles((prev) => [
            ...prev,
            { id: Date.now(), row: brick.row, col: brick.col, color: brick.color.bg },
          ]);
          setTimeout(() => setParticles((prev) => prev.slice(1)), 600);

          // Find next target
          const currentBricksUpdated = [...currentBricks];
          currentBricksUpdated[idx] = { ...brick, state: 'breaking' };
          const linear = toLinear(idx);
          const nextIdx = findNextTarget(currentBricksUpdated, linear + 1);

          if (nextIdx === -1) {
            playSound('levelUp');
            // Time bonus
            setScore((prev) => prev + timeLeft * 5);
            setTimeout(() => setScreen('levelEnd'), 600);
          } else {
            setTargetIndex(nextIdx);
          }
        } else {
          setTypedChars(newTyped);
        }
      } else {
        playSound('miss');
        onRecordKeystroke(expectedChar, false, 150, null);
        setCombo(0);
        setWrongFlash(true);
        setTimeout(() => setWrongFlash(false), 200);
      }
    },
    [typedChars, combo, timeLeft, startGame, startLevel, findNextTarget, toLinear, onRecordKeystroke]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleMobileInput = useCallback(
    (e) => {
      const data = e.nativeEvent?.data || e.data;
      if (data) {
        for (const ch of data) {
          handleKeyDown({ key: ch, preventDefault() {} });
        }
      }
      if (e.target) e.target.value = '';
    },
    [handleKeyDown]
  );

  // ============================================================================
  // RENDER: READY
  // ============================================================================

  if (screen === 'ready') {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center select-none cursor-pointer"
        onClick={startGame}
        style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }}
      >
        <input ref={inputRef} className="mobile-input"
          inputMode="text" autoCapitalize="off" autoCorrect="off" autoComplete="off"
          onInput={handleMobileInput} onBlur={(e) => setTimeout(() => e.target?.focus(), 50)} autoFocus />

        <button
          onClick={(e) => { e.stopPropagation(); onNavigate('#/'); }}
          className="absolute top-4 left-4 z-30 bg-white/10 hover:bg-white/20 text-white/70 px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
        >
          &larr; Home
        </button>

        <div className="grid grid-cols-5 gap-2 mb-8 opacity-60">
          {BRICK_COLORS.slice(0, 5).map((c, i) => (
            <div key={i} className="w-14 h-8 rounded-lg"
              style={{ background: c.bg, boxShadow: `0 0 10px ${c.bg}44` }} />
          ))}
        </div>

        <h1 className="text-5xl md:text-7xl font-black text-white mb-3"
          style={{ textShadow: '0 0 40px rgba(59,130,246,0.5), 0 4px 12px rgba(0,0,0,0.5)' }}>
          Type Breaker
        </h1>
        <p className="text-lg text-blue-300 mb-2 font-medium">
          Smash bricks by typing their words!
        </p>
        <p className="text-blue-400/60 mb-8 text-sm max-w-xs text-center">
          Type each letter or word to shatter bricks. Clear all bricks before time runs out!
        </p>

        <div className="bg-blue-500/20 backdrop-blur px-8 py-4 rounded-2xl border border-blue-400/30 animate-pulse">
          <span className="text-blue-200 text-lg font-bold">Tap or press any key to start</span>
        </div>

        {progressData?.gameProgress?.breakout?.highScore > 0 && (
          <div className="mt-6 text-blue-400/60 text-sm">
            High Score: {progressData.gameProgress.breakout.highScore} |
            Best Level: {progressData.gameProgress.breakout.bestLevel || 1}
          </div>
        )}
      </div>
    );
  }

  // ============================================================================
  // RENDER: GAME OVER
  // ============================================================================

  if (screen === 'gameOver') {
    const accuracy = totalKeys > 0 ? Math.round((correctKeys / totalKeys) * 100) : 0;
    return (
      <div className="min-h-screen flex flex-col items-center justify-center select-none"
        style={{ background: 'linear-gradient(180deg, #1a0a2e 0%, #2d1045 50%, #1a0525 100%)' }}>
        <input ref={inputRef} className="mobile-input"
          inputMode="text" autoCapitalize="off" autoCorrect="off" autoComplete="off"
          onInput={handleMobileInput} onBlur={(e) => setTimeout(() => e.target?.focus(), 50)} autoFocus />

        <h1 className="text-5xl font-black text-white mb-6"
          style={{ textShadow: '0 0 30px rgba(239,68,68,0.5)' }}>
          Time&apos;s Up!
        </h1>

        <div className="bg-white/10 backdrop-blur rounded-3xl p-8 max-w-sm w-full mb-6">
          <div className="text-center mb-6">
            <div className="text-5xl font-black text-white">{score}</div>
            <div className="text-blue-300/70 text-sm">Final Score</div>
          </div>
          <div className="grid grid-cols-3 gap-4 mb-4 text-center">
            <div>
              <div className="text-2xl font-bold text-white">{level}</div>
              <div className="text-blue-300/50 text-xs">Level</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{totalBroken}</div>
              <div className="text-blue-300/50 text-xs">Bricks</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{accuracy}%</div>
              <div className="text-blue-300/50 text-xs">Accuracy</div>
            </div>
          </div>
          <div className="text-center text-white/40 text-sm">
            Best Combo: {maxCombo}x
          </div>
        </div>

        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button onClick={startGame}
            className="bg-blue-500/30 hover:bg-blue-500/50 text-white px-8 py-4 rounded-2xl font-bold text-lg border border-blue-400/30 transition-all">
            Play Again
          </button>
          <button onClick={() => onNavigate('#/')}
            className="bg-white/10 hover:bg-white/20 text-white/60 px-6 py-3 rounded-xl font-medium transition-all text-sm">
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER: LEVEL END
  // ============================================================================

  if (screen === 'levelEnd') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center select-none"
        style={{ background: 'linear-gradient(180deg, #0f0f23 0%, #1b2838 50%, #0d1f2d 100%)' }}>
        <input ref={inputRef} className="mobile-input"
          inputMode="text" autoCapitalize="off" autoCorrect="off" autoComplete="off"
          onInput={handleMobileInput} onBlur={(e) => setTimeout(() => e.target?.focus(), 50)} autoFocus />

        <h1 className="text-4xl font-black text-white mb-2"
          style={{ textShadow: '0 0 30px rgba(34,197,94,0.5)' }}>
          Level {level} Clear!
        </h1>
        <p className="text-green-300/70 mb-6">
          {BRICKS_PER_LEVEL} bricks destroyed &middot; +{timeLeft * 5} time bonus
        </p>

        <div className="bg-white/10 backdrop-blur rounded-2xl p-6 max-w-xs w-full mb-6 text-center">
          <div className="text-4xl font-black text-white mb-1">{score}</div>
          <div className="text-blue-300/50 text-sm">Score</div>
          <div className="mt-3 text-white/60 text-sm">
            Combo: {maxCombo}x
          </div>
        </div>

        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button onClick={() => startLevel(level + 1)}
            className="bg-green-500/30 hover:bg-green-500/50 text-white px-8 py-4 rounded-2xl font-bold text-lg border border-green-400/30 transition-all animate-pulse">
            Next Level
          </button>
          <button onClick={() => { reportSession(); onNavigate('#/'); }}
            className="bg-white/10 hover:bg-white/20 text-white/60 px-6 py-3 rounded-xl font-medium transition-all text-sm">
            Quit &amp; Save
          </button>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER: PLAYING
  // ============================================================================

  const targetBrick = bricks[targetIndex];
  const brickW = 100 / COLS;
  const brickH = 11;

  return (
    <div className="min-h-screen flex flex-col select-none"
      style={{ background: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)' }}>
      <input ref={inputRef} className="mobile-input"
        inputMode="text" autoCapitalize="off" autoCorrect="off" autoComplete="off"
        onInput={handleMobileInput} onBlur={(e) => setTimeout(() => e.target?.focus(), 50)} autoFocus />

      {/* HUD */}
      <div className="flex items-center justify-between px-4 py-2 z-30 relative">
        <button onClick={() => { reportSession(); onNavigate('#/'); }}
          className="bg-white/10 hover:bg-white/20 text-white/70 px-3 py-1.5 rounded-lg text-sm font-medium transition-all">
          &larr; Quit
        </button>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="text-white/50 text-xs">Level</div>
            <div className="text-white font-bold text-lg leading-none">{level}</div>
          </div>
          <div className="text-center">
            <div className="text-white/50 text-xs">Score</div>
            <div className="text-white font-bold text-lg leading-none">{score}</div>
          </div>
        </div>
        <div className={`text-center px-3 py-1 rounded-lg ${timeLeft <= 10 ? 'bg-red-500/30 text-red-300' : 'bg-white/10 text-white/70'}`}>
          <div className="font-bold text-lg leading-none">{timeLeft}s</div>
        </div>
      </div>

      {/* Combo */}
      {combo > 1 && (
        <div className="text-center z-30 relative -mt-1">
          <span className="text-yellow-400 font-black text-xl"
            style={{ textShadow: '0 0 15px rgba(250,204,21,0.5)' }}>
            {combo}x COMBO
          </span>
        </div>
      )}

      {/* Brick grid */}
      <div className="flex-1 px-3 py-2 relative">
        <div className="max-w-md mx-auto relative" style={{ height: '55vh' }}>
          {bricks.map((brick, idx) => {
            if (brick.state === 'broken') return null;

            const isTarget = idx === targetIndex;
            const isBreaking = brick.state === 'breaking';
            const x = (brick.col / COLS) * 100;
            const y = (brick.row / ROWS) * 55;

            return (
              <div key={brick.id} className="absolute"
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  width: `${brickW}%`,
                  height: `${brickH}%`,
                  padding: 2,
                  animation: isBreaking ? 'brick-break 0.4s ease-out forwards' : 'none',
                }}>
                <div
                  className={`w-full h-full rounded-lg flex items-center justify-center font-bold text-white transition-all relative overflow-hidden ${wrongFlash && isTarget ? 'scale-95' : ''}`}
                  style={{
                    fontSize: brick.text.length > 3 ? '0.7rem' : '0.85rem',
                    background: isTarget
                      ? `linear-gradient(180deg, ${brick.color.light}, ${brick.color.bg})`
                      : `linear-gradient(180deg, ${brick.color.bg}dd, ${brick.color.dark}dd)`,
                    boxShadow: isTarget
                      ? `0 0 20px ${brick.color.bg}88, inset 0 1px 0 rgba(255,255,255,0.3)`
                      : `inset 0 1px 0 rgba(255,255,255,0.15), 0 2px 4px rgba(0,0,0,0.3)`,
                    border: isTarget ? '2px solid rgba(255,255,255,0.6)' : '1px solid rgba(255,255,255,0.1)',
                  }}
                >
                  {isTarget ? (
                    <span>
                      {brick.text.split('').map((ch, ci) => (
                        <span key={ci} style={{
                          opacity: ci < typedChars ? 0.3 : 1,
                          textDecoration: ci < typedChars ? 'line-through' : 'none',
                        }}>{ch.toUpperCase()}</span>
                      ))}
                    </span>
                  ) : (
                    <span className="opacity-80">{brick.text.toUpperCase()}</span>
                  )}

                  {isTarget && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                      style={{ animation: 'brick-sheen 1.5s ease-in-out infinite' }} />
                  )}
                </div>
              </div>
            );
          })}

          {/* Particles */}
          {particles.map((p) => (
            <div key={p.id} className="absolute pointer-events-none z-40"
              style={{
                left: `${(p.col / COLS) * 100 + brickW / 2}%`,
                top: `${(p.row / ROWS) * 55 + brickH / 2}%`,
              }}>
              {Array.from({ length: 8 }).map((_, i) => {
                const angle = (i / 8) * Math.PI * 2;
                return (
                  <div key={i} className="absolute w-2 h-2 rounded-sm"
                    style={{
                      background: p.color,
                      animation: 'brick-particle 0.5s ease-out forwards',
                      '--px': `${Math.cos(angle) * (30 + Math.random() * 20)}px`,
                      '--py': `${Math.sin(angle) * (30 + Math.random() * 20)}px`,
                    }} />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Current word display */}
      <div className="text-center pb-4 z-20 relative">
        {targetBrick && targetBrick.state === 'intact' && (
          <div className="inline-block px-8 py-3 rounded-2xl"
            style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)' }}>
            <div className="text-white/50 text-xs mb-1 font-medium">TYPE:</div>
            <div className="text-3xl font-black tracking-wider">
              {targetBrick.text.split('').map((ch, ci) => (
                <span key={ci} style={{
                  color: ci < typedChars ? '#22c55e' : wrongFlash && ci === typedChars ? '#ef4444' : 'white',
                  transition: 'color 0.1s',
                }}>{ch.toUpperCase()}</span>
              ))}
            </div>
          </div>
        )}
        <div className="text-white/30 text-xs mt-2">
          {bricks.filter((b) => b.state === 'intact').length} bricks remaining
        </div>
      </div>

      {/* Keyframes */}
      <style>{`
        @keyframes brick-break {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.2); opacity: 0.7; }
          100% { transform: scale(0); opacity: 0; }
        }
        @keyframes brick-particle {
          0% { opacity: 1; transform: translate(0, 0) scale(1); }
          100% { opacity: 0; transform: translate(var(--px), var(--py)) scale(0.3); }
        }
        @keyframes brick-sheen {
          0%, 100% { transform: translateX(-100%); }
          50% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
