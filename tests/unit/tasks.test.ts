import { describe, expect, it } from 'vitest';
import { addTask, moveTask, removeTask, restoreTask, type Task } from '../../src/tasks';

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

describe('removeTask', () => {
  const tasks: Task[] = [
    { id: 'a', title: 'One', status: 'Todo' },
    { id: 'b', title: 'Same', status: 'Doing' },
    { id: 'c', title: 'Same', status: 'Todo' },
  ];

  it('removes only the task with the given id and reports it with its index', () => {
    expect(removeTask(tasks, 'b')).toEqual({
      tasks: [
        { id: 'a', title: 'One', status: 'Todo' },
        { id: 'c', title: 'Same', status: 'Todo' },
      ],
      removed: { task: { id: 'b', title: 'Same', status: 'Doing' }, index: 1 },
    });
  });

  it('returns the same array and no removed task for an unknown id', () => {
    const result = removeTask(tasks, 'x');
    expect(result.tasks).toBe(tasks);
    expect(result.removed).toBeNull();
  });
});

describe('restoreTask', () => {
  const tasks: Task[] = [
    { id: 'a', title: 'One', status: 'Todo' },
    { id: 'b', title: 'Two', status: 'Todo' },
    { id: 'c', title: 'Three', status: 'Doing' },
  ];

  it('puts a removed task back where it was', () => {
    for (const id of ['a', 'b', 'c']) {
      const { tasks: rest, removed } = removeTask(tasks, id);
      expect(restoreTask(rest, removed!)).toEqual(tasks);
    }
  });

  it('appends the task when its index is past the end', () => {
    const task: Task = { id: 'z', title: 'Late', status: 'Done' };
    expect(restoreTask([], { task, index: 5 })).toEqual([task]);
  });

  it('returns the same array when the task is already present', () => {
    expect(restoreTask(tasks, { task: tasks[1], index: 0 })).toBe(tasks);
  });
});
