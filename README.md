# Typing Trainer

A typing training platform for kids and learners. Eight games and activities build real keyboard skills through adaptive lessons, arcade challenges, creative writing, and brain breaks. All progress is tracked locally with no login required.

**Live:** [https://mwilco03.github.io/TypingTrainer/](https://mwilco03.github.io/TypingTrainer/)

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:5173/TypingTrainer/](http://localhost:5173/TypingTrainer/) in a browser.

### Production Build

```bash
npm run build
npm run preview
```

Output goes to `dist/`. Deployed automatically to GitHub Pages on push to `main` via the workflow in `.github/workflows/deploy.yml`.

## Games & Activities

### Lessons

| Game | Route | Description |
|------|-------|-------------|
| **Type Flow** | `#/typeflow` | Adaptive lesson engine with 10 progressive modules from home row to full keyboard. Four-phase progression per module (Drill, Words, Complexity, Mastery) with real-time difficulty scaling. Spaced repetition review keys injected into ~30% of drills. After 3 drill exercises, real words using the current key set are mixed in. |
| **Type Quest** | `#/typequest` | Six structured lessons with guided exercises, streaks, and unlockable achievements. Visual keyboard highlights each finger's home position with color-coded zones. Builds from Home Row Heroes through top and bottom rows to full keyboard. |

### Arcade

| Game | Route | Description |
|------|-------|-------------|
| **Type Pong** | `#/pong` | A word bounces across a Pong court. Type it before it scores on your side. Five levels with escalating word length and ball speed. Delta-time animation with `requestAnimationFrame`. First 3 words of each level use the previous level's easier word lengths as warmup. |
| **Word Hunt** | `#/duckhunt` | Words fly across the screen as ducks. Type them before they escape. Auto-targeting, combo scoring, escalating rounds. Three misses allowed per round. First 3 ducks of each round use shorter words and slower flight for warmup. |
| **Type Dance** | `#/typedance` | DDR-style rhythm typing. Notes fall down four colored lanes; type them when they reach the hit zone. Judgments from PERFECT to MISS with combo multipliers. Progresses from single letters to bigrams to full words. First 4 notes of each level use the previous tier's content. |
| **Type Breaker** | `#/breakout` | Classic brick breaker meets typing. A 5x6 grid of colored bricks each hold a letter or word. Type the target brick's content to shatter it with a particle explosion. Timer-based levels with progressive word difficulty (letters, easy words, medium, hard). Combo multiplier and time bonus scoring. |

### Creative

| Game | Route | Description |
|------|-------|-------------|
| **Typing Journal** | `#/journal` | Free-form writing using only mastered keys. Unlearned keys shake and flash when pressed. Word suggestions and writing prompts are filtered by available keys. Entries are saved locally (last 50 retained). |

### Brain Break

| Game | Route | Description |
|------|-------|-------------|
| **Kitchen I Spy** | `#/kitchen` | A relaxing kitchen scene across three difficulty tiers (10 items each). Read a clue, find the matching item by tapping it. No timer, hints available. Tiers unlock progressively. |

## Shared Systems

### Progression Engine

The central data model lives in `src/engine/ProgressionEngine.js` and is stored in `localStorage`. It tracks:

- **Per-key metrics** — accuracy, inter-keystroke interval (IKI) with rolling window of 20 samples, standard deviation for fluency detection
- **Bigram fluency** — accuracy and IKI for common two-letter pairs (th, he, in, etc.)
- **Spaced repetition** — Leitner system with five boxes at intervals of 1, 3, 7, 14, and 30 sessions. Keys demote to box 0 on errors, advance on 85%+ accuracy. Review keys are injected into Type Flow drills.
- **Session history** — last 100 sessions with game, WPM, accuracy, and exercise count
- **Stars** — 1 to 7 per session based on accuracy vs age norms, speed vs age norms, and exercise volume
- **Daily streak** — consecutive days of practice, with longest-ever tracking
- **Game-specific progress** — module progress, high scores, levels cleared, achievements, etc.

### Age-Gated Norms

Five age groups with targets used for star calculation and parent report comparisons:

| Age Group | WPM Target | Accuracy Target | Session Length |
|-----------|-----------|-----------------|---------------|
| 6–7       | 10        | 70%             | 10 min        |
| 8–9       | 18        | 80%             | 15 min        |
| 10–11     | 28        | 85%             | 20 min        |
| 12–13     | 35        | 90%             | 25 min        |
| 14+       | 45        | 92%             | 30 min        |

### Progressive Difficulty

Every game applies a warmup pattern: the first few items of each new level or round use content from the previous difficulty tier before ramping to full difficulty. This eases the transition and builds confidence.

### Parent Features

- **Progress Report** (`#/progress`) — weekly summary with average WPM, accuracy, fluency trend, mastered/weak key badges, age-norm comparison, and coaching suggestions
- **QR Parent Challenge** — the report generates a QR code encoding the child's weakest keys. A parent or teacher scans it to open a typing drill (`#/challenge/<encoded>`) built from those tough keys, with WPM and accuracy results at the end
- **Challenge Page** (`#/challenge/<encoded>`) — standalone page that works without stored data. Shows the tough keys, runs a drill, and displays results

## Pages

| Page | Route | Purpose |
|------|-------|---------|
| **Hub** | `#/` | Game selection with category tabs. First-time profile setup (name + age group). Stats bar showing stars, streak, mastered keys, and practice time. |
| **Hand Placement** | `#/onboarding` | Five-step animated tutorial for proper finger placement on the home row. Shown once on first visit, accessible from Hub anytime. |
| **Progress Report** | `#/progress` | Parent-facing analytics dashboard with QR code challenge. Reset button with confirmation. |
| **Parent Challenge** | `#/challenge/<data>` | Interactive challenge for parents. Decodes weak keys from URL, runs a typing drill, shows results. |

## Accessibility

An accessibility modal (gear icon on the Hub) provides:

- **Reduce Motion** — disables animations and transitions (also respects `prefers-reduced-motion`)
- **High Contrast** — 25% contrast boost
- **Larger Text** — 120% base font size
- **Dyslexia Font** — loads OpenDyslexic via CDN
- **Colorblind Mode** — adds diagonal stripe patterns to color-only indicators
- **Sound Toggle** — enable or disable procedural audio feedback

Settings persist in `localStorage`.

## Architecture

```
src/
  main.jsx                App entry point, service worker registration
  main.css                Tailwind directives + accessibility CSS overrides
  App.jsx                 Hash-based SPA router, shared state, error boundary
  engine/
    ProgressionEngine.js  Data model, spaced repetition, stars, parent report, challenge encoding
  games/
    TypeFlow.jsx          Adaptive lesson engine (10 modules, 4 phases)
    TypingTutor.jsx       Structured lessons with achievements
    TypePong.jsx          Pong arcade (requestAnimationFrame)
    WordHunt.jsx          Duck hunt arcade (requestAnimationFrame)
    TypeDance.jsx         DDR-style rhythm typing (requestAnimationFrame)
    TypeBreakout.jsx      Brick breaker arcade (CSS animations)
    TypingJournal.jsx     Free-form writing with learned-keys constraint
    KitchenISpy.jsx       Kitchen I Spy brain break (3 tiers, tap-to-select)
  components/
    HandPlacement.jsx     Onboarding tutorial
    AccessibilityModal.jsx  Settings modal + useAccessibility hook
  pages/
    Hub.jsx               Game selection hub
    ProgressReport.jsx    Parent-facing report with QR code
    ParentChallenge.jsx   Parent challenge page
public/
  manifest.json           PWA manifest (standalone display)
  sw.js                   Service worker (network-first with cache fallback)
  404.html                GitHub Pages SPA redirect (path → hash route)
  icon-192.svg            App icon
  icon-512.svg            App icon
```

## Tech Stack

- **React 18** — functional components with hooks
- **Vite 6** — build tool (base path `/TypingTrainer/`)
- **Tailwind CSS 3** — utility-first styling
- **qrcode.react** — QR code generation for parent challenges
- **localStorage** — all data persisted client-side, no backend
- **Web Audio API** — procedural sound effects (no audio files)
- **GitHub Actions** — auto-deploy to Pages on push to `main`
- **PWA** — service worker with offline fallback, standalone display

## Data Storage

All data lives in `localStorage` under these keys:

| Key | Purpose |
|-----|---------|
| `typingTrainer` | Main progression data (key metrics, sessions, game progress, profile, stars) |
| `typingTrainer_a11y` | Accessibility settings |
| `typingTrainer_journal` | Journal entries (last 50) |
| `typingTrainer_onboarded` | Onboarding completion flag |

No data is sent to any server. Reset all progress from the Progress Report page.

## Mobile Support

All games work on mobile devices:

- Touch-to-start overlays summon the on-screen keyboard
- Input fields use `inputMode="text"` and 16px font size to prevent iOS auto-zoom
- Game layouts adapt to smaller screens via Tailwind responsive utilities

## Development

```bash
npm run dev      # Dev server at localhost:5173/TypingTrainer/
npm run build    # Production build to dist/
npm run preview  # Preview production build locally
```

Hash-based routing (`#/typeflow`, `#/breakout`, etc.) means no server-side configuration is needed for SPA navigation on GitHub Pages.
