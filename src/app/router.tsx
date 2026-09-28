import { createHashRouter, Navigate } from 'react-router';
import { EditCycleScreen, NewCycleScreen } from '../features/cycle/CycleFormScreen';
import { CycleReviewScreen, CycleSummaryScreen } from '../features/cycle/CycleReviewScreen';
import { CycleScreen } from '../features/cycle/CycleScreen';
import { HomeScreen } from '../features/home/HomeScreen';
import { MoreScreen } from '../features/more/MoreScreen';
import { PieceDetailScreen } from '../features/pieces/PieceDetailScreen';
import { EditPieceScreen, NewPieceScreen } from '../features/pieces/PieceFormScreens';
import { PiecesScreen } from '../features/pieces/PiecesScreen';
import { FinishScreen } from '../features/session/FinishScreen';
import { PlanScreen } from '../features/session/PlanScreen';
import { SessionRoute } from '../features/session/SessionRoute';
import { LogSessionScreen } from '../features/session/LogSessionScreen';
import { SessionsScreen } from '../features/session/SessionsScreen';
import { TechniqueScreen } from '../features/technique/TechniqueScreen';
import { TemplateEditorScreen } from '../features/templates/TemplateEditorScreen';
import { TemplatesScreen } from '../features/templates/TemplatesScreen';
import { AppShell } from './AppShell';
import { RouteError } from './RouteError';

// Hash-based URLs (`/#/pieces`) work on any static host without server configuration.
export const router = createHashRouter([
  {
    // Catches errors of every screen below and shows a friendly page with a reload button.
    ErrorBoundary: RouteError,
    children: [
      {
        path: '/',
        Component: AppShell,
        children: [
          { index: true, Component: HomeScreen },
          { path: 'pieces', Component: PiecesScreen },
          { path: 'pieces/:pieceId', Component: PieceDetailScreen },
          { path: 'cycle', Component: CycleScreen },
          { path: 'more', Component: MoreScreen },
          { path: 'sessions', Component: SessionsScreen },
          { path: 'templates', Component: TemplatesScreen },
          { path: 'technique', Component: TechniqueScreen },
          { path: 'cycles/:cycleId', Component: CycleSummaryScreen },
        ],
      },
      // Full-screen pages without the tab bar.
      { path: '/pieces/new', Component: NewPieceScreen },
      { path: '/pieces/:pieceId/edit', Component: EditPieceScreen },
      { path: '/sessions/log', Component: LogSessionScreen },
      { path: '/sessions/:sessionId', Component: SessionRoute },
      { path: '/sessions/:sessionId/plan', Component: PlanScreen },
      { path: '/sessions/:sessionId/finish', Component: FinishScreen },
      { path: '/templates/:templateId', Component: TemplateEditorScreen },
      { path: '/cycles/new', Component: NewCycleScreen },
      { path: '/cycles/:cycleId/edit', Component: EditCycleScreen },
      { path: '/cycles/:cycleId/review', Component: CycleReviewScreen },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]);
