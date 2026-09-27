import { useEffect, useState } from 'react';
import { matchScore, tokenize } from '../domain/search';

export interface CatalogComposer {
  id: string;
  name: string;
  years: string;
}

export interface CatalogWork {
  id: string;
  composer: string;
  title: string;
  catalog?: string;
  /** Extra search terms (nicknames, collection names). */
  aliases?: string[];
}

export interface Catalog {
  version: number;
  composers: CatalogComposer[];
  works: CatalogWork[];
}

export interface CatalogMatch {
  work: CatalogWork;
  composer: CatalogComposer;
}

let loading: Promise<Catalog> | undefined;

/** Loads the built-in catalog (a separate file, fetched the first time it's needed). */
export function loadCatalog(): Promise<Catalog> {
  loading ??= import('./catalog.json').then((module) => module.default as Catalog);
  return loading;
}

export function useCatalog(): Catalog | undefined {
  const [catalog, setCatalog] = useState<Catalog>();
  useEffect(() => {
    let active = true;
    void loadCatalog().then((loaded) => {
      if (active) setCatalog(loaded);
    });
    return () => {
      active = false;
    };
  }, []);
  return catalog;
}

interface IndexedWork extends CatalogMatch {
  words: string[];
}

const indexes = new WeakMap<Catalog, IndexedWork[]>();

function indexOf(catalog: Catalog): IndexedWork[] {
  let index = indexes.get(catalog);
  if (!index) {
    const composers = new Map(catalog.composers.map((c) => [c.id, c]));
    index = catalog.works.map((work) => {
      const composer = composers.get(work.composer)!;
      const text = [composer.name, work.title, work.catalog ?? '', ...(work.aliases ?? [])];
      return { work, composer, words: tokenize(text.join(' ')) };
    });
    indexes.set(catalog, index);
  }
  return index;
}

/**
 * Works matching every word of the query (in title, composer, catalog number or nickname),
 * best matches first; equal matches keep the catalog's order (roughly by popularity).
 */
export function searchCatalog(catalog: Catalog, query: string, limit = 8): CatalogMatch[] {
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];
  return indexOf(catalog)
    .map((entry, order) => ({ entry, order, score: matchScore(tokens, entry.words) }))
    .filter((result) => result.score > 0)
    .sort((a, b) => b.score - a.score || a.order - b.order)
    .slice(0, limit)
    .map(({ entry }) => ({ work: entry.work, composer: entry.composer }));
}
