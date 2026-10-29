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

/** Reads stored tasks; missing or malformed data yields an empty list. */
export function loadTasks(storage: Pick<Storage, 'getItem'>): Task[] {
  const raw = storage.getItem(STORAGE_KEY);
  if (raw === null) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isTask) : [];
  } catch {
    return [];
  }
}

export function saveTasks(storage: Pick<Storage, 'setItem'>, tasks: Task[]): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}
