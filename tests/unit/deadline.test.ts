import { describe, expect, it } from 'vitest';
import { formatDeadline, isLate, localDate, moveTask, renameTask, setDeadline, type Task } from '../../src/tasks';

describe('setDeadline', () => {
  const tasks: Task[] = [
    { id: 'a', title: 'Same', status: 'Todo' },
    { id: 'b', title: 'Same', status: 'Doing', deadline: '2026-12-24' },
  ];

  it('sets a complete date on the task with the given id only', () => {
    expect(setDeadline(tasks, 'a', '2026-11-05')).toEqual([
      { id: 'a', title: 'Same', status: 'Todo', deadline: '2026-11-05' },
      tasks[1],
    ]);
  });

  it('replaces an existing deadline', () => {
    expect(setDeadline(tasks, 'b', '2027-01-02')[1]).toEqual({ id: 'b', title: 'Same', status: 'Doing', deadline: '2027-01-02' });
  });

  it('removes the deadline for an empty or incomplete date', () => {
    for (const value of ['', '2026-11', '5', '2026-11-5', ' 2026-11-05']) {
      expect(setDeadline(tasks, 'b', value)[1]).toEqual({ id: 'b', title: 'Same', status: 'Doing' });
    }
  });

  it('removes the deadline for a date that does not exist', () => {
    expect(setDeadline(tasks, 'b', '2026-02-30')[1]).toEqual({ id: 'b', title: 'Same', status: 'Doing' });
    expect(setDeadline(tasks, 'b', '2026-13-01')[1]).toEqual({ id: 'b', title: 'Same', status: 'Doing' });
  });

  it('allows a date in the past', () => {
    expect(setDeadline(tasks, 'a', '2025-01-02')[0].deadline).toBe('2025-01-02');
  });

  it('returns the same array for an unknown id', () => {
    expect(setDeadline(tasks, 'x', '2026-11-05')).toBe(tasks);
  });
});

describe('a deadline stays with its task', () => {
  it('is kept when the task moves or is renamed', () => {
    const tasks: Task[] = [{ id: 'a', title: 'One', status: 'Todo', deadline: '2026-12-24' }];
    expect(moveTask(tasks, 'a', 'Done')[0].deadline).toBe('2026-12-24');
    expect(renameTask(tasks, 'a', 'Two')[0].deadline).toBe('2026-12-24');
  });
});

describe('formatDeadline', () => {
  it('shows day, English three-letter month and four-digit year', () => {
    expect(formatDeadline('2026-11-05')).toBe('5 Nov 2026');
    expect(formatDeadline('2027-03-09')).toBe('9 Mar 2027');
    expect(formatDeadline('2025-12-31')).toBe('31 Dec 2025');
  });
});

describe('localDate', () => {
  it('gives the local calendar date', () => {
    expect(localDate(new Date(2026, 10, 5, 23, 59, 59))).toBe('2026-11-05');
    expect(localDate(new Date(2026, 10, 6, 0, 0, 0))).toBe('2026-11-06');
    expect(localDate(new Date(2026, 0, 9, 12))).toBe('2026-01-09');
  });
});

describe('isLate', () => {
  const today = '2026-11-05';
  const task = (status: Task['status'], deadline?: string): Task => ({ id: 'a', title: 'T', status, deadline });

  it('is late when the deadline is before today and the task is not Done', () => {
    expect(isLate(task('Todo', '2026-11-04'), today)).toBe(true);
    expect(isLate(task('Doing', '2025-01-02'), today)).toBe(true);
  });

  it('is not late on or after the deadline day', () => {
    expect(isLate(task('Todo', '2026-11-05'), today)).toBe(false);
    expect(isLate(task('Todo', '2026-11-06'), today)).toBe(false);
  });

  it('is never late in Done or without a deadline', () => {
    expect(isLate(task('Done', '2026-11-04'), today)).toBe(false);
    expect(isLate(task('Todo'), today)).toBe(false);
  });
});
