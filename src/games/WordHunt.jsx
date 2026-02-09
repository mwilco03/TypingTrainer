import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';

// ============================================================================
// WORD LISTS - ~150 kid-friendly words organized by length
// ============================================================================

const WORDS_BY_LENGTH = {
  3: [
    'cat', 'dog', 'run', 'fun', 'big', 'red', 'hat', 'sun', 'cup', 'map',
    'bed', 'fix', 'log', 'pen', 'sit', 'hop', 'bug', 'jam', 'net', 'van',
    'box', 'pig', 'owl', 'fox', 'bat', 'fin', 'gem', 'hug', 'jet', 'kit',
  ],
  4: [
    'fish', 'bird', 'duck', 'frog', 'jump', 'play', 'tree', 'star', 'blue',
    'cake', 'drum', 'gift', 'hill', 'kite', 'lamp', 'moon', 'nest', 'pond',
    'rain', 'ship', 'toad', 'vine', 'wolf', 'yarn', 'bear', 'clap', 'deer',
    'egg', 'flap', 'glow',
  ],
  5: [
    'happy', 'dance', 'smile', 'green', 'light', 'water', 'cloud', 'dream',
    'candy', 'flame', 'grape', 'heart', 'juice', 'lemon', 'maple', 'night',
    'ocean', 'paint', 'quest', 'river', 'swing', 'tiger', 'under', 'world',
    'brave', 'creek', 'fairy', 'giant', 'house', 'jelly',
  ],
  6: [
    'garden', 'rabbit', 'purple', 'basket', 'window', 'flying', 'sunset',
    'castle', 'dragon', 'forest', 'golden', 'island', 'jungle', 'kitten',
    'meadow', 'planet', 'rocket', 'silver', 'turtle', 'breeze', 'cookie',
    'donkey', 'flower', 'guitar', 'harbor', 'insect', 'ladybug', 'monkey',
    'noodle', 'oyster',
  ],
  7: [
    'rainbow', 'kitchen', 'penguin', 'dolphin', 'blanket', 'chicken',
    'camping', 'feather', 'morning', 'pancake', 'sandbox', 'tractor',
    'unicorn', 'volcano', 'weather', 'giraffe', 'muffin', 'popcorn',
    'cupcake', 'lantern',
  ],
};

// ============================================================================
// ROUND CONFIGURATION
// ============================================================================

const ROUND_CONFIG = [
  { maxDucks: 1, minLen: 3, maxLen: 3, flightDuration: 6000, spawnInterval: 3500 },
  { maxDucks: 2, minLen: 3, maxLen: 4, flightDuration: 5000, spawnInterval: 3000 },
  { maxDucks: 2, minLen: 4, maxLen: 4, flightDuration: 4200, spawnInterval: 2600 },
  { maxDucks: 3, minLen: 4, maxLen: 5, flightDuration: 3800, spawnInterval: 2200 },
  { maxDucks: 3, minLen: 5, maxLen: 7, flightDuration: 3400, spawnInterval: 2000 },
];

const DUCKS_PER_ROUND = 10;
const MAX_MISSES = 3;

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
      wrong:   { freq: 220, dur: 0.1,  vol: 0.08 },
      hit:     { freq: 660, dur: 0.12, vol: 0.1  },
      miss:    { freq: 180, dur: 0.3,  vol: 0.06 },
      levelUp: { freq: 1040, dur: 0.2, vol: 0.1  },
    };
    const c = configs[type] || configs.correct;
    osc.frequency.value = c.freq;
    gain.gain.value = c.vol;
    osc.start();
    osc.stop(ctx.currentTime + c.dur);
  } catch (e) {}
};

// ============================================================================
// HELPERS
// ============================================================================

let nextDuckId = 1;

function getRandomWord(minLen, maxLen) {
  const validLengths = Object.keys(WORDS_BY_LENGTH)
    .map(Number)
    .filter((len) => len >= minLen && len <= maxLen);
  if (validLengths.length === 0) return 'duck';
  const len = validLengths[Math.floor(Math.random() * validLengths.length)];
  const words = WORDS_BY_LENGTH[len];
  return words[Math.floor(Math.random() * words.length)];
}

function getRoundConfig(round) {
  const idx = Math.min(round - 1, ROUND_CONFIG.length - 1);
  return ROUND_CONFIG[idx];
}

