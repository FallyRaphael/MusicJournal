import { useState, type KeyboardEvent, type MouseEvent } from 'react';
import { Link } from 'react-router';
import type { Id, Passage, Session } from '../../domain/model';
import {
  entryMatches,
  passageLabel,
  sortPassages,
  type PassageFilter,
} from '../../domain/passages';
import { isPiece } from '../../domain/pieceStats';
import { tempoHistory, tempoScale, type TempoPoint } from '../../domain/tempo';
import { formatMediumDate, formatShortDate } from '../../lib/format';
import { Card } from '../../ui/Card';
import { ChipRow, ToggleChip } from '../../ui/Chip';
import styles from './TempoCard.module.css';

// Chart geometry in viewBox units; the SVG scales to the card's width.
const WIDTH = 320;
const LEFT = 30;
const RIGHT = WIDTH - 10;
const TOP = 14;
const BOTTOM = 124;
const HEIGHT = 146;

interface TempoCardProps {
  pieceId: Id;
  passages: readonly Passage[];
  /** Sessions with the piece. */
  sessions: readonly Session[];
  /** Target tempo of the running cycle's goal for this piece. */
  goalBpm?: number;
}

/**
 * Tempo progress of a piece: the fastest tempo of each session, for the whole piece or one
 * passage, with the cycle goal as a dashed line. Shown once there are two sessions to compare.
 */
export function TempoCard({ pieceId, passages, sessions, goalBpm }: TempoCardProps) {
  const [chosenKey, setChosenKey] = useState<PassageFilter>(null);
  const known = new Set(passages.map((p) => p.id));
  const options = [
    { key: null, label: 'Whole piece' },
    ...sortPassages(passages).map((p) => ({ key: p.id, label: passageLabel(p) })),
  ]
    .map((option) => ({
      ...option,
      points: tempoHistory(isPiece(pieceId), sessions, (entry) =>
        entryMatches(entry, option.key, known),
      ),
    }))
    .filter((option) => option.points.length >= 2);

  if (options.length === 0) return null;
  const option = options.find((o) => o.key === chosenKey) ?? options[0];

  return (
    <Card aria-labelledby="tempo-title">
      <h2 id="tempo-title" className={styles.title}>
        Tempo
      </h2>
      {options.length > 1 && (
        <ChipRow>
          {options.map((o) => (
            <ToggleChip
              key={o.key ?? 'whole'}
              pressed={o.key === option.key}
              onChange={() => setChosenKey(o.key)}
            >
              {o.label}
            </ToggleChip>
          ))}
        </ChipRow>
      )}
      <TempoChart
        key={option.key ?? 'whole'}
        points={option.points}
        goalBpm={option.key === null ? goalBpm : undefined}
      />
    </Card>
  );
}

interface TempoChartProps {
  /** The fastest tempo per session, oldest first; at least two. */
  points: readonly TempoPoint[];
  goalBpm?: number;
}

function TempoChart({ points, goalBpm }: TempoChartProps) {
  const [chosen, setChosen] = useState<number | null>(null);
  const last = points.length - 1;
  const selected = Math.min(chosen ?? last, last);
  const point = points[selected];

  const scale = tempoScale(
    goalBpm ? [...points.map((p) => p.bpm), goalBpm] : points.map((p) => p.bpm),
  );
  const first = points[0].at;
  const span = points[last].at - first;
  const x = (at: number) =>
    span === 0 ? (LEFT + RIGHT) / 2 : LEFT + ((at - first) / span) * (RIGHT - LEFT);
  const y = (bpm: number) =>
    BOTTOM - ((bpm - scale.min) / (scale.max - scale.min)) * (BOTTOM - TOP);

  const change = points[last].bpm - points[0].bpm;
  const radius = points.length > 30 ? 2 : 3.5;

  const pickAt = (event: MouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const target = ((event.clientX - rect.left) / rect.width) * WIDTH;
    let nearest = 0;
    points.forEach((p, i) => {
      if (Math.abs(x(p.at) - target) < Math.abs(x(points[nearest].at) - target)) nearest = i;
    });
    setChosen(nearest);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const next = {
      ArrowLeft: selected - 1,
      ArrowRight: selected + 1,
      Home: 0,
      End: last,
    }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    setChosen(Math.max(0, Math.min(last, next)));
  };

  const describe = (p: TempoPoint) => `${formatMediumDate(p.at)}: ${p.bpm} BPM, ${p.method}`;
  const goalY = goalBpm ? y(goalBpm) : 0;

  return (
    <>
      <div>
        <p className={styles.current}>
          <span className={`${styles.bpm} tabular`}>{points[last].bpm}</span> BPM
        </p>
        <p className={styles.muted}>
          {change === 0
            ? `Same as on ${formatShortDate(first)}`
            : `${change > 0 ? '+' : '−'}${Math.abs(change)} since ${formatShortDate(first)}`}
        </p>
      </div>

      <div
        className={styles.chart}
        role="slider"
        tabIndex={0}
        aria-label="Fastest tempo per session"
        aria-valuemin={0}
        aria-valuemax={last}
        aria-valuenow={selected}
        aria-valuetext={describe(point)}
        onClick={pickAt}
        onKeyDown={onKeyDown}
      >
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} aria-hidden="true">
          {scale.ticks.map((tick) => (
            <g key={tick}>
              <line x1={LEFT} x2={RIGHT} y1={y(tick)} y2={y(tick)} className={styles.grid} />
              <text x={0} y={y(tick) + 4} className={styles.label}>
                {tick}
              </text>
            </g>
          ))}
          {goalBpm && (
            <g>
              <line x1={LEFT} x2={RIGHT} y1={goalY} y2={goalY} className={styles.goal} />
              {/* At the left, where the line is lowest, so the label stays clear of it. */}
              <text
                x={LEFT + 2}
                y={goalY - TOP > 12 ? goalY - 5 : goalY + 14}
                className={styles.label}
              >
                Cycle goal {goalBpm}
              </text>
            </g>
          )}
          <line x1={x(point.at)} x2={x(point.at)} y1={TOP} y2={BOTTOM} className={styles.guide} />
          <polyline
            points={points.map((p) => `${x(p.at)},${y(p.bpm)}`).join(' ')}
            className={styles.line}
          />
          {points.map((p) => (
            <circle
              key={p.sessionId}
              cx={x(p.at)}
              cy={y(p.bpm)}
              r={radius}
              className={styles.dot}
            />
          ))}
          <circle cx={x(point.at)} cy={y(point.bpm)} r={6} className={styles.selected} />
          <text x={LEFT} y={HEIGHT - 4} className={styles.label}>
            {formatShortDate(first)}
          </text>
          <text x={RIGHT} y={HEIGHT - 4} textAnchor="end" className={styles.label}>
            {formatShortDate(points[last].at)}
          </text>
        </svg>
      </div>

      <div className={styles.detail}>
        <span>
          <span className="tabular">{formatMediumDate(point.at)}</span> ·{' '}
          <strong className="tabular">{point.bpm} BPM</strong> · {point.method}
        </span>
        <Link to={`/sessions/${point.sessionId}`} className={styles.link}>
          Session
        </Link>
      </div>
    </>
  );
}
