import React, { useState, useEffect, useCallback, useRef } from 'react';

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

const HOME_ROW_KEYS = ['a', 's', 'd', 'f', 'j', 'k', 'l', ';'];

const LESSONS = [
  {
    id: 1,
    name: "Home Row Heroes",
    description: "Meet your finger homes! Keep your fingers on ASDF and JKL;",
    keys: ['a', 's', 'd', 'f', 'j', 'k', 'l', ';'],
    exercises: [
      "fff jjj fff jjj",
      "ddd kkk ddd kkk",
      "sss lll sss lll",
      "aaa ;;; aaa ;;;",
      "asdf jkl; asdf jkl;",
      "fjfj dkdk slsl a;a;",
      "fall sad lad ask dad"
    ]
  },
  {
    id: 2,
    name: "Reaching for G and H",
    description: "Your index fingers stretch to reach G and H!",
    keys: ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';'],
    exercises: [
      "ggg hhh ggg hhh",
      "fgf jhj fgf jhj",
      "glad had gash hall",
      "half flag dash hash"
    ]
  },
  {
    id: 3,
    name: "Top Row Adventure",
    description: "Reach up to find E, R, U, and I!",
    keys: ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', 'e', 'r', 'u', 'i'],
    exercises: [
      "eee rrr uuu iii",
      "red fur ride fire",
      "dark ride like sure",
      "girl fear hear idea"
    ]
  },
  {
    id: 4,
    name: "More Top Row",
    description: "Now add T, Y, W, and O!",
    keys: ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', 'e', 'r', 'u', 'i', 't', 'y', 'w', 'o'],
    exercises: [
      "ttt yyy www ooo",
      "today story world",
      "write your story today",
      "yellow tower water"
    ]
  },
  {
    id: 5,
    name: "Bottom Row Basics",
    description: "Reach down to find the bottom row keys!",
    keys: ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', 'e', 'r', 'u', 'i', 't', 'y', 'w', 'o', 'z', 'x', 'c', 'v', 'b', 'n', 'm'],
    exercises: [
      "zzz xxx ccc vvv bbb nnn mmm",
      "zebra box cave van cabin",
      "amazing excited nervous",
      "climb above broken"
    ]
  },
  {
    id: 6,
    name: "Full Keyboard Fun",
    description: "You know all the letters now! Practice everything!",
    keys: Object.keys(KEY_TO_FINGER),
    exercises: [
      "the quick brown fox jumps",
      "pack my box with five dozen",
      "lazy dogs sleep all day long",
      "typing is fun when you practice"
    ]
  }
];

const ACHIEVEMENTS = [
  { id: 'first_lesson', name: 'First Steps', description: 'Complete your first lesson' },
  { id: 'speed_demon', name: 'Speed Demon', description: 'Type 20 words per minute' },
  { id: 'perfect_10', name: 'Perfect Ten', description: 'Get 100% accuracy on an exercise' },
  { id: 'home_master', name: 'Home Row Master', description: 'Complete all home row exercises' },
  { id: 'full_keyboard', name: 'Keyboard Explorer', description: 'Use every letter of the alphabet' }
];

const playSound = (type) => {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    const soundConfig = {
      correct: { frequency: 800, duration: 0.05 },
      wrong: { frequency: 200, duration: 0.15 },
      complete: { frequency: 600, duration: 0.2 }
    };

    const config = soundConfig[type] || soundConfig.correct;
    oscillator.frequency.value = config.frequency;
    oscillator.type = 'sine';
    gainNode.gain.value = 0.1;

    oscillator.start();
    oscillator.stop(audioContext.currentTime + config.duration);
  } catch (e) {}
};

// ============================================================================
// COMPONENTS
// ============================================================================

