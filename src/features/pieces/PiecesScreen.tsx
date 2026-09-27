import { Music, Plus, SlidersHorizontal } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { usePieces, useSessionsWithPieces } from '../../db/pieces';
import { lastPracticedByPiece } from '../../domain/pieceStats';
import {
  collectTags,
  filterPieces,
  sortPieces,
  tabOf,
  type FeelFilter,
  type PieceSort,
  type PieceTab,
} from '../../domain/pieces';
import { Button, IconButton } from '../../ui/Button';
import { EmptyState, PageHeader, Screen } from '../../ui/Screen';
import { SearchField } from '../../ui/SearchField';
import { SegmentedControl } from '../../ui/SegmentedControl';
import { FilterSheet } from './FilterSheet';
import { FEEL_FILTER_LABELS, SORT_LABELS, TAB_LABELS } from './labels';
import { PieceRow } from './PieceRow';
import styles from './PiecesScreen.module.css';

const TABS = Object.keys(TAB_LABELS) as PieceTab[];

const EMPTY_TAB_TEXT: Record<PieceTab, { title: string; text: string }> = {
  active: {
    title: 'Nothing in progress',
    text: 'Pieces you’re learning or maintaining show up here.',
  },
  upNext: { title: 'Nothing up next', text: 'Collect pieces here that you want to start soon.' },
  shelf: {
    title: 'The shelf is empty',
    text: 'Pieces you put aside land here, with their full history.',
  },
};

// Filters live in the URL, so they survive opening a piece and coming back.
const oneOf = <T extends string>(value: string | null, options: readonly T[], fallback: T): T =>
  options.includes(value as T) ? (value as T) : fallback;

export function PiecesScreen() {
  const navigate = useNavigate();
  const pieces = usePieces();
  const sessions = useSessionsWithPieces();
  const [params, setParams] = useSearchParams();
  const [filterOpen, setFilterOpen] = useState(false);

  const tab = oneOf(params.get('tab'), TABS, 'active');
  const sort = oneOf(params.get('sort'), Object.keys(SORT_LABELS) as PieceSort[], 'recent');
  const query = params.get('q') ?? '';
  const feelOptions = Object.keys(FEEL_FILTER_LABELS);
  const feels = params.getAll('feel').filter((f): f is FeelFilter => feelOptions.includes(f));
  const tags = params.getAll('tag');

  // One URL update per user action: consecutive updates in the same tick would overwrite
  // each other.
  const updateParams = (change: (params: URLSearchParams) => void) => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        change(next);
        return next;
      },
      { replace: true },
    );
  };

  const setParam = (key: string, value: string | readonly string[] | null) =>
    updateParams((next) => {
      next.delete(key);
      for (const v of typeof value === 'string' ? [value] : (value ?? [])) next.append(key, v);
    });

  const lastPracticed = useMemo(() => lastPracticedByPiece(sessions ?? []), [sessions]);
  const allTags = useMemo(() => collectTags(pieces ?? []), [pieces]);
  const counts = useMemo(() => {
    const result: Record<PieceTab, number> = { active: 0, upNext: 0, shelf: 0 };
    for (const piece of pieces ?? []) result[tabOf(piece.status)] += 1;
    return result;
  }, [pieces]);

  const filterCount = feels.length + tags.length;
  const visible = sortPieces(
    filterPieces(pieces ?? [], { tab, query, feels, tags }),
    sort,
    lastPracticed,
  );

  const clearFilters = (includingSort = false) =>
    updateParams((next) => {
      ['q', 'feel', 'tag', ...(includingSort ? ['sort'] : [])].forEach((key) => next.delete(key));
    });

  const addButton = (
    <IconButton label="Add piece" onClick={() => navigate('/pieces/new')}>
      <Plus size={24} />
    </IconButton>
  );

  if (pieces !== undefined && pieces.length === 0) {
    return (
      <Screen>
        <PageHeader title="Pieces" actions={addButton} />
        <EmptyState icon={<Music size={24} aria-hidden="true" />} title="No pieces yet">
          Your repertoire lives here: what you’re learning, maintaining, or have shelved.
        </EmptyState>
        <Button variant="primary" size="lg" block onClick={() => navigate('/pieces/new')}>
          Add your first piece
        </Button>
      </Screen>
    );
  }

  return (
    <Screen>
      <PageHeader title="Pieces" actions={addButton} />
      <SegmentedControl
        legend="Show"
        name="piece-tab"
        options={TABS.map((value) => ({ value, label: TAB_LABELS[value], count: counts[value] }))}
        value={tab}
        onChange={(value) => setParam('tab', value === 'active' ? null : value)}
      />
      <div className={styles.toolbar}>
        <SearchField
          label="Search pieces"
          value={query}
          onChange={(value) => setParam('q', value || null)}
        />
        <Button
          icon={<SlidersHorizontal size={18} aria-hidden="true" />}
          onClick={() => setFilterOpen(true)}
          aria-label={
            filterCount > 0 ? `Sort and filter, ${filterCount} active` : 'Sort and filter'
          }
          className={filterCount > 0 ? styles.filterActive : undefined}
        >
          {filterCount > 0 && <span className="tabular">{filterCount}</span>}
        </Button>
      </div>

      {pieces === undefined ? null : visible.length > 0 ? (
        <ul className={styles.list}>
          {visible.map((piece) => (
            <li key={piece.id}>
              <PieceRow piece={piece} lastPracticedAt={lastPracticed.get(piece.id)} />
            </li>
          ))}
        </ul>
      ) : counts[tab] > 0 ? (
        <EmptyState title="No matches">
          <Button variant="ghost" onClick={() => clearFilters()}>
            Clear search and filters
          </Button>
        </EmptyState>
      ) : (
        <EmptyState title={EMPTY_TAB_TEXT[tab].title}>{EMPTY_TAB_TEXT[tab].text}</EmptyState>
      )}

      <FilterSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        sort={sort}
        feels={feels}
        tags={tags}
        allTags={allTags}
        onSortChange={(value) => setParam('sort', value === 'recent' ? null : value)}
        onFeelsChange={(value) => setParam('feel', value)}
        onTagsChange={(value) => setParam('tag', value)}
        onReset={() => clearFilters(true)}
      />
    </Screen>
  );
}
