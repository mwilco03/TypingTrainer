// ============================================================================
// SHARED PROGRESSION ENGINE
// Unified data model across all typing games. Manages:
// - Player profile and preferences
// - Per-key metrics with inter-keystroke interval (IKI) tracking
// - Bigram (key pair) fluency
// - Spaced repetition scheduling (Leitner boxes)
// - Session history for parent reports
// - Stars/points/achievements
// - Game-specific progress that feeds cross-game unlocks
// ============================================================================

const STORAGE_KEY = 'typingTainer';
const MAX_SESSIONS = 100; // keep last N sessions for history

// Age-appropriate benchmark norms
const AGE_NORMS = {
  '6-7':  { wpm: 10, accuracy: 70, sessionMinutes: 10 },
  '8-9':  { wpm: 18, accuracy: 80, sessionMinutes: 15 },
  '10-11': { wpm: 28, accuracy: 85, sessionMinutes: 20 },
  '12-13': { wpm: 35, accuracy: 90, sessionMinutes: 25 },
  '14+':  { wpm: 45, accuracy: 92, sessionMinutes: 30 },
};

// Spaced repetition intervals (in sessions)
const SR_INTERVALS = [1, 3, 7, 14, 30];

function createDefaultData() {
  return {
    version: 1,

    // Player profile
    profile: {
      name: '',
      ageGroup: null, // '6-7', '8-9', '10-11', '12-13', '14+'
      createdAt: Date.now(),
      totalSessions: 0,
      totalPracticeTimeMs: 0,
      dailyStreak: 0,
      longestStreak: 0,
      lastSessionDate: null, // YYYY-MM-DD
    },

    // Cumulative stars earned across all games
    stars: 0,

    // Per-key metrics (shared across all games)
    keyMetrics: {},

    // Bigram metrics
    bigramMetrics: {},

    // Per-game progress
    gameProgress: {
      typeflow: { moduleProgress: {}, bestWpm: 0, totalSessions: 0 },
      typequest: { completedLessons: [], achievements: [], totalSessions: 0 },
      pong: { highScore: 0, levelsCleared: 0, totalSessions: 0 },
      duckhunt: { highScore: 0, ducksHit: 0, totalSessions: 0 },
      kitchen: { completedTiers: [], totalSessions: 0 },
      journal: { totalSessions: 0, totalWords: 0, totalEntries: 0 },
    },

    // Session history for parent reports
    sessions: [],

    // Global achievements
    achievements: [],

    // Unlocked cosmetics
    unlockables: {
      themes: ['default'],
      activeTheme: 'default',
    },
  };
}

// ============================================================================
// Key metrics helpers
// ============================================================================

function updateKeyMetric(metrics, key, correct, ikiMs) {
  const existing = metrics[key] || {
    correct: 0,
    total: 0,
    accuracy: 0.5,
    ikiSamples: [],    // last 20 IKI measurements
    avgIKI: 0,
    ikiStdDev: 0,
    lastPracticed: 0,
    srBox: 0,          // Leitner box (0-4)
    srSessionsUntilReview: 1,
  };

  const newCorrect = existing.correct + (correct ? 1 : 0);
  const newTotal = existing.total + 1;
  const newAccuracy = newCorrect / newTotal;

  // IKI tracking (rolling window of last 20 samples)
  const ikiSamples = [...existing.ikiSamples];
  if (ikiMs > 0 && ikiMs < 3000) {
    ikiSamples.push(ikiMs);
    if (ikiSamples.length > 20) ikiSamples.shift();
  }

  const avgIKI = ikiSamples.length > 0
    ? ikiSamples.reduce((a, b) => a + b, 0) / ikiSamples.length
    : 0;

  const ikiStdDev = ikiSamples.length > 1
    ? Math.sqrt(ikiSamples.reduce((sum, v) => sum + (v - avgIKI) ** 2, 0) / ikiSamples.length)
    : 0;

  // Spaced repetition: demote to box 0 on wrong, otherwise leave box unchanged
  // (advancement happens at session boundaries via advanceSR)
  let srBox = existing.srBox;
  if (!correct && srBox > 0) {
    srBox = 0;
  }

  return {
    ...existing,
    correct: newCorrect,
    total: newTotal,
    accuracy: newAccuracy,
    ikiSamples,
    avgIKI: Math.round(avgIKI),
    ikiStdDev: Math.round(ikiStdDev),
    lastPracticed: Date.now(),
    srBox,
    srSessionsUntilReview: SR_INTERVALS[srBox] || 1,
  };
}

