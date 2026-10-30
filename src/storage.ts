import { STATUSES, type Task } from './tasks';

export const STORAGE_KEY = 'tasks';

function isTask(value: unknown): value is Task {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.id === 'string' &&
    typeof v.title === 'string' &&
    typeof v.status === 'string' &&
    (STATUSES as readonly string[]).includes(v.status)
  );
}

/**
 * Returns the browser storage, or null when accessing it throws
 * (for example when the browser blocks the page from storing data).
 */
export function openStorage<S>(getStorage: () => S): S | null {
  try {
    return getStorage();
  } catch {
    return null;
  }
}

/** Reads stored tasks; missing, unreadable or malformed data yields an empty list. */
export function loadTasks(storage: Pick<Storage, 'getItem'> | null): Task[] {
  if (storage === null) return [];
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isTask) : [];
  } catch {
    return [];
  }
}

/**
 * Stores the whole task list. Returns false when there is no storage or writing fails,
 * whatever the reason, so the caller can tell the user that tasks are not saved.
 */
export function saveTasks(storage: Pick<Storage, 'setItem'> | null, tasks: Task[]): boolean {
  if (storage === null) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    return true;
  } catch {
    return false;
  }
}
