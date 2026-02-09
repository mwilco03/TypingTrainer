import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';

// ============================================================================
// WORD LIST - ~200 kid-friendly common English words organized by length
// ============================================================================

const WORDS_BY_LENGTH = {
  3: [
    'cat', 'dog', 'run', 'fun', 'big', 'red', 'hat', 'sun', 'cup', 'map',
    'bag', 'bat', 'bed', 'box', 'bus', 'cut', 'dig', 'fan', 'fly', 'got',
    'gum', 'hen', 'hit', 'hot', 'jam', 'jet', 'jog', 'kit', 'log', 'mix',
    'net', 'nut', 'pan', 'pen', 'pig', 'pot', 'rug', 'sit', 'top', 'van',
    'vet', 'web', 'win', 'yak', 'zip', 'add', 'all', 'ask', 'bad', 'can',
  ],
  4: [
    'fish', 'jump', 'play', 'tree', 'star', 'blue', 'cake', 'rain', 'bird',
    'frog', 'duck', 'hill', 'kite', 'lamp', 'moon', 'nest', 'pond', 'ring',
    'ship', 'swim', 'turn', 'wave', 'yard', 'bell', 'cold', 'drum', 'five',
    'gold', 'hand', 'king', 'land', 'melt', 'pink', 'rock', 'skip', 'talk',
    'warm', 'home', 'ball', 'camp', 'deer', 'fast', 'glad', 'help', 'kind',
    'last', 'nice', 'open', 'read', 'seed', 'told', 'walk', 'wish', 'good',
  ],
  5: [
    'happy', 'dance', 'smile', 'green', 'light', 'water', 'apple', 'brave',
    'cloud', 'dream', 'eagle', 'float', 'grape', 'heart', 'juice', 'lemon',
    'magic', 'night', 'ocean', 'paint', 'queen', 'river', 'space', 'tiger',
    'under', 'voice', 'whale', 'young', 'beach', 'candy', 'earth', 'flame',
    'horse', 'jelly', 'lucky', 'music', 'plant', 'quick', 'stone', 'train',
  ],
  6: [
    'garden', 'rabbit', 'purple', 'basket', 'window', 'castle', 'flower',
    'jacket', 'kitten', 'monkey', 'pencil', 'rocket', 'sunset', 'turtle',
    'violin', 'winter', 'animal', 'butter', 'candle', 'dinner', 'frozen',
    'golden', 'insect', 'jingle', 'knight', 'market', 'orange', 'planet',
    'stream', 'bright', 'cherry', 'finger', 'gentle', 'hidden', 'island',
  ],
  7: [
    'rainbow', 'dolphin', 'giraffe', 'pancake', 'popcorn', 'blanket',
    'chicken', 'diamond', 'feather', 'holiday', 'kitchen', 'morning',
    'penguin', 'pumpkin', 'quarter', 'teacher', 'thunder', 'volcano',
    'weather', 'bicycle', 'journey', 'monster', 'picture', 'printer',
    'sparrow', 'tractor', 'uniform', 'village', 'whistle', 'amazing',
  ],
};

// ============================================================================
// LEVEL CONFIGURATION
// ============================================================================

function getLevelConfig(level) {
  switch (level) {
    case 1: return { wordLengths: [3], crossTimeMs: 8000, targetScore: 5 };
    case 2: return { wordLengths: [4], crossTimeMs: 7000, targetScore: 5 };
    case 3: return { wordLengths: [4, 5], crossTimeMs: 6000, targetScore: 5 };
    case 4: return { wordLengths: [5, 6], crossTimeMs: 5000, targetScore: 5 };
    default: return { wordLengths: [6, 7], crossTimeMs: 4000, targetScore: 5 };
  }
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
      correct: { freq: 880, dur: 0.03, vol: 0.06 },
      wrong: { freq: 220, dur: 0.1, vol: 0.08 },
      score: { freq: 660, dur: 0.15, vol: 0.1 },
      lose: { freq: 180, dur: 0.3, vol: 0.08 },
      levelUp: { freq: 1040, dur: 0.2, vol: 0.1 },
    };
    const c = configs[type] || configs.correct;
    osc.frequency.value = c.freq;
    gain.gain.value = c.vol;
    osc.start();
    osc.stop(ctx.currentTime + c.dur);
  } catch (e) {}
};

