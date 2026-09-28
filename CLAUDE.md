# Practice Journal – notes for Claude

Personal piano practice PWA, used on an Android phone (Chrome), offline-first, English UI.
The user decides product/UX questions; propose options with trade-offs before larger changes.

## Build plan

1. Foundation (done): setup, PWA, database, themes, tab navigation
2. Pieces (done): list/filter/sort, add with catalog suggestions, piece page, statuses & periods, shelving
3. Sessions (done): technique items, templates, planning, timer, quick log, finish summary, log afterwards
4. Dashboard & cycles (done): weekly target/streak, cycles, goals with automatic progress, end review
5. Backup (done): export, import (replace or merge) with preview, undo, backup reminder
6. Polish & deploy: tempo chart, details, hosting on GitHub Pages (public repository)

UX direction: bottom tabs (Home / Pieces / Cycle / More) in a light, neutral look with a blue
accent; the session screen is a full-screen "stage" mode showing one item at a time with a big
timer, prev/pause/next, method buttons, a BPM stepper and an "All items" overview.

## Conventions

- `src/domain/` is pure TypeScript: no React, Dexie or browser APIs. Put logic there and test it.
- Never store derived values (durations, totals, streaks, goal progress); compute them.
- Every record has `id` (UUID via `newId()`), `createdAt`, `updatedAt`. Bump `updatedAt` on
  every change and delete via `deleteRecord()` (writes a tombstone) – the backup merge relies
  on both.
- Timer: persist start/stop timestamps as segments; elapsed time is always calculated.
- Schema changes: add a new `this.version(n)` in `src/db/database.ts`, never edit old versions.
- Colours only via the CSS variables in `src/styles/tokens.css`; touch targets ≥ 44px.
- Screens use `Screen`/`PageHeader` from `src/ui/Screen.tsx`; icons from `lucide-react`.
- Sheets (`src/ui/Sheet.tsx`) are native modal dialogs; focus a field on open with
  `data-autofocus` (React's `autoFocus` fires before the dialog is visible).
- Don't call `Date.now()` during render or in handlers defined in the component body
  (react-hooks purity rule); use `useNow()`, and counters for sheet `key`s.
- Session and template changes go through `mutateSession` / `mutateTemplate` (read–change–write
  in one transaction). Editors pass _updater functions_ (`PlanEditor.onChange`,
  `BudgetControl.onChange`) so quick repeated taps don't overwrite each other.
- Session items reference pieces/technique/free text via `ItemRef`; compare with `sameRef` /
  `refKey` from `src/domain/refs.ts`. Section order follows the section types' `order`.
- The work catalog (`src/catalog/catalog.json`) is generated data; only add entries whose
  catalog numbers and keys are certain. Search normalisation lives in `src/domain/search.ts`.
- UI copy uses US spelling ("practiced"), dates are formatted en-GB ("27 Sept 2026").
- Before finishing a change: `npx tsc -b`, `npm test`, `npm run lint`, `npx prettier --check .`.
