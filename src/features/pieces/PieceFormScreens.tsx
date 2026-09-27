import { useMemo } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';
import { createPiece, updatePiece, usePiece, usePieces, type PieceDetails } from '../../db/pieces';
import type { Piece } from '../../domain/model';
import { collectTags } from '../../domain/pieces';
import { useGoBack } from '../../lib/navigation';
import { PieceForm } from './PieceForm';

const EMPTY: PieceDetails = { title: '', composer: '', tags: [], notes: '' };

function useSuggestions() {
  const pieces = usePieces();
  return useMemo(
    () => ({
      knownComposers: [...new Set((pieces ?? []).map((p) => p.composer).filter(Boolean))],
      knownTags: collectTags(pieces ?? []),
    }),
    [pieces],
  );
}

export function NewPieceScreen() {
  const navigate = useNavigate();
  const cancel = useGoBack('/pieces');
  const suggestions = useSuggestions();
  return (
    <PieceForm
      heading="New piece"
      initial={EMPTY}
      initialStatus="learning"
      {...suggestions}
      onCancel={cancel}
      onSubmit={async (details, status) => {
        const piece = await createPiece(details, status ?? 'learning');
        // Replace the form in the history: "back" from the new piece leads to the list.
        void navigate(`/pieces/${piece.id}`, { replace: true });
      }}
    />
  );
}

function detailsOf(piece: Piece): PieceDetails {
  return {
    title: piece.title,
    composer: piece.composer,
    catalogNumber: piece.catalogNumber,
    catalogId: piece.catalogId,
    tags: piece.tags,
    feel: piece.feel,
    targetDate: piece.targetDate,
    notes: piece.notes,
  };
}

export function EditPieceScreen() {
  const { pieceId = '' } = useParams();
  const piece = usePiece(pieceId);
  const goBack = useGoBack(`/pieces/${pieceId}`);
  const suggestions = useSuggestions();

  if (piece === undefined) return null;
  if (piece === null) return <Navigate to="/pieces" replace />;

  return (
    <PieceForm
      heading="Edit piece"
      initial={detailsOf(piece)}
      {...suggestions}
      onCancel={goBack}
      onSubmit={async (details) => {
        await updatePiece(piece.id, details);
        goBack();
      }}
    />
  );
}
