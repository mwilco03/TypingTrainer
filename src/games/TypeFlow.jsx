import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import ProgressionEngine from '../engine/ProgressionEngine';

// ============================================================================
// MODULES - Structured learning path with adaptive content within each
// ============================================================================

const MODULES = [
  {
    id: 'home-index',
    name: 'Index Fingers',
    icon: '\uD83D\uDC46',
    description: 'Start with F and J - your anchor keys',
    keys: ['f', 'j'],
    targetWpm: 8,
    targetAccuracy: 85,
  },
  {
    id: 'home-middle',
    name: 'Middle Fingers',
    icon: '\u270C\uFE0F',
    description: 'Add D and K',
    keys: ['f', 'j', 'd', 'k'],
    targetWpm: 10,
    targetAccuracy: 85,
  },
  {
    id: 'home-ring',
    name: 'Ring Fingers',
    icon: '\uD83D\uDD96',
    description: 'Add S and L',
    keys: ['f', 'j', 'd', 'k', 's', 'l'],
    targetWpm: 12,
    targetAccuracy: 85,
  },
  {
    id: 'home-pinky',
    name: 'Full Home Row',
    icon: '\uD83C\uDFE0',
    description: 'Complete with A and ;',
    keys: ['f', 'j', 'd', 'k', 's', 'l', 'a', ';'],
    targetWpm: 15,
    targetAccuracy: 85,
  },
  {
    id: 'home-center',
    name: 'Center Reach',
    icon: '\uD83D\uDC49',
    description: 'Index fingers reach to G and H',
    keys: ['f', 'j', 'd', 'k', 's', 'l', 'a', ';', 'g', 'h'],
    targetWpm: 15,
    targetAccuracy: 85,
  },
  {
    id: 'top-inner',
    name: 'Top Row Start',
    icon: '\u2B06\uFE0F',
    description: 'Reach up for E, R, U, I',
    keys: ['f', 'j', 'd', 'k', 's', 'l', 'a', ';', 'g', 'h', 'e', 'r', 'u', 'i'],
    targetWpm: 18,
    targetAccuracy: 82,
  },
  {
    id: 'top-center',
    name: 'T and Y',
    icon: '\uD83C\uDFAF',
    description: 'Index fingers reach up and over',
    keys: ['f', 'j', 'd', 'k', 's', 'l', 'a', ';', 'g', 'h', 'e', 'r', 'u', 'i', 't', 'y'],
    targetWpm: 20,
    targetAccuracy: 82,
  },
  {
    id: 'top-outer',
    name: 'W, O, Q, P',
    icon: '\uD83C\uDFB9',
    description: 'Complete the top row',
    keys: ['f', 'j', 'd', 'k', 's', 'l', 'a', ';', 'g', 'h', 'e', 'r', 'u', 'i', 't', 'y', 'w', 'o', 'q', 'p'],
    targetWpm: 22,
    targetAccuracy: 80,
  },
  {
    id: 'bottom-row',
    name: 'Bottom Row',
    icon: '\u2B07\uFE0F',
    description: 'Reach down for Z through M',
    keys: ['f', 'j', 'd', 'k', 's', 'l', 'a', ';', 'g', 'h', 'e', 'r', 'u', 'i', 't', 'y', 'w', 'o', 'q', 'p', 'z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/'],
    targetWpm: 22,
    targetAccuracy: 80,
  },
  {
    id: 'full-keyboard',
    name: 'Full Keyboard',
    icon: '\uD83D\uDC51',
    description: 'Master everything with space bar',
    keys: ['f', 'j', 'd', 'k', 's', 'l', 'a', ';', 'g', 'h', 'e', 'r', 'u', 'i', 't', 'y', 'w', 'o', 'q', 'p', 'z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/', ' '],
    targetWpm: 25,
    targetAccuracy: 85,
  },
];

// ============================================================================
// WORD BANKS
// ============================================================================

const WORD_BANKS = {
  'fj': ['fjfj', 'jfjf', 'ff', 'jj', 'fjf', 'jfj'],
  'fjdk': ['fj', 'dk', 'fd', 'jk', 'kd', 'dkdk', 'fjdk'],
  'fjdksl': ['flask', 'skill', 'fills', 'kills', 'dull', 'full', 'sills', 'falls', 'jds', 'ksl'],
  'home': ['sad', 'dad', 'lad', 'ask', 'all', 'fall', 'salad', 'flask', 'shall', 'lass', 'adds', 'fads'],
  'homegh': ['glad', 'gash', 'hash', 'dash', 'flash', 'slash', 'glass', 'half', 'shall', 'flags', 'shag'],
  'witheri': ['red', 'rid', 'did', 'kid', 'lid', 'sir', 'her', 'his', 'fir', 'fire', 'hire', 'like', 'hike', 'hide', 'side', 'ride', 'dire', 'sure', 'lure'],
  'withty': ['try', 'the', 'yet', 'set', 'let', 'get', 'hat', 'sat', 'rat', 'that', 'this', 'they', 'stay', 'style', 'story', 'dirty', 'thirty'],
  'withwo': ['two', 'who', 'how', 'row', 'low', 'wow', 'own', 'flow', 'slow', 'show', 'know', 'grow', 'throw', 'follow', 'window'],
  'withqp': ['quip', 'quit', 'quote', 'equip', 'input', 'output', 'opaque'],
  'bottom': ['van', 'can', 'man', 'ban', 'mix', 'fix', 'six', 'box', 'next', 'exact', 'inbox', 'climb', 'comb'],
  'common': ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'see', 'way', 'who', 'did', 'own', 'say', 'she', 'too', 'use', 'boy', 'also', 'back', 'been', 'call', 'come', 'each', 'find', 'from', 'give', 'good', 'have', 'here', 'just', 'know', 'last', 'left', 'life', 'like', 'line', 'long', 'look', 'made', 'make', 'many', 'more', 'most', 'much', 'must', 'name', 'need', 'only', 'over', 'part', 'some', 'such', 'take', 'tell', 'than', 'that', 'them', 'then', 'they', 'this', 'time', 'very', 'want', 'well', 'what', 'when', 'will', 'with', 'word', 'work', 'year', 'your'],
};