function updateBigramMetric(metrics, bigram, correct, ikiMs) {
  const existing = metrics[bigram] || { correct: 0, total: 0, avgIKI: 0, ikiSamples: [] };

  const newCorrect = existing.correct + (correct ? 1 : 0);
  const newTotal = existing.total + 1;

  const ikiSamples = [...(existing.ikiSamples || [])];
  if (ikiMs > 0 && ikiMs < 3000) {
    ikiSamples.push(ikiMs);
    if (ikiSamples.length > 20) ikiSamples.shift();
  }

  const avgIKI = ikiSamples.length > 0
    ? Math.round(ikiSamples.reduce((a, b) => a + b, 0) / ikiSamples.length)
    : 0;

  return {
    correct: newCorrect,
    total: newTotal,
    avgIKI,
    ikiSamples,
  };
}

// ============================================================================
// Spaced repetition
// ============================================================================

function getKeysForReview(keyMetrics) {
  const now = Date.now();
  return Object.entries(keyMetrics)
    .filter(([, m]) => {
      if (m.total < 5) return false; // not enough data yet
      return m.srSessionsUntilReview <= 0;
    })
    .sort((a, b) => a[1].accuracy - b[1].accuracy) // weakest first
    .map(([key]) => key);
}

function advanceSRAfterSession(keyMetrics, practicedKeys) {
  const updated = { ...keyMetrics };

  for (const key of Object.keys(updated)) {
    const m = { ...updated[key] };

    if (practicedKeys.includes(key)) {
      // If practiced and accuracy is high enough, advance box
      if (m.accuracy >= 0.85 && m.srBox < SR_INTERVALS.length - 1) {
        m.srBox += 1;
      }
      m.srSessionsUntilReview = SR_INTERVALS[m.srBox];
    } else {
      // Not practiced this session: decrement countdown
      m.srSessionsUntilReview = Math.max(0, (m.srSessionsUntilReview || 1) - 1);
    }

    updated[key] = m;
  }

  return updated;
}

// ============================================================================
// Stars calculation
// ============================================================================

function calculateSessionStars(wpm, accuracy, exerciseCount, norms) {
  let stars = 0;

  // Base star for completing a session
  stars += 1;

  // Accuracy stars
  if (accuracy >= (norms?.accuracy || 80)) stars += 1;
  if (accuracy >= 95) stars += 1;

  // Speed stars
  if (wpm >= (norms?.wpm || 15)) stars += 1;
  if (wpm >= (norms?.wpm || 15) * 1.5) stars += 1;

  // Volume bonus
  if (exerciseCount >= 5) stars += 1;
  if (exerciseCount >= 10) stars += 1;

  return Math.min(stars, 7); // cap at 7 per session
}

// ============================================================================
// Daily streak
// ============================================================================

function updateDailyStreak(profile) {
  const today = new Date().toISOString().slice(0, 10);
  const lastDate = profile.lastSessionDate;

  if (lastDate === today) {
    // Already practiced today
    return profile;
  }

  const updated = { ...profile, lastSessionDate: today };

  if (lastDate) {
    const last = new Date(lastDate);
    const now = new Date(today);
    const diffDays = Math.round((now - last) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      updated.dailyStreak = (profile.dailyStreak || 0) + 1;
      updated.longestStreak = Math.max(updated.longestStreak || 0, updated.dailyStreak);
    } else if (diffDays > 1) {
      updated.dailyStreak = 1;
    }
  } else {
    updated.dailyStreak = 1;
  }

  return updated;
}

// ============================================================================
// Mastered keys (for cross-game unlocking)
// ============================================================================

function getMasteredKeys(keyMetrics) {
  return Object.entries(keyMetrics)
    .filter(([, m]) => m.total >= 20 && m.accuracy >= 0.85 && m.ikiStdDev < 150)
    .map(([key]) => key);
}

function getWeakKeys(keyMetrics, threshold = 0.75) {
  return Object.entries(keyMetrics)
    .filter(([, m]) => m.total >= 10 && m.accuracy < threshold)
    .sort((a, b) => a[1].accuracy - b[1].accuracy)
    .map(([key]) => key);
}

// ============================================================================
// Parent report data
// ============================================================================