// ============================================================================
// WORD SELECTION
// ============================================================================

function pickWord(wordLengths, keyMetrics) {
  const practicedKeys = new Set(
    Object.entries(keyMetrics)
      .filter(([, m]) => m.total >= 5)
      .map(([k]) => k)
  );

  let candidates = [];
  for (const len of wordLengths) {
    const words = WORDS_BY_LENGTH[len] || [];
    candidates.push(...words);
  }

  if (practicedKeys.size >= 6) {
    const filtered = candidates.filter(w =>
      w.split('').every(c => practicedKeys.has(c))
    );
    if (filtered.length >= 3) candidates = filtered;
  }

  if (candidates.length === 0) return 'fun';
  return candidates[Math.floor(Math.random() * candidates.length)];
}

function pickChallenge(level, keyMetrics, wordsInLevel) {
  const config = getLevelConfig(level);
  // Warmup: first 3 words of each level (after level 1) use easier word lengths
  if (wordsInLevel < 3 && level > 1) {
    const easyConfig = getLevelConfig(level - 1);
    return pickWord(easyConfig.wordLengths, keyMetrics);
  }
  if (level >= 5 && Math.random() < 0.35) {
    const a = pickWord([3, 4], keyMetrics);
    let b = pickWord([3, 4], keyMetrics);
    let tries = 0;
    while (b === a && tries < 5) { b = pickWord([3, 4], keyMetrics); tries++; }
    return a + ' ' + b;
  }
  return pickWord(config.wordLengths, keyMetrics);
}

// ============================================================================
// SCORE DOTS COMPONENT
// ============================================================================

