import { describe, expect, it } from 'vitest';
import { STORAGE_KEY, loadTasks, openStorage, saveTasks } from '../../src/storage';
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

describe('storage that cannot be used', () => {
  it('opens storage when it can be accessed', () => {
    const storage = memoryStorage();
    expect(openStorage(() => storage)).toBe(storage);
  });

  it('yields no storage when accessing it throws', () => {
    expect(
      openStorage(() => {
        throw new DOMException('blocked', 'SecurityError');
      }),
    ).toBeNull();
  });

  it('reports a successful save', () => {
    expect(saveTasks(memoryStorage(), [])).toBe(true);
  });

  it('reports a failed save when writing throws', () => {
    const storage = {
      setItem: () => {
        throw new DOMException('full', 'QuotaExceededError');
      },
    };
    expect(saveTasks(storage, [{ id: 'a', title: 'One', status: 'Todo' }])).toBe(false);
  });

  it('reports a failed save when there is no storage', () => {
    expect(saveTasks(null, [])).toBe(false);
  });

  it('loads an empty list when there is no storage or reading throws', () => {
    expect(loadTasks(null)).toEqual([]);
    expect(
      loadTasks({
        getItem: () => {
          throw new DOMException('blocked', 'SecurityError');
        },
      }),
    ).toEqual([]);
  });

  it('stores the whole list on a save after a failure', () => {
    const storage = memoryStorage();
    let fail = true;
    const flaky = {
      setItem: (key: string, value: string) => {
        if (fail) throw new DOMException('full', 'QuotaExceededError');
        storage.setItem(key, value);
      },
    };
    const tasks: Task[] = [
      { id: 'a', title: 'One', status: 'Doing' },
      { id: 'b', title: 'Two', status: 'Done' },
    ];
    expect(saveTasks(flaky, tasks.slice(0, 1))).toBe(false);
    fail = false;
    expect(saveTasks(flaky, tasks)).toBe(true);
    expect(loadTasks(storage)).toEqual(tasks);
  });
});