function generateReportData(data) {
  const recentSessions = data.sessions.slice(-7);
  const totalSessions = recentSessions.length;

  if (totalSessions === 0) {
    return {
      summary: 'No practice sessions this week yet.',
      keysLearned: 0,
      avgWpm: 0,
      avgAccuracy: 0,
      fluencyChange: 0,
      weakKeys: [],
      strongKeys: [],
      sessionsThisWeek: 0,
      streak: data.profile.dailyStreak,
      totalStars: data.stars,
      suggestions: ['Start with the home row lesson to build a strong foundation.'],
    };
  }

  const avgWpm = Math.round(
    recentSessions.reduce((s, r) => s + (r.wpm || 0), 0) / totalSessions
  );
  const avgAccuracy = Math.round(
    recentSessions.reduce((s, r) => s + (r.accuracy || 0), 0) / totalSessions
  );

  // Compare first half vs second half of recent sessions for fluency change
  const half = Math.ceil(totalSessions / 2);
  const firstHalf = recentSessions.slice(0, half);
  const secondHalf = recentSessions.slice(half);
  const firstAvg = firstHalf.reduce((s, r) => s + (r.wpm || 0), 0) / firstHalf.length;
  const secondAvg = secondHalf.length > 0
    ? secondHalf.reduce((s, r) => s + (r.wpm || 0), 0) / secondHalf.length
    : firstAvg;
  const fluencyChange = secondAvg > 0
    ? Math.round(((secondAvg - firstAvg) / Math.max(firstAvg, 1)) * 100)
    : 0;

  const masteredKeys = getMasteredKeys(data.keyMetrics);
  const weakKeys = getWeakKeys(data.keyMetrics);

  const suggestions = [];
  if (weakKeys.length > 0) {
    suggestions.push(`Extra practice recommended for: ${weakKeys.slice(0, 4).join(', ').toUpperCase()}`);
  }
  if (avgAccuracy < 80) {
    suggestions.push('Focus on accuracy over speed. Slow down and hit the right keys.');
  }
  if (totalSessions < 3) {
    suggestions.push('Try to practice at least 3-4 times per week for best results.');
  }
  if (fluencyChange < 0) {
    suggestions.push('Speed dipped this week. A short warm-up drill at the start of each session helps.');
  }

  const norms = AGE_NORMS[data.profile.ageGroup] || AGE_NORMS['10-11'];
  let comparedToNorm = 'on track';
  if (avgWpm >= norms.wpm * 1.2) comparedToNorm = 'above expectations';
  else if (avgWpm < norms.wpm * 0.7) comparedToNorm = 'building up';

  return {
    summary: `${totalSessions} sessions this week. Average ${avgWpm} WPM at ${avgAccuracy}% accuracy.`,
    keysLearned: masteredKeys.length,
    avgWpm,
    avgAccuracy,
    fluencyChange,
    weakKeys: weakKeys.slice(0, 5),
    strongKeys: masteredKeys.slice(0, 10),
    sessionsThisWeek: totalSessions,
    streak: data.profile.dailyStreak,
    totalStars: data.stars,
    comparedToNorm,
    suggestions,
  };
}

// ============================================================================
// QR challenge encoding (compressed level for parent to try)
// ============================================================================

function encodeParentChallenge(keyMetrics) {
  // Build a challenge from the kid's weakest keys so the parent
  // can experience exactly what's hard
  const weakKeys = getWeakKeys(keyMetrics, 0.9).slice(0, 6);
  if (weakKeys.length === 0) return null;

  const challenge = {
    k: weakKeys,
    t: Date.now(),
  };

  // Simple base64 encoding -- the QR code will contain a URL
  // like /TypingTainer/#/challenge/<encoded>
  try {
    return btoa(JSON.stringify(challenge));
  } catch {
    return null;
  }
}

function decodeParentChallenge(encoded) {
  try {
    return JSON.parse(atob(encoded));
  } catch {
    return null;
  }
}

// ============================================================================
// Main API
// ============================================================================

