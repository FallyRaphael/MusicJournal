import type { SessionItem, TimeSegment, Timestamp } from './model';

/** Milliseconds covered by a segment; a running segment counts up to `now`. */
export function segmentMillis(segment: TimeSegment, now: Timestamp): number {
  return Math.max(0, (segment.end ?? now) - segment.start);
}

/** Practiced seconds of an item: timed segments plus the manual correction. */
export function itemSeconds(item: Pick<SessionItem, 'segments' | 'adjustSeconds'>, now: Timestamp) {
  const millis = item.segments.reduce((sum, segment) => sum + segmentMillis(segment, now), 0);
  return Math.max(0, Math.floor(millis / 1000) + item.adjustSeconds);
}
