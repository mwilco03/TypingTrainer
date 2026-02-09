import React, { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// CONFIGURATION
// ============================================================================

const LANE_COUNT = 4;
const HIT_ZONE_Y = 85; // % from top where the hit zone sits
const HIT_ZONE_TOLERANCE = 8; // % above/below for "great" hits
const GOOD_TOLERANCE = 14;
const OK_TOLERANCE = 20;

const FALL_DURATION_BASE = 3200; // ms for a note to fall from top to hit zone
const FALL_DURATION_MIN = 1800;

const SPAWN_INTERVAL_BASE = 1200; // ms between spawns
const SPAWN_INTERVAL_MIN = 500;

const NOTES_PER_LEVEL = 20;
const MAX_LIVES = 5;

// Note types: single letter, bigram, short word
const NOTE_POOLS = {
  letters: 'asdfghjkl;qwertyuiopzxcvbnm'.split(''),
  bigrams: [
    'th', 'he', 'in', 'er', 'an', 'on', 'at', 'en', 'nd', 'ti',
    'es', 'or', 'te', 'of', 'ed', 'is', 'it', 'al', 'ar', 'st',
    'to', 'nt', 'ng', 'se', 'ha', 'as', 'ou', 're', 'io', 'le',
  ],
  words: [
    'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had',
    'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his',
    'how', 'its', 'let', 'may', 'new', 'now', 'old', 'see', 'two', 'way',
    'who', 'did', 'got', 'run', 'say', 'she', 'too', 'use', 'big', 'red',
    'fun', 'cat', 'dog', 'hat', 'sun', 'cup', 'sit', 'hop',
  ],
};

// Lane colors (neon DDR style)
const LANE_COLORS = [
  { bg: '#ef4444', glow: 'rgba(239,68,68,0.5)', text: '#fef2f2' },
  { bg: '#3b82f6', glow: 'rgba(59,130,246,0.5)', text: '#eff6ff' },
  { bg: '#22c55e', glow: 'rgba(34,197,94,0.5)', text: '#f0fdf4' },
  { bg: '#eab308', glow: 'rgba(234,179,8,0.5)', text: '#fefce8' },
];

// Judgment thresholds
const JUDGMENTS = {
  perfect: { label: 'PERFECT', color: '#facc15', points: 100, glow: 'rgba(250,204,21,0.7)' },
  great: { label: 'GREAT', color: '#22c55e', points: 75, glow: 'rgba(34,197,94,0.5)' },
  good: { label: 'GOOD', color: '#3b82f6', points: 50, glow: 'rgba(59,130,246,0.4)' },
  ok: { label: 'OK', color: '#a78bfa', points: 25, glow: 'rgba(167,139,250,0.4)' },
  miss: { label: 'MISS', color: '#ef4444', points: 0, glow: 'rgba(239,68,68,0.5)' },
};

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
      perfect: { freq: 880, type: 'sine', dur: 0.08, vol: 0.1 },
      great:   { freq: 660, type: 'sine', dur: 0.06, vol: 0.08 },
      good:    { freq: 520, type: 'sine', dur: 0.05, vol: 0.07 },
      ok:      { freq: 400, type: 'sine', dur: 0.04, vol: 0.06 },
      miss:    { freq: 180, type: 'sawtooth', dur: 0.15, vol: 0.06 },
      levelUp: { freq: 1040, type: 'sine', dur: 0.25, vol: 0.12 },
      beat:    { freq: 120, type: 'sine', dur: 0.02, vol: 0.02 },
    };
    const c = configs[type] || configs.good;
    osc.frequency.value = c.freq;
    osc.type = c.type || 'sine';
    gain.gain.value = c.vol;
    osc.start();
    osc.stop(ctx.currentTime + c.dur);
  } catch (e) {}
};

// ============================================================================
// HELPERS
// ============================================================================

let nextNoteId = 1;

