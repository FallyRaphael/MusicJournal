import { describe, expect, it } from 'vitest';
import { matchScore, normalize, tokenize } from './search';

describe('normalize', () => {
  it('ignores case, accents and punctuation', () => {
    expect(normalize('Frédéric Chopin – Op. 9, No. 2')).toBe('frederic chopin op 9 no 2');
    expect(normalize('Antonín Dvořák')).toBe('antonin dvorak');
    expect(normalize('Träumerei')).toBe('traumerei');
  });
});

describe('tokenize', () => {
  it('maps common abbreviations', () => {
    expect(tokenize('Opus 27 Nr. 2')).toEqual(['op', '27', 'no', '2']);
  });

  it('returns nothing for blank input', () => {
    expect(tokenize('  – ')).toEqual([]);
  });
});

describe('matchScore', () => {
  const words = tokenize('Frédéric Chopin Nocturne in E-flat major Op. 9 No. 2');

  it('requires every query word to match', () => {
    expect(matchScore(tokenize('chopin nocturne'), words)).toBeGreaterThan(0);
    expect(matchScore(tokenize('chopin waltz'), words)).toBe(0);
  });

  it('matches word beginnings', () => {
    expect(matchScore(tokenize('noct'), words)).toBeGreaterThan(0);
  });

  it('ranks exact words above prefixes above inner matches', () => {
    expect(matchScore(['nocturne'], words)).toBeGreaterThan(matchScore(['noct'], words));
    expect(matchScore(['noct'], words)).toBeGreaterThan(matchScore(['ctur'], words));
  });

  it('does not match short fragments inside words', () => {
    expect(matchScore(['ho'], words)).toBe(0);
  });
});