function ScoreDots({ count, total, colorFilled, colorEmpty }) {
  return (
    <div className="flex gap-1.5">
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
            i < count ? colorFilled : colorEmpty || 'bg-gray-700/60'
          } ${i < count ? 'scale-110' : ''}`}
        />
      ))}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function TypePong({ progressData, onRecordKeystroke, onEndSession, onUpdateGameProgress, onNavigate }) {
  // ---- Game state ----
  const [gameState, setGameState] = useState('ready');
  const [level, setLevel] = useState(1);
  const [playerScore, setPlayerScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [currentWord, setCurrentWord] = useState('');
  const [typedIndex, setTypedIndex] = useState(0);
  const [ballPosition, setBallPosition] = useState(100);
  const [flashWrong, setFlashWrong] = useState(false);
  const [scoreFlash, setScoreFlash] = useState(null);

  // ---- Session tracking ----
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [totalKeystrokes, setTotalKeystrokes] = useState(0);
  const [wordsCompleted, setWordsCompleted] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [lastKeyTime, setLastKeyTime] = useState(null);
  const keysUsedRef = useRef(new Set());

  // ---- Refs for animation ----
  const inputRef = useRef(null);
  const animFrameRef = useRef(null);
  const lastFrameTimeRef = useRef(null);
  const ballPosRef = useRef(100);
  const onBallReachPlayerRef = useRef(null);
  const sessionReportedRef = useRef(false);
  const processingRef = useRef(false);
  const levelWordsRef = useRef(0);

  // ---- Progress data ----
  const gameData = progressData.gameProgress.pong || { highScore: 0, levelsCleared: 0, totalSessions: 0 };
  const keyMetrics = progressData.keyMetrics;

  const levelConfig = useMemo(() => getLevelConfig(level), [level]);
  const targetScore = levelConfig.targetScore;

  // ---- Focus management ----
  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, [gameState, currentWord]);

  // ---- Animation helpers ----
  const stopAnimation = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    lastFrameTimeRef.current = null;
  }, []);

  const startAnimation = useCallback((crossTimeMs) => {
    stopAnimation();
    ballPosRef.current = 100;
    setBallPosition(100);

    const speed = 100 / crossTimeMs; // percent per millisecond

    const animate = (timestamp) => {
      if (lastFrameTimeRef.current === null) {
        lastFrameTimeRef.current = timestamp;
        animFrameRef.current = requestAnimationFrame(animate);
        return;
      }

      const delta = Math.min(timestamp - lastFrameTimeRef.current, 50);
      lastFrameTimeRef.current = timestamp;
      ballPosRef.current -= speed * delta;

      if (ballPosRef.current <= 2) {
        ballPosRef.current = 2;
        setBallPosition(2);
        stopAnimation();
        if (onBallReachPlayerRef.current) onBallReachPlayerRef.current();
        return;
      }

      setBallPosition(ballPosRef.current);
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
  }, [stopAnimation]);

  // ---- Start a new round ----
  const startNewRound = useCallback((lvl) => {
    processingRef.current = false;
    const config = getLevelConfig(lvl);
    const word = pickChallenge(lvl, keyMetrics, levelWordsRef.current);
    setCurrentWord(word);
    setTypedIndex(0);
    setFlashWrong(false);
    startAnimation(config.crossTimeMs);
  }, [keyMetrics, startAnimation]);

  // ---- Ball reaches player side (opponent scores) ----
  onBallReachPlayerRef.current = () => {
    if (processingRef.current) return;
    processingRef.current = true;
    playSound('lose');
    setScoreFlash('opponent');
    setTimeout(() => setScoreFlash(null), 500);

    setOpponentScore(prev => {
      const next = prev + 1;
      if (next >= targetScore) {
        setGameState('gameOver');
      } else {
        setTimeout(() => startNewRound(level), 700);
      }
      return next;
    });
  };

  // ---- Player completes the word ----
  const handleWordComplete = useCallback(() => {
    if (processingRef.current) return;
    processingRef.current = true;
    stopAnimation();
    playSound('score');
    setScoreFlash('player');
    setTimeout(() => setScoreFlash(null), 500);
    setWordsCompleted(c => c + 1);
    levelWordsRef.current += 1;

    setPlayerScore(prev => {
      const next = prev + 1;
      if (next >= targetScore) {
        playSound('levelUp');
        setGameState('levelComplete');
        onUpdateGameProgress('pong', (d) => ({
          ...d,
          levelsCleared: Math.max(d.levelsCleared || 0, level),
        }));
        setTimeout(() => {
          const nextLvl = level + 1;
          setLevel(nextLvl);
          setPlayerScore(0);
          setOpponentScore(0);
          setGameState('playing');
          levelWordsRef.current = 0;
          startNewRound(nextLvl);
        }, 2500);
      } else {
        setTimeout(() => startNewRound(level), 350);
      }
      return next;
    });
  }, [stopAnimation, targetScore, level, startNewRound, onUpdateGameProgress]);

  // ---- Report session on game over ----
  const reportSession = useCallback(() => {
    if (sessionReportedRef.current) return false;
    sessionReportedRef.current = true;

    const acc = totalKeystrokes > 0 ? Math.round((totalCorrect / totalKeystrokes) * 100) : 0;
    const dMs = sessionStartTime ? Date.now() - sessionStartTime : 0;
    const wpmVal = dMs > 5000 ? Math.round((totalCorrect / 5) / (dMs / 60000)) : 0;

    onUpdateGameProgress('pong', (prev) => ({
      ...prev,
      highScore: Math.max(prev.highScore || 0, wordsCompleted),
      totalSessions: (prev.totalSessions || 0) + 1,
    }));

    onEndSession({
      game: 'pong',
      durationMs: dMs,
      wpm: wpmVal,
      accuracy: acc,
      exerciseCount: wordsCompleted,
      keysUsed: [...keysUsedRef.current],
    });

    return true;
  }, [totalCorrect, totalKeystrokes, sessionStartTime, wordsCompleted, onUpdateGameProgress, onEndSession]);

  useEffect(() => {
    if (gameState === 'gameOver') {
      reportSession();
    }
  }, [gameState, reportSession]);

  // ---- Keystroke handler ----
  const handleKeyDown = useCallback((e) => {
    // READY: any key starts the game
    if (gameState === 'ready') {
      if (e.key === 'Escape') return;
      e.preventDefault();
      sessionReportedRef.current = false;
      keysUsedRef.current = new Set();
      levelWordsRef.current = 0;
      setGameState('playing');
      setSessionStartTime(Date.now());
      setLevel(1);
      setPlayerScore(0);
      setOpponentScore(0);
      setTotalCorrect(0);
      setTotalKeystrokes(0);
      setWordsCompleted(0);
      setLastKeyTime(null);
      startNewRound(1);
      return;
    }

    // GAME OVER: Enter restarts
    if (gameState === 'gameOver' && e.key === 'Enter') {
      e.preventDefault();
      setGameState('ready');
      stopAnimation();
      return;
    }

    // Only process typing during active play
    if (gameState !== 'playing' || !currentWord) return;
    const typed = e.key;
    if (typed.length !== 1 && typed !== ' ') return;
    e.preventDefault();

    const expected = currentWord[typedIndex];
    if (expected === undefined) return;

    const now = Date.now();
    const ikiMs = lastKeyTime ? Math.min(2000, now - lastKeyTime) : 150;
    setLastKeyTime(now);
    setTotalKeystrokes(t => t + 1);

    const previousKey = typedIndex > 0 ? currentWord[typedIndex - 1] : null;
    onRecordKeystroke(expected, typed === expected, ikiMs, previousKey);
    keysUsedRef.current.add(expected);

    if (typed === expected) {
      playSound('correct');
      setTotalCorrect(c => c + 1);
      const nextIdx = typedIndex + 1;
      setTypedIndex(nextIdx);
      if (nextIdx >= currentWord.length) {
        handleWordComplete();
      }
    } else {
      playSound('wrong');
      setFlashWrong(true);
      setTimeout(() => setFlashWrong(false), 200);
    }
  }, [gameState, currentWord, typedIndex, lastKeyTime, startNewRound, stopAnimation, handleWordComplete, onRecordKeystroke]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleMobileInput = useCallback((e) => {
    const data = e.nativeEvent?.data || e.data;
    if (data) {
      for (const ch of data) {
        handleKeyDown({ key: ch, preventDefault() {} });
      }
    }
    if (e.target) e.target.value = '';
  }, [handleKeyDown]);

  // Cleanup animation on unmount
  useEffect(() => () => stopAnimation(), [stopAnimation]);

  // ---- Quit / back handler ----
  const handleQuit = useCallback(() => {
    stopAnimation();

    if (wordsCompleted > 0) {
      reportSession();
    }

    onNavigate('#/');
  }, [stopAnimation, wordsCompleted, reportSession, onNavigate]);

  // ---- Derived display values ----
  const accuracy = totalKeystrokes > 0 ? Math.round((totalCorrect / totalKeystrokes) * 100) : 100;
  const durationSec = sessionStartTime ? Math.floor((Date.now() - sessionStartTime) / 1000) : 0;
  const wpm = durationSec > 5 ? Math.round((totalCorrect / 5) / (durationSec / 60)) : 0;

  // ============================================================================
  // RENDER: READY SCREEN
  // ============================================================================
  if (gameState === 'ready') {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-white p-4 cursor-pointer"
        onClick={startNewRound}>
        <input
          ref={inputRef}
          className="mobile-input"
          inputMode="text"
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          onInput={handleMobileInput}
          autoFocus
          onBlur={(e) => setTimeout(() => e.target?.focus(), 50)}
        />

        <button
          onClick={(e) => { e.stopPropagation(); onNavigate('#/'); }}
          className="absolute top-4 left-4 text-gray-500 hover:text-white text-sm transition-colors"
        >
          &larr; Home
        </button>

        <div className="text-6xl font-black mb-1 tracking-tight">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-teal-400 to-cyan-400">
            TYPE PONG
          </span>
        </div>
        <div className="text-gray-500 text-sm mb-10">Arcade Typing Game</div>

        {/* Mini court preview */}
        <div className="relative w-72 h-36 bg-gray-800/50 rounded-xl border border-gray-700/40 mb-10 overflow-hidden">
          <div className="absolute left-1/2 top-0 bottom-0 border-l-2 border-dashed border-gray-700/40 -translate-x-1/2" />
          <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-14 rounded-full bg-blue-500/80" />
          <div className="absolute right-1.5 top-1/2 -translate-y-1/2 w-1.5 h-14 rounded-full bg-red-500/80" />
          <div
            className="absolute top-1/2 px-3 py-1 rounded-full bg-gray-700/80 border border-teal-500/40 font-mono text-sm text-teal-300 animate-bounce"
            style={{ left: '55%', transform: 'translate(-50%, -50%)' }}
          >
            cat
          </div>
        </div>

        <div className="max-w-sm text-center space-y-2 text-gray-400 text-sm mb-10">
          <p>A word flies toward your paddle.</p>
          <p>Type it correctly before it gets past you!</p>
          <p className="text-gray-500">First to {targetScore} points wins each round.</p>
        </div>

        <div className="bg-gray-800/50 rounded-xl p-4 max-w-xs w-full mb-10 space-y-2.5 text-sm border border-gray-700/30">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center shrink-0 text-green-400 text-xs font-bold">+</div>
            <span className="text-gray-300">Type the word correctly to score</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center shrink-0 text-red-400 text-xs font-bold">-</div>
            <span className="text-gray-300">Ball gets past you, opponent scores</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-full bg-yellow-500/20 flex items-center justify-center shrink-0 text-yellow-400 text-xs font-bold">5</div>
            <span className="text-gray-300">Clear 5 levels to become champion</span>
          </div>
        </div>

        {(gameData.highScore > 0 || gameData.levelsCleared > 0) && (
          <div className="text-gray-600 text-xs mb-6">
            Best: {gameData.highScore} words | Levels cleared: {gameData.levelsCleared}
          </div>
        )}

        <div className="animate-pulse text-lg text-teal-400 font-medium">
          Tap or press any key to start
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER: GAME OVER SCREEN
  // ============================================================================
  if (gameState === 'gameOver') {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-white p-4">
        <input
          ref={inputRef}
          className="mobile-input"
          inputMode="text"
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          onInput={handleMobileInput}
          autoFocus
          onBlur={(e) => setTimeout(() => e.target?.focus(), 50)}
        />

        <button
          onClick={() => onNavigate('#/')}
          className="absolute top-4 left-4 text-gray-500 hover:text-white text-sm transition-colors"
        >
          &larr; Home
        </button>

        <div className="text-5xl font-black text-red-500 mb-2">GAME OVER</div>
        <p className="text-gray-500 mb-8">Opponent reached {targetScore} points</p>

        <div className="bg-gray-800/60 rounded-2xl p-6 max-w-sm w-full mb-8 border border-gray-700/30">
          <div className="grid grid-cols-2 gap-5 text-center">
            <div>
              <div className="text-3xl font-bold text-teal-400">{wordsCompleted}</div>
              <div className="text-xs text-gray-500 mt-1">Words Typed</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-400">Lv {level}</div>
              <div className="text-xs text-gray-500 mt-1">Reached</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-green-400">{accuracy}%</div>
              <div className="text-xs text-gray-500 mt-1">Accuracy</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-purple-400">{wpm}</div>
              <div className="text-xs text-gray-500 mt-1">WPM</div>
            </div>
          </div>
        </div>

        <div className="space-y-3 w-full max-w-sm">
          <button
            onClick={() => setGameState('ready')}
            className="w-full bg-gradient-to-r from-green-500 to-teal-500 text-white py-3 rounded-xl font-bold hover:opacity-90 transition-opacity"
          >
            Play Again
          </button>
          <button
            onClick={() => onNavigate('#/')}
            className="w-full bg-gray-800 text-gray-400 py-3 rounded-xl font-medium hover:bg-gray-700 transition-colors border border-gray-700/40"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER: PLAYING + LEVEL COMPLETE
  // ============================================================================
  const ballPct = Math.max(6, Math.min(94, ballPosition));

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col select-none overflow-hidden">
      {/* Hidden input for keystroke capture */}
      <input
        ref={inputRef}
        className="mobile-input"
        inputMode="text"
        autoCapitalize="off"
        autoCorrect="off"
        autoComplete="off"
        onInput={handleMobileInput}
        autoFocus
        onBlur={(e) => setTimeout(() => e.target?.focus(), 50)}
      />

      {/* ---- Top bar ---- */}
      <div className="flex items-center justify-between px-3 py-2.5 bg-gray-800/90 border-b border-gray-700/40 z-10 shrink-0">
        <button
          onClick={handleQuit}
          className="text-gray-500 hover:text-white text-sm px-2 py-1 rounded hover:bg-gray-700/50 transition-colors"
        >
          &larr; Home
        </button>

        <div className="bg-gray-700/40 px-3 py-1 rounded-full text-sm text-gray-400 font-medium">
          Level {level}
        </div>

        <div className="flex items-center gap-4">
          <div className={`font-mono text-lg font-bold transition-all duration-200 ${
            scoreFlash === 'player' ? 'text-green-300 scale-125' : 'text-blue-400'
          }`}>
            {playerScore}
          </div>
          <span className="text-gray-600 text-sm">vs</span>
          <div className={`font-mono text-lg font-bold transition-all duration-200 ${
            scoreFlash === 'opponent' ? 'text-yellow-300 scale-125' : 'text-red-400'
          }`}>
            {opponentScore}
          </div>
        </div>
      </div>

      {/* ---- Score progress dots ---- */}
      <div className="flex items-center justify-center gap-6 py-2 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs text-blue-400/60 font-medium">YOU</span>
          <ScoreDots count={playerScore} total={targetScore} colorFilled="bg-blue-400" />
        </div>
        <div className="text-gray-700 text-xs">first to {targetScore}</div>
        <div className="flex items-center gap-2">
          <ScoreDots count={opponentScore} total={targetScore} colorFilled="bg-red-400" />
          <span className="text-xs text-red-400/60 font-medium">CPU</span>
        </div>
      </div>

      {/* ---- Court area ---- */}
      <div className="flex-1 relative mx-2 my-1 rounded-xl overflow-hidden" style={{ minHeight: '260px' }}>
        {/* Court background */}
        <div
          className="absolute inset-0 rounded-xl border border-gray-700/20"
          style={{ background: 'linear-gradient(180deg, #111827 0%, #0f172a 100%)' }}
        />

        {/* Center dashed line */}
        <div className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 border-l-2 border-dashed border-gray-700/30" />

        {/* Center circle */}
        <div className="absolute left-1/2 top-1/2 w-20 h-20 md:w-28 md:h-28 border-2 border-gray-700/20 rounded-full -translate-x-1/2 -translate-y-1/2" />

        {/* Player paddle (left, blue) */}
        <div className="absolute left-1 md:left-2 top-1/2 -translate-y-1/2">
          <div
            className="w-2 md:w-3 rounded-full bg-gradient-to-b from-blue-400 to-blue-600"
            style={{
              height: '100px',
              boxShadow: ballPosition < 30
                ? '0 0 25px rgba(59,130,246,0.6), 0 0 50px rgba(59,130,246,0.2)'
                : '0 0 15px rgba(59,130,246,0.3)',
              transition: 'box-shadow 0.3s',
            }}
          />
        </div>

        {/* Opponent paddle (right, red) */}
        <div className="absolute right-1 md:right-2 top-1/2 -translate-y-1/2">
          <div
            className="w-2 md:w-3 rounded-full bg-gradient-to-b from-red-400 to-red-600"
            style={{
              height: '100px',
              boxShadow: '0 0 15px rgba(239,68,68,0.3)',
            }}
          />
        </div>

        {/* Ball trail */}
        {gameState === 'playing' && currentWord && (
          <div
            className="absolute top-1/2 -translate-y-1/2 h-0.5 rounded-full pointer-events-none"
            style={{
              left: `${ballPct}%`,
              right: '6%',
              background: 'linear-gradient(to right, rgba(45,212,191,0.25), transparent)',
            }}
          />
        )}

        {/* Ball (word container) */}
        {gameState === 'playing' && currentWord && (
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 pointer-events-none"
            style={{ left: `${ballPct}%` }}
          >
            {/* Glow */}
            <div
              className="absolute inset-0 rounded-full blur-xl pointer-events-none"
              style={{
                background: flashWrong
                  ? 'rgba(239,68,68,0.35)'
                  : 'rgba(45,212,191,0.2)',
                transform: 'scale(2.5)',
              }}
            />

            {/* Pill-shaped ball */}
            <div
              className={`relative px-4 py-2 md:px-6 md:py-3 rounded-full border-2 backdrop-blur-sm transition-colors duration-75 ${
                flashWrong
                  ? 'bg-red-950/80 border-red-500/70'
                  : 'bg-gray-900/85 border-teal-400/50'
              }`}
              style={{
                boxShadow: flashWrong
                  ? '0 0 30px rgba(239,68,68,0.5), inset 0 1px 0 rgba(239,68,68,0.1)'
                  : '0 0 25px rgba(45,212,191,0.2), inset 0 1px 0 rgba(255,255,255,0.05)',
              }}
            >
              <div className="font-mono text-xl md:text-3xl tracking-wider whitespace-nowrap flex">
                {currentWord.split('').map((char, i) => {
                  const isTyped = i < typedIndex;
                  const isCurrent = i === typedIndex;
                  return (
                    <span
                      key={i}
                      className={`transition-colors duration-75 ${
                        isTyped ? 'text-green-400' : ''
                      } ${
                        isCurrent
                          ? 'text-yellow-300 underline decoration-2 underline-offset-4 decoration-yellow-400/80'
                          : ''
                      } ${
                        !isTyped && !isCurrent ? 'text-white/90' : ''
                      }`}
                    >
                      {char === ' ' ? '\u00A0' : char}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Score flash overlay */}
        {scoreFlash && (
          <div
            className={`absolute inset-0 rounded-xl pointer-events-none transition-opacity duration-300 ${
              scoreFlash === 'player'
                ? 'bg-gradient-to-r from-blue-500/10 to-transparent'
                : 'bg-gradient-to-l from-red-500/10 to-transparent'
            }`}
          />
        )}

        {/* Level complete overlay */}
        {gameState === 'levelComplete' && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/85 backdrop-blur-sm rounded-xl z-20">
            <div className="text-center px-4">
              <div className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-400 to-orange-400 mb-3 animate-pulse">
                Level {level} Complete!
              </div>
              <div className="text-gray-400 text-lg mb-2">
                Get ready for Level {level + 1}...
              </div>
              <div className="text-gray-600 text-sm">
                Words get longer and faster!
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ---- Bottom bar: word echo + stats ---- */}
      {gameState === 'playing' && currentWord && (
        <div className="bg-gray-800/80 border-t border-gray-700/30 px-4 py-3 shrink-0">
          <div className="max-w-lg mx-auto">
            {/* Word echo */}
            <div className="text-center font-mono text-lg md:text-xl tracking-[0.15em] mb-2">
              {currentWord.split('').map((char, i) => {
                const isTyped = i < typedIndex;
                const isCurrent = i === typedIndex;
                return (
                  <span
                    key={i}
                    className={`inline-block px-0.5 ${
                      isTyped ? 'text-green-400' : ''
                    } ${
                      isCurrent ? 'text-yellow-300 bg-yellow-400/10 rounded animate-pulse font-bold' : ''
                    } ${
                      !isTyped && !isCurrent ? 'text-gray-600' : ''
                    }`}
                  >
                    {char === ' ' ? '\u2423' : char}
                  </span>
                );
              })}
            </div>
            {/* Stats */}
            <div className="flex justify-center gap-6 text-xs text-gray-600">
              <span>
                Accuracy:{' '}
                <span className={accuracy >= 80 ? 'text-green-500' : accuracy >= 60 ? 'text-yellow-500' : 'text-red-400'}>
                  {accuracy}%
                </span>
              </span>
              <span>Words: <span className="text-teal-400">{wordsCompleted}</span></span>
              {wpm > 0 && <span>WPM: <span className="text-purple-400">{wpm}</span></span>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
