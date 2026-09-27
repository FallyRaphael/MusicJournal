import { describe, expect, it } from 'vitest';
import { loadCatalog, searchCatalog } from './catalog';

const catalog = await loadCatalog();
const titles = (query: string, limit?: number) =>
  searchCatalog(catalog, query, limit).map((m) => `${m.composer.name}: ${m.work.title}`);

describe('catalog data', () => {
  it('has unique work ids that all point to a composer', () => {
    const composerIds = new Set(catalog.composers.map((c) => c.id));
    const workIds = new Set(catalog.works.map((w) => w.id));
    expect(workIds.size).toBe(catalog.works.length);
    expect(catalog.works.every((w) => composerIds.has(w.composer))).toBe(true);
  });
});

describe('searchCatalog', () => {
  it('finds works by nickname', () => {
    expect(titles('moonlight')[0]).toBe(
      'Ludwig van Beethoven: Piano Sonata No. 14 in C-sharp minor “Moonlight”',
    );
    expect(titles('fur elise')[0]).toContain('Für Elise');
  });

  it('finds works by catalog number', () => {
    expect(titles('bwv 846')[0]).toBe(
      'Johann Sebastian Bach: Prelude and Fugue in C major (WTC I)',
    );
    expect(titles('chopin op 9 2')[0]).toBe('Frédéric Chopin: Nocturne in E-flat major');
  });

  it('lists a composer’s best-known works first', () => {
    expect(titles('chopin', 1)).toEqual(['Frédéric Chopin: Nocturne in E-flat major']);
  });

  it('matches without accents', () => {
    expect(titles('traumerei')[0]).toBe('Robert Schumann: Träumerei (Kinderszenen)');
    expect(titles('gymnopedie 1')[0]).toBe('Erik Satie: Gymnopédie No. 1');
  });

  it('respects the limit and returns nothing for an empty query', () => {
    expect(titles('bach', 5)).toHaveLength(5);
    expect(titles('   ')).toEqual([]);
  });
});
