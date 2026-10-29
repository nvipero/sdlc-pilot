import { describe, expect, it } from 'vitest';
import { addTask, moveTask, type Task } from '../../src/tasks';

describe('addTask', () => {
  it('adds a task in Todo with a trimmed title', () => {
    expect(addTask([], '  Buy milk  ', 'a')).toEqual([{ id: 'a', title: 'Buy milk', status: 'Todo' }]);
  });

  it('returns the same array for an empty or whitespace-only title', () => {
    const tasks: Task[] = [];
    expect(addTask(tasks, '', 'a')).toBe(tasks);
    expect(addTask(tasks, ' \t ', 'a')).toBe(tasks);
  });

  it('keeps existing tasks and allows duplicate titles', () => {
    const tasks = addTask(addTask([], 'Same', 'a'), 'Same', 'b');
    expect(tasks.map((t) => t.id)).toEqual(['a', 'b']);
  });
});

describe('moveTask', () => {
  it('changes only the task with the given id', () => {
    const tasks: Task[] = [
      { id: 'a', title: 'Same', status: 'Todo' },
      { id: 'b', title: 'Same', status: 'Todo' },
    ];
    expect(moveTask(tasks, 'b', 'Done')).toEqual([
      { id: 'a', title: 'Same', status: 'Todo' },
      { id: 'b', title: 'Same', status: 'Done' },
    ]);
  });
});
