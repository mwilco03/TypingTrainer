import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// ============================================================================
// KITCHEN ITEM DATA - Three difficulty tiers
// Within each tier, items are ordered by kitchen zone:
//   indices 0-2  = upper shelf
//   indices 3-6  = counter / appliance area
//   indices 7-9  = lower area
// ============================================================================

const KITCHEN_TIERS = {
  1: [
    // -- Upper Shelf --
    { name: 'bowl', emoji: '\uD83E\uDD63', clue: 'I spy a round dish you eat cereal from' },
    { name: 'cup', emoji: '\u2615', clue: 'I spy something small you drink juice from' },
    { name: 'mug', emoji: '\uD83C\uDF75', clue: 'I spy something you hold hot cocoa in' },
    // -- Counter --
    { name: 'fork', emoji: '\uD83C\uDF74', clue: 'I spy something with pointy prongs for picking up food' },
    { name: 'dish', emoji: '\uD83C\uDF7D\uFE0F', clue: 'I spy something you serve dinner on' },
    { name: 'lid', emoji: '\uD83E\uDED5', clue: 'I spy something that covers a pot to keep the heat in' },
    { name: 'pot', emoji: '\uD83C\uDF72', clue: 'I spy something deep you boil water in' },
    // -- Lower Area --
    { name: 'pan', emoji: '\uD83C\uDF73', clue: 'I spy something flat you cook eggs in' },
    { name: 'sink', emoji: '\uD83D\uDEB0', clue: 'I spy where you wash your hands in the kitchen' },
    { name: 'oven', emoji: '\u2668\uFE0F', clue: 'I spy where you bake cookies and cakes' },
  ],
  2: [
    // -- Upper Shelf --
    { name: 'glass', emoji: '\uD83E\uDD5B', clue: 'I spy something see-through you pour milk into' },
    { name: 'plate', emoji: '\uD83C\uDF7D\uFE0F', clue: 'I spy a flat circle you put your food on' },
    { name: 'mixer', emoji: '\uD83C\uDF9B\uFE0F', clue: 'I spy a machine that stirs batter really fast' },
    // -- Counter --
    { name: 'spoon', emoji: '\uD83E\uDD44', clue: 'I spy something you stir soup with' },
    { name: 'knife', emoji: '\uD83D\uDD2A', clue: 'I spy something sharp that cuts food' },
    { name: 'whisk', emoji: '\uD83E\uDD62', clue: 'I spy a wire tool you beat eggs with' },
    { name: 'apron', emoji: '\uD83E\uDDD1\u200D\uD83C\uDF73', clue: 'I spy something you wear to stay clean while cooking' },
    // -- Lower Area --
    { name: 'stove', emoji: '\uD83D\uDD25', clue: 'I spy where pots and pans sit to get hot' },
    { name: 'towel', emoji: '\uD83E\uDDFB', clue: 'I spy something you dry your hands with' },
    { name: 'ladle', emoji: '\uD83E\uDED5', clue: 'I spy a big deep spoon for scooping soup' },
  ],
  3: [
    // -- Upper Shelf --
    { name: 'cabinet', emoji: '\uD83D\uDDC4\uFE0F', clue: 'I spy where plates and cups hide behind doors' },
    { name: 'blender', emoji: '\uD83E\uDDCA', clue: 'I spy something that makes smoothies' },
    { name: 'teapot', emoji: '\uD83E\uDED6', clue: 'I spy something you brew tea in' },
    // -- Counter --
    { name: 'cutting board', emoji: '\uD83E\uDEB5', clue: 'I spy something you chop vegetables on' },
    { name: 'toaster', emoji: '\uD83C\uDF5E', clue: 'I spy something that makes bread warm and crispy' },
    { name: 'spatula', emoji: '\uD83E\uDD44', clue: 'I spy a flat tool you flip pancakes with' },
    { name: 'counter', emoji: '\uD83D\uDCD0', clue: 'I spy the flat surface where you prepare food' },
    // -- Lower Area --
    { name: 'freezer', emoji: '\u2744\uFE0F', clue: 'I spy something very cold that keeps ice cream frozen' },
    { name: 'rolling pin', emoji: '\uD83D\uDCCF', clue: 'I spy something you roll dough flat with' },
    { name: 'colander', emoji: '\uD83E\uDEE7', clue: 'I spy a bowl with holes for draining pasta water' },
  ],
};