// ============================================================================
// CONSTANTS
// ============================================================================

const FINGER_COLORS = {
  leftPinky: '#ef4444',
  leftRing: '#f97316',
  leftMiddle: '#eab308',
  leftIndex: '#22c55e',
  rightIndex: '#22c55e',
  rightMiddle: '#eab308',
  rightRing: '#f97316',
  rightPinky: '#ef4444',
  thumb: '#8b5cf6'
};

const KEY_TO_FINGER = {
  'q': 'leftPinky', 'a': 'leftPinky', 'z': 'leftPinky',
  'w': 'leftRing', 's': 'leftRing', 'x': 'leftRing',
  'e': 'leftMiddle', 'd': 'leftMiddle', 'c': 'leftMiddle',
  'r': 'leftIndex', 'f': 'leftIndex', 'v': 'leftIndex', 't': 'leftIndex',
  'g': 'leftIndex', 'b': 'leftIndex',
  'y': 'rightIndex', 'h': 'rightIndex', 'n': 'rightIndex', 'u': 'rightIndex',
  'j': 'rightIndex', 'm': 'rightIndex',
  'i': 'rightMiddle', 'k': 'rightMiddle', ',': 'rightMiddle',
  'o': 'rightRing', 'l': 'rightRing', '.': 'rightRing',
  'p': 'rightPinky', ';': 'rightPinky', '/': 'rightPinky',
  ' ': 'thumb'
};

const KEYBOARD_ROWS = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/'],
  [' ']
];

const HOME_ROW = new Set(['a', 's', 'd', 'f', 'j', 'k', 'l', ';']);

const ROLLING_WINDOW = 30;

// ============================================================================
// ADAPTIVE ENGINE
// ============================================================================

const PHASE = {
  DRILL: 'drill',
  WORDS: 'words',
  COMPLEXITY: 'complexity',
  MASTERY: 'mastery',
};

const PHASE_THRESHOLDS = {
  drillToWords: 70,
  wordsToComplexity: 82,
  complexityToMastery: 88,
  minKeystrokesForPhase: 15,
};

