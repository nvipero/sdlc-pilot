import { describe, expect, it } from 'vitest';
import { STORAGE_KEY, loadTasks, saveTasks } from '../../src/storage';
import type { Task } from '../../src/tasks';

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
  };
}

describe('storage', () => {
  it('returns an empty list when nothing is stored', () => {
    expect(loadTasks(memoryStorage())).toEqual([]);
  });

  it('round-trips saved tasks', () => {
    const storage = memoryStorage();
    const tasks: Task[] = [
      { id: 'a', title: 'One', status: 'Todo' },
      { id: 'b', title: 'Two', status: 'Done' },
    ];
    saveTasks(storage, tasks);
    expect(loadTasks(storage)).toEqual(tasks);
  });

  it('returns an empty list for malformed data', () => {
    expect(loadTasks(memoryStorage({ [STORAGE_KEY]: 'not json' }))).toEqual([]);
    expect(loadTasks(memoryStorage({ [STORAGE_KEY]: '{}' }))).toEqual([]);
  });

  it('drops entries that are not valid tasks', () => {
    const raw = JSON.stringify([
      { id: 'a', title: 'Ok', status: 'Doing' },
      { id: 'b', title: 'Bad', status: 'Blocked' },
      null,
    ]);
    expect(loadTasks(memoryStorage({ [STORAGE_KEY]: raw }))).toEqual([{ id: 'a', title: 'Ok', status: 'Doing' }]);
  });
});
