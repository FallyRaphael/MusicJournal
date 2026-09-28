import { useMemo } from 'react';
import { usePieces } from '../../db/pieces';
import { sectionOrder, useSectionTypes } from '../../db/sectionTypes';
import { useTechniqueItems } from '../../db/techniques';
import type {
  Id,
  ItemRef,
  Piece,
  PracticeEntry,
  SectionType,
  TechniqueItem,
} from '../../domain/model';
import type { SectionOrder } from '../../domain/session';
import { composerLine } from '../pieces/labels';

export interface ItemInfo {
  title: string;
  subtitle: string;
  /** The current "focus next time" note of the piece or technique item. */
  focusNote: string;
  /** The piece or technique item no longer exists. */
  missing: boolean;
}

export function describeItem(
  ref: ItemRef,
  pieces: ReadonlyMap<Id, Piece>,
  techniques: ReadonlyMap<Id, TechniqueItem>,
): ItemInfo {
  switch (ref.kind) {
    case 'piece': {
      const piece = pieces.get(ref.pieceId);
      return piece
        ? {
            title: piece.title,
            subtitle: composerLine(piece),
            focusNote: piece.focusNote,
            missing: false,
          }
        : { title: 'Deleted piece', subtitle: '', focusNote: '', missing: true };
    }
    case 'technique': {
      const item = techniques.get(ref.techniqueId);
      return item
        ? { title: item.name, subtitle: item.category, focusNote: item.focusNote, missing: false }
        : { title: 'Deleted technique item', subtitle: '', focusNote: '', missing: true };
    }
    case 'free':
      return { title: ref.label, subtitle: '', focusNote: '', missing: false };
  }
}

export interface Lookups {
  loaded: boolean;
  info: (ref: ItemRef) => ItemInfo;
  sectionName: (sectionTypeId: Id) => string;
  /** All section types in order, including archived ones. */
  sectionTypes: SectionType[];
  /** Section types offered for new items. */
  activeSectionTypes: SectionType[];
  order: SectionOrder;
  pieces: Piece[];
  techniques: TechniqueItem[];
}

/** Everything needed to show session items by name. */
export function useLookups(): Lookups {
  const pieces = usePieces();
  const techniques = useTechniqueItems();
  const sectionTypes = useSectionTypes();

  return useMemo(() => {
    const pieceMap = new Map((pieces ?? []).map((p) => [p.id, p]));
    const techniqueMap = new Map((techniques ?? []).map((t) => [t.id, t]));
    const typeMap = new Map((sectionTypes ?? []).map((t) => [t.id, t]));
    return {
      loaded: pieces !== undefined && techniques !== undefined && sectionTypes !== undefined,
      info: (ref: ItemRef) => describeItem(ref, pieceMap, techniqueMap),
      sectionName: (id: Id) => typeMap.get(id)?.name ?? 'Other',
      sectionTypes: sectionTypes ?? [],
      activeSectionTypes: (sectionTypes ?? []).filter((t) => !t.archived),
      order: sectionOrder(sectionTypes ?? []),
      pieces: pieces ?? [],
      techniques: techniques ?? [],
    };
  }, [pieces, techniques, sectionTypes]);
}

/** "Slow practice · 60 BPM" */
export function describeEntry(entry: PracticeEntry): string {
  return [entry.method, entry.bpm !== undefined ? `${entry.bpm} BPM` : '']
    .filter(Boolean)
    .join(' · ');
}