const Key = ({ letter, isActive, isPressed, isInLesson, showFingerHint }) => {
  const finger = KEY_TO_FINGER[letter.toLowerCase()];
  const fingerColor = FINGER_COLORS[finger];
  const isHomeRow = HOME_ROW_KEYS.includes(letter.toLowerCase());

  return (
    <div
      className={`
        flex items-center justify-center font-bold rounded-lg transition-all duration-100 select-none
        ${letter === ' ' ? 'w-48 h-12' : 'w-12 h-12'}
        ${isPressed ? 'bg-blue-400 scale-95' : ''}
        ${!isInLesson ? 'bg-gray-300 opacity-50' : 'bg-gray-200'}
        border-2 ${isHomeRow ? 'border-blue-500' : 'border-gray-400'}
      `}
      style={{
        backgroundColor: isActive && showFingerHint ? fingerColor : undefined,
        boxShadow: isActive ? '0 0 20px ' + fingerColor : 'none'
      }}
    >
      <span className={`text-lg ${isActive ? 'text-white' : 'text-gray-700'}`}>
        {letter === ' ' ? 'SPACE' : letter.toUpperCase()}
      </span>
    </div>
  );
};

const Keyboard = ({ activeKey, pressedKey, lessonKeys, showFingerHint }) => (
  <div className="bg-gray-100 p-6 rounded-2xl shadow-inner">
    {KEYBOARD_ROWS.map((row, rowIndex) => (
      <div key={rowIndex} className="flex justify-center gap-1 mb-1" style={{ marginLeft: rowIndex * 20 }}>
        {row.map((key) => (
          <Key
            key={key}
            letter={key}
            isActive={activeKey?.toLowerCase() === key.toLowerCase()}
            isPressed={pressedKey?.toLowerCase() === key.toLowerCase()}
            isInLesson={lessonKeys.includes(key.toLowerCase())}
            showFingerHint={showFingerHint}
          />
        ))}
      </div>
    ))}
  </div>
);

const FingerGuide = () => {
  const fingers = [
    { name: 'Pinky', color: FINGER_COLORS.leftPinky, keys: 'Q A Z' },
    { name: 'Ring', color: FINGER_COLORS.leftRing, keys: 'W S X' },
    { name: 'Middle', color: FINGER_COLORS.leftMiddle, keys: 'E D C' },
    { name: 'Index', color: FINGER_COLORS.leftIndex, keys: 'R F V T G B' },
    { name: 'Thumb', color: FINGER_COLORS.thumb, keys: 'SPACE' },
    { name: 'Index', color: FINGER_COLORS.rightIndex, keys: 'Y H N U J M' },
    { name: 'Middle', color: FINGER_COLORS.rightMiddle, keys: 'I K ,' },
    { name: 'Ring', color: FINGER_COLORS.rightRing, keys: 'O L .' },
    { name: 'Pinky', color: FINGER_COLORS.rightPinky, keys: 'P ; /' },
  ];

  return (
    <div className="flex justify-center gap-2 mb-4 flex-wrap">
      {fingers.map((finger, i) => (
        <div key={i} className="flex items-center gap-1 text-xs">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: finger.color }} />
          <span className="text-gray-600">{finger.name}</span>
        </div>
      ))}
    </div>
  );
};