const KITCHEN_ZONES = [
  { label: 'Upper Shelf', icon: '\uD83E\uDEB5', start: 0, end: 3, cols: 3 },
  { label: 'Counter', icon: '\uD83E\uDDF1', start: 3, end: 7, cols: 4 },
  { label: 'Lower Area', icon: '\uD83D\uDEAA', start: 7, end: 10, cols: 3 },
];

const TOTAL_ITEMS_PER_TIER = 10;

// ============================================================================
// HELPERS
// ============================================================================

function shuffleArray(arr) {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function levenshteinDistance(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

/** Check a player's typed answer against the expected item name. */
function checkAnswer(input, answer) {
  const trimmed = input.trim().toLowerCase();
  const expected = answer.toLowerCase();

  if (!trimmed) {
    return { correct: false, nearMiss: false, message: '' };
  }

  // Exact match
  if (trimmed === expected) {
    return { correct: true, nearMiss: false, message: '' };
  }

  // Match ignoring internal spaces (e.g. "cuttingboard" for "cutting board")
  const inputNoSpaces = trimmed.replace(/\s+/g, '');
  const expectedNoSpaces = expected.replace(/\s+/g, '');
  if (inputNoSpaces === expectedNoSpaces) {
    return { correct: true, nearMiss: false, message: '' };
  }

  // Partial match: typed just one word of a multi-word answer
  const expectedWords = expected.split(' ');
  if (expectedWords.length > 1 && expectedWords.some((w) => w === trimmed)) {
    return {
      correct: false,
      nearMiss: true,
      message: "You're on the right track! What's the full name?",
    };
  }

  // Fuzzy matching -- Levenshtein distance
  const dist = levenshteinDistance(trimmed, expected);
  const threshold = expected.length <= 4 ? 1 : expected.length <= 7 ? 2 : 3;

  if (dist > 0 && dist <= threshold) {
    return { correct: false, nearMiss: true, message: 'Almost! Check your spelling.' };
  }

  // Also try without spaces for multi-word answers
  if (expectedWords.length > 1) {
    const distNoSpaces = levenshteinDistance(inputNoSpaces, expectedNoSpaces);
    if (distNoSpaces > 0 && distNoSpaces <= threshold) {
      return { correct: false, nearMiss: true, message: 'Almost! Check your spelling.' };
    }
  }

  return { correct: false, nearMiss: false, message: 'Not quite. Try again!' };
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

/** A single kitchen item card in the scene grid. */
function KitchenItemCard({ item, isFound, isTarget, isJustFound }) {
  return (
    <div
      className={[
        'relative bg-white rounded-xl p-3 flex flex-col items-center justify-center',
        'transition-all duration-300 border-2 min-h-[88px]',
        isFound
          ? 'border-green-300 bg-green-50'
          : isTarget
            ? 'border-amber-300 kitchen-pulse'
            : 'border-amber-100 hover:border-amber-200',
        isJustFound ? 'found-glow' : '',
      ].join(' ')}
    >
      <span
        className={[
          'text-3xl mb-1 transition-transform duration-300',
          isJustFound ? 'scale-125' : '',
        ].join(' ')}
      >
        {item.emoji}
      </span>
      <span
        className={[
          'text-xs font-semibold text-center leading-tight',
          isFound ? 'text-green-700' : 'text-gray-300',
        ].join(' ')}
      >
        {isFound ? item.name : '???'}
      </span>
      {isFound && (
        <div className="absolute top-1 right-1.5 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
          <span className="text-white text-xs font-bold">{'\u2713'}</span>
        </div>
      )}
    </div>
  );
}

/** Animated star-burst that plays once each time a new item is found. */
function CelebrationOverlay({ animKey }) {
  if (animKey <= 0) return null;

  const positions = [
    { x: -30, y: -40, delay: 0, size: 'text-2xl' },
    { x: 30, y: -45, delay: 0.05, size: 'text-xl' },
    { x: -50, y: -15, delay: 0.1, size: 'text-lg' },
    { x: 50, y: -20, delay: 0.08, size: 'text-2xl' },
    { x: 0, y: -55, delay: 0.03, size: 'text-3xl' },
    { x: -20, y: -60, delay: 0.12, size: 'text-lg' },
  ];

  return (
    <div
      key={animKey}
      className="fixed inset-0 pointer-events-none flex items-center justify-center z-50"
    >
      {positions.map((pos, i) => (
        <span
          key={i}
          className={`absolute ${pos.size} star-burst`}
          style={{
            '--star-x': `${pos.x}px`,
            '--star-y': `${pos.y}px`,
            animationDelay: `${pos.delay}s`,
          }}
        >
          {'\u2B50'}
        </span>
      ))}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function KitchenISpy({
  progressData,
  onRecordKeystroke,
  onEndSession,
  onUpdateGameProgress,
  onNavigate,
}) {
  // ---------------------------------------------------------------------------
  // Determine starting tier from saved progress
  // ---------------------------------------------------------------------------
  const gameData = progressData?.gameProgress?.kitchen || {};
  const completedTiers = gameData.completedTiers || [];

  const startingTier = useMemo(() => {
    if (!completedTiers.includes(1)) return 1;
    if (!completedTiers.includes(2)) return 2;
    if (!completedTiers.includes(3)) return 3;
    return 1; // all tiers completed -- replay from the beginning
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  const [gameState, setGameState] = useState('playing'); // 'playing' | 'complete'
  const [currentTier, setCurrentTier] = useState(startingTier);

  // Shuffled clue presentation order (indices 0-9 in random sequence)
  const [clueOrder, setClueOrder] = useState(() =>
    shuffleArray(Array.from({ length: TOTAL_ITEMS_PER_TIER }, (_, i) => i))
  );
  const [currentStep, setCurrentStep] = useState(0);
  const [foundItems, setFoundItems] = useState(new Set());
  const [inputValue, setInputValue] = useState('');
  const [message, setMessage] = useState(null); // { text, type }
  const [hintRevealed, setHintRevealed] = useState(false);
  const [justFoundIndex, setJustFoundIndex] = useState(null);
  const [celebrationKey, setCelebrationKey] = useState(0);
  const [sessionStartTime] = useState(Date.now());

  const inputRef = useRef(null);
  const messageTimerRef = useRef(null);

  // Current tier items (display order is fixed by zone)
  const tierItems = KITCHEN_TIERS[currentTier];

  // Current clue target
  const currentTargetIndex = clueOrder[currentStep];
  const currentItem = tierItems?.[currentTargetIndex];

  // ---------------------------------------------------------------------------
  // Focus management
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (gameState === 'playing' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [gameState, currentStep]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Show a temporary message
  // ---------------------------------------------------------------------------
  const showTimedMessage = useCallback((msg, durationMs = 2000) => {
    if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
    setMessage(msg);
    messageTimerRef.current = setTimeout(() => {
      setMessage(null);
      messageTimerRef.current = null;
    }, durationMs);
  }, []);

  // ---------------------------------------------------------------------------
  // Start / restart a tier
  // ---------------------------------------------------------------------------
  const startTier = useCallback((tier) => {
    setCurrentTier(tier);
    setClueOrder(shuffleArray(Array.from({ length: TOTAL_ITEMS_PER_TIER }, (_, i) => i)));
    setCurrentStep(0);
    setFoundItems(new Set());
    setInputValue('');
    setMessage(null);
    setHintRevealed(false);
    setJustFoundIndex(null);
    setGameState('playing');
  }, []);

  // ---------------------------------------------------------------------------
  // Handle answer submission
  // ---------------------------------------------------------------------------
  const handleSubmit = useCallback(
    (e) => {
      e.preventDefault();
      if (!inputValue.trim() || gameState !== 'playing' || !currentItem) return;

      const result = checkAnswer(inputValue, currentItem.name);

      if (result.correct) {
        // -- Correct answer --
        const newFound = new Set(foundItems);
        newFound.add(currentTargetIndex);
        setFoundItems(newFound);
        setInputValue('');
        setHintRevealed(false);
        setJustFoundIndex(currentTargetIndex);
        setCelebrationKey((prev) => prev + 1);

        showTimedMessage({ text: 'You found it!', type: 'success' }, 1400);

        // Remove the glow highlight after the animation completes
        setTimeout(() => setJustFoundIndex(null), 1200);

        if (newFound.size >= TOTAL_ITEMS_PER_TIER) {
          // ---- Tier complete ----
          setTimeout(() => {
            setGameState('complete');

            onUpdateGameProgress('kitchen', (prev) => ({
              completedTiers: [
                ...new Set([...(prev?.completedTiers || []), currentTier]),
              ],
              totalItemsFound:
                (prev?.totalItemsFound || 0) + TOTAL_ITEMS_PER_TIER,
              totalSessions: (prev?.totalSessions || 0) + 1,
            }));

            onEndSession({
              game: 'kitchen',
              durationMs: Date.now() - sessionStartTime,
              wpm: 0,
              accuracy: 100,
              exerciseCount: TOTAL_ITEMS_PER_TIER,
              keysUsed: [],
            });
          }, 1600);
        } else {
          // Advance to next clue after a brief pause
          setTimeout(() => setCurrentStep((prev) => prev + 1), 1500);
        }
      } else if (result.message) {
        // -- Incorrect or near-miss --
        showTimedMessage(
          { text: result.message, type: result.nearMiss ? 'hint' : 'tryAgain' },
          result.nearMiss ? 3000 : 2000
        );
      }
    },
    [
      inputValue,
      gameState,
      currentItem,
      currentTargetIndex,
      foundItems,
      currentTier,
      sessionStartTime,
      onUpdateGameProgress,
      onEndSession,
      showTimedMessage,
    ]
  );

  // ---------------------------------------------------------------------------
  // Hint handler -- reveals the first letter
  // ---------------------------------------------------------------------------
  const handleHint = useCallback(() => {
    if (!currentItem) return;
    setHintRevealed(true);
    const firstLetter = currentItem.name[0].toUpperCase();
    showTimedMessage(
      { text: `Hint: It starts with "${firstLetter}"`, type: 'hint' },
      5000
    );
  }, [currentItem, showTimedMessage]);

  // ---------------------------------------------------------------------------
  // Navigation -- save partial progress if the player leaves mid-game
  // ---------------------------------------------------------------------------
  const handleGoHome = useCallback(() => {
    if (gameState === 'playing' && foundItems.size > 0) {
      onEndSession({
        game: 'kitchen',
        durationMs: Date.now() - sessionStartTime,
        wpm: 0,
        accuracy: 100,
        exerciseCount: foundItems.size,
        keysUsed: [],
      });
    }
    onNavigate('#/');
  }, [gameState, foundItems, onEndSession, sessionStartTime, onNavigate]);

  // ===========================================================================
  // RENDER: Completion Screen
  // ===========================================================================

  if (gameState === 'complete') {
    const allTiersDone = [1, 2, 3].every(
      (t) => t === currentTier || completedTiers.includes(t)
    );

    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 p-4 flex items-center justify-center">
        <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-md w-full text-center">
          {/* Trophy or party icon */}
          <div className="text-6xl mb-3">
            {allTiersDone ? '\uD83C\uDFC6' : '\uD83C\uDF89'}
          </div>

          <h1 className="text-2xl font-bold text-amber-800 mb-1">
            {allTiersDone ? 'Kitchen Master Chef!' : 'Kitchen Clean Sweep!'}
          </h1>
          <p className="text-gray-500 mb-5">
            {allTiersDone
              ? 'You found every item across all tiers!'
              : `You found every item in the Tier ${currentTier} kitchen!`}
          </p>

          {/* Found items summary */}
          <div className="bg-amber-50 rounded-2xl p-4 mb-5">
            <div className="text-sm font-semibold text-amber-700 mb-3">
              Tier {currentTier} Complete
            </div>
            <div className="grid grid-cols-5 gap-3">
              {tierItems.map((item, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <span className="text-2xl">{item.emoji}</span>
                  <span className="text-xs text-gray-600 leading-tight text-center">
                    {item.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Star display */}
          <div className="flex items-center justify-center gap-1.5 mb-2">
            {Array.from({ length: TOTAL_ITEMS_PER_TIER }).map((_, i) => (
              <span key={i} className="text-xl">
                {'\u2B50'}
              </span>
            ))}
          </div>
          <p className="text-amber-600 font-medium text-sm mb-6">
            {TOTAL_ITEMS_PER_TIER} stars earned!
          </p>

          {/* Action buttons */}
          <div className="space-y-2.5">
            {currentTier < 3 && (
              <button
                onClick={() => startTier(currentTier + 1)}
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white py-3 rounded-xl font-bold hover:opacity-90 transition-opacity"
              >
                Next: Tier {currentTier + 1} {'\u2192'}
              </button>
            )}
            <button
              onClick={() => startTier(currentTier)}
              className="w-full bg-amber-100 text-amber-700 py-3 rounded-xl font-medium hover:bg-amber-200 transition-colors"
            >
              Replay Tier {currentTier}
            </button>
            {currentTier >= 3 && (
              <button
                onClick={() => startTier(1)}
                className="w-full bg-amber-100 text-amber-700 py-3 rounded-xl font-medium hover:bg-amber-200 transition-colors"
              >
                Start Over (Tier 1)
              </button>
            )}
            <button
              onClick={handleGoHome}
              className="w-full bg-gray-100 text-gray-600 py-2.5 rounded-xl text-sm hover:bg-gray-200 transition-colors"
            >
              Back to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ===========================================================================
  // RENDER: Playing Screen
  // ===========================================================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 p-3">
      {/* Custom keyframe animations */}
      <style>{`
        @keyframes gentle-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.5); }
          50% { box-shadow: 0 0 0 8px rgba(251, 191, 36, 0); }
        }
        @keyframes found-glow {
          0%   { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0.7); transform: scale(1); }
          40%  { box-shadow: 0 0 24px 6px rgba(34, 197, 94, 0.3); transform: scale(1.06); }
          100% { box-shadow: 0 0 0 0 rgba(34, 197, 94, 0); transform: scale(1); }
        }
        @keyframes star-burst {
          0%   { opacity: 1; transform: translate(0, 0) scale(0.5); }
          100% { opacity: 0; transform: translate(var(--star-x), var(--star-y)) scale(1.2); }
        }
        .kitchen-pulse { animation: gentle-pulse 2s ease-in-out infinite; }
        .found-glow    { animation: found-glow 0.8s ease-out; }
        .star-burst    { animation: star-burst 0.7s ease-out forwards; }
      `}</style>

      <div className="max-w-2xl mx-auto">
        {/* ----------------------------------------------------------------- */}
        {/* Header                                                            */}
        {/* ----------------------------------------------------------------- */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={handleGoHome}
            className="text-amber-700 hover:text-amber-900 text-sm px-2 py-1 rounded-lg hover:bg-white/60 transition-colors font-medium"
          >
            {'\u2190'} Home
          </button>
          <div className="text-center">
            <h1 className="text-xl font-bold text-amber-800">Kitchen I Spy</h1>
            <p className="text-xs text-amber-500 font-medium">
              Tier {currentTier} {'\u00B7'} No rush!
            </p>
          </div>
          <div className="text-sm text-amber-700 font-semibold bg-white/60 px-3 py-1 rounded-lg">
            {foundItems.size}/{TOTAL_ITEMS_PER_TIER}
          </div>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* Progress bar                                                      */}
        {/* ----------------------------------------------------------------- */}
        <div className="h-2.5 bg-amber-100 rounded-full mb-4 overflow-hidden shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-amber-400 to-orange-400 rounded-full transition-all duration-700 ease-out"
            style={{
              width: `${(foundItems.size / TOTAL_ITEMS_PER_TIER) * 100}%`,
            }}
          />
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* Clue card                                                         */}
        {/* ----------------------------------------------------------------- */}
        <div className="bg-white rounded-2xl p-5 shadow-lg mb-4 border-2 border-amber-200">
          <div className="flex items-start gap-3">
            <span className="text-3xl flex-shrink-0">{'\uD83D\uDD0D'}</span>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-amber-500 font-semibold uppercase tracking-wider mb-1">
                Clue {currentStep + 1} of {TOTAL_ITEMS_PER_TIER}
              </div>
              <p className="text-lg text-gray-800 font-medium leading-snug">
                {currentItem?.clue || ''}
              </p>
            </div>
          </div>
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* Kitchen scene                                                     */}
        {/* ----------------------------------------------------------------- */}
        <div className="bg-gradient-to-b from-amber-100/80 to-amber-50/80 rounded-2xl p-3 sm:p-4 shadow-inner mb-4 border border-amber-200 relative">
          {KITCHEN_ZONES.map((zone, zoneIdx) => (
            <div
              key={zoneIdx}
              className={zoneIdx < KITCHEN_ZONES.length - 1 ? 'mb-3' : ''}
            >
              {/* Zone label */}
              <div className="text-xs text-amber-400 font-semibold mb-1.5 px-1 flex items-center gap-1">
                <span>{zone.icon}</span>
                <span>{zone.label}</span>
              </div>

              {/* Item cards grid */}
              <div
                className={[
                  'grid gap-2',
                  zone.cols === 4 ? 'grid-cols-4' : 'grid-cols-3',
                ].join(' ')}
              >
                {tierItems.slice(zone.start, zone.end).map((item, i) => {
                  const idx = zone.start + i;
                  return (
                    <KitchenItemCard
                      key={idx}
                      item={item}
                      isFound={foundItems.has(idx)}
                      isTarget={
                        idx === currentTargetIndex && !foundItems.has(idx)
                      }
                      isJustFound={idx === justFoundIndex}
                    />
                  );
                })}
              </div>
            </div>
          ))}

          {/* Star-burst celebration overlay */}
          <CelebrationOverlay animKey={celebrationKey} />
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* Message area (fixed height to prevent layout shift)               */}
        {/* ----------------------------------------------------------------- */}
        <div className="h-10 flex items-center justify-center mb-2">
          {message && (
            <div
              className={[
                'py-2 px-5 rounded-xl font-medium text-sm text-center transition-all',
                message.type === 'success'
                  ? 'bg-green-100 text-green-700'
                  : '',
                message.type === 'hint' ? 'bg-amber-100 text-amber-700' : '',
                message.type === 'tryAgain' ? 'bg-gray-100 text-gray-500' : '',
              ].join(' ')}
            >
              {message.type === 'success' && '\u2728 '}
              {message.text}
            </div>
          )}
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* Input area -- styled as a kitchen chalkboard                      */}
        {/* ----------------------------------------------------------------- */}
        <div className="bg-gray-800 rounded-2xl p-4 shadow-xl border-4 border-amber-800/70">
          {/* Decorative chalk-dust edge */}
          <div className="h-px bg-gradient-to-r from-transparent via-gray-500/30 to-transparent mb-3" />

          <div className="text-xs text-gray-400 mb-2.5 text-center font-medium tracking-wide">
            Type the name of the item you spy
          </div>

          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type your answer..."
              className="flex-1 bg-gray-700/80 text-white text-lg px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-amber-400 placeholder-gray-500 font-medium"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck="false"
            />
            <button
              type="submit"
              disabled={!inputValue.trim()}
              className="bg-amber-500 hover:bg-amber-400 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold px-5 py-3 rounded-xl transition-colors"
            >
              Check
            </button>
          </form>

          {/* Hint button */}
          <div className="flex justify-center mt-3">
            <button
              type="button"
              onClick={handleHint}
              disabled={hintRevealed}
              className={[
                'text-xs px-4 py-1.5 rounded-lg transition-colors',
                hintRevealed
                  ? 'text-amber-300/60 cursor-default'
                  : 'text-amber-400 hover:text-amber-300 hover:bg-gray-700/50',
              ].join(' ')}
            >
              {hintRevealed
                ? `Hint: Starts with "${currentItem?.name[0].toUpperCase()}"`
                : '\uD83D\uDCA1 Need a hint?'}
            </button>
          </div>

          {/* Decorative chalk-dust edge */}
          <div className="h-px bg-gradient-to-r from-transparent via-gray-500/30 to-transparent mt-3" />
        </div>

        {/* ----------------------------------------------------------------- */}
        {/* Cozy footer                                                       */}
        {/* ----------------------------------------------------------------- */}
        <div className="text-center mt-4 mb-2 text-xs text-amber-400/80 font-medium">
          Take your time. No rush, no timer. Just you and the kitchen.
        </div>
      </div>
    </div>
  );
}
