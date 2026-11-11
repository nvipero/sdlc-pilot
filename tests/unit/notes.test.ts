import { describe, expect, it } from 'vitest';
import { noteText, toNotes } from '../../src/notes';

describe('noteText', () => {
  it('removes leading and trailing white space', () => {
    expect(noteText('  Buy milk  ')).toBe('Buy milk');
  });

  it('keeps white space inside the text', () => {
    expect(noteText('Gamma with  inner spaces')).toBe('Gamma with  inner spaces');
  });

  it('returns null for empty or white-space-only text', () => {
    expect(noteText('')).toBeNull();
    expect(noteText('   ')).toBeNull();
    expect(noteText('\t\n ')).toBeNull();
  });
});

describe('toNotes', () => {
  it('keeps the rows in the order given, with their id and text', () => {
    expect(toNotes([{ id: 1, text: 'One' }, { id: 2, text: 'Two' }])).toEqual([
      { id: 1, text: 'One' },
      { id: 2, text: 'Two' },
    ]);
  });

  it('drops malformed rows', () => {
    expect(toNotes([{ id: 1, text: 'One' }, null, { id: '2', text: 'x' }, { id: 3 }, 'row'])).toEqual([
      { id: 1, text: 'One' },
    ]);
  });

  it('returns an empty list for data that is not a list', () => {
    expect(toNotes(null)).toEqual([]);
    expect(toNotes({ id: 1, text: 'One' })).toEqual([]);
  });
});