const ProgressBar = ({ current, total, accuracy }) => {
  const percentage = total > 0 ? (current / total) * 100 : 0;

  return (
    <div className="w-full mb-4">
      <div className="flex justify-between text-sm text-gray-600 mb-1">
        <span>Progress: {current}/{total}</span>
        <span>Accuracy: {accuracy}%</span>
      </div>
      <div className="w-full h-4 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

const TypeDisplay = ({ text, currentIndex, errors }) => (
  <div className="text-3xl font-mono p-6 bg-white rounded-xl shadow-inner min-h-24 flex items-center justify-center flex-wrap">
    {text.split('').map((char, i) => {
      const isError = errors.has(i);
      const isCurrent = i === currentIndex;
      const isTyped = i < currentIndex;

      return (
        <span
          key={i}
          className={`
            ${isCurrent ? 'bg-yellow-300 animate-pulse' : ''}
            ${isTyped && !isError ? 'text-green-600' : ''}
            ${isError ? 'text-red-500 bg-red-100' : ''}
            ${!isTyped && !isCurrent ? 'text-gray-400' : ''}
            px-0.5 rounded
          `}
        >
          {char === ' ' ? '\u00A0' : char}
        </span>
      );
    })}
  </div>
);

const LessonCard = ({ lesson, isCompleted, onSelect }) => (
  <button
    onClick={() => onSelect(lesson)}
    className={`
      p-4 rounded-xl text-left transition-all w-full
      ${isCompleted ? 'bg-white border-2 border-gray-200 opacity-75' : 'bg-white border-2 border-gray-200'}
      hover:shadow-lg hover:scale-[1.01]
    `}
  >
    <div className="flex items-center gap-2">
      <span className="text-2xl">{isCompleted ? '\u2705' : '\uD83D\uDCDA'}</span>
      <div>
        <h3 className="font-bold text-gray-800">{lesson.name}</h3>
        <p className="text-sm text-gray-500">{lesson.description}</p>
      </div>
    </div>
  </button>
);

const Stats = ({ wpm, accuracy, streak }) => (
  <div className="flex justify-center gap-8 mb-4">
    <div className="text-center">
      <div className="text-3xl font-bold text-blue-600">{wpm}</div>
      <div className="text-sm text-gray-500">WPM</div>
    </div>
    <div className="text-center">
      <div className="text-3xl font-bold text-green-600">{accuracy}%</div>
      <div className="text-sm text-gray-500">Accuracy</div>
    </div>
    <div className="text-center">
      <div className="text-3xl font-bold text-orange-500">{streak}</div>
      <div className="text-sm text-gray-500">Streak</div>
    </div>
  </div>
);

const AchievementPopup = ({ achievement, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-4 right-4 bg-gradient-to-r from-yellow-400 to-orange-500 text-white p-4 rounded-xl shadow-2xl animate-bounce z-50">
      <div className="text-2xl mb-1">{achievement.name}</div>
      <div className="text-sm opacity-90">{achievement.description}</div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function TypingTutor({ progressData, onRecordKeystroke, onEndSession, onUpdateGameProgress, onNavigate }) {
  const [screen, setScreen] = useState('menu');
  const [currentLesson, setCurrentLesson] = useState(null);
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [errors, setErrors] = useState(new Set());
  const [pressedKey, setPressedKey] = useState(null);
  const [newAchievement, setNewAchievement] = useState(null);
  const [showFingerHint, setShowFingerHint] = useState(true);
  const [streak, setStreak] = useState(0);
  const [totalChars, setTotalChars] = useState(0);
  const [correctChars, setCorrectChars] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [lastKeyTime, setLastKeyTime] = useState(null);
  const [wpm, setWpm] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState(null);

  const inputRef = useRef(null);

  // Use shared progress data
  const gameData = progressData.gameProgress.typequest;
  const completedLessons = new Set(gameData.completedLessons || []);
  const achievements = gameData.achievements || [];

  const currentText = currentLesson?.exercises[exerciseIndex] || '';
  const accuracy = totalChars > 0 ? Math.round((correctChars / totalChars) * 100) : 100;

  const unlockAchievement = useCallback((id) => {
    if (!achievements.includes(id)) {
      const achievement = ACHIEVEMENTS.find(a => a.id === id);
      onUpdateGameProgress('typequest', (prev) => ({
        ...prev,
        achievements: [...(prev.achievements || []), id],
      }));
      setNewAchievement(achievement);
      playSound('complete');
    }
  }, [achievements, onUpdateGameProgress]);

  const handleKeyDown = useCallback((e) => {
    if (screen !== 'practice' || !currentText) return;

    if (!startTime) {
      setStartTime(Date.now());
    }

    const expectedChar = currentText[currentIndex];
    const typedChar = e.key;

    if (typedChar.length === 1 || typedChar === ' ') {
      e.preventDefault();

      const now = Date.now();
      const timeTaken = lastKeyTime ? Math.min(2000, now - lastKeyTime) : 150;
      setLastKeyTime(now);

      setPressedKey(typedChar);
      setTimeout(() => setPressedKey(null), 100);

      setTotalChars(prev => prev + 1);

      const isCorrect = typedChar === expectedChar;

      // Report to shared progression engine
      const previousKey = currentIndex > 0 ? currentText[currentIndex - 1] : null;
      onRecordKeystroke(expectedChar, isCorrect, timeTaken, previousKey);

      if (isCorrect) {
        playSound('correct');
        setCorrectChars(prev => prev + 1);
        setStreak(prev => prev + 1);
        setCurrentIndex(prev => prev + 1);

        const elapsedMinutes = (Date.now() - (startTime || Date.now())) / 60000;
        const wordsTyped = (currentIndex + 1) / 5;
        if (elapsedMinutes > 0) {
          setWpm(Math.round(wordsTyped / elapsedMinutes));
        }

        if (currentIndex + 1 >= currentText.length) {
          if (accuracy === 100) {
            unlockAchievement('perfect_10');
          }
          if (wpm >= 20) {
            unlockAchievement('speed_demon');
          }

          if (exerciseIndex + 1 < currentLesson.exercises.length) {
            setExerciseIndex(prev => prev + 1);
            setCurrentIndex(0);
            setErrors(new Set());
            setStartTime(null);
            setLastKeyTime(null);
          } else {
            // Lesson complete
            onUpdateGameProgress('typequest', (prev) => ({
              ...prev,
              completedLessons: [...new Set([...(prev.completedLessons || []), currentLesson.id])],
              totalSessions: (prev.totalSessions || 0) + 1,
            }));

            unlockAchievement('first_lesson');
            if (currentLesson.id === 1) {
              unlockAchievement('home_master');
            }
            if (currentLesson.id === 6) {
              unlockAchievement('full_keyboard');
            }

            // Report session
            onEndSession({
              game: 'typequest',
              durationMs: Date.now() - (sessionStartTime || Date.now()),
              wpm,
              accuracy,
              exerciseCount: exerciseIndex + 1,
              keysUsed: currentLesson.keys,
            });

            setScreen('complete');
          }
        }
      } else {
        playSound('wrong');
        setErrors(prev => new Set([...prev, currentIndex]));
        setStreak(0);
      }
    }
  }, [screen, currentText, currentIndex, currentLesson, exerciseIndex, startTime, lastKeyTime, accuracy, wpm, unlockAchievement, onRecordKeystroke, onEndSession, onUpdateGameProgress, sessionStartTime]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    if (screen === 'practice' && inputRef.current) {
      inputRef.current.focus();
    }
  }, [screen]);

  const startLesson = (lesson) => {
    setCurrentLesson(lesson);
    setExerciseIndex(0);
    setCurrentIndex(0);
    setErrors(new Set());
    setTotalChars(0);
    setCorrectChars(0);
    setStartTime(null);
    setLastKeyTime(null);
    setWpm(0);
    setSessionStartTime(Date.now());
    setScreen('practice');
  };

  const resetExercise = () => {
    setCurrentIndex(0);
    setErrors(new Set());
    setStartTime(null);
    setLastKeyTime(null);
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  if (screen === 'menu') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-100 to-purple-100 p-8">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => onNavigate('#/')}
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              &larr; Home
            </button>
            <div className="text-center">
              <h1 className="text-4xl font-bold text-blue-600">Type Quest!</h1>
              <p className="text-lg text-gray-600">Learn to type like a pro!</p>
            </div>
            <div className="w-12" />
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-xl mb-6">
            <h2 className="text-2xl font-bold text-gray-700 mb-4">Choose Your Adventure</h2>
            <div className="space-y-3">
              {LESSONS.map((lesson) => (
                <LessonCard
                  key={lesson.id}
                  lesson={lesson}
                  isCompleted={completedLessons.has(lesson.id)}
                  onSelect={startLesson}
                />
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-xl">
            <h2 className="text-2xl font-bold text-gray-700 mb-4">Achievements</h2>
            <div className="grid grid-cols-2 gap-3">
              {ACHIEVEMENTS.map((a) => (
                <div
                  key={a.id}
                  className={`p-3 rounded-lg ${achievements.includes(a.id) ? 'bg-yellow-100' : 'bg-gray-100 opacity-50'}`}
                >
                  <div className="font-bold">{a.name}</div>
                  <div className="text-xs text-gray-500">{a.description}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 flex items-center justify-center gap-2">
            <label className="flex items-center gap-2 text-gray-600">
              <input
                type="checkbox"
                checked={showFingerHint}
                onChange={(e) => setShowFingerHint(e.target.checked)}
                className="w-5 h-5"
              />
              Show finger color hints
            </label>
          </div>
        </div>
      </div>
    );
  }

  if (screen === 'complete') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-100 to-blue-100 p-8 flex items-center justify-center">
        <div className="bg-white rounded-3xl p-12 shadow-2xl text-center max-w-md">
          <div className="text-8xl mb-4">{'\uD83C\uDF89'}</div>
          <h1 className="text-4xl font-bold text-green-600 mb-4">Amazing!</h1>
          <p className="text-xl text-gray-600 mb-6">
            You completed "{currentLesson?.name}"!
          </p>
          <Stats wpm={wpm} accuracy={accuracy} streak={streak} />
          <div className="space-y-3 mt-6">
            <button
              onClick={() => startLesson(currentLesson)}
              className="w-full bg-blue-500 text-white py-3 rounded-xl font-bold hover:bg-blue-600 transition"
            >
              Practice Again
            </button>
            <button
              onClick={() => setScreen('menu')}
              className="w-full bg-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-300 transition"
            >
              Back to Lessons
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Practice screen
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-purple-50 p-4">
      <input
        ref={inputRef}
        className="opacity-0 absolute pointer-events-none"
        onBlur={(e) => setTimeout(() => e.target?.focus(), 10)}
        autoFocus
      />

      {newAchievement && (
        <AchievementPopup
          achievement={newAchievement}
          onClose={() => setNewAchievement(null)}
        />
      )}

      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={() => {
              if (sessionStartTime && currentIndex > 0) {
                onEndSession({
                  game: 'typequest',
                  durationMs: Date.now() - sessionStartTime,
                  wpm,
                  accuracy,
                  exerciseCount: exerciseIndex + 1,
                  keysUsed: currentLesson?.keys || [],
                });
              }
              setScreen('menu');
            }}
            className="text-gray-500 hover:text-gray-700 font-medium"
          >
            &larr; Back to Lessons
          </button>
          <h2 className="text-xl font-bold text-blue-600">{currentLesson?.name}</h2>
          <button
            onClick={resetExercise}
            className="text-orange-500 hover:text-orange-700 font-medium"
          >
            Restart
          </button>
        </div>

        <Stats wpm={wpm} accuracy={accuracy} streak={streak} />

        <ProgressBar
          current={currentIndex}
          total={currentText.length}
          accuracy={accuracy}
        />

        <TypeDisplay
          text={currentText}
          currentIndex={currentIndex}
          errors={errors}
        />

        <div className="mt-4 text-center text-gray-500 mb-4">
          Exercise {exerciseIndex + 1} of {currentLesson?.exercises.length}
        </div>

        {showFingerHint && <FingerGuide />}

        <Keyboard
          activeKey={currentText[currentIndex]}
          pressedKey={pressedKey}
          lessonKeys={currentLesson?.keys || []}
          showFingerHint={showFingerHint}
        />

        <div className="mt-6 text-center text-gray-400 text-sm">
          Keep your fingers on the home row (ASDF JKL;) and feel for the bumps on F and J!
        </div>
      </div>
    </div>
  );
}
