/** A note of the signed-in account, as stored in the database's `notes` table. */
export interface Note {
  id: number;
  text: string;
}

/** The text a note is saved with: without leading and trailing white space, or null when nothing is left. */
export function noteText(input: string): string | null {
  const text = input.trim();
  return text === '' ? null : text;
}

function isNote(value: unknown): value is Note {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.id === 'number' && typeof v.text === 'string';
}

/** Reads note rows from the database in the order given; malformed rows are dropped. */
export function toNotes(rows: unknown): Note[] {
  if (!Array.isArray(rows)) return [];
  return rows.filter(isNote).map(({ id, text }) => ({ id, text }));
}