function getLevelConfig(level) {
  const speedFactor = Math.min(1, (level - 1) * 0.08);
  const fallDuration = FALL_DURATION_BASE - speedFactor * (FALL_DURATION_BASE - FALL_DURATION_MIN);
  const spawnInterval = SPAWN_INTERVAL_BASE - speedFactor * (SPAWN_INTERVAL_BASE - SPAWN_INTERVAL_MIN);

  // What kind of notes appear
  let pool;
  if (level <= 2) pool = 'letters';
  else if (level <= 5) pool = 'bigrams';
  else pool = 'words';

  return { fallDuration, spawnInterval, pool };
}

function createNote(level, laneIndex, notesAlreadySpawned) {
  const config = getLevelConfig(level);
  // Warmup: first 4 notes of bigram/word levels use the previous tier
  let poolName = config.pool;
  if (notesAlreadySpawned < 4 && level > 2) {
    if (poolName === 'bigrams') poolName = 'letters';
    else if (poolName === 'words') poolName = 'bigrams';
  }
  const pool = NOTE_POOLS[poolName];
  const text = pool[Math.floor(Math.random() * pool.length)];

  return {
    id: nextNoteId++,
    text,
    lane: laneIndex,
    spawnTime: Date.now(),
    fallDuration: config.fallDuration + (Math.random() - 0.5) * 300,
    state: 'falling', // falling | hit | missed
    judgment: null,
  };
}

function getNoteY(note, now) {
  const elapsed = now - note.spawnTime;
  const progress = elapsed / note.fallDuration;
  return progress * (HIT_ZONE_Y + 15); // falls past hit zone
}

