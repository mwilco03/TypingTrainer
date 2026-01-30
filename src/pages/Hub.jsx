import React, { useState } from 'react';
import ProgressionEngine from '../engine/ProgressionEngine';

const GAMES = [
  {
    id: 'typeflow',
    route: '#/typeflow',
    name: 'Type Flow',
    tagline: 'Adaptive lessons that grow with you',
    icon: '\u2328\uFE0F',
    color: 'from-blue-500 to-indigo-600',
    description: '10 progressive modules from home row to full keyboard. Drills adapt to your weak spots in real time.',
    category: 'lessons',
  },
  {
    id: 'typequest',
    route: '#/typequest',
    name: 'Type Quest',
    tagline: 'Structured lessons with achievements',
    icon: '\uD83D\uDCDA',
    color: 'from-purple-500 to-pink-600',
    description: '6 guided lessons with exercises, streaks, and achievements to unlock.',
    category: 'lessons',
  },
  {
    id: 'pong',
    route: '#/pong',
    name: 'Type Pong',
    tagline: 'Type the word before it scores!',
    icon: '\uD83C\uDFD3',
    color: 'from-green-500 to-teal-600',
    description: 'A word bounces back and forth. Type it before it reaches your side. Speed increases as you level up.',
    category: 'arcade',
  },
  {
    id: 'duckhunt',
    route: '#/duckhunt',
    name: 'Word Hunt',
    tagline: 'Type fast or the words fly away!',
    icon: '\uD83E\uDD86',
    color: 'from-orange-500 to-red-600',
    description: 'Words appear and start flying away. Type them to score before they escape!',
    category: 'arcade',
  },
  {
    id: 'kitchen',
    route: '#/kitchen',
    name: 'Kitchen I Spy',
    tagline: 'Find and type hidden items',
    icon: '\uD83C\uDF73',
    color: 'from-amber-500 to-orange-600',
    description: 'A relaxing kitchen scene. Read the clue, find the item, type its name. No timer, no pressure.',
    category: 'break',
  },
  {
    id: 'journal',
    route: '#/journal',
    name: 'Typing Journal',
    tagline: 'Free writing with your mastered keys',
    icon: '\uD83D\uDCD3',
    color: 'from-yellow-500 to-amber-600',
    description: 'Write anything you want! Only your learned keys work. See what stories you can tell.',
    category: 'creative',
  },
];

