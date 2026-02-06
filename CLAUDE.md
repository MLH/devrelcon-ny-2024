# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DevRelCon NY conference website, built on the [Hoverboard](https://github.com/gdg-x/hoverboard) template (v3). It's a PWA for the DevRelCon NY 2025 conference at Industry City, Brooklyn. Production URL: `https://nyc.devrelcon.dev/`

## Commands

- **Dev server:** `npm start` (runs Rollup + Firebase emulators concurrently)
- **Production build:** `npm run build`
- **Deploy:** `npm run deploy` (builds then deploys to Firebase)
- **Lint all:** `npm run lint` (runs eslint, stylelint, prettier, markdownlint, type checking in parallel)
- **Fix all:** `npm run fix` (auto-fix all linters)
- **Tests:** `npm test` (runs Jest — two projects: "Web" for `src/**/*.test.ts` and "Firestore" for `*.rules.test.ts`)
- **Single test:** `npx jest --testPathPattern=<pattern>` (e.g., `npx jest --testPathPattern=about-block`)
- **Type check web only:** `npx tsc --noEmit`
- **Type check functions:** `npm --prefix ./functions run build`
- **Initialize Firestore data:** `npm run firestore:init`

## Architecture

### Tech Stack
- **Frontend:** Polymer 3 (legacy, being migrated) + LitElement for newer components
- **State Management:** Redux Toolkit (`@reduxjs/toolkit`) with `configureStore`
- **Backend:** Firebase (Firestore, Hosting, Cloud Functions, Auth, Messaging, Storage)
- **Bundler:** Rollup with TypeScript plugin
- **Templating:** Nunjucks for build-time HTML/manifest/markdown template compilation
- **Testing:** Jest with ts-jest, jsdom environment, `@testing-library/dom`
- **Service Worker:** Workbox (generated at build time via rollup-plugin-workbox)

### Key Directories
- `src/` — Frontend source
  - `hoverboard-app.ts` — Root app shell (Polymer element), initializes router and Redux store
  - `router.ts` — Vaadin Router with lazy-loaded page imports
  - `firebase.ts` — Firebase SDK initialization (config loaded from `/__/firebase/init.js` via a `window.firebaseConfig` shim in `index.html`)
  - `components/` — Reusable UI components (about-block, auth-required, hero, markdown, snack-bar)
  - `elements/` — Page-level elements (schedule, speakers, partners, footer, header, dialogs, etc.)
  - `pages/` — Route page components (home, schedule, speakers, FAQ, neighborhood, etc.)
  - `store/` — Redux slices organized by feature domain (auth, blog, speakers, sessions, schedule, etc.)
  - `models/` — TypeScript interfaces/types for domain objects (speaker, session, ticket, etc.) with co-located tests
  - `utils/` — Utilities (analytics, config, data, icons, markdown rendering, etc.)
  - `styles/` — Shared CSS styles
  - `__mocks__/firebase.ts` — Firebase mock for tests
- `functions/` — Firebase Cloud Functions (separate npm project with own `tsconfig.json`)
  - `src/` — Prerendering, notifications, schedule generation, image optimization, Mailchimp subscription
- `config/` — Environment configs (`development.json`, `production.json`) with basepath, URL, and Google Maps API key
- `public/` — Static assets, manifest, and data files
  - `data/settings.json` — Conference content config (navigation, hero settings, UI strings, location, social links)
  - `data/resources.json` — Conference metadata (title, description, dates, ticket links, footer content)
- `utils/build.ts` — Build utilities: Nunjucks template compilation, environment detection. Merges `resources.json` + `settings.json` + env config at build time
- `__tests__/` — Test setup files

### Important Patterns

- **Build-time templating:** `index.html`, `manifest.json`, and markdown files are processed through Nunjucks at build time using data from `public/data/*.json` and `config/*.json`. Variables use `{{ variableName }}` syntax.
- **Firebase config loading:** The app intercepts Firebase's hosted `/__/firebase/init.js` to capture config on `window.firebaseConfig`, then uses it in `src/firebase.ts`. Tests mock this via `src/__mocks__/firebase.ts`.
- **Environment selection:** Set `BUILD_ENV` to override, otherwise `NODE_ENV=production` uses `config/production.json`, everything else uses `config/development.json`.
- **Dual component systems:** The app uses both Polymer 3 (`@polymer/decorators`, `PolymerElement`) for the app shell and older elements, and Lit (`lit`, `LitElement`) for newer components. Both coexist.
- **Jest ES module handling:** Many dependencies are ESM-only; `jest.config.ts` explicitly lists packages that need transformation via `transformIgnorePatterns`.
- **Cloud Functions are a separate project:** `functions/` has its own `package.json`, `node_modules`, and `tsconfig.json`. Install with `npm --prefix ./functions ci`.

### Node Version
- `package.json` specifies Node 20 / npm 10
- `mise.toml` specifies Node 22 (local tooling override)

### CI
GitHub Actions runs `lint`, `test`, and `build` in parallel on push (`.github/workflows/main.yaml`). CI creates an empty `serviceAccount.json` as a stub.
