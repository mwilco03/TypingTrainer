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
import TypeDance from './games/TypeDance';

// Error boundary to prevent full-app crashes from game errors
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-lg text-center">
            <div className="text-4xl mb-3">&#x26A0;&#xFE0F;</div>
            <h2 className="text-lg font-bold text-gray-800 mb-2">Something went wrong</h2>
            <p className="text-sm text-gray-500 mb-4">The game ran into an error. No progress was lost.</p>
            <button
              onClick={() => {
                this.setState({ hasError: false });
                window.location.hash = '#/';
              }}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600"
            >
              Back to Home
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

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
  // Applies accessibility CSS classes to document root
  useAccessibility();

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

    case 'typedance':
      content = <TypeDance {...sharedProps} />;
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
    <ErrorBoundary>
      {content}
      {showA11y && <AccessibilityModal onClose={() => setShowA11y(false)} />}
    </ErrorBoundary>
  );
}