function GameCard({ game, onNavigate }) {
  const isDisabled = game.comingSoon;

  return (
    <button
      onClick={() => !isDisabled && onNavigate(game.route)}
      disabled={isDisabled}
      className={`
        relative w-full text-left rounded-2xl overflow-hidden transition-all
        ${isDisabled
          ? 'opacity-60 cursor-not-allowed'
          : 'hover:shadow-xl hover:scale-[1.02] active:scale-[0.99]'
        }
      `}
    >
      <div className={`bg-gradient-to-br ${game.color} p-5 text-white`}>
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">{game.icon}</span>
              <h3 className="text-lg font-bold truncate">{game.name}</h3>
            </div>
            <p className="text-sm text-white/80 mb-2">{game.tagline}</p>
            <p className="text-xs text-white/60 line-clamp-2">{game.description}</p>
          </div>
          {isDisabled && (
            <span className="bg-white/20 text-white text-xs px-2 py-1 rounded-full ml-2 shrink-0">
              Soon
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function ProfileSetup({ profile, onSetProfile, onClose }) {
  const [name, setName] = useState(profile.name || '');
  const [ageGroup, setAgeGroup] = useState(profile.ageGroup || '');

  const handleSave = () => {
    onSetProfile({ name: name.trim(), ageGroup: ageGroup || null });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Player Profile</h2>

        <label className="block mb-3">
          <span className="text-sm text-gray-600 mb-1 block">Name (optional)</span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none"
            maxLength={30}
          />
        </label>

        <label className="block mb-4">
          <span className="text-sm text-gray-600 mb-1 block">Age group (helps set goals)</span>
          <select
            value={ageGroup}
            onChange={(e) => setAgeGroup(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent outline-none bg-white"
          >
            <option value="">Select...</option>
            <option value="6-7">6-7 years</option>
            <option value="8-9">8-9 years</option>
            <option value="10-11">10-11 years</option>
            <option value="12-13">12-13 years</option>
            <option value="14+">14+ years</option>
          </select>
        </label>

        {ageGroup && (
          <div className="bg-blue-50 rounded-lg p-3 mb-4 text-sm text-blue-700">
            Goals for {ageGroup}: {ProgressionEngine.AGE_NORMS[ageGroup]?.wpm} WPM,{' '}
            {ProgressionEngine.AGE_NORMS[ageGroup]?.accuracy}% accuracy,{' '}
            {ProgressionEngine.AGE_NORMS[ageGroup]?.sessionMinutes} min sessions
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 py-2 rounded-lg bg-blue-500 text-white font-medium hover:bg-blue-600"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Hub({ progressData, onNavigate, onSetProfile, onShowAccessibility }) {
  const [showProfile, setShowProfile] = useState(false);

  const { profile, stars } = progressData;
  const masteredKeys = ProgressionEngine.getMasteredKeys(progressData);

  const lessons = GAMES.filter(g => g.category === 'lessons');
  const arcade = GAMES.filter(g => g.category === 'arcade');
  const creative = GAMES.filter(g => g.category === 'creative');
  const breaks = GAMES.filter(g => g.category === 'break');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {showProfile && (
        <ProfileSetup
          profile={profile}
          onSetProfile={onSetProfile}
          onClose={() => setShowProfile(false)}
        />
      )}

      <div className="max-w-lg mx-auto px-4 py-6">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
            Typing Tainer
          </h1>
          <p className="text-gray-500 text-sm mt-1">Build real typing skills through play</p>
        </div>

        {/* Stats bar */}
        <div className="bg-white rounded-2xl p-4 shadow-sm mb-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowProfile(true)}
              className="flex items-center gap-2 hover:bg-gray-50 rounded-lg px-2 py-1 -ml-2 transition-colors"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white text-sm font-bold">
                {profile.name ? profile.name[0].toUpperCase() : '?'}
              </div>
              <div className="text-left">
                <div className="text-sm font-medium text-gray-800">
                  {profile.name || 'Set up profile'}
                </div>
                <div className="text-xs text-gray-400">
                  {profile.ageGroup ? `Age ${profile.ageGroup}` : 'Tap to set age group'}
                </div>
              </div>
            </button>

            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-lg font-bold text-amber-500">{stars}</div>
                <div className="text-xs text-gray-400">Stars</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-orange-500">{profile.dailyStreak || 0}</div>
                <div className="text-xs text-gray-400">Streak</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-blue-500">{masteredKeys.length}</div>
                <div className="text-xs text-gray-400">Keys</div>
              </div>
            </div>
          </div>

          {/* Session count hint */}
          {profile.totalSessions === 0 && (
            <div className="mt-3 bg-blue-50 rounded-lg p-3 text-sm text-blue-700">
              Welcome! Start with <strong>Type Flow</strong> or <strong>Type Quest</strong> to learn the home row.
            </div>
          )}

          {profile.dailyStreak > 0 && profile.lastSessionDate === new Date().toISOString().slice(0, 10) && (
            <div className="mt-3 bg-green-50 rounded-lg p-2 text-sm text-green-700 text-center">
              You've practiced today. Nice work!
            </div>
          )}
        </div>

        {/* Lessons section */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 px-1">
            Lessons
          </h2>
          <div className="space-y-3">
            {lessons.map(game => (
              <GameCard
                key={game.id}
                game={game}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>

        {/* Arcade section */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 px-1">
            Arcade
          </h2>
          <div className="space-y-3">
            {arcade.map(game => (
              <GameCard
                key={game.id}
                game={game}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>

        {/* Creative section */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 px-1">
            Creative
          </h2>
          <div className="space-y-3">
            {creative.map(game => (
              <GameCard
                key={game.id}
                game={game}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>

        {/* Break games section */}
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 px-1">
            Brain Break
          </h2>
          <div className="space-y-3">
            {breaks.map(game => (
              <GameCard
                key={game.id}
                game={game}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>

        {/* Footer links */}
        <div className="flex justify-center gap-4 text-sm mt-8 mb-4">
          <button
            onClick={() => onNavigate('#/progress')}
            className="text-blue-500 hover:text-blue-700 font-medium"
          >
            Progress Report
          </button>
          <span className="text-gray-300">|</span>
          <button
            onClick={() => onNavigate('#/onboarding')}
            className="text-gray-400 hover:text-gray-600 font-medium"
          >
            Hand Placement
          </button>
          {onShowAccessibility && (
            <>
              <span className="text-gray-300">|</span>
              <button
                onClick={onShowAccessibility}
                className="text-gray-400 hover:text-gray-600 font-medium"
              >
                Accessibility
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
