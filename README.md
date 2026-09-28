# Practice Journal

A personal piano practice tracker for the phone: log practice sessions with a per-item
timer, manage repertoire, and plan multi-week practice cycles. It is an installable web
app (PWA) that works offline; all data stays on the device.

## Commands

| Command           | What it does                                              |
| ----------------- | --------------------------------------------------------- |
| `npm run dev`     | Dev server, also reachable from a phone on the same Wi-Fi |
| `npm run build`   | Type check and production build into `dist/`              |
| `npm run preview` | Serve the production build (service worker active)        |
| `npm test`        | Unit tests (Vitest, in-memory IndexedDB)                  |
| `npm run lint`    | ESLint                                                    |
| `npm run format`  | Prettier                                                  |
| `npm run icons`   | Regenerate app icons from `public/icon.svg`               |

Testing on the phone: run `npm run dev` and open the "Network" address it prints in
Chrome on the phone. Offline mode and installing only work over HTTPS, i.e. once the app
is hosted (or via `npm run preview` on the laptop itself).

## Deploy

Every push to `main` runs `.github/workflows/deploy.yml` on GitHub: lint, tests and the
build, then it publishes `dist/` to GitHub Pages at `https://<user>.github.io/<repository>/`.
Install the app from there; it shows an update prompt whenever a new version is deployed.
Data is stored per address, so moving to another address means Back up → Restore.

## Stack

React + TypeScript, built with Vite. Data lives in IndexedDB via Dexie.js;
`vite-plugin-pwa` provides the manifest and the offline service worker. Styling is plain
CSS Modules with design tokens in `src/styles/tokens.css` (light and dark theme).
Routing uses hash URLs (`/#/pieces`) so the app runs on any static host.

TypeScript is pinned to 6.0 because typescript-eslint does not support TypeScript 7 yet.

## Structure

```
src/
  app/       router, app shell, tab bar, update prompt
  domain/    data model and pure logic (no React, no browser APIs) – unit tested
  db/        Dexie database, schema versions, defaults, queries
  features/  screens: home, pieces, cycle, more, session
  ui/        shared components (Button, Card, Stepper, SegmentedControl, …)
  lib/       browser helpers: theme, storage persistence, formatting
  styles/    design tokens and global CSS
```
