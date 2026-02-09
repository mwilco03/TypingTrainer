import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import ProgressionEngine from '../engine/ProgressionEngine';

const COMMON_WORDS = [
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had',
  'her', 'was', 'one', 'our', 'day', 'get', 'has', 'him', 'his', 'how',
  'its', 'may', 'new', 'now', 'see', 'way', 'who', 'did', 'own', 'say',
  'she', 'too', 'use', 'also', 'back', 'been', 'call', 'come', 'each',
  'find', 'from', 'give', 'good', 'have', 'here', 'just', 'know', 'last',
  'left', 'life', 'like', 'long', 'look', 'made', 'make', 'many', 'more',
  'most', 'much', 'must', 'name', 'need', 'only', 'over', 'part', 'some',
  'such', 'take', 'tell', 'than', 'that', 'them', 'then', 'they', 'this',
  'time', 'very', 'want', 'well', 'what', 'when', 'will', 'with', 'word',
  'work', 'year', 'your',
];

export default function ParentChallenge({ encodedData, onNavigate }) {
  const challenge = useMemo(() => {
    return ProgressionEngine.decodeChallenge(encodedData);
  }, [encodedData]);

  const [screen, setScreen] = useState('intro');
  const [challengeText, setChallengeText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [errors, setErrors] = useState(new Set());
  const [startTime, setStartTime] = useState(null);
  const [results, setResults] = useState(null);

  const inputRef = useRef(null);
  const screenRef = useRef(screen);
  screenRef.current = screen;

  if (!challenge || !challenge.k || challenge.k.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50 p-4">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center shadow-lg">
          <div className="text-4xl mb-3">&#x1F517;</div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">Invalid Challenge</h1>
          <p className="text-gray-500 text-sm mb-4">
            This challenge link is expired or invalid.
          </p>
          <button
            onClick={() => onNavigate('#/')}
            className="bg-blue-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-600"
          >
            Go to Typing Tainer
          </button>
        </div>
      </div>
    );
  }

  const weakKeys = challenge.k;

  const generateChallenge = useCallback(() => {
    const keySet = new Set(weakKeys);
    const relevantWords = COMMON_WORDS.filter((w) =>
      w.split('').some((c) => keySet.has(c))
    );

    const parts = [];

    // Key drills
    for (const key of weakKeys.slice(0, 3)) {
      parts.push(key.repeat(4));
    }

    // Words using weak keys
    if (relevantWords.length > 0) {
      const shuffled = relevantWords.sort(() => Math.random() - 0.5);
      parts.push(...shuffled.slice(0, 6));
    } else {
      parts.push(weakKeys.join('').repeat(3));
    }

    return parts.join(' ');
  }, [weakKeys]);

  const startChallenge = useCallback(() => {
    setChallengeText(generateChallenge());
    setCurrentIndex(0);
    setErrors(new Set());
    setStartTime(Date.now());
    setScreen('playing');
  }, [generateChallenge]);

  useEffect(() => {
    if (screen === 'playing' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [screen]);

  const handleKeyDown = useCallback(
    (e) => {
      if (screenRef.current !== 'playing' || !challengeText) return;
      if (e.key.length !== 1 && e.key !== ' ') return;
      if (e.preventDefault) e.preventDefault();

      const expected = challengeText[currentIndex];
      const typed = e.key;

      if (typed === expected) {
        const next = currentIndex + 1;
        setCurrentIndex(next);

        if (next >= challengeText.length) {
          const duration = Date.now() - startTime;
          const totalChars = challengeText.length;
          const errorCount = errors.size;
          const accuracy = Math.round(
            ((totalChars - errorCount) / totalChars) * 100
          );
          const wpm = duration >= 5000 ? Math.round((totalChars / 5) / (duration / 60000)) : 0;
          setResults({ wpm, accuracy, duration, errorCount });
          setScreen('done');
        }
      } else {
        setErrors((prev) => new Set([...prev, currentIndex]));
      }
    },
    [challengeText, currentIndex, startTime, errors]
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
  // RENDER: INTRO
  // ============================================================================

  if (screen === 'intro') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 p-4">
        <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
          <div className="text-5xl mb-4">&#x1F3C6;</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Parent Challenge!
          </h1>
          <p className="text-gray-500 text-sm mb-4">
            Your child is learning to type. Try their toughest keys and see how
            you do!
          </p>

          <div className="bg-red-50 rounded-xl p-4 mb-6">
            <div className="text-sm font-semibold text-red-700 mb-2">
              Their tough keys:
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {weakKeys.map((k) => (
                <span
                  key={k}
                  className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-red-100 text-red-700 font-mono font-bold text-lg border-2 border-red-200"
                >
                  {k.toUpperCase()}
                </span>
              ))}
            </div>
          </div>

          <button
            onClick={startChallenge}
            className="w-full bg-gradient-to-r from-purple-500 to-blue-500 text-white py-3 rounded-xl font-bold text-lg hover:opacity-90 transition-opacity"
          >
            Take the Challenge!
          </button>

          <button
            onClick={() => onNavigate('#/')}
            className="mt-3 text-sm text-gray-400 hover:text-gray-600 block mx-auto"
          >
            Or try Typing Tainer
          </button>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER: PLAYING
  // ============================================================================

  if (screen === 'playing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4 flex flex-col items-center justify-center">
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

        <div className="max-w-xl w-full">
          <div className="text-center mb-6">
            <h2 className="text-lg font-bold text-gray-700">
              Type the text below:
            </h2>
            <p className="text-sm text-gray-400">
              These are your child&apos;s toughest keys
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-lg min-h-32 flex items-center justify-center">
            <div className="text-2xl md:text-3xl font-mono leading-relaxed flex flex-wrap justify-center gap-0.5">
              {challengeText.split('').map((char, i) => {
                const isError = errors.has(i);
                const isCurrent = i === currentIndex;
                const isTyped = i < currentIndex;
                return (
                  <span
                    key={i}
                    className={[
                      'px-0.5 rounded transition-all',
                      isCurrent ? 'bg-purple-200 animate-pulse' : '',
                      isTyped && !isError ? 'text-green-600' : '',
                      isError ? 'text-red-500 bg-red-100' : '',
                      !isTyped && !isCurrent ? 'text-gray-300' : '',
                    ].join(' ')}
                  >
                    {char === ' ' ? '\u00A0' : char}
                  </span>
                );
              })}
            </div>
          </div>

          <div className="text-center mt-4 text-sm text-gray-400">
            {currentIndex} / {challengeText.length} characters
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // RENDER: DONE
  // ============================================================================

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl">
        <div className="text-5xl mb-4">&#x1F389;</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Challenge Complete!
        </h1>

        <div className="grid grid-cols-2 gap-4 my-6">
          <div className="bg-blue-50 rounded-xl p-4">
            <div className="text-2xl font-bold text-blue-600">
              {results?.wpm || 0}
            </div>
            <div className="text-xs text-gray-500">WPM</div>
          </div>
          <div className="bg-green-50 rounded-xl p-4">
            <div className="text-2xl font-bold text-green-600">
              {results?.accuracy || 0}%
            </div>
            <div className="text-xs text-gray-500">Accuracy</div>
          </div>
        </div>

        <p className="text-gray-500 text-sm mb-6">
          Now you know what your child is working on! Encourage them to keep
          practicing.
        </p>

        <div className="space-y-2">
          <button
            onClick={startChallenge}
            className="w-full bg-purple-100 text-purple-700 py-3 rounded-xl font-medium hover:bg-purple-200"
          >
            Try Again
          </button>
          <button
            onClick={() => onNavigate('#/')}
            className="w-full bg-gray-100 text-gray-600 py-2 rounded-xl text-sm hover:bg-gray-200"
          >
            Try Typing Tainer
          </button>
        </div>
      </div>
    </div>
  );
}
