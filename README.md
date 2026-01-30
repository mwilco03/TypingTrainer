# Typing Tainer

A typing training platform for kids and learners. Six games and activities that build real keyboard skills through adaptive lessons, arcade challenges, creative writing, and brain breaks. All progress is tracked locally with no login required.

**Live:** [https://mwilco03.github.io/TypingTainer/](https://mwilco03.github.io/TypingTainer/)

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:5173/TypingTainer/](http://localhost:5173/TypingTainer/) in a browser.

### Production Build

```bash
npm run build
npm run preview
```

Output goes to `dist/`. Deployed automatically to GitHub Pages on push to `main` via the workflow in `.github/workflows/deploy.yml`.

## What's Inside

### Games & Activities

| Game | Route | Category | Description |
|------|-------|----------|-------------|
| **Type Flow** | `#/typeflow` | Lesson | 10 progressive modules from home row to full keyboard. Drills adapt in real time using a 4-phase engine (Drill, Words, Complexity, Mastery). Spaced repetition review keys injected into ~30% of drills. |
| **Type Quest** | `#/typequest` | Lesson | 6 structured lessons with exercises, streaks, and unlockable achievements. Guided progression with keyboard visualization. |
| **Type Pong** | `#/pong` | Arcade | A word flies across a Pong court. Type it before it scores on your side. 5 levels, word length and speed escalate. Uses delta-time animation with `requestAnimationFrame`. |
| **Word Hunt** | `#/duckhunt` | Arcade | Words fly across the screen as ducks. Auto-targeting, combo scoring, escalating rounds. 3 misses per round. |
| **Typing Journal** | `#/journal` | Creative | Free-form writing using only mastered keys. Blocked keys shake and flash. Word suggestions and writing prompts filtered by available keys. Entries saved locally. |
| **Kitchen I Spy** | `#/kitchen` | Brain Break | A relaxing kitchen scene across 3 difficulty tiers. Read a clue, find the item, type its name. Fuzzy matching, hints, no timer. |

### Shared Systems

- **Progression Engine** (`src/engine/ProgressionEngine.js`) — Central data model stored in `localStorage`. Tracks per-key metrics (IKI, accuracy, standard deviation), bigram fluency, spaced repetition scheduling (Leitner boxes with 5 intervals), session history, stars, daily streaks, and game-specific progress.
- **Spaced Repetition** — Keys are assigned to Leitner boxes (intervals: 1, 3, 7, 14, 30 sessions). Keys demote to box 0 on errors, advance on 85%+ accuracy. Review keys are injected into Type Flow drills.
- **Age-Gated Norms** — Five age groups with WPM, accuracy, and session-length targets (e.g., 6-7: 10 WPM / 70% acc, 14+: 45 WPM / 92% acc). Used for star calculation and parent report comparisons.
- **Stars** — 1-7 per session based on accuracy vs norms, speed vs norms, and exercise volume.
- **Parent Report** (`#/progress`) — Weekly summary with stats, fluency trend, mastered/weak keys, suggestions, and a shareable challenge link that encodes the child's weak keys so a parent can try them.

### Pages

- **Hub** (`#/`) — Game cards organized by category (Lessons, Arcade, Creative, Brain Break). Profile setup with age group. Stats bar showing stars, streak, mastered keys count.
- **Hand Placement** (`#/onboarding`) — 5-step animated tutorial for proper finger placement on the home row. Shown on first visit.
- **Progress Report** (`#/progress`) — Parent-facing view. Reset button with confirmation.
- **Accessibility** — Modal with toggles for: reduced motion, high contrast, larger text, dyslexia-friendly font (OpenDyslexic), colorblind patterns, sound effects, screen reader hints.

## Architecture

```
src/
  main.jsx              App entry point
  main.css              Tailwind directives + accessibility CSS overrides
  App.jsx               Hash-based SPA router, shared state, error boundary
  engine/
    ProgressionEngine.js  Shared data model, spaced repetition, star calc, parent report
  games/
    TypeFlow.jsx          Adaptive lesson engine (10 modules, 4 phases)
    TypingTutor.jsx       Structured lessons with achievements
    TypePong.jsx          Pong arcade game (requestAnimationFrame)
    WordHunt.jsx          Duck hunt arcade game (requestAnimationFrame)
    TypingJournal.jsx     Free-form writing with learned-keys-only constraint
    KitchenISpy.jsx       Kitchen I Spy brain break (3 tiers, fuzzy matching)
  components/
    HandPlacement.jsx     Onboarding tutorial
    AccessibilityModal.jsx  Settings modal + useAccessibility hook
  pages/
    Hub.jsx               Game selection hub
    ProgressReport.jsx    Parent-facing report
public/
  manifest.json           PWA manifest
  sw.js                   Service worker (network-first with cache fallback)
  icon-192.svg            App icon
  icon-512.svg            App icon
```

## Tech Stack

- **React 18** — UI framework
- **Vite 6** — Build tool (base path: `/TypingTainer/`)
- **Tailwind CSS 3** — Utility-first styling
- **localStorage** — All data persisted client-side, no backend
- **GitHub Actions** — Auto-deploy to Pages on push to `main`
- **PWA** — Service worker with offline fallback

## Data Storage

All data is in `localStorage` under these keys:

| Key | Purpose |
|-----|---------|
| `typingTainer` | Main progression data (key metrics, sessions, game progress, profile, stars) |
| `typingTainer_a11y` | Accessibility settings |
| `typingTainer_journal` | Journal entries (last 50) |
| `typingTainer_onboarded` | Onboarding completion flag |

No data is sent to any server. Reset all progress from the Progress Report page.

## Development

```bash
npm run dev      # Start dev server at localhost:5173
npm run build    # Production build to dist/
npm run preview  # Preview production build locally
```

The app uses hash-based routing (`#/typeflow`, `#/pong`, etc.) so no server-side configuration is needed for SPA navigation on GitHub Pages.
