import { createHashRouter, Navigate } from 'react-router';
import { CycleScreen } from '../features/cycle/CycleScreen';
import { HomeScreen } from '../features/home/HomeScreen';
import { MoreScreen } from '../features/more/MoreScreen';
import { PieceDetailScreen } from '../features/pieces/PieceDetailScreen';
import { EditPieceScreen, NewPieceScreen } from '../features/pieces/PieceFormScreens';
import { PiecesScreen } from '../features/pieces/PiecesScreen';
import { SessionScreen } from '../features/session/SessionScreen';
import { AppShell } from './AppShell';

// Hash-based URLs (`/#/pieces`) work on any static host without server configuration.
export const router = createHashRouter([
  {
    path: '/',
    Component: AppShell,
    children: [
      { index: true, Component: HomeScreen },
      { path: 'pieces', Component: PiecesScreen },
      { path: 'pieces/:pieceId', Component: PieceDetailScreen },
      { path: 'cycle', Component: CycleScreen },
      { path: 'more', Component: MoreScreen },
    ],
  },
  // Full-screen pages without the tab bar.
  { path: '/pieces/new', Component: NewPieceScreen },
  { path: '/pieces/:pieceId/edit', Component: EditPieceScreen },
  { path: '/session', Component: SessionScreen },
  { path: '*', element: <Navigate to="/" replace /> },
]);