function createDuck(round, areaWidth, areaHeight, ducksAlreadySpawned) {
  const config = getRoundConfig(round);
  // Warmup: first 3 ducks of rounds > 1 use easier word lengths and slower speed
  let minLen = config.minLen;
  let maxLen = config.maxLen;
  let baseFlight = config.flightDuration;
  if (ducksAlreadySpawned < 3 && round > 1) {
    const easyConfig = getRoundConfig(round - 1);
    minLen = easyConfig.minLen;
    maxLen = easyConfig.maxLen;
    baseFlight += 800;
  }
  const word = getRandomWord(minLen, maxLen);
  const groundHeight = 80;
  const minY = 40;
  const maxY = areaHeight - groundHeight - 80;
  const y = minY + Math.random() * Math.max(0, maxY - minY);
  const bobAmplitude = 8 + Math.random() * 12;
  const bobFrequency = 0.8 + Math.random() * 1.2;

  return {
    id: nextDuckId++,
    word,
    x: -120,
    y,
    startY: y,
    bobAmplitude,
    bobFrequency,
    spawnTime: Date.now(),
    flightDuration: baseFlight + (Math.random() - 0.5) * 600,
    state: 'flying',       // flying | hit | escaped
    hitTime: null,
    areaWidth,
  };
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function WordHunt({ progressData, onRecordKeystroke, onEndSession, onUpdateGameProgress, onNavigate }) {
  // Game state
  const [gameState, setGameState] = useState('ready'); // ready | playing | roundEnd | gameOver
  const [round, setRound] = useState(1);
  const [ducks, setDucks] = useState([]);
  const [typedBuffer, setTypedBuffer] = useState('');
  const [targetDuckId, setTargetDuckId] = useState(null);
  const [score, setScore] = useState(0);
  const [misses, setMisses] = useState(0);
  const [ducksSpawned, setDucksSpawned] = useState(0);
  const [ducksHit, setDucksHit] = useState(0);
  const [roundDucksHit, setRoundDucksHit] = useState(0);
  const [roundDucksTotal, setRoundDucksTotal] = useState(0);
  const [inputFlash, setInputFlash] = useState(null); // null | 'red' | 'green'
  const [sessionStart, setSessionStart] = useState(null);
  const [totalKeysPressed, setTotalKeysPressed] = useState(0);
  const [correctKeys, setCorrectKeys] = useState(0);
  const [lastKeyTime, setLastKeyTime] = useState(null);
  const [allKeysUsed, setAllKeysUsed] = useState(new Set());
  const [comboCount, setComboCount] = useState(0);
  const [showCombo, setShowCombo] = useState(false);
  const [hitEffects, setHitEffects] = useState([]);

  const inputRef = useRef(null);
  const gameAreaRef = useRef(null);
  const animFrameRef = useRef(null);
  const lastSpawnRef = useRef(0);
  const ducksRef = useRef(ducks);
  const roundRef = useRef(round);
  const ducksSpawnedRef = useRef(ducksSpawned);
  const missesRef = useRef(misses);
  const gameStateRef = useRef(gameState);

  // Keep refs in sync
  ducksRef.current = ducks;
  roundRef.current = round;
  ducksSpawnedRef.current = ducksSpawned;
  missesRef.current = misses;
  gameStateRef.current = gameState;

  // ============================================================================
  // GAME AREA DIMENSIONS
  // ============================================================================

  const [areaSize, setAreaSize] = useState({ width: 800, height: 500 });

  useEffect(() => {
    const measure = () => {
      if (gameAreaRef.current) {
        const rect = gameAreaRef.current.getBoundingClientRect();
        setAreaSize({ width: rect.width, height: rect.height });
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // ============================================================================
  // FOCUS MANAGEMENT
  // ============================================================================

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [gameState]);

  // ============================================================================
  // START / RESET GAME
  // ============================================================================

  const startRound = useCallback((roundNum) => {
    setRound(roundNum);
    setDucks([]);
    setTypedBuffer('');
    setTargetDuckId(null);
    setMisses(0);
    setDucksSpawned(0);
    setRoundDucksHit(0);
    setRoundDucksTotal(0);
    lastSpawnRef.current = 0;
    ducksSpawnedRef.current = 0;
    missesRef.current = 0;
    setGameState('playing');
    if (!sessionStart) {
      setSessionStart(Date.now());
    }
  }, [sessionStart]);

  const startGame = useCallback(() => {
    setScore(0);
    setDucksHit(0);
    setTotalKeysPressed(0);
    setCorrectKeys(0);
    setComboCount(0);
    setAllKeysUsed(new Set());
    setSessionStart(Date.now());
    setHitEffects([]);
    nextDuckId = 1;
    startRound(1);
  }, [startRound]);

  // ============================================================================
  // ANIMATION LOOP
  // ============================================================================

  useEffect(() => {
    if (gameState !== 'playing') {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      return;
    }

    const tick = () => {
      if (gameStateRef.current !== 'playing') return;

      const now = Date.now();
      const config = getRoundConfig(roundRef.current);
      const currentAreaWidth = gameAreaRef.current
        ? gameAreaRef.current.getBoundingClientRect().width
        : areaSize.width;
      const currentAreaHeight = gameAreaRef.current
        ? gameAreaRef.current.getBoundingClientRect().height
        : areaSize.height;

      setDucks((prev) => {
        let updated = prev.map((duck) => {
          if (duck.state === 'hit') {
            const elapsed = now - duck.hitTime;
            if (elapsed > 800) {
              return { ...duck, state: 'gone' };
            }
            return {
              ...duck,
              y: duck.y + elapsed * 0.005,
              x: duck.x,
            };
          }

          if (duck.state === 'flying') {
            const elapsed = now - duck.spawnTime;
            const progress = elapsed / duck.flightDuration;

            if (progress >= 1) {
              return { ...duck, state: 'escaped' };
            }

            const newX = -120 + progress * (currentAreaWidth + 240);
            const bobOffset = Math.sin(elapsed / 1000 * duck.bobFrequency * Math.PI * 2) * duck.bobAmplitude;
            const newY = duck.startY + bobOffset;

            return { ...duck, x: newX, y: newY };
          }

          return duck;
        });

        // Handle escaped ducks
        const newlyEscaped = updated.filter((d) => d.state === 'escaped');
        if (newlyEscaped.length > 0) {
          newlyEscaped.forEach(() => {
            playSound('miss');
          });
          setMisses((prev) => {
            const newMisses = prev + newlyEscaped.length;
            missesRef.current = newMisses;
            return newMisses;
          });
          setRoundDucksTotal((prev) => prev + newlyEscaped.length);

          // Clear targeting if target escaped
          setTargetDuckId((prevTarget) => {
            if (prevTarget && newlyEscaped.some((d) => d.id === prevTarget)) {
              setTypedBuffer('');
              return null;
            }
            return prevTarget;
          });
        }

        // Remove gone and escaped ducks
        updated = updated.filter((d) => d.state !== 'gone' && d.state !== 'escaped');

        return updated;
      });

      // Check round end conditions
      if (missesRef.current >= MAX_MISSES) {
        setGameState('roundEnd');
        return;
      }

      // Spawn new ducks
      const activeDucks = ducksRef.current.filter((d) => d.state === 'flying').length;
      if (
        ducksSpawnedRef.current < DUCKS_PER_ROUND &&
        activeDucks < config.maxDucks &&
        now - lastSpawnRef.current > config.spawnInterval
      ) {
        const newDuck = createDuck(roundRef.current, currentAreaWidth, currentAreaHeight, ducksSpawnedRef.current);
        setDucks((prev) => [...prev, newDuck]);
        setDucksSpawned((prev) => {
          const val = prev + 1;
          ducksSpawnedRef.current = val;
          return val;
        });
        lastSpawnRef.current = now;
      }

      // Check if round is complete (all ducks spawned and none flying)
      if (ducksSpawnedRef.current >= DUCKS_PER_ROUND) {
        const stillFlying = ducksRef.current.filter((d) => d.state === 'flying').length;
        const stillAnimating = ducksRef.current.filter((d) => d.state === 'hit').length;
        if (stillFlying === 0 && stillAnimating === 0) {
          setGameState('roundEnd');
          return;
        }
      }

      animFrameRef.current = requestAnimationFrame(tick);
    };

    // Initial spawn
    if (ducksSpawnedRef.current === 0) {
      const currentAreaWidth = gameAreaRef.current
        ? gameAreaRef.current.getBoundingClientRect().width
        : areaSize.width;
      const currentAreaHeight = gameAreaRef.current
        ? gameAreaRef.current.getBoundingClientRect().height
        : areaSize.height;
      const newDuck = createDuck(roundRef.current, currentAreaWidth, currentAreaHeight, 0);
      setDucks([newDuck]);
      setDucksSpawned(1);
      ducksSpawnedRef.current = 1;
      lastSpawnRef.current = Date.now();
    }

    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [gameState, areaSize.width, areaSize.height]);

  // ============================================================================
  // AUTO-TARGETING
  // ============================================================================

  const findTargetDuck = useCallback((buffer) => {
    if (!buffer) return null;
    const flyingDucks = ducksRef.current.filter((d) => d.state === 'flying');
    const match = flyingDucks.find((d) => d.word.startsWith(buffer.toLowerCase()));
    return match ? match.id : null;
  }, []);

  // ============================================================================
  // INPUT HANDLING
  // ============================================================================

  const handleKeyDown = useCallback((e) => {
    // Ready screen: any key starts the game
    if (gameStateRef.current === 'ready') {
      if (e.key.length === 1 || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        startGame();
      }
      return;
    }

    // Round end / game over: Enter to continue
    if (gameStateRef.current === 'roundEnd' || gameStateRef.current === 'gameOver') {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (gameStateRef.current === 'roundEnd') {
          if (missesRef.current >= MAX_MISSES && roundRef.current > 1) {
            setGameState('gameOver');
          } else {
            playSound('levelUp');
            startRound(roundRef.current + 1);
          }
        } else {
          // gameOver: restart
          startGame();
        }
      }
      return;
    }

    if (gameStateRef.current !== 'playing') return;

    const key = e.key;

    // Only handle single printable characters and backspace
    if (key === 'Backspace') {
      e.preventDefault();
      setTypedBuffer((prev) => {
        const newBuf = prev.slice(0, -1);
        if (newBuf.length === 0) {
          setTargetDuckId(null);
        } else {
          const newTarget = findTargetDuck(newBuf);
          setTargetDuckId(newTarget);
        }
        return newBuf;
      });
      return;
    }

    if (key.length !== 1) return;
    e.preventDefault();

    const now = Date.now();
    const ikiMs = lastKeyTime ? Math.min(2000, now - lastKeyTime) : 150;
    setLastKeyTime(now);
    setTotalKeysPressed((prev) => prev + 1);
    setAllKeysUsed((prev) => new Set([...prev, key.toLowerCase()]));

    const newBuffer = typedBuffer + key.toLowerCase();

    // Find or verify target
    const currentTarget = targetDuckId
      ? ducksRef.current.find((d) => d.id === targetDuckId && d.state === 'flying')
      : null;

    let matchedDuck = null;

    if (currentTarget && currentTarget.word.startsWith(newBuffer)) {
      matchedDuck = currentTarget;
    } else {
      // Try to find a new target
      const flyingDucks = ducksRef.current.filter((d) => d.state === 'flying');
      matchedDuck = flyingDucks.find((d) => d.word.startsWith(newBuffer));
    }

    if (matchedDuck) {
      // Correct key
      playSound('correct');
      setCorrectKeys((prev) => prev + 1);
      const previousKey = typedBuffer.length > 0 ? typedBuffer[typedBuffer.length - 1] : null;
      onRecordKeystroke(key.toLowerCase(), true, ikiMs, previousKey);

      setTypedBuffer(newBuffer);
      setTargetDuckId(matchedDuck.id);
      setInputFlash('green');
      setTimeout(() => setInputFlash(null), 150);

      // Check if word is complete
      if (newBuffer === matchedDuck.word) {
        // HIT!
        playSound('hit');
        const wordLength = matchedDuck.word.length;
        const pointsBase = wordLength * 10;
        const comboBonus = comboCount * 5;
        const points = pointsBase + comboBonus;

        setScore((prev) => prev + points);
        setDucksHit((prev) => prev + 1);
        setRoundDucksHit((prev) => prev + 1);
        setRoundDucksTotal((prev) => prev + 1);
        setComboCount((prev) => prev + 1);
        setShowCombo(true);
        setTimeout(() => setShowCombo(false), 800);

        // Add hit effect
        const hitDuck = ducksRef.current.find((d) => d.id === matchedDuck.id);
        if (hitDuck) {
          setHitEffects((prev) => [
            ...prev,
            {
              id: hitDuck.id,
              x: hitDuck.x,
              y: hitDuck.y,
              points,
              time: Date.now(),
            },
          ]);
          setTimeout(() => {
            setHitEffects((prev) => prev.filter((e) => e.id !== hitDuck.id));
          }, 1000);
        }

        // Mark duck as hit
        setDucks((prev) =>
          prev.map((d) =>
            d.id === matchedDuck.id
              ? { ...d, state: 'hit', hitTime: Date.now() }
              : d
          )
        );

        setTypedBuffer('');
        setTargetDuckId(null);
      }
    } else {
      // Wrong key
      playSound('wrong');
      const previousKey = typedBuffer.length > 0 ? typedBuffer[typedBuffer.length - 1] : null;
      onRecordKeystroke(key.toLowerCase(), false, ikiMs, previousKey);

      setInputFlash('red');
      setTimeout(() => setInputFlash(null), 200);
      setComboCount(0);

      // If buffer doesn't match any duck, clear it
      if (!matchedDuck) {
        setTypedBuffer('');
        setTargetDuckId(null);
      }
    }
  }, [
    gameState, typedBuffer, targetDuckId, lastKeyTime, comboCount,
    findTargetDuck, startGame, startRound, onRecordKeystroke,
  ]);

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

  // ============================================================================
  // END SESSION
  // ============================================================================

  const handleEndSession = useCallback(() => {
    const durationMs = sessionStart ? Date.now() - sessionStart : 0;
    const accuracy = totalKeysPressed > 0
      ? Math.round((correctKeys / totalKeysPressed) * 100)
      : 0;
    const wpm = durationMs >= 5000
      ? Math.round((correctKeys / 5) / (durationMs / 60000))
      : 0;

    onUpdateGameProgress('duckhunt', (prev) => ({
      ...prev,
      highScore: Math.max(prev.highScore || 0, score),
      bestRound: Math.max(prev.bestRound || 0, round),
      totalDucksHit: (prev.totalDucksHit || 0) + ducksHit,
      totalSessions: (prev.totalSessions || 0) + 1,
    }));

    onEndSession({
      game: 'duckhunt',
      durationMs,
      wpm,
      accuracy,
      exerciseCount: ducksHit,
      keysUsed: [...allKeysUsed],
    });
  }, [
    sessionStart, totalKeysPressed, correctKeys, score, round, ducksHit,
    allKeysUsed, onUpdateGameProgress, onEndSession,
  ]);

  // End session on game over
  useEffect(() => {
    if (gameState === 'gameOver') {
      handleEndSession();
    }
  }, [gameState, handleEndSession]);

  // Handle round end -> game over transition
  useEffect(() => {
    if (gameState === 'roundEnd' && misses >= MAX_MISSES && round <= 1) {
      // First round fail also goes to game over
      const timer = setTimeout(() => setGameState('gameOver'), 100);
      return () => clearTimeout(timer);
    }
  }, [gameState, misses, round]);

  // Clean up hit effects periodically
  useEffect(() => {
    const cleanup = setInterval(() => {
      setHitEffects((prev) => prev.filter((e) => Date.now() - e.time < 1000));
    }, 2000);
    return () => clearInterval(cleanup);
  }, []);

  // ============================================================================
  // DERIVED STATE
  // ============================================================================

  const accuracy = totalKeysPressed > 0
    ? Math.round((correctKeys / totalKeysPressed) * 100)
    : 100;

  const targetDuck = useMemo(
    () => ducks.find((d) => d.id === targetDuckId && d.state === 'flying'),
    [ducks, targetDuckId]
  );

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderDuck = (duck) => {
    const isTarget = duck.id === targetDuckId;
    const isHit = duck.state === 'hit';
    const hitElapsed = isHit && duck.hitTime ? Date.now() - duck.hitTime : 0;

    let transform = '';
    let opacity = 1;
    let filter = '';

    if (isHit) {
      const spin = hitElapsed * 0.8;
      const fallY = hitElapsed * 0.4;
      transform = `rotate(${spin}deg) translateY(${fallY}px)`;
      opacity = Math.max(0, 1 - hitElapsed / 800);
    }

    const typedLen = isTarget ? typedBuffer.length : 0;

    return (
      <div
        key={duck.id}
        className="absolute transition-none"
        style={{
          left: duck.x,
          top: duck.y,
          transform,
          opacity,
          filter,
          zIndex: isTarget ? 20 : 10,
          pointerEvents: 'none',
        }}
      >
        {/* Wing (left side) */}
        <div
          className="absolute"
          style={{
            left: -18,
            top: 10,
            width: 24,
            height: 16,
            background: isTarget
              ? 'linear-gradient(135deg, #fbbf24, #f59e0b)'
              : 'linear-gradient(135deg, #60a5fa, #3b82f6)',
            borderRadius: '50% 10% 50% 50%',
            transform: `rotate(${Math.sin(Date.now() / 150) * 25 - 10}deg)`,
            transformOrigin: 'right center',
          }}
        />

        {/* Body */}
        <div
          className="relative px-3 py-2 rounded-2xl shadow-lg border-2 flex items-center justify-center"
          style={{
            minWidth: 60,
            background: isTarget
              ? 'linear-gradient(180deg, #fef3c7, #fde68a)'
              : isHit
                ? 'linear-gradient(180deg, #fca5a5, #f87171)'
                : 'linear-gradient(180deg, #dbeafe, #93c5fd)',
            borderColor: isTarget ? '#f59e0b' : isHit ? '#ef4444' : '#60a5fa',
            boxShadow: isTarget
              ? '0 0 16px rgba(245, 158, 11, 0.5), 0 4px 12px rgba(0,0,0,0.15)'
              : '0 4px 12px rgba(0,0,0,0.15)',
          }}
        >
          {/* Eye */}
          <div
            className="absolute bg-gray-800 rounded-full"
            style={{
              width: 5,
              height: 5,
              top: 6,
              right: 8,
            }}
          />

          {/* Beak */}
          <div
            className="absolute"
            style={{
              right: -8,
              top: 10,
              width: 0,
              height: 0,
              borderTop: '4px solid transparent',
              borderBottom: '4px solid transparent',
              borderLeft: '10px solid #fb923c',
            }}
          />

          {/* Word */}
          <span className="font-bold text-sm tracking-wide select-none" style={{ letterSpacing: '0.05em' }}>
            {duck.word.split('').map((char, i) => (
              <span
                key={i}
                style={{
                  color:
                    isTarget && i < typedLen
                      ? '#16a34a'
                      : isTarget
                        ? '#92400e'
                        : '#1e3a5f',
                  fontWeight: isTarget && i < typedLen ? 900 : 700,
                  textShadow: isTarget && i < typedLen ? '0 0 4px rgba(22,163,106,0.3)' : 'none',
                }}
              >
                {char}
              </span>
            ))}
          </span>
        </div>

        {/* Tail (right side, behind body visually) */}
        <div
          className="absolute"
          style={{
            left: -10,
            top: 16,
            width: 14,
            height: 8,
            background: isTarget
              ? 'linear-gradient(135deg, #d97706, #b45309)'
              : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
            borderRadius: '50%',
          }}
        />
      </div>
    );
  };

  // ============================================================================
  // CLOUD COMPONENT
  // ============================================================================

  const clouds = useMemo(() => {
    const items = [];
    for (let i = 0; i < 5; i++) {
      items.push({
        id: i,
        left: `${10 + i * 20}%`,
        top: `${5 + (i % 3) * 12}%`,
        scale: 0.6 + Math.random() * 0.6,
        opacity: 0.3 + Math.random() * 0.3,
      });
    }
    return items;
  }, []);

  // ============================================================================
  // LIVES INDICATOR
  // ============================================================================

  const renderLives = () => {
    const lives = [];
    for (let i = 0; i < MAX_MISSES; i++) {
      const isLost = i < misses;
      lives.push(
        <svg
          key={i}
          width="28"
          height="28"
          viewBox="0 0 28 28"
          className="transition-all duration-300"
          style={{
            opacity: isLost ? 0.25 : 1,
            transform: isLost ? 'scale(0.85)' : 'scale(1)',
            filter: isLost ? 'grayscale(1)' : 'none',
          }}
        >
          <ellipse cx="14" cy="14" rx="10" ry="8" fill={isLost ? '#9ca3af' : '#60a5fa'} />
          <ellipse cx="18" cy="11" rx="3" ry="4" fill={isLost ? '#6b7280' : '#3b82f6'} />
          <circle cx="18" cy="10" r="1.5" fill="white" />
          <circle cx="18" cy="10" r="0.8" fill="#1e293b" />
          <polygon points="23,13 28,12 23,15" fill={isLost ? '#9ca3af' : '#fb923c'} />
          <ellipse cx="8" cy="13" rx="5" ry="3" fill={isLost ? '#9ca3af' : '#93c5fd'} />
        </svg>
      );
    }
    return lives;
  };

  // ============================================================================
  // READY SCREEN
  // ============================================================================

  if (gameState === 'ready') {
    return (
      <div
        className="min-h-screen flex flex-col relative overflow-hidden select-none cursor-pointer"
        onClick={startGame}
        style={{
          background: 'linear-gradient(180deg, #7dd3fc 0%, #38bdf8 30%, #0ea5e9 60%, #0284c7 100%)',
        }}
      >
        <input
          ref={inputRef}
          className="mobile-input"
          inputMode="text"
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          onInput={handleMobileInput}
          onBlur={(e) => setTimeout(() => e.target?.focus(), 50)}
          autoFocus
        />

        {/* Back button */}
        <button
          onClick={(e) => { e.stopPropagation(); onNavigate('#/'); }}
          className="absolute top-4 left-4 z-30 bg-white/20 hover:bg-white/40 backdrop-blur text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
        >
          &larr; Home
        </button>

        {/* Clouds */}
        {clouds.map((cloud) => (
          <div
            key={cloud.id}
            className="absolute rounded-full"
            style={{
              left: cloud.left,
              top: cloud.top,
              width: 120 * cloud.scale,
              height: 50 * cloud.scale,
              background: `rgba(255,255,255,${cloud.opacity})`,
              filter: 'blur(2px)',
            }}
          />
        ))}

        {/* Title */}
        <div className="flex-1 flex flex-col items-center justify-center z-10 px-4">
          <div className="mb-6">
            <svg width="80" height="60" viewBox="0 0 80 60">
              <ellipse cx="40" cy="30" rx="28" ry="20" fill="#fde68a" />
              <ellipse cx="52" cy="24" rx="8" ry="10" fill="#fbbf24" />
              <circle cx="54" cy="22" r="3" fill="white" />
              <circle cx="55" cy="21" r="1.5" fill="#1e293b" />
              <polygon points="62,27 72,24 62,30" fill="#fb923c" />
              <ellipse cx="24" cy="32" rx="14" ry="8" fill="#fcd34d" />
            </svg>
          </div>

          <h1
            className="text-5xl md:text-7xl font-black text-white mb-3 tracking-tight"
            style={{
              textShadow: '0 4px 12px rgba(0,0,0,0.25), 0 2px 4px rgba(0,0,0,0.15)',
            }}
          >
            Word Hunt
          </h1>
          <p className="text-xl text-white/90 mb-2 font-medium"
            style={{ textShadow: '0 2px 4px rgba(0,0,0,0.15)' }}
          >
            Type words to catch the ducks!
          </p>
          <p className="text-white/70 mb-8 text-sm">
            Ducks fly across the sky -- type their word before they escape!
          </p>

          <div
            className="bg-white/20 backdrop-blur-sm px-8 py-4 rounded-2xl border border-white/30 animate-pulse"
          >
            <span className="text-white text-lg font-bold" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>
              Tap or press any key to start
            </span>
          </div>

          {/* High score */}
          {progressData?.gameProgress?.duckhunt?.highScore > 0 && (
            <div className="mt-6 text-white/60 text-sm">
              High Score: {progressData.gameProgress.duckhunt.highScore} |
              Best Round: {progressData.gameProgress.duckhunt.bestRound || 1}
            </div>
          )}
        </div>

        {/* Ground */}
        <div
          className="w-full"
          style={{
            height: 80,
            background: 'linear-gradient(180deg, #22c55e 0%, #16a34a 40%, #15803d 100%)',
            borderTop: '3px solid #4ade80',
          }}
        >
          {/* Grass tufts */}
          <div className="relative w-full h-full overflow-hidden">
            {[10, 25, 40, 55, 70, 85].map((pos) => (
              <div
                key={pos}
                className="absolute bottom-0"
                style={{
                  left: `${pos}%`,
                  width: 0,
                  height: 0,
                  borderLeft: '4px solid transparent',
                  borderRight: '4px solid transparent',
                  borderBottom: `${12 + Math.random() * 8}px solid #4ade80`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // GAME OVER SCREEN
  // ============================================================================

  if (gameState === 'gameOver') {
    return (
      <div
        className="min-h-screen flex flex-col relative overflow-hidden select-none"
        style={{
          background: 'linear-gradient(180deg, #fda4af 0%, #fb7185 30%, #e11d48 70%, #9f1239 100%)',
        }}
      >
        <input
          ref={inputRef}
          className="mobile-input"
          inputMode="text"
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          onInput={handleMobileInput}
          onBlur={(e) => setTimeout(() => e.target?.focus(), 50)}
          autoFocus
        />

        <button
          onClick={() => onNavigate('#/')}
          className="absolute top-4 left-4 z-30 bg-white/20 hover:bg-white/40 backdrop-blur text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
        >
          &larr; Home
        </button>

        <div className="flex-1 flex flex-col items-center justify-center z-10 px-4">
          <h1
            className="text-5xl md:text-6xl font-black text-white mb-4"
            style={{ textShadow: '0 4px 12px rgba(0,0,0,0.3)' }}
          >
            Game Over!
          </h1>

          <div className="bg-white/20 backdrop-blur rounded-3xl p-8 max-w-sm w-full mb-6">
            <div className="grid grid-cols-2 gap-6 text-center">
              <div>
                <div className="text-4xl font-black text-white">{score}</div>
                <div className="text-white/70 text-sm font-medium">Score</div>
              </div>
              <div>
                <div className="text-4xl font-black text-white">{round}</div>
                <div className="text-white/70 text-sm font-medium">Rounds</div>
              </div>
              <div>
                <div className="text-4xl font-black text-white">{ducksHit}</div>
                <div className="text-white/70 text-sm font-medium">Ducks Hit</div>
              </div>
              <div>
                <div className="text-4xl font-black text-white">{accuracy}%</div>
                <div className="text-white/70 text-sm font-medium">Accuracy</div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 w-full max-w-xs">
            <div
              className="bg-white/25 backdrop-blur-sm px-8 py-4 rounded-2xl border border-white/30 text-center cursor-pointer hover:bg-white/35 transition-all"
              onClick={startGame}
            >
              <span className="text-white text-lg font-bold">
                Play Again
              </span>
            </div>

            <button
              onClick={() => onNavigate('#/')}
              className="bg-white/10 hover:bg-white/20 text-white/80 px-6 py-3 rounded-xl font-medium transition-all text-sm"
            >
              Back to Home
            </button>
          </div>
        </div>

        {/* Ground */}
        <div
          className="w-full"
          style={{
            height: 80,
            background: 'linear-gradient(180deg, #22c55e 0%, #16a34a 40%, #15803d 100%)',
            borderTop: '3px solid #4ade80',
          }}
        />
      </div>
    );
  }

  // ============================================================================
  // ROUND END SCREEN
  // ============================================================================

  if (gameState === 'roundEnd') {
    const failed = misses >= MAX_MISSES;

    return (
      <div
        className="min-h-screen flex flex-col relative overflow-hidden select-none"
        style={{
          background: failed
            ? 'linear-gradient(180deg, #fda4af 0%, #fb7185 40%, #f43f5e 100%)'
            : 'linear-gradient(180deg, #bbf7d0 0%, #4ade80 40%, #22c55e 100%)',
        }}
      >
        <input
          ref={inputRef}
          className="mobile-input"
          inputMode="text"
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          onInput={handleMobileInput}
          onBlur={(e) => setTimeout(() => e.target?.focus(), 50)}
          autoFocus
        />

        <button
          onClick={() => onNavigate('#/')}
          className="absolute top-4 left-4 z-30 bg-white/20 hover:bg-white/40 backdrop-blur text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
        >
          &larr; Home
        </button>

        <div className="flex-1 flex flex-col items-center justify-center z-10 px-4">
          <h1
            className="text-4xl md:text-5xl font-black text-white mb-2"
            style={{ textShadow: '0 4px 12px rgba(0,0,0,0.2)' }}
          >
            {failed ? 'Round Over!' : `Round ${round} Complete!`}
          </h1>

          <div className="bg-white/20 backdrop-blur rounded-2xl p-6 max-w-xs w-full mb-6 text-center">
            <div className="text-white/90 text-lg mb-4 font-medium">
              Ducks hit: {roundDucksHit} / {roundDucksTotal}
            </div>
            <div className="text-5xl font-black text-white mb-2">{score}</div>
            <div className="text-white/60 text-sm">Total Score</div>
          </div>

          <div
            className="bg-white/25 backdrop-blur-sm px-8 py-4 rounded-2xl border border-white/30 cursor-pointer hover:bg-white/35 transition-all animate-pulse"
            onClick={() => {
              if (failed && round > 1) {
                setGameState('gameOver');
              } else if (failed && round <= 1) {
                setGameState('gameOver');
              } else {
                playSound('levelUp');
                startRound(round + 1);
              }
            }}
          >
            <span className="text-white text-lg font-bold">
              {failed ? 'See Results' : 'Next Round'}
            </span>
          </div>
        </div>

        {/* Ground */}
        <div
          className="w-full"
          style={{
            height: 80,
            background: 'linear-gradient(180deg, #22c55e 0%, #16a34a 40%, #15803d 100%)',
            borderTop: '3px solid #4ade80',
          }}
        />
      </div>
    );
  }

  // ============================================================================
  // PLAYING SCREEN
  // ============================================================================

  return (
    <div
      className="min-h-screen flex flex-col relative overflow-hidden select-none"
      style={{
        background: 'linear-gradient(180deg, #7dd3fc 0%, #38bdf8 30%, #0ea5e9 60%, #0284c7 100%)',
      }}
    >
      <input
        ref={inputRef}
        className="mobile-input"
        inputMode="text"
        autoCapitalize="off"
        autoCorrect="off"
        autoComplete="off"
        onInput={handleMobileInput}
        onBlur={(e) => setTimeout(() => e.target?.focus(), 50)}
        autoFocus
      />

      {/* HUD - Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-start justify-between p-3">
        {/* Back button */}
        <button
          onClick={() => {
            handleEndSession();
            onNavigate('#/');
          }}
          className="bg-white/20 hover:bg-white/40 backdrop-blur text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
        >
          &larr; Home
        </button>

        {/* Round indicator */}
        <div className="bg-white/20 backdrop-blur rounded-xl px-4 py-2 text-center">
          <div className="text-white/70 text-xs font-medium">Round</div>
          <div className="text-white text-2xl font-black leading-none">{round}</div>
        </div>

        {/* Score */}
        <div className="bg-white/20 backdrop-blur rounded-xl px-4 py-2 text-right min-w-[100px]">
          <div className="text-white/70 text-xs font-medium">Score</div>
          <div className="text-white text-2xl font-black leading-none">{score}</div>
        </div>
      </div>

      {/* Lives indicator - top center-right */}
      <div className="absolute top-16 right-3 z-30 flex items-center gap-1 bg-white/10 backdrop-blur rounded-lg px-2 py-1">
        {renderLives()}
      </div>

      {/* Ducks remaining */}
      <div className="absolute top-16 left-3 z-30 bg-white/10 backdrop-blur rounded-lg px-3 py-1">
        <span className="text-white/70 text-xs">
          {ducksSpawned}/{DUCKS_PER_ROUND} ducks
        </span>
      </div>

      {/* Combo indicator */}
      {showCombo && comboCount > 1 && (
        <div
          className="absolute top-28 left-1/2 z-40 -translate-x-1/2 transition-all"
          style={{
            animation: 'comboPopIn 0.5s ease-out',
          }}
        >
          <div className="bg-yellow-400/90 backdrop-blur text-yellow-900 px-4 py-2 rounded-xl font-black text-lg shadow-lg">
            {comboCount}x Combo!
          </div>
        </div>
      )}

      {/* Clouds */}
      {clouds.map((cloud) => (
        <div
          key={cloud.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: cloud.left,
            top: cloud.top,
            width: 120 * cloud.scale,
            height: 50 * cloud.scale,
            background: `rgba(255,255,255,${cloud.opacity})`,
            filter: 'blur(2px)',
            zIndex: 1,
          }}
        />
      ))}

      {/* Game area */}
      <div
        ref={gameAreaRef}
        className="flex-1 relative"
        style={{ minHeight: 300 }}
      >
        {/* Render ducks */}
        {ducks
          .filter((d) => d.state === 'flying' || d.state === 'hit')
          .map(renderDuck)}

        {/* Hit point effects */}
        {hitEffects.map((effect) => {
          const elapsed = Date.now() - effect.time;
          return (
            <div
              key={`effect-${effect.id}`}
              className="absolute pointer-events-none z-30 font-black text-yellow-300"
              style={{
                left: effect.x + 20,
                top: effect.y - 10 - elapsed * 0.06,
                opacity: Math.max(0, 1 - elapsed / 1000),
                fontSize: 20,
                textShadow: '0 2px 8px rgba(0,0,0,0.4), 0 0 4px rgba(250,204,21,0.5)',
              }}
            >
              +{effect.points}
            </div>
          );
        })}
      </div>

      {/* Ground */}
      <div
        className="w-full relative z-10"
        style={{
          height: 80,
          background: 'linear-gradient(180deg, #22c55e 0%, #16a34a 40%, #15803d 100%)',
          borderTop: '3px solid #4ade80',
        }}
      >
        {/* Grass tufts */}
        <div className="relative w-full h-full overflow-hidden">
          {[5, 12, 20, 28, 35, 43, 50, 58, 65, 73, 80, 88, 95].map((pos, i) => (
            <div
              key={pos}
              className="absolute"
              style={{
                left: `${pos}%`,
                bottom: 60,
                width: 0,
                height: 0,
                borderLeft: '3px solid transparent',
                borderRight: '3px solid transparent',
                borderBottom: `${10 + (i % 3) * 4}px solid #4ade80`,
              }}
            />
          ))}
        </div>

        {/* Input display area */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20">
          <div
            className="px-6 py-2 rounded-xl font-mono text-lg font-bold tracking-widest min-w-[160px] text-center transition-all duration-100"
            style={{
              background:
                inputFlash === 'red'
                  ? 'rgba(239, 68, 68, 0.7)'
                  : inputFlash === 'green'
                    ? 'rgba(34, 197, 94, 0.5)'
                    : 'rgba(255, 255, 255, 0.25)',
              color: inputFlash === 'red' ? '#fff' : 'rgba(255,255,255,0.9)',
              backdropFilter: 'blur(4px)',
              border: `2px solid ${
                inputFlash === 'red'
                  ? 'rgba(239,68,68,0.6)'
                  : targetDuck
                    ? 'rgba(250,204,21,0.6)'
                    : 'rgba(255,255,255,0.2)'
              }`,
              boxShadow: targetDuck
                ? '0 0 12px rgba(250,204,21,0.3)'
                : 'none',
            }}
          >
            {typedBuffer || (
              <span style={{ opacity: 0.4 }}>type here...</span>
            )}
          </div>
        </div>
      </div>

      {/* Inline keyframe animation for combo popup */}
      <style>{`
        @keyframes comboPopIn {
          0% { transform: translateX(-50%) scale(0.5); opacity: 0; }
          60% { transform: translateX(-50%) scale(1.15); opacity: 1; }
          100% { transform: translateX(-50%) scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
