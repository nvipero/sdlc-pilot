import { describe, expect, it } from 'vitest';
import { addTask, dropTask, focusAfterRemoval, moveTask, removeTask, renameTask, type Task } from '../../src/tasks';

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

  it('removes only the task with the given id', () => {
    expect(removeTask(tasks, 'b')).toEqual([
      { id: 'a', title: 'One', status: 'Todo' },
      { id: 'c', title: 'Same', status: 'Todo' },
    ]);
  });

  it('returns the same array for an unknown id', () => {
    expect(removeTask(tasks, 'x')).toBe(tasks);
  });
});

describe('focusAfterRemoval', () => {
  const tasks: Task[] = [
    { id: 'a', title: 'One', status: 'Todo' },
    { id: 'x', title: 'Other', status: 'Doing' },
    { id: 'b', title: 'Two', status: 'Todo' },
    { id: 'y', title: 'Alone', status: 'Done' },
    { id: 'c', title: 'Three', status: 'Todo' },
  ];

  it('picks the next task in the same swimlane, skipping other swimlanes', () => {
    expect(focusAfterRemoval(tasks, 'a')).toEqual({ removeOf: 'b' });
    expect(focusAfterRemoval(tasks, 'b')).toEqual({ removeOf: 'c' });
  });

  it('picks the previous task in the same swimlane when the removed task is the last one', () => {
    expect(focusAfterRemoval(tasks, 'c')).toEqual({ removeOf: 'b' });
  });

  it('picks the swimlane heading when the swimlane becomes empty', () => {
    expect(focusAfterRemoval(tasks, 'x')).toEqual({ heading: 'Doing' });
    expect(focusAfterRemoval(tasks, 'y')).toEqual({ heading: 'Done' });
  });

  it('returns null for an unknown id', () => {
    expect(focusAfterRemoval(tasks, 'nope')).toBeNull();
  });
});

describe('dropTask', () => {
  const tasks: Task[] = [
    { id: 'a', title: 'Same', status: 'Todo' },
    { id: 'b', title: 'Same', status: 'Doing' },
  ];

  it('moves the dropped task to the swimlane status and leaves the others', () => {
    expect(dropTask(tasks, 'a', 'Done')).toEqual([
      { id: 'a', title: 'Same', status: 'Done' },
      { id: 'b', title: 'Same', status: 'Doing' },
    ]);
  });

  it('allows a move backward', () => {
    expect(dropTask(tasks, 'b', 'Todo')[1].status).toBe('Todo');
  });

  it('returns the same array for a drop on the task\'s own swimlane', () => {
    expect(dropTask(tasks, 'b', 'Doing')).toBe(tasks);
  });

  it('returns the same array for a release outside every swimlane', () => {
    expect(dropTask(tasks, 'a', null)).toBe(tasks);
  });

  it('returns the same array for an unknown id', () => {
    expect(dropTask(tasks, 'x', 'Done')).toBe(tasks);
  });
});

describe('renameTask', () => {
  const tasks: Task[] = [
    { id: 'a', title: 'Same', status: 'Todo' },
    { id: 'b', title: 'Same', status: 'Doing' },
    { id: 'c', title: 'Other', status: 'Todo' },
  ];

  it('changes only the title of the task with the given id, keeping status and position', () => {
    expect(renameTask(tasks, 'b', 'New')).toEqual([
      { id: 'a', title: 'Same', status: 'Todo' },
      { id: 'b', title: 'New', status: 'Doing' },
      { id: 'c', title: 'Other', status: 'Todo' },
    ]);
  });

  it('trims whitespace around the new title', () => {
    expect(renameTask(tasks, 'c', '  Buy oat milk  ')[2].title).toBe('Buy oat milk');
  });

  it('allows a title another task already has', () => {
    expect(renameTask(tasks, 'c', 'Same').map((t) => t.title)).toEqual(['Same', 'Same', 'Same']);
  });

  it('returns the same array for an empty or whitespace-only title', () => {
    expect(renameTask(tasks, 'a', '')).toBe(tasks);
    expect(renameTask(tasks, 'a', ' \t ')).toBe(tasks);
  });

  it('returns the same array for an unknown id', () => {
    expect(renameTask(tasks, 'x', 'New')).toBe(tasks);
  });
});