function getJudgment(noteY) {
  const distance = Math.abs(noteY - HIT_ZONE_Y);
  if (distance <= HIT_ZONE_TOLERANCE * 0.4) return 'perfect';
  if (distance <= HIT_ZONE_TOLERANCE) return 'great';
  if (distance <= GOOD_TOLERANCE) return 'good';
  if (distance <= OK_TOLERANCE) return 'ok';
  return 'miss';
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function TypeDance({ progressData, onRecordKeystroke, onEndSession, onUpdateGameProgress, onNavigate }) {
  const [screen, setScreen] = useState('ready'); // ready | playing | levelEnd | gameOver
  const [level, setLevel] = useState(1);
  const [notes, setNotes] = useState([]);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(MAX_LIVES);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [notesSpawned, setNotesSpawned] = useState(0);
  const [notesHit, setNotesHit] = useState(0);
  const [totalNotesHit, setTotalNotesHit] = useState(0);
  const [judgmentCounts, setJudgmentCounts] = useState({ perfect: 0, great: 0, good: 0, ok: 0, miss: 0 });
  const [lastJudgment, setLastJudgment] = useState(null);
  const [lastJudgmentTime, setLastJudgmentTime] = useState(0);
  const [typedBuffer, setTypedBuffer] = useState('');
  const [activeLane, setActiveLane] = useState(null);
  const [sessionStart, setSessionStart] = useState(null);
  const [totalKeys, setTotalKeys] = useState(0);
  const [correctKeys, setCorrectKeys] = useState(0);
  const [allKeysUsed, setAllKeysUsed] = useState(new Set());
  const [lastKeyTime, setLastKeyTime] = useState(null);
  const [laneFlash, setLaneFlash] = useState({}); // { laneIndex: 'judgment' }
  const [beatPulse, setBeatPulse] = useState(false);

  const inputRef = useRef(null);
  const animFrameRef = useRef(null);
  const lastSpawnRef = useRef(0);
  const notesRef = useRef(notes);
  const notesSpawnedRef = useRef(notesSpawned);
  const livesRef = useRef(lives);
  const screenRef = useRef(screen);
  const levelRef = useRef(level);

  notesRef.current = notes;
  notesSpawnedRef.current = notesSpawned;
  livesRef.current = lives;
  screenRef.current = screen;
  levelRef.current = level;

  // ============================================================================
  // FOCUS
  // ============================================================================

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, [screen]);

  // ============================================================================
  // BEAT PULSE (visual metronome)
  // ============================================================================

  useEffect(() => {
    if (screen !== 'playing') return;
    const config = getLevelConfig(level);
    const interval = setInterval(() => {
      setBeatPulse(true);
      setTimeout(() => setBeatPulse(false), 100);
    }, config.spawnInterval);
    return () => clearInterval(interval);
  }, [screen, level]);

  // ============================================================================
  // START / RESET
  // ============================================================================

  const startLevel = useCallback((lvl) => {
    setLevel(lvl);
    setNotes([]);
    setNotesSpawned(0);
    setNotesHit(0);
    setTypedBuffer('');
    setActiveLane(null);
    setLaneFlash({});
    lastSpawnRef.current = 0;
    notesSpawnedRef.current = 0;
    setScreen('playing');
    if (!sessionStart) setSessionStart(Date.now());
  }, [sessionStart]);

  const startGame = useCallback(() => {
    setScore(0);
    setLives(MAX_LIVES);
    livesRef.current = MAX_LIVES;
    setCombo(0);
    setMaxCombo(0);
    setTotalNotesHit(0);
    setJudgmentCounts({ perfect: 0, great: 0, good: 0, ok: 0, miss: 0 });
    setTotalKeys(0);
    setCorrectKeys(0);
    setAllKeysUsed(new Set());
    setSessionStart(Date.now());
    nextNoteId = 1;
    startLevel(1);
  }, [startLevel]);

  // ============================================================================
  // ANIMATION LOOP
  // ============================================================================

  useEffect(() => {
    if (screen !== 'playing') {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      return;
    }

    const tick = () => {
      if (screenRef.current !== 'playing') return;
      const now = Date.now();
      const config = getLevelConfig(levelRef.current);

      // Update notes
      setNotes(prev => {
        let updated = prev.map(note => {
          if (note.state !== 'falling') return note;
          const y = getNoteY(note, now);
          // Missed — fell past the zone
          if (y > HIT_ZONE_Y + OK_TOLERANCE + 5) {
            return { ...note, state: 'missed' };
          }
          return note;
        });

        // Handle newly missed notes
        const newlyMissed = updated.filter(n => n.state === 'missed' && !n.judgment);
        if (newlyMissed.length > 0) {
          newlyMissed.forEach(n => {
            n.judgment = 'miss';
            playSound('miss');
          });
          setLives(prev => {
            const newLives = Math.max(0, prev - newlyMissed.length);
            livesRef.current = newLives;
            return newLives;
          });
          setCombo(0);
          setJudgmentCounts(prev => ({ ...prev, miss: prev.miss + newlyMissed.length }));
          setLastJudgment('miss');
          setLastJudgmentTime(now);

          // Record miss keystrokes
          newlyMissed.forEach(n => {
            n.text.split('').forEach(ch => {
              onRecordKeystroke(ch, false, 150, null);
            });
          });
        }

        // Remove old missed/hit notes (after animation)
        updated = updated.filter(n => {
          if (n.state === 'missed' || n.state === 'hit') {
            return now - (n.hitTime || n.spawnTime + n.fallDuration) < 600;
          }
          return true;
        });

        return updated;
      });

      // Check game over
      if (livesRef.current <= 0) {
        setScreen('gameOver');
        return;
      }

      // Spawn new notes
      if (notesSpawnedRef.current < NOTES_PER_LEVEL && now - lastSpawnRef.current > config.spawnInterval) {
        // Pick a random lane, avoid same lane twice in a row
        const lane = Math.floor(Math.random() * LANE_COUNT);
        const newNote = createNote(levelRef.current, lane, notesSpawnedRef.current);
        setNotes(prev => [...prev, newNote]);
        setNotesSpawned(prev => {
          const val = prev + 1;
          notesSpawnedRef.current = val;
          return val;
        });
        lastSpawnRef.current = now;
      }

      // Check if level complete
      if (notesSpawnedRef.current >= NOTES_PER_LEVEL) {
        const remaining = notesRef.current.filter(n => n.state === 'falling').length;
        if (remaining === 0) {
          setScreen('levelEnd');
          playSound('levelUp');
          return;
        }
      }

      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [screen, onRecordKeystroke]);

  // ============================================================================
  // INPUT HANDLING
  // ============================================================================

  const attemptHit = useCallback((fullText) => {
    const now = Date.now();
    // Find the closest falling note that matches the typed text
    const fallingNotes = notesRef.current
      .filter(n => n.state === 'falling' && n.text === fullText)
      .map(n => ({ ...n, y: getNoteY(n, now) }))
      .filter(n => n.y >= 0 && n.y <= HIT_ZONE_Y + OK_TOLERANCE + 2)
      .sort((a, b) => Math.abs(a.y - HIT_ZONE_Y) - Math.abs(b.y - HIT_ZONE_Y));

    if (fallingNotes.length === 0) return false;

    const target = fallingNotes[0];
    const judgment = getJudgment(target.y);

    if (judgment === 'miss') return false; // too far from hit zone

    const jData = JUDGMENTS[judgment];
    playSound(judgment);

    // Mark note as hit
    setNotes(prev => prev.map(n =>
      n.id === target.id
        ? { ...n, state: 'hit', judgment, hitTime: now }
        : n
    ));

    // Update score with combo multiplier
    const comboMultiplier = 1 + Math.floor(combo / 10) * 0.25;
    const points = Math.round(jData.points * comboMultiplier);
    setScore(prev => prev + points);
    setCombo(prev => {
      const newCombo = prev + 1;
      setMaxCombo(mc => Math.max(mc, newCombo));
      return newCombo;
    });
    setNotesHit(prev => prev + 1);
    setTotalNotesHit(prev => prev + 1);
    setJudgmentCounts(prev => ({ ...prev, [judgment]: prev[judgment] + 1 }));
    setLastJudgment(judgment);
    setLastJudgmentTime(now);

    // Flash the lane
    setLaneFlash(prev => ({ ...prev, [target.lane]: judgment }));
    setTimeout(() => {
      setLaneFlash(prev => {
        const copy = { ...prev };
        delete copy[target.lane];
        return copy;
      });
    }, 200);

    // Record correct keystrokes
    fullText.split('').forEach((ch, i) => {
      const ikiMs = i === 0 ? (lastKeyTime ? Math.min(2000, now - lastKeyTime) : 150) : 80;
      onRecordKeystroke(ch, true, ikiMs, i > 0 ? fullText[i - 1] : null);
      setAllKeysUsed(prev => new Set([...prev, ch]));
    });
    setCorrectKeys(prev => prev + fullText.length);

    return true;
  }, [combo, lastKeyTime, onRecordKeystroke]);

  const handleKeyDown = useCallback((e) => {
    if (screenRef.current === 'ready') {
      if (e.key.length === 1 || e.key === 'Enter') {
        e.preventDefault();
        startGame();
      }
      return;
    }

    if (screenRef.current === 'levelEnd') {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        startLevel(levelRef.current + 1);
      }
      return;
    }

    if (screenRef.current === 'gameOver') {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        startGame();
      }
      return;
    }

    if (screenRef.current !== 'playing') return;
    if (e.key === 'Escape') {
      e.preventDefault();
      handleQuit();
      return;
    }
    if (e.key.length !== 1) return;
    e.preventDefault();

    const ch = e.key.toLowerCase();
    setTotalKeys(prev => prev + 1);
    setLastKeyTime(Date.now());

    const config = getLevelConfig(levelRef.current);

    if (config.pool === 'letters') {
      // Single-character mode: try to hit immediately
      const hit = attemptHit(ch);
      if (!hit) {
        playSound('miss');
        setCombo(0);
        onRecordKeystroke(ch, false, 150, null);
      }
      setTypedBuffer('');
      setActiveLane(null);
    } else {
      // Multi-char mode: build buffer
      const newBuffer = typedBuffer + ch;
      setTypedBuffer(newBuffer);

      // Check if buffer matches any falling note exactly
      const hit = attemptHit(newBuffer);
      if (hit) {
        setTypedBuffer('');
        setActiveLane(null);
      } else {
        // Check if buffer is a prefix of any falling note
        const isPrefix = notesRef.current.some(
          n => n.state === 'falling' && n.text.startsWith(newBuffer)
        );
        if (!isPrefix) {
          // No match possible, reset
          playSound('miss');
          setCombo(0);
          setTypedBuffer('');
          setActiveLane(null);
          onRecordKeystroke(ch, false, 150, null);
        } else {
          // Find which lane we're targeting
          const target = notesRef.current.find(
            n => n.state === 'falling' && n.text.startsWith(newBuffer)
          );
          if (target) setActiveLane(target.lane);
        }
      }
    }
  }, [typedBuffer, attemptHit, startGame, startLevel, onRecordKeystroke]);

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

  const handleQuit = useCallback(() => {
    const durationMs = sessionStart ? Date.now() - sessionStart : 0;
    const accuracy = totalKeys > 0 ? Math.round((correctKeys / totalKeys) * 100) : 0;
    const wpm = durationMs >= 5000 ? Math.round((correctKeys / 5) / (durationMs / 60000)) : 0;

    onUpdateGameProgress('typedance', prev => ({
      ...prev,
      highScore: Math.max(prev.highScore || 0, score),
      bestLevel: Math.max(prev.bestLevel || 0, level),
      bestCombo: Math.max(prev.bestCombo || 0, maxCombo),
      totalSessions: (prev.totalSessions || 0) + 1,
    }));

    onEndSession({
      game: 'typedance',
      durationMs,
      wpm,
      accuracy,
      exerciseCount: totalNotesHit,
      keysUsed: [...allKeysUsed],
    });

    onNavigate('#/');
  }, [sessionStart, totalKeys, correctKeys, score, level, maxCombo, totalNotesHit, allKeysUsed, onUpdateGameProgress, onEndSession, onNavigate]);

  // Auto-report on game over
  useEffect(() => {
    if (screen === 'gameOver') {
      const durationMs = sessionStart ? Date.now() - sessionStart : 0;
      const accuracy = totalKeys > 0 ? Math.round((correctKeys / totalKeys) * 100) : 0;
      const wpm = durationMs >= 5000 ? Math.round((correctKeys / 5) / (durationMs / 60000)) : 0;

      onUpdateGameProgress('typedance', prev => ({
        ...prev,
        highScore: Math.max(prev.highScore || 0, score),
        bestLevel: Math.max(prev.bestLevel || 0, level),
        bestCombo: Math.max(prev.bestCombo || 0, maxCombo),
        totalSessions: (prev.totalSessions || 0) + 1,
      }));

      onEndSession({
        game: 'typedance',
        durationMs,
        wpm,
        accuracy,
        exerciseCount: totalNotesHit,
        keysUsed: [...allKeysUsed],
      });
    }
  }, [screen]);

  // ============================================================================
  // RENDER: READY SCREEN
  // ============================================================================

  if (screen === 'ready') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center select-none cursor-pointer"
        onClick={startGame}
        style={{ background: 'linear-gradient(180deg, #0f0f23 0%, #1a1a3e 50%, #2d1b69 100%)' }}>
        <input ref={inputRef} className="mobile-input"
          inputMode="text" autoCapitalize="off" autoCorrect="off" autoComplete="off"
          onInput={handleMobileInput} onBlur={e => setTimeout(() => e.target?.focus(), 50)} autoFocus />

        <button onClick={(e) => { e.stopPropagation(); onNavigate('#/'); }}
          className="absolute top-4 left-4 z-30 bg-white/10 hover:bg-white/20 text-white/70 px-3 py-1.5 rounded-lg text-sm font-medium transition-all">
          &larr; Home
        </button>

        {/* Animated lane preview */}
        <div className="flex gap-3 mb-8 opacity-60">
          {LANE_COLORS.map((c, i) => (
            <div key={i} className="w-14 h-24 rounded-xl border-2 border-white/20"
              style={{ background: `linear-gradient(180deg, ${c.bg}22, ${c.bg}44)` }}>
              <div className="w-8 h-8 mx-auto mt-2 rounded-lg opacity-60"
                style={{ background: c.bg, boxShadow: `0 0 12px ${c.glow}` }} />
            </div>
          ))}
        </div>

        <h1 className="text-5xl md:text-7xl font-black text-white mb-3"
          style={{ textShadow: '0 0 40px rgba(139,92,246,0.5), 0 4px 12px rgba(0,0,0,0.5)' }}>
          Type Dance
        </h1>
        <p className="text-lg text-purple-300 mb-2 font-medium">
          Hit the notes as they reach the zone!
        </p>
        <p className="text-purple-400/60 mb-8 text-sm max-w-xs text-center">
          Type the letter or word on each note when it reaches the glowing bar at the bottom
        </p>

        <div className="bg-purple-500/20 backdrop-blur px-8 py-4 rounded-2xl border border-purple-400/30 animate-pulse">
          <span className="text-purple-200 text-lg font-bold">Tap or press any key to start</span>
        </div>

        {progressData?.gameProgress?.typedance?.highScore > 0 && (
          <div className="mt-6 text-purple-400/60 text-sm">
            High Score: {progressData.gameProgress.typedance.highScore} |
            Best Level: {progressData.gameProgress.typedance.bestLevel || 1}
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
    const totalJudged = judgmentCounts.perfect + judgmentCounts.great + judgmentCounts.good + judgmentCounts.ok + judgmentCounts.miss;

    return (
      <div className="min-h-screen flex flex-col items-center justify-center select-none"
        style={{ background: 'linear-gradient(180deg, #1a0a2e 0%, #2d1045 50%, #1a0525 100%)' }}>
        <input ref={inputRef} className="mobile-input"
          inputMode="text" autoCapitalize="off" autoCorrect="off" autoComplete="off"
          onInput={handleMobileInput} onBlur={e => setTimeout(() => e.target?.focus(), 50)} autoFocus />

        <h1 className="text-5xl font-black text-white mb-6"
          style={{ textShadow: '0 0 30px rgba(239,68,68,0.5)' }}>
          Game Over
        </h1>

        <div className="bg-white/10 backdrop-blur rounded-3xl p-8 max-w-sm w-full mb-6">
          <div className="text-center mb-6">
            <div className="text-5xl font-black text-white">{score}</div>
            <div className="text-purple-300/70 text-sm">Final Score</div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6 text-center">
            <div>
              <div className="text-2xl font-bold text-white">{level}</div>
              <div className="text-purple-300/50 text-xs">Level</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{maxCombo}</div>
              <div className="text-purple-300/50 text-xs">Max Combo</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-white">{accuracy}%</div>
              <div className="text-purple-300/50 text-xs">Accuracy</div>
            </div>
          </div>

          {/* Judgment breakdown */}
          {totalJudged > 0 && (
            <div className="space-y-1">
              {['perfect', 'great', 'good', 'ok', 'miss'].map(j => (
                <div key={j} className="flex items-center justify-between text-sm">
                  <span className="font-bold" style={{ color: JUDGMENTS[j].color }}>{JUDGMENTS[j].label}</span>
                  <span className="text-white/60">{judgmentCounts[j]}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button onClick={startGame}
            className="bg-purple-500/30 hover:bg-purple-500/50 text-white px-8 py-4 rounded-2xl font-bold text-lg border border-purple-400/30 transition-all">
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
    const pct = notesHit > 0 ? Math.round((notesHit / NOTES_PER_LEVEL) * 100) : 0;
    return (
      <div className="min-h-screen flex flex-col items-center justify-center select-none"
        style={{ background: 'linear-gradient(180deg, #0f0f23 0%, #1b2838 50%, #0d1f2d 100%)' }}>
        <input ref={inputRef} className="mobile-input"
          inputMode="text" autoCapitalize="off" autoCorrect="off" autoComplete="off"
          onInput={handleMobileInput} onBlur={e => setTimeout(() => e.target?.focus(), 50)} autoFocus />

        <h1 className="text-4xl font-black text-white mb-2"
          style={{ textShadow: '0 0 30px rgba(34,197,94,0.5)' }}>
          Level {level} Complete!
        </h1>
        <p className="text-green-300/70 mb-6">
          {pct}% hit rate &middot; {notesHit}/{NOTES_PER_LEVEL} notes
        </p>

        <div className="bg-white/10 backdrop-blur rounded-2xl p-6 max-w-xs w-full mb-6 text-center">
          <div className="text-4xl font-black text-white mb-1">{score}</div>
          <div className="text-purple-300/50 text-sm">Score</div>
          <div className="mt-3 text-white/60 text-sm">
            Combo: {maxCombo} &middot; Lives: {lives}/{MAX_LIVES}
          </div>
        </div>

        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button onClick={() => startLevel(level + 1)}
            className="bg-green-500/30 hover:bg-green-500/50 text-white px-8 py-4 rounded-2xl font-bold text-lg border border-green-400/30 transition-all animate-pulse">
            Next Level
          </button>
          <button onClick={handleQuit}
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

  const now = Date.now();
  const config = getLevelConfig(level);

  return (
    <div className="min-h-screen flex flex-col select-none overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #0f0f23 0%, #1a1a3e 100%)' }}>
      <input ref={inputRef} className="mobile-input"
        inputMode="text" autoCapitalize="off" autoCorrect="off" autoComplete="off"
        onInput={handleMobileInput} onBlur={e => setTimeout(() => e.target?.focus(), 50)} autoFocus />

      {/* HUD */}
      <div className="flex items-center justify-between px-4 py-2 z-30 relative">
        <button onClick={handleQuit}
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

        {/* Lives */}
        <div className="flex gap-1">
          {Array.from({ length: MAX_LIVES }).map((_, i) => (
            <div key={i} className="w-3 h-3 rounded-full transition-all"
              style={{
                background: i < lives ? '#ef4444' : 'rgba(255,255,255,0.1)',
                boxShadow: i < lives ? '0 0 6px rgba(239,68,68,0.5)' : 'none',
              }} />
          ))}
        </div>
      </div>

      {/* Combo display */}
      {combo > 1 && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-40 text-center">
          <div className="text-yellow-400 font-black text-2xl"
            style={{ textShadow: '0 0 20px rgba(250,204,21,0.5)' }}>
            {combo}x
          </div>
          <div className="text-yellow-400/50 text-xs font-medium">COMBO</div>
        </div>
      )}

      {/* Progress bar */}
      <div className="px-4 mb-1 z-20 relative">
        <div className="h-1 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300 rounded-full"
            style={{ width: `${(notesSpawned / NOTES_PER_LEVEL) * 100}%` }} />
        </div>
      </div>

      {/* Judgment display */}
      {lastJudgment && now - lastJudgmentTime < 500 && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
          <div className="font-black text-3xl tracking-wider"
            style={{
              color: JUDGMENTS[lastJudgment].color,
              textShadow: `0 0 20px ${JUDGMENTS[lastJudgment].glow}`,
              opacity: Math.max(0, 1 - (now - lastJudgmentTime) / 500),
              transform: `translateY(${-(now - lastJudgmentTime) * 0.03}px) scale(${1 + (now - lastJudgmentTime) * 0.0005})`,
            }}>
            {JUDGMENTS[lastJudgment].label}
          </div>
        </div>
      )}

      {/* Lane area */}
      <div className="flex-1 relative flex justify-center items-stretch px-4 py-2">
        <div className="flex gap-2 w-full max-w-md relative" style={{ minHeight: 400 }}>
          {/* Lanes */}
          {LANE_COLORS.map((color, i) => {
            const flash = laneFlash[i];
            const flashColor = flash ? JUDGMENTS[flash]?.glow : null;
            return (
              <div key={i} className="flex-1 relative rounded-xl overflow-hidden"
                style={{
                  background: flash
                    ? `linear-gradient(180deg, ${color.bg}15, ${flashColor || color.bg + '33'}, ${color.bg}15)`
                    : `linear-gradient(180deg, ${color.bg}08, ${color.bg}15, ${color.bg}08)`,
                  borderLeft: `1px solid ${color.bg}22`,
                  borderRight: `1px solid ${color.bg}22`,
                  transition: 'background 0.15s',
                }}>
                {/* Hit zone indicator */}
                <div className="absolute left-0 right-0"
                  style={{
                    top: `${HIT_ZONE_Y - 2}%`,
                    height: '4%',
                    background: `linear-gradient(180deg, transparent, ${color.bg}${beatPulse ? '88' : '44'}, transparent)`,
                    boxShadow: beatPulse ? `0 0 20px ${color.glow}` : `0 0 8px ${color.glow}`,
                    transition: 'box-shadow 0.1s, background 0.1s',
                  }} />

                {/* Hit zone receptor */}
                <div className="absolute left-1/2 -translate-x-1/2"
                  style={{
                    top: `${HIT_ZONE_Y - 3}%`,
                    width: '70%',
                    height: '6%',
                    border: `2px solid ${color.bg}66`,
                    borderRadius: 8,
                    background: `${color.bg}11`,
                  }} />
              </div>
            );
          })}

          {/* Notes (rendered on top of lanes) */}
          {notes.filter(n => n.state === 'falling' || (n.state === 'hit' && n.hitTime && now - n.hitTime < 400)).map(note => {
            const y = note.state === 'hit' ? getNoteY(note, note.hitTime) : getNoteY(note, now);
            const color = LANE_COLORS[note.lane];
            const isHit = note.state === 'hit';
            const hitElapsed = isHit ? now - note.hitTime : 0;
            const isActive = activeLane === note.lane && note.state === 'falling';
            const typedLen = isActive ? typedBuffer.length : 0;

            return (
              <div key={note.id} className="absolute pointer-events-none"
                style={{
                  left: `${(note.lane / LANE_COUNT) * 100 + (100 / LANE_COUNT) * 0.5}%`,
                  top: `${y}%`,
                  transform: `translateX(-50%) ${isHit ? `scale(${1 + hitElapsed * 0.003})` : ''}`,
                  opacity: isHit ? Math.max(0, 1 - hitElapsed / 400) : 1,
                  zIndex: 20,
                  transition: isHit ? 'opacity 0.3s' : 'none',
                }}>
                <div className="px-3 py-2 rounded-xl font-black text-center whitespace-nowrap"
                  style={{
                    background: isHit
                      ? JUDGMENTS[note.judgment]?.color || color.bg
                      : `linear-gradient(180deg, ${color.bg}, ${color.bg}cc)`,
                    color: color.text,
                    fontSize: note.text.length > 2 ? '0.8rem' : '1rem',
                    minWidth: 36,
                    boxShadow: isHit
                      ? `0 0 30px ${JUDGMENTS[note.judgment]?.glow || color.glow}`
                      : `0 0 12px ${color.glow}, 0 2px 8px rgba(0,0,0,0.3)`,
                    border: isActive ? '2px solid rgba(255,255,255,0.8)' : '1px solid rgba(255,255,255,0.2)',
                  }}>
                  {note.text.split('').map((ch, ci) => (
                    <span key={ci} style={{
                      opacity: isActive && ci < typedLen ? 0.4 : 1,
                      textDecoration: isActive && ci < typedLen ? 'line-through' : 'none',
                    }}>{ch}</span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom: typed buffer for multi-char modes */}
      {config.pool !== 'letters' && (
        <div className="text-center pb-4 z-20 relative">
          <div className="inline-block px-6 py-2 rounded-xl font-mono text-lg font-bold tracking-widest"
            style={{
              background: typedBuffer ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.1)',
              color: typedBuffer ? '#e9d5ff' : 'rgba(255,255,255,0.3)',
              border: typedBuffer ? '1px solid rgba(139,92,246,0.4)' : '1px solid rgba(255,255,255,0.1)',
              minWidth: 120,
            }}>
            {typedBuffer || 'type...'}
          </div>
        </div>
      )}

      {/* Inline keyframes */}
      <style>{`
        @keyframes noteGlow {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.3); }
        }
      `}</style>
    </div>
  );
}
