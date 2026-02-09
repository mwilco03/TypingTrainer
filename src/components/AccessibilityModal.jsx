import React, { useState, useEffect } from 'react';

const STORAGE_KEY = 'typingTrainer_a11y';

const DEFAULTS = {
  reduceMotion: false,
  highContrast: false,
  largeText: false,
  dyslexiaFont: false,
  colorblindMode: false, // uses patterns instead of color-only indicators
  soundEnabled: true,
  screenReaderHints: false,
};

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {}
  return { ...DEFAULTS };
}

function saveSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {}
}

// Apply settings to document root as CSS custom properties / classes
function applyToDocument(settings) {
  const root = document.documentElement;

  root.classList.toggle('reduce-motion', settings.reduceMotion);
  root.classList.toggle('high-contrast', settings.highContrast);
  root.classList.toggle('large-text', settings.largeText);
  root.classList.toggle('dyslexia-font', settings.dyslexiaFont);
  root.classList.toggle('colorblind-mode', settings.colorblindMode);
}

// Hook for other components to read accessibility settings
export function useAccessibility() {
  const [settings, setSettings] = useState(loadSettings);

  useEffect(() => {
    // Check system preference for reduced motion
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches && !settings.reduceMotion) {
      const updated = { ...settings, reduceMotion: true };
      setSettings(updated);
      saveSettings(updated);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    applyToDocument(settings);
  }, [settings]);

  return settings;
}

function Toggle({ label, description, checked, onChange }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <div className="relative mt-0.5 shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <div className="w-10 h-6 bg-gray-300 rounded-full peer-checked:bg-blue-500 transition-colors" />
        <div className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
      </div>
      <div>
        <div className="text-sm font-medium text-gray-800 group-hover:text-gray-900">{label}</div>
        {description && <div className="text-xs text-gray-500 mt-0.5">{description}</div>}
      </div>
    </label>
  );
}

export default function AccessibilityModal({ onClose }) {
  const [settings, setSettings] = useState(loadSettings);

  const update = (key, value) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    saveSettings(updated);
    applyToDocument(updated);
  };

  const resetAll = () => {
    setSettings({ ...DEFAULTS });
    saveSettings(DEFAULTS);
    applyToDocument(DEFAULTS);
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label="Accessibility settings"
    >
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white rounded-t-2xl p-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">Accessibility</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            &times;
          </button>
        </div>

        <div className="p-4 space-y-5">
          <Toggle
            label="Reduce motion"
            description="Minimize animations and transitions"
            checked={settings.reduceMotion}
            onChange={(v) => update('reduceMotion', v)}
          />

          <Toggle
            label="High contrast"
            description="Increase color contrast for text and UI elements"
            checked={settings.highContrast}
            onChange={(v) => update('highContrast', v)}
          />

          <Toggle
            label="Larger text"
            description="Increase text size throughout the app"
            checked={settings.largeText}
            onChange={(v) => update('largeText', v)}
          />

          <Toggle
            label="Dyslexia-friendly font"
            description="Use OpenDyslexic font for improved readability"
            checked={settings.dyslexiaFont}
            onChange={(v) => update('dyslexiaFont', v)}
          />

          <Toggle
            label="Colorblind mode"
            description="Use patterns and labels alongside colors"
            checked={settings.colorblindMode}
            onChange={(v) => update('colorblindMode', v)}
          />

          <Toggle
            label="Sound effects"
            description="Play audio feedback for correct and incorrect keys"
            checked={settings.soundEnabled}
            onChange={(v) => update('soundEnabled', v)}
          />

          <Toggle
            label="Screen reader hints"
            description="Add extra ARIA descriptions for assistive technology"
            checked={settings.screenReaderHints}
            onChange={(v) => update('screenReaderHints', v)}
          />
        </div>

        <div className="p-4 border-t border-gray-100 flex justify-between">
          <button
            onClick={resetAll}
            className="text-sm text-gray-400 hover:text-red-500"
          >
            Reset to defaults
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