const AdaptiveEngine = {
  determinePhase(keystrokes, currentModule, moduleIndex) {
    if (keystrokes.length < PHASE_THRESHOLDS.minKeystrokesForPhase) {
      return PHASE.DRILL;
    }

    const recent = keystrokes.slice(-ROLLING_WINDOW);
    const accuracy = (recent.filter(k => k.correct).length / recent.length) * 100;
    const times = recent.map(k => k.time).filter(t => t > 0 && t < 2000);
    const avgTime = times.length > 0 ? times.reduce((a, b) => a + b, 0) / times.length : 300;

    const speedBonus = Math.max(0, (250 - avgTime) / 25);
    const effectiveScore = accuracy + speedBonus;

    if (effectiveScore >= PHASE_THRESHOLDS.complexityToMastery) {
      return PHASE.MASTERY;
    }
    if (effectiveScore >= PHASE_THRESHOLDS.wordsToComplexity && moduleIndex < MODULES.length - 1) {
      return PHASE.COMPLEXITY;
    }
    if (accuracy >= PHASE_THRESHOLDS.drillToWords) {
      return PHASE.WORDS;
    }
    return PHASE.DRILL;
  },

  calculateMetrics(keystrokes) {
    if (keystrokes.length < 3) {
      return { accuracy: 100, wpm: 0, avgTime: 0, phase: PHASE.DRILL };
    }

    const recent = keystrokes.slice(-ROLLING_WINDOW);
    const correct = recent.filter(k => k.correct).length;
    const accuracy = Math.round((correct / recent.length) * 100);

    const times = recent.map(k => k.time).filter(t => t > 0 && t < 2000);
    const totalTime = times.reduce((a, b) => a + b, 0);
    const avgTime = times.length > 0 ? Math.round(totalTime / times.length) : 0;
    const wpm = totalTime > 0 ? Math.round((recent.length / 5) / (totalTime / 60000)) : 0;

    return { accuracy, wpm, avgTime };
  },

  getPartnerKey(key) {
    const pairs = {
      'f': 'j', 'j': 'f', 'd': 'k', 'k': 'd', 's': 'l', 'l': 's',
      'a': ';', ';': 'a', 'g': 'h', 'h': 'g', 'e': 'i', 'i': 'e',
      'r': 'u', 'u': 'r', 't': 'y', 'y': 't', 'w': 'o', 'o': 'w',
      'q': 'p', 'p': 'q', 'v': 'm', 'm': 'v', 'c': ',', ',': 'c',
      'x': '.', '.': 'x', 'z': '/', '/': 'z', 'b': 'n', 'n': 'b'
    };
    return pairs[key];
  },

  generateDrill(keys, keyMetrics) {
    const keyArray = keys.filter(k => k !== ' ');
    const sorted = keyArray
      .map(k => ({ key: k, acc: keyMetrics[k]?.accuracy ?? 0.5 }))
      .sort((a, b) => a.acc - b.acc);

    const patterns = [];

    const weakest = sorted[0]?.key;
    if (weakest) {
      patterns.push(weakest.repeat(4));
      const partner = this.getPartnerKey(weakest);
      if (partner && keyArray.includes(partner)) {
        patterns.push(weakest + partner + weakest + partner + weakest + partner);
      }
    }

    const pairs = [];
    for (let i = 0; i < keyArray.length; i += 2) {
      if (keyArray[i + 1]) {
        pairs.push(keyArray[i] + keyArray[i + 1]);
      }
    }
    if (pairs.length > 0) {
      patterns.push(pairs.slice(0, 2).map(p => p.repeat(3)).join(' '));
    }

    if (keyArray.includes('f') && keyArray.includes('j')) {
      patterns.push('fj'.repeat(4));
    }

    return patterns.slice(0, 3).join(' ');
  },

  generateWords(keys, keyMetrics) {
    const keySet = new Set(keys);
    const validWords = Object.values(WORD_BANKS)
      .flat()
      .filter(word => word.split('').every(c => keySet.has(c)))
      .filter(word => word.length >= 2);

    if (validWords.length === 0) {
      return this.generateDrill(keys, keyMetrics);
    }

    const weakKeys = keys.filter(k => (keyMetrics[k]?.accuracy ?? 1) < 0.85);
    const scored = validWords.map(word => {
      const weakHits = word.split('').filter(c => weakKeys.includes(c)).length;
      const lengthBonus = Math.min(word.length / 6, 1);
      return { word, score: weakHits * 2 + lengthBonus + Math.random() * 0.5 };
    });

    scored.sort((a, b) => b.score - a.score);

    const selected = [];
    const used = new Set();
    for (const { word } of scored) {
      if (!used.has(word) && selected.length < 4) {
        selected.push(word);
        used.add(word);
      }
    }

    return selected.join(' ');
  },

  generateComplexity(currentModule, nextModule, keyMetrics) {
    const currentKeys = currentModule.keys;
    const newKeys = nextModule.keys.filter(k => !currentKeys.includes(k) && k !== ' ');

    if (newKeys.length === 0) {
      return this.generateWords(currentKeys, keyMetrics);
    }

    const allKeys = [...currentKeys, ...newKeys.slice(0, 2)];
    const keySet = new Set(allKeys);

    const previewWords = Object.values(WORD_BANKS)
      .flat()
      .filter(word => {
        const chars = word.split('');
        const usesNewKey = chars.some(c => newKeys.includes(c));
        const allValid = chars.every(c => keySet.has(c));
        return usesNewKey && allValid;
      });

    const comfortWords = Object.values(WORD_BANKS)
      .flat()
      .filter(word => word.split('').every(c => currentKeys.includes(c)))
      .slice(0, 10);

    const result = [];

    const newKey = newKeys[0];
    const partner = this.getPartnerKey(newKey);
    if (partner && currentKeys.includes(partner)) {
      result.push(partner + newKey + partner + newKey);
    } else {
      result.push(newKey.repeat(3));
    }

    if (previewWords.length > 0) {
      result.push(previewWords[Math.floor(Math.random() * previewWords.length)]);
    }

    const shuffledComfort = comfortWords.sort(() => Math.random() - 0.5);
    result.push(...shuffledComfort.slice(0, 2));

    return result.join(' ');
  },

  generateMastery(keys, keyMetrics, bigramMetrics) {
    const keySet = new Set(keys);

    const weakBigrams = Object.entries(bigramMetrics)
      .filter(([bg, m]) => {
        const [a, b] = bg.split('');
        return keySet.has(a) && keySet.has(b) && m.total >= 3 && (m.correct / m.total) < 0.9;
      })
      .sort((a, b) => (a[1].correct / a[1].total) - (b[1].correct / b[1].total))
      .slice(0, 2)
      .map(([bg]) => bg);

    const challengeWords = Object.values(WORD_BANKS)
      .flat()
      .filter(word => word.split('').every(c => keySet.has(c)))
      .filter(word => word.length >= 4)
      .sort(() => Math.random() - 0.5)
      .slice(0, 4);

    const result = [];

    if (weakBigrams.length > 0) {
      result.push(weakBigrams.map(bg => bg.repeat(3)).join(' '));
    }

    result.push(...challengeWords);

    const left = keys.filter(k => ['a', 's', 'd', 'f', 'g', 'q', 'w', 'e', 'r', 't', 'z', 'x', 'c', 'v', 'b'].includes(k));
    const right = keys.filter(k => ['h', 'j', 'k', 'l', ';', 'y', 'u', 'i', 'o', 'p', 'n', 'm', ',', '.', '/'].includes(k));

    if (left.length > 0 && right.length > 0) {
      let rhythm = '';
      for (let i = 0; i < 6; i++) {
        rhythm += left[Math.floor(Math.random() * left.length)];
        rhythm += right[Math.floor(Math.random() * right.length)];
      }
      result.push(rhythm);
    }

    return result.slice(0, 4).join(' ');
  },

  // Generate a spaced repetition review fragment for keys due for review
  generateReviewFragment(reviewKeys, moduleKeys, keyMetrics) {
    // Only review keys that belong to the current or earlier modules
    const moduleSet = new Set(moduleKeys);
    const applicable = reviewKeys.filter(k => moduleSet.has(k));
    if (applicable.length === 0) return '';

    const patterns = [];
    for (const key of applicable.slice(0, 2)) {
      const partner = this.getPartnerKey(key);
      if (partner && moduleSet.has(partner)) {
        patterns.push(key + partner + key + partner);
      } else {
        patterns.push(key.repeat(4));
      }
    }

    // Also find a word using review keys
    const keySet = new Set(moduleKeys);
    const reviewWord = Object.values(WORD_BANKS)
      .flat()
      .filter(w => w.split('').every(c => keySet.has(c)))
      .filter(w => w.split('').some(c => applicable.includes(c)))
      .sort(() => Math.random() - 0.5)[0];

    if (reviewWord) patterns.push(reviewWord);
    return patterns.join(' ');
  },

  generateChallenge(phase, currentModule, nextModule, keyMetrics, bigramMetrics, reviewKeys) {
    let base;
    switch (phase) {
      case PHASE.DRILL:
        base = this.generateDrill(currentModule.keys, keyMetrics);
        break;
      case PHASE.WORDS:
        base = this.generateWords(currentModule.keys, keyMetrics);
        break;
      case PHASE.COMPLEXITY:
        if (nextModule) {
          base = this.generateComplexity(currentModule, nextModule, keyMetrics);
        } else {
          base = this.generateWords(currentModule.keys, keyMetrics);
        }
        break;
      case PHASE.MASTERY:
        base = this.generateMastery(currentModule.keys, keyMetrics, bigramMetrics);
        break;
      default:
        base = this.generateDrill(currentModule.keys, keyMetrics);
    }

    // Inject spaced repetition review ~30% of the time when reviews are due
    if (reviewKeys && reviewKeys.length > 0 && Math.random() < 0.3) {
      const review = this.generateReviewFragment(reviewKeys, currentModule.keys, keyMetrics);
      if (review) {
        return review + ' ' + base;
      }
    }

    return base;
  },

  checkModuleComplete(keystrokes, module) {
    if (keystrokes.length < 30) return false;
    const metrics = this.calculateMetrics(keystrokes);
    return metrics.accuracy >= module.targetAccuracy && metrics.wpm >= module.targetWpm;
  }
};

