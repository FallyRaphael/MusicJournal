import { SETTINGS_ID, type SectionType, type Settings, type Timestamp } from '../domain/model';

export const DEFAULT_SECTION_NAMES = [
  'Warm-up',
  'Technique',
  'Sight-reading',
  'Repertoire',
  'Theory & ear training',
];

export const DEFAULT_METHODS = [
  'Slow practice',
  'Hands separate',
  'Metronome',
  'Rhythms',
  'Chunking',
  'Play-through',
];

/**
 * Fixed ids, so the defaults are the same records on every device: merging a backup into a
 * fresh install then doesn't create "Warm-up" twice.
 */
const sectionTypeId = (name: string) =>
  `section-${name
    .toLowerCase()
    .replace(/[^a-z]+/g, '-')
    .replace(/-$/, '')}`;

export function defaultSectionTypes(now: Timestamp): SectionType[] {
  return DEFAULT_SECTION_NAMES.map((name, order) => ({
    id: sectionTypeId(name),
    createdAt: now,
    updatedAt: now,
    name,
    order,
    archived: false,
  }));
}

export function defaultSettings(now: Timestamp): Settings {
  return {
    id: SETTINGS_ID,
    createdAt: now,
    updatedAt: now,
    weeklyTarget: 4,
    methods: [...DEFAULT_METHODS],
  };
}
