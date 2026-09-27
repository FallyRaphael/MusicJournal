import type { Feel, Piece, PieceStatus, ShelveOutcome } from '../../domain/model';
import type { FeelFilter, PieceSort, PieceTab } from '../../domain/pieces';

export const STATUS_LABELS: Record<PieceStatus, string> = {
  upNext: 'Up next',
  learning: 'Learning',
  maintaining: 'Maintaining',
  shelved: 'Shelved',
};

export const STATUS_DESCRIPTIONS: Record<PieceStatus, string> = {
  upNext: 'Want to start soon',
  learning: 'Actively working on it',
  maintaining: 'Learned – keeping it in the fingers',
  shelved: 'Put aside for now',
};

export const OUTCOME_LABELS: Record<ShelveOutcome, string> = {
  learned: 'Learned',
  partlyLearned: 'Partly learned',
  dropped: 'Dropped',
};

export const FEEL_LABELS: Record<Feel, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};

export const FEEL_FILTER_LABELS: Record<FeelFilter, string> = {
  ...FEEL_LABELS,
  unrated: 'Not rated',
};

export const TAB_LABELS: Record<PieceTab, string> = {
  active: 'Active',
  upNext: 'Up next',
  shelf: 'Shelf',
};

export const SORT_LABELS: Record<PieceSort, string> = {
  recent: 'Recently practiced',
  title: 'Title',
  composer: 'Composer',
  target: 'Target date',
};

/** "Frédéric Chopin · Op. 9 No. 2" */
export function composerLine(piece: Pick<Piece, 'composer' | 'catalogNumber'>): string {
  return [piece.composer, piece.catalogNumber].filter(Boolean).join(' · ');
}