// ============================================================================
// SOUND
// ============================================================================

const playSound = (type, enabled = true) => {
  if (!enabled) return;
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    const configs = {
      correct: { freq: 880, dur: 0.03, vol: 0.06 },
      wrong: { freq: 220, dur: 0.1, vol: 0.08 },
      complete: { freq: 660, dur: 0.12, vol: 0.08 },
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
// COMPONENTS
// ============================================================================

const LiveMetrics = ({ wpm, accuracy, streak, phase }) => {
  const getPhaseInfo = () => {
    switch (phase) {
      case PHASE.DRILL:
        return { label: 'Building Foundation', color: 'from-orange-400 to-red-500', icon: '\uD83C\uDFAF' };
      case PHASE.WORDS:
        return { label: 'Learning Words', color: 'from-yellow-400 to-orange-500', icon: '\uD83D\uDCDD' };
      case PHASE.COMPLEXITY:
        return { label: 'Adding Complexity', color: 'from-blue-400 to-purple-500', icon: '\uD83D\uDE80' };
      case PHASE.MASTERY:
        return { label: 'Mastery Mode', color: 'from-green-400 to-emerald-500', icon: '\uD83D\uDC51' };
      default:
        return { label: 'Practice', color: 'from-gray-400 to-gray-500', icon: '\u2328\uFE0F' };
    }
  };

  const phaseInfo = getPhaseInfo();
  const progressToNext = phase === PHASE.DRILL ? Math.min(100, (accuracy / 70) * 100)
    : phase === PHASE.WORDS ? Math.min(100, ((accuracy - 70) / 12) * 100)
    : phase === PHASE.COMPLEXITY ? Math.min(100, ((accuracy - 82) / 6) * 100)
    : 100;

  return (
    <div className="bg-white/90 backdrop-blur rounded-2xl p-4 shadow-lg mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{phaseInfo.icon}</span>
          <div>
            <div className="font-bold text-gray-800 text-sm">{phaseInfo.label}</div>
            <div className="text-xs text-gray-500">
              {phase === PHASE.DRILL && 'Get to 70% accuracy'}
              {phase === PHASE.WORDS && 'Get to 82% for next keys'}
              {phase === PHASE.COMPLEXITY && 'Get to 88% to master'}
              {phase === PHASE.MASTERY && 'Hit targets to complete!'}
            </div>
          </div>
        </div>
        <div className="w-24">
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r ${phaseInfo.color} transition-all duration-300`}
              style={{ width: `${progressToNext}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <div className="text-3xl font-bold text-blue-600">{wpm}</div>
          <div className="text-xs text-gray-500">WPM</div>
        </div>
        <div>
          <div className={`text-3xl font-bold ${accuracy >= 85 ? 'text-green-500' : accuracy >= 70 ? 'text-yellow-500' : 'text-orange-500'}`}>
            {accuracy}%
          </div>
          <div className="text-xs text-gray-500">Accuracy</div>
        </div>
        <div>
          <div className="text-3xl font-bold text-orange-500">{streak}</div>
          <div className="text-xs text-gray-500">Streak</div>
        </div>
      </div>
    </div>
  );
};

const TypeDisplay = ({ text, currentIndex, errors, keyTimes }) => (
  <div className="bg-white rounded-2xl p-6 shadow-inner mb-4 min-h-24 flex items-center justify-center">
    <div className="text-3xl md:text-4xl font-mono leading-relaxed flex flex-wrap justify-center gap-0.5">
      {text.split('').map((char, i) => {
        const isError = errors.has(i);
        const isCurrent = i === currentIndex;
        const isTyped = i < currentIndex;
        const wasSlow = keyTimes[i] > 400;

        return (
          <span
            key={i}
            className={`
              px-0.5 rounded transition-all
              ${isCurrent ? 'bg-yellow-300 animate-pulse scale-110' : ''}
              ${isTyped && !isError ? 'text-green-600' : ''}
              ${isError ? 'text-red-500 bg-red-100' : ''}
              ${!isTyped && !isCurrent ? 'text-gray-300' : ''}
              ${wasSlow && isTyped && !isError ? 'underline decoration-yellow-400 decoration-2' : ''}
            `}
          >
            {char === ' ' ? '\u00A0' : char}
          </span>
        );
      })}
    </div>
  </div>
);

const Key = ({ letter, isActive, isPressed, isInModule, fingerColor, mastery }) => {
  const isHome = HOME_ROW.has(letter);

  const getMasteryIndicator = () => {
    if (mastery === undefined) return null;
    if (mastery >= 95) return <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-green-400" />;
    if (mastery >= 80) return <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-yellow-400" />;
    if (mastery >= 0) return <div className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-red-400" />;
    return null;
  };

  return (
    <div
      className={`
        relative flex items-center justify-center font-bold rounded-lg transition-all duration-75 select-none
        ${letter === ' ' ? 'w-40 h-10' : 'w-10 h-10'}
        ${isPressed ? 'scale-90' : ''}
        ${!isInModule ? 'opacity-25' : ''}
        border-2 ${isHome ? 'border-blue-400' : 'border-gray-300'}
      `}
      style={{
        backgroundColor: isActive ? fingerColor : isPressed ? '#bfdbfe' : '#f3f4f6',
        boxShadow: isActive ? `0 0 15px ${fingerColor}50` : 'none',
      }}
    >
      <span className={`text-sm ${isActive ? 'text-white font-black' : 'text-gray-600'}`}>
        {letter === ' ' ? 'SPACE' : letter.toUpperCase()}
      </span>
      {isHome && <div className="absolute -bottom-0.5 w-1.5 h-0.5 bg-blue-400 rounded-full" />}
      {getMasteryIndicator()}
    </div>
  );
};

const Keyboard = ({ activeKey, pressedKey, moduleKeys, keyMetrics }) => {
  const keySet = new Set(moduleKeys);

  return (
    <div className="bg-gray-100 p-4 rounded-2xl shadow-inner">
      {KEYBOARD_ROWS.map((row, rowIndex) => (
        <div
          key={rowIndex}
          className="flex justify-center gap-1 mb-1"
          style={{ marginLeft: [0, 20, 44, 100][rowIndex] }}
        >
          {row.map(key => (
            <Key
              key={key}
              letter={key}
              isActive={activeKey?.toLowerCase() === key}
              isPressed={pressedKey?.toLowerCase() === key}
              isInModule={keySet.has(key)}
              fingerColor={FINGER_COLORS[KEY_TO_FINGER[key]]}
              mastery={keyMetrics[key]?.accuracy !== undefined ? Math.round(keyMetrics[key].accuracy * 100) : undefined}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

const ModuleCard = ({ module, progress, isLocked, isCurrent, onSelect }) => (
  <button
    onClick={() => !isLocked && onSelect(module)}
    disabled={isLocked}
    className={`
      w-full p-4 rounded-xl text-left transition-all
      ${isLocked ? 'opacity-50 cursor-not-allowed bg-gray-100' : 'hover:shadow-lg hover:scale-[1.01] bg-white'}
      ${isCurrent ? 'ring-2 ring-blue-400' : ''}
      ${progress?.completed ? 'border-l-4 border-green-400' : ''}
    `}
  >
    <div className="flex items-center gap-3">
      <span className="text-2xl">{isLocked ? '\uD83D\uDD12' : module.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="font-bold text-gray-800 truncate">{module.name}</div>
        <div className="text-xs text-gray-500 truncate">{module.description}</div>
        {progress?.bestWpm > 0 && (
          <div className="text-xs text-blue-600 mt-1">
            Best: {progress.bestWpm} WPM &middot; {progress.bestAccuracy}%
          </div>
        )}
      </div>
      {progress?.completed && <span className="text-xl">{'\u2705'}</span>}
    </div>
  </button>
);

const SessionComplete = ({ results, module, onContinue, onMenu, onNextModule, nextModule }) => (
  <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4 flex items-center justify-center">
    <div className="bg-white rounded-3xl p-8 shadow-2xl max-w-md w-full text-center">
      <div className="text-6xl mb-4">{results.improved ? '\uD83D\uDE80' : '\uD83D\uDCAA'}</div>
      <h1 className="text-2xl font-bold text-gray-800 mb-2">
        {results.improved ? 'Great Progress!' : 'Good Practice!'}
      </h1>
      <p className="text-gray-500 mb-4">{module.name}</p>

      <div className="bg-gray-50 rounded-xl p-4 mb-6 grid grid-cols-2 gap-4">
        <div>
          <div className="text-2xl font-bold text-blue-600">{results.wpm}</div>
          <div className="text-xs text-gray-500">WPM</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-green-600">{results.accuracy}%</div>
          <div className="text-xs text-gray-500">Accuracy</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-purple-600">{results.exercises}</div>
          <div className="text-xs text-gray-500">Exercises</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-orange-500">{results.maxStreak}</div>
          <div className="text-xs text-gray-500">Best Streak</div>
        </div>
      </div>

      {results.starsEarned > 0 && (
        <div className="bg-amber-50 rounded-xl p-3 mb-4 text-amber-700 text-sm">
          +{results.starsEarned} stars earned!
        </div>
      )}

      {results.completed && (
        <div className="bg-green-50 rounded-xl p-3 mb-4 text-green-700 text-sm">
          Module completed! Targets reached.
        </div>
      )}

      <div className="space-y-2">
        {nextModule && (
          <button
            onClick={onNextModule}
            className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white py-3 rounded-xl font-bold hover:opacity-90"
          >
            Next: {nextModule.name} &rarr;
          </button>
        )}
        <button
          onClick={onContinue}
          className="w-full bg-blue-100 text-blue-700 py-3 rounded-xl font-medium hover:bg-blue-200"
        >
          Practice More
        </button>
        <button
          onClick={onMenu}
          className="w-full bg-gray-100 text-gray-600 py-2 rounded-xl text-sm hover:bg-gray-200"
        >
          Back to Menu
        </button>
      </div>
    </div>
  </div>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const initialModuleProgress = {};

export default function TypeFlow({ progressData, onRecordKeystroke, onEndSession, onUpdateGameProgress, onNavigate }) {
  const [screen, setScreen] = useState('menu');
  const [currentModule, setCurrentModule] = useState(null);

  // Session state
  const [currentText, setCurrentText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [errors, setErrors] = useState(new Set());
  const [pressedKey, setPressedKey] = useState(null);
  const [keyTimes, setKeyTimes] = useState({});
  const [keystrokes, setKeystrokes] = useState([]);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [exerciseCount, setExerciseCount] = useState(0);
  const [lastKeyTime, setLastKeyTime] = useState(null);
  const [sessionStartTime, setSessionStartTime] = useState(null);
  const [sessionResults, setSessionResults] = useState(null);

  // Settings
  const [soundEnabled, setSoundEnabled] = useState(true);

  const inputRef = useRef(null);

  // Use game-specific progress from shared engine
  const gameData = progressData.gameProgress.typeflow;
  const moduleProgress = gameData.moduleProgress || initialModuleProgress;
  const keyMetrics = progressData.keyMetrics;
  const bigramMetrics = progressData.bigramMetrics;

  // Calculate live metrics and phase
  const { liveMetrics, currentPhase } = useMemo(() => {
    if (keystrokes.length < 3) {
      return {
        liveMetrics: { wpm: 0, accuracy: 100 },
        currentPhase: PHASE.DRILL
      };
    }

    const recent = keystrokes.slice(-ROLLING_WINDOW);
    const correct = recent.filter(k => k.correct).length;
    const accuracy = Math.round((correct / recent.length) * 100);

    const times = recent.map(k => k.time).filter(t => t > 0 && t < 2000);
    const totalTime = times.reduce((a, b) => a + b, 0);
    const wpm = totalTime > 0 ? Math.round((recent.length / 5) / (totalTime / 60000)) : 0;

    const moduleIndex = currentModule ? MODULES.findIndex(m => m.id === currentModule.id) : 0;
    const phase = AdaptiveEngine.determinePhase(keystrokes, currentModule, moduleIndex);

    return {
      liveMetrics: { wpm, accuracy },
      currentPhase: phase
    };
  }, [keystrokes, currentModule]);

  const nextModule = useMemo(() => {
    if (!currentModule) return null;
    const index = MODULES.findIndex(m => m.id === currentModule.id);
    return MODULES[index + 1] || null;
  }, [currentModule]);

  // Generate new exercise
  const generateExercise = useCallback(() => {
    if (!currentModule) return;

    const moduleIndex = MODULES.findIndex(m => m.id === currentModule.id);
    const phase = AdaptiveEngine.determinePhase(keystrokes, currentModule, moduleIndex);
    const next = MODULES[moduleIndex + 1] || null;

    // Get keys due for spaced repetition review
    const reviewKeys = ProgressionEngine.getReviewKeys(progressData);

    const text = AdaptiveEngine.generateChallenge(
      phase,
      currentModule,
      next,
      keyMetrics,
      bigramMetrics,
      reviewKeys
    );

    setCurrentText(text);
    setCurrentIndex(0);
    setErrors(new Set());
    setKeyTimes({});
    setLastKeyTime(Date.now());
  }, [currentModule, keystrokes, keyMetrics, bigramMetrics, progressData]);

  // Start module
  const startModule = useCallback((module) => {
    setCurrentModule(module);
    setKeystrokes([]);
    setStreak(0);
    setMaxStreak(0);
    setExerciseCount(0);
    setSessionStartTime(Date.now());
    setScreen('practice');
  }, []);

  // Initialize exercise when entering practice
  useEffect(() => {
    if (screen === 'practice' && currentModule && !currentText) {
      generateExercise();
    }
  }, [screen, currentModule, currentText, generateExercise]);

  // Focus input
  useEffect(() => {
    if (screen === 'practice' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [screen, currentText]);

  // Handle keystrokes
  const handleKeyDown = useCallback((e) => {
    if (screen !== 'practice' || !currentText) return;

    const expected = currentText[currentIndex];
    const typed = e.key;

    if (typed.length === 1 || typed === ' ') {
      e.preventDefault();

      const now = Date.now();
      const timeTaken = lastKeyTime ? Math.min(2000, now - lastKeyTime) : 150;
      setLastKeyTime(now);

      setPressedKey(typed);
      setTimeout(() => setPressedKey(null), 70);

      const isCorrect = typed === expected;

      // Record to local session state
      setKeystrokes(prev => [...prev, { key: expected, correct: isCorrect, time: timeTaken }]);
      setKeyTimes(prev => ({ ...prev, [currentIndex]: timeTaken }));

      // Report to shared progression engine
      const previousKey = currentIndex > 0 ? currentText[currentIndex - 1] : null;
      onRecordKeystroke(expected, isCorrect, timeTaken, previousKey);

      if (isCorrect) {
        playSound('correct', soundEnabled);
        setStreak(s => {
          const newStreak = s + 1;
          setMaxStreak(m => Math.max(m, newStreak));
          return newStreak;
        });
        setCurrentIndex(i => i + 1);

        // Exercise complete
        if (currentIndex + 1 >= currentText.length) {
          playSound('complete', soundEnabled);
          setExerciseCount(c => c + 1);

          const newPhase = AdaptiveEngine.determinePhase(
            [...keystrokes, { key: expected, correct: true, time: timeTaken }],
            currentModule,
            MODULES.findIndex(m => m.id === currentModule.id)
          );

          if (newPhase !== currentPhase && newPhase !== PHASE.DRILL) {
            playSound('levelUp', soundEnabled);
          }

          setTimeout(generateExercise, 450);
        }
      } else {
        playSound('wrong', soundEnabled);
        setErrors(prev => new Set([...prev, currentIndex]));
        setStreak(0);
      }
    }
  }, [screen, currentText, currentIndex, lastKeyTime, soundEnabled, generateExercise, keystrokes, currentModule, currentPhase, onRecordKeystroke]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // End session
  const handleEndSession = () => {
    const results = {
      wpm: liveMetrics.wpm,
      accuracy: liveMetrics.accuracy,
      exercises: exerciseCount,
      maxStreak,
      improved: false,
      completed: false,
      starsEarned: 0,
    };

    // Update module progress via shared engine
    const currentProgress = moduleProgress[currentModule.id] || { bestWpm: 0, bestAccuracy: 0, completed: false, sessions: 0 };
    const newBestWpm = Math.max(currentProgress.bestWpm, liveMetrics.wpm);
    const newBestAccuracy = Math.max(currentProgress.bestAccuracy, liveMetrics.accuracy);
    const isCompleted = newBestWpm >= currentModule.targetWpm && newBestAccuracy >= currentModule.targetAccuracy;

    results.improved = newBestWpm > currentProgress.bestWpm || newBestAccuracy > currentProgress.bestAccuracy;
    results.completed = isCompleted && !currentProgress.completed;

    onUpdateGameProgress('typeflow', (prev) => ({
      ...prev,
      moduleProgress: {
        ...prev.moduleProgress,
        [currentModule.id]: {
          bestWpm: newBestWpm,
          bestAccuracy: newBestAccuracy,
          completed: isCompleted,
          sessions: (currentProgress.sessions || 0) + 1,
        }
      },
      totalSessions: (prev.totalSessions || 0) + 1,
      bestWpm: Math.max(prev.bestWpm || 0, liveMetrics.wpm),
    }));

    // Report session to shared engine
    onEndSession({
      game: 'typeflow',
      durationMs: Date.now() - (sessionStartTime || Date.now()),
      wpm: liveMetrics.wpm,
      accuracy: liveMetrics.accuracy,
      exerciseCount,
      keysUsed: currentModule.keys,
    });

    if (results.completed) {
      playSound('levelUp', soundEnabled);
    }

    setSessionResults(results);
    setScreen('complete');
  };

  // Module locking
  const isModuleLocked = (module) => {
    const index = MODULES.findIndex(m => m.id === module.id);
    if (index === 0) return false;
    const prevModule = MODULES[index - 1];
    return !moduleProgress[prevModule.id]?.completed;
  };

  const getNextModule = () => {
    if (!currentModule) return null;
    const index = MODULES.findIndex(m => m.id === currentModule.id);
    const next = MODULES[index + 1];
    if (next && !isModuleLocked(next)) return next;
    return null;
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (screen === 'menu') {
    const completedCount = MODULES.filter(m => moduleProgress[m.id]?.completed).length;

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4">
        <div className="max-w-lg mx-auto pt-6">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => onNavigate('#/')}
              className="text-gray-400 hover:text-gray-600 text-sm"
            >
              &larr; Home
            </button>
            <div className="text-center">
              <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                Type Flow
              </h1>
              <p className="text-gray-500 text-sm">Adaptive typing for growing skills</p>
            </div>
            <div className="w-12" />
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-lg mb-4">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm text-gray-500">Progress</span>
              <span className="text-sm font-medium text-blue-600">{completedCount}/{MODULES.length} modules</span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-400 to-purple-500"
                style={{ width: `${(completedCount / MODULES.length) * 100}%` }}
              />
            </div>
            {gameData.bestWpm > 0 && (
              <div className="text-center mt-3 text-sm text-gray-500">
                Best: {gameData.bestWpm} WPM &middot; {gameData.totalSessions} sessions
              </div>
            )}
          </div>

          <div className="space-y-2 mb-6">
            {MODULES.map((module) => (
              <ModuleCard
                key={module.id}
                module={module}
                progress={moduleProgress[module.id]}
                isLocked={isModuleLocked(module)}
                isCurrent={false}
                onSelect={startModule}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'complete' && sessionResults) {
    return (
      <SessionComplete
        results={sessionResults}
        module={currentModule}
        onContinue={() => {
          setCurrentText('');
          setSessionResults(null);
          startModule(currentModule);
        }}
        onMenu={() => {
          setCurrentText('');
          setSessionResults(null);
          setScreen('menu');
        }}
        onNextModule={() => {
          const next = getNextModule();
          if (next) {
            setCurrentText('');
            setSessionResults(null);
            startModule(next);
          }
        }}
        nextModule={getNextModule()}
      />
    );
  }

  // Practice screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-3">
      <input
        ref={inputRef}
        className="opacity-0 absolute pointer-events-none"
        onBlur={(e) => setTimeout(() => e.target?.focus(), 10)}
        autoFocus
      />

      <div className="max-w-2xl mx-auto">
        <div className="flex justify-between items-center mb-3">
          <button
            onClick={() => {
              if (exerciseCount > 0) handleEndSession();
              else setScreen('menu');
            }}
            className="text-gray-400 hover:text-gray-600 text-sm px-2 py-1 rounded hover:bg-white/50"
          >
            &larr; Modules
          </button>
          <div className="flex items-center gap-2">
            <span className="text-lg">{currentModule?.icon}</span>
            <span className="font-medium text-gray-700">{currentModule?.name}</span>
          </div>
          <button
            onClick={handleEndSession}
            className="bg-green-100 text-green-700 px-3 py-1 rounded-lg text-sm font-medium hover:bg-green-200"
          >
            Finish
          </button>
        </div>

        <LiveMetrics
          wpm={liveMetrics.wpm}
          accuracy={liveMetrics.accuracy}
          streak={streak}
          phase={currentPhase}
        />

        <TypeDisplay
          text={currentText}
          currentIndex={currentIndex}
          errors={errors}
          keyTimes={keyTimes}
        />

        <div className="flex justify-between items-center text-xs text-gray-400 mb-3 px-1">
          <span>Exercise {exerciseCount + 1}</span>
          <span className="font-medium">
            {currentPhase === PHASE.DRILL && 'Drill'}
            {currentPhase === PHASE.WORDS && 'Words'}
            {currentPhase === PHASE.COMPLEXITY && '+New Keys'}
            {currentPhase === PHASE.MASTERY && 'Mastery'}
          </span>
          <button
            onClick={() => setSoundEnabled(s => !s)}
            className="opacity-50 hover:opacity-100"
          >
            {soundEnabled ? '\uD83D\uDD0A' : '\uD83D\uDD07'}
          </button>
        </div>

        <Keyboard
          activeKey={currentText[currentIndex]}
          pressedKey={pressedKey}
          moduleKeys={currentModule?.keys || []}
          keyMetrics={keyMetrics}
        />

        <div className="mt-4 text-center text-xs text-gray-400">
          Keep fingers on home row &middot; Feel bumps on F and J
        </div>
      </div>
    </div>
  );
}