const ProgressionEngine = {
  AGE_NORMS,

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Merge with defaults to handle schema evolution
        const defaults = createDefaultData();
        return {
          ...defaults,
          ...parsed,
          profile: { ...defaults.profile, ...parsed.profile },
          gameProgress: {
            ...defaults.gameProgress,
            ...parsed.gameProgress,
            typeflow: { ...defaults.gameProgress.typeflow, ...(parsed.gameProgress?.typeflow || {}) },
            typequest: { ...defaults.gameProgress.typequest, ...(parsed.gameProgress?.typequest || {}) },
            pong: { ...defaults.gameProgress.pong, ...(parsed.gameProgress?.pong || {}) },
            duckhunt: { ...defaults.gameProgress.duckhunt, ...(parsed.gameProgress?.duckhunt || {}) },
            kitchen: { ...defaults.gameProgress.kitchen, ...(parsed.gameProgress?.kitchen || {}) },
            journal: { ...defaults.gameProgress.journal, ...(parsed.gameProgress?.journal || {}) },
          },
          unlockables: { ...defaults.unlockables, ...(parsed.unlockables || {}) },
        };
      }
    } catch (e) {
      console.warn('Failed to load progress data:', e);
    }
    return createDefaultData();
  },

  save(data) {
    try {
      // Strip IKI samples from storage to save space (keep computed values)
      const stripped = {
        ...data,
        keyMetrics: Object.fromEntries(
          Object.entries(data.keyMetrics).map(([k, v]) => {
            const { ikiSamples, ...rest } = v;
            return [k, { ...rest, ikiSamples: (ikiSamples || []).slice(-10) }];
          })
        ),
        bigramMetrics: Object.fromEntries(
          Object.entries(data.bigramMetrics).map(([k, v]) => {
            const { ikiSamples, ...rest } = v;
            return [k, { ...rest, ikiSamples: (ikiSamples || []).slice(-5) }];
          })
        ),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stripped));
    } catch (e) {
      console.warn('Failed to save progress data:', e);
    }
  },

  // Record a single keystroke (call from any game)
  recordKeystroke(data, key, correct, ikiMs, previousKey) {
    const keyMetrics = {
      ...data.keyMetrics,
      [key]: updateKeyMetric(data.keyMetrics, key, correct, ikiMs),
    };

    let bigramMetrics = { ...data.bigramMetrics };
    if (previousKey) {
      const bigram = previousKey + key;
      bigramMetrics[bigram] = updateBigramMetric(bigramMetrics, bigram, correct, ikiMs);
    }

    return { ...data, keyMetrics, bigramMetrics };
  },

  // End a session (call when player finishes a game round)
  endSession(data, { game, durationMs, wpm, accuracy, exerciseCount, keysUsed }) {
    const norms = AGE_NORMS[data.profile.ageGroup] || AGE_NORMS['10-11'];
    const earnedStars = calculateSessionStars(wpm, accuracy, exerciseCount, norms);

    const session = {
      date: Date.now(),
      dateStr: new Date().toISOString().slice(0, 10),
      game,
      durationMs,
      wpm,
      accuracy,
      exerciseCount,
      starsEarned: earnedStars,
    };

    const sessions = [...data.sessions, session];
    if (sessions.length > MAX_SESSIONS) sessions.shift();

    // Advance spaced repetition for practiced keys
    const keyMetrics = advanceSRAfterSession(data.keyMetrics, keysUsed || []);

    const profile = {
      ...updateDailyStreak(data.profile),
      totalSessions: data.profile.totalSessions + 1,
      totalPracticeTimeMs: data.profile.totalPracticeTimeMs + (durationMs || 0),
    };

    const updated = {
      ...data,
      profile,
      keyMetrics,
      stars: data.stars + earnedStars,
      sessions,
    };

    this.save(updated);
    return { data: updated, starsEarned: earnedStars };
  },

  // Get keys that are due for spaced review
  getReviewKeys(data) {
    return getKeysForReview(data.keyMetrics);
  },

  // Get mastered and weak keys
  getMasteredKeys(data) {
    return getMasteredKeys(data.keyMetrics);
  },

  getWeakKeys(data) {
    return getWeakKeys(data.keyMetrics);
  },

  // Get age-appropriate norms
  getNorms(data) {
    return AGE_NORMS[data.profile.ageGroup] || AGE_NORMS['10-11'];
  },

  // Generate parent report
  getReport(data) {
    return generateReportData(data);
  },

  // QR challenge for parent
  encodeChallenge(data) {
    return encodeParentChallenge(data.keyMetrics);
  },

  decodeChallenge(encoded) {
    return decodeParentChallenge(encoded);
  },

  // Update game-specific progress
  updateGameProgress(data, game, updater) {
    return {
      ...data,
      gameProgress: {
        ...data.gameProgress,
        [game]: updater(data.gameProgress[game]),
      },
    };
  },

  // Reset all data
  reset() {
    localStorage.removeItem(STORAGE_KEY);
    return createDefaultData();
  },
};

export default ProgressionEngine;
