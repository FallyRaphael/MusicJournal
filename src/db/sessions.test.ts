import { beforeEach, describe, expect, it } from 'vitest';
import { newSessionItem, startItem, toSessionSections } from '../domain/session';
import { db } from './database';
import { createPiece } from './pieces';
import { completeSession, createSession, mutateSession } from './sessions';
import { createTechnique } from './techniques';
import { createTemplate, mutateTemplate } from './templates';

beforeEach(async () => {
  await db.delete();
  await db.open();
});

async function setup() {
  const piece = await createPiece(
    { title: 'Nocturne', composer: 'Chopin', tags: [], notes: '' },
    'learning',
  );
  const scales = await createTechnique({ name: 'C major scale', category: 'Scales', notes: '' });
  const session = await createSession({
    date: '2026-09-28',
    status: 'planned',
    sections: [
      {
        id: 'rep',
        sectionTypeId: 'repertoire',
        items: [
          { ...newSessionItem({ kind: 'piece', pieceId: piece.id }), id: 'noct' },
          { ...newSessionItem({ kind: 'technique', techniqueId: scales.id }), id: 'scales' },
          { ...newSessionItem({ kind: 'free', label: 'Mikrokosmos' }), id: 'free' },
        ],
      },
    ],
  });
  return { piece, scales, session };
}

describe('sessions in the database', () => {
  it('stores the search indexes of new and changed sessions', async () => {
    const { piece, scales, session } = await setup();
    expect(session.pieceIds).toEqual([piece.id]);
    expect(session.techniqueIds).toEqual([scales.id]);

    await mutateSession(session.id, (s) => ({
      ...s,
      sections: s.sections.map((sec) => ({
        ...sec,
        items: sec.items.filter((i) => i.id !== 'noct'),
      })),
    }));
    expect((await db.sessions.get(session.id))?.pieceIds).toEqual([]);
    expect(await db.sessions.where('pieceIds').equals(piece.id).count()).toBe(0);
  });

  it('saves every timer change right away', async () => {
    const { session } = await setup();
    await mutateSession(session.id, (s) => startItem(s, 'noct', 1_000));
    const stored = await db.sessions.get(session.id);
    expect(stored?.status).toBe('running');
    expect(stored?.sections[0].items[0].segments).toEqual([{ start: 1_000, end: null }]);
  });

  it('finishing carries focus notes over to the piece and technique item', async () => {
    const { piece, scales, session } = await setup();
    await mutateSession(session.id, (s) => startItem(s, 'noct', Date.now()));
    await completeSession(
      session.id,
      [
        { ref: { kind: 'piece', pieceId: piece.id }, focusNote: 'LH jumps in bars 13–16' },
        { ref: { kind: 'technique', techniqueId: scales.id }, focusNote: '' },
      ],
      'Good session',
    );

    const stored = await db.sessions.get(session.id);
    expect(stored?.status).toBe('finished');
    expect(stored?.note).toBe('Good session');
    expect(stored?.sections[0].items[0].segments[0].end).not.toBeNull();
    expect(stored?.sections[0].items[0].focusNext).toBe('LH jumps in bars 13–16');
    expect((await db.pieces.get(piece.id))?.focusNote).toBe('LH jumps in bars 13–16');
    expect((await db.techniqueItems.get(scales.id))?.focusNote).toBe('');
  });
});

describe('templates in the database', () => {
  it('copies a plan and applies quick changes on top of each other', async () => {
    const { session } = await setup();
    const template = await createTemplate('Full routine', session.sections);
    expect(template.sections[0].items).toHaveLength(3);
    expect(template.sections[0].items[0]).not.toHaveProperty('segments');

    // Two changes started before either is saved must both survive.
    await Promise.all([
      mutateTemplate(template.id, (t) => ({ ...t, name: 'Morning' })),
      mutateTemplate(template.id, (t) => ({
        ...t,
        sections: t.sections.map((s) => ({ ...s, items: s.items.slice(1) })),
      })),
    ]);
    const stored = await db.templates.get(template.id);
    expect(stored?.name).toBe('Morning');
    expect(stored?.sections[0].items).toHaveLength(2);
  });

  it('starts sessions from a template with fresh items', async () => {
    const { session } = await setup();
    const template = await createTemplate('Full routine', session.sections);
    const sections = toSessionSections(template.sections);
    expect(sections[0].items[0].id).not.toBe(template.sections[0].items[0].id);
    expect(sections[0].items[0].segments).toEqual([]);
  });
});
