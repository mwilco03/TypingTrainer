import React, { useState, useEffect, useCallback } from 'react';
import ProgressionEngine from './engine/ProgressionEngine';
import Hub from './pages/Hub';
import ProgressReport from './pages/ProgressReport';
import HandPlacement from './components/HandPlacement';
import AccessibilityModal from './components/AccessibilityModal';
import { useAccessibility } from './components/AccessibilityModal';
import TypeFlow from './games/TypeFlow';
import TypingTutor from './games/TypingTutor';
import TypePong from './games/TypePong';
import WordHunt from './games/WordHunt';
import KitchenISpy from './games/KitchenISpy';
import TypingJournal from './games/TypingJournal';

// Simple hash-based router
function useHashRoute() {
  const [route, setRoute] = useState(window.location.hash || '#/');

  useEffect(() => {
    const handler = () => setRoute(window.location.hash || '#/');
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  const navigate = useCallback((hash) => {
    window.location.hash = hash;
  }, []);

  return { route, navigate };
}

export default function App() {
  const [progressData, setProgressData] = useState(() => ProgressionEngine.load());
  const [showA11y, setShowA11y] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return !localStorage.getItem('typingTainer_onboarded');
  });
  const { route, navigate } = useHashRoute();
  const a11ySettings = useAccessibility();

  // Save whenever progress changes
  useEffect(() => {
    ProgressionEngine.save(progressData);
  }, [progressData]);

  // Shared callbacks for games to report progress
  const onRecordKeystroke = useCallback((key, correct, ikiMs, previousKey) => {
    setProgressData(prev => ProgressionEngine.recordKeystroke(prev, key, correct, ikiMs, previousKey));
  }, []);

  const onEndSession = useCallback((sessionData) => {
    setProgressData(prev => {
      const { data } = ProgressionEngine.endSession(prev, sessionData);
      return data;
    });
  }, []);

  const onUpdateGameProgress = useCallback((game, updater) => {
    setProgressData(prev => ProgressionEngine.updateGameProgress(prev, game, updater));
  }, []);

  const onSetProfile = useCallback((updates) => {
    setProgressData(prev => ({
      ...prev,
      profile: { ...prev.profile, ...updates },
    }));
  }, []);

  const onResetAll = useCallback(() => {
    if (confirm('Reset all progress? This cannot be undone.')) {
      setProgressData(ProgressionEngine.reset());
    }
  }, []);

  // Show hand placement onboarding on first visit
  if (showOnboarding) {
    return (
      <HandPlacement onComplete={() => {
        localStorage.setItem('typingTainer_onboarded', '1');
        setShowOnboarding(false);
      }} />
    );
  }

  // Route matching
  const routePath = route.replace('#', '').split('/').filter(Boolean);
  const page = routePath[0] || '';

  const sharedProps = {
    progressData,
    onRecordKeystroke,
    onEndSession,
    onUpdateGameProgress,
    onNavigate: navigate,
  };

  let content;
  switch (page) {
    case 'typeflow':
      content = <TypeFlow {...sharedProps} />;
      break;

    case 'typequest':
      content = <TypingTutor {...sharedProps} />;
      break;

    case 'pong':
      content = <TypePong {...sharedProps} />;
      break;

    case 'duckhunt':
      content = <WordHunt {...sharedProps} />;
      break;

    case 'kitchen':
      content = <KitchenISpy {...sharedProps} />;
      break;

    case 'journal':
      content = <TypingJournal {...sharedProps} />;
      break;

    case 'progress':
      content = (
        <ProgressReport
          progressData={progressData}
          onNavigate={navigate}
          onReset={onResetAll}
        />
      );
      break;

    case 'onboarding':
      content = (
        <HandPlacement onComplete={() => navigate('#/')} />
      );
      break;

    default:
      content = (
        <Hub
          progressData={progressData}
          onNavigate={navigate}
          onSetProfile={onSetProfile}
          onShowAccessibility={() => setShowA11y(true)}
        />
      );
  }

  return (
    <>
      {content}
      {showA11y && <AccessibilityModal onClose={() => setShowA11y(false)} />}
    </>
  );
}
