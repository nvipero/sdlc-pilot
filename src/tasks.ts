export type Status = 'Todo' | 'Doing' | 'Done';

export const STATUSES: readonly Status[] = ['Todo', 'Doing', 'Done'];

export interface Task {
  id: string;
  title: string;
  status: Status;
}

/**
 * Adds a new task in Todo. Returns the same array when the trimmed title is empty,
 * so the caller can tell that nothing changed.
 */
export function addTask(tasks: Task[], title: string, id: string): Task[] {
  const trimmed = title.trim();
  if (trimmed === '') return tasks;
  return [...tasks, { id, title: trimmed, status: 'Todo' }];
}

/** Moves the task with the given id to a status; other tasks are left as they are. */
export function moveTask(tasks: Task[], id: string, status: Status): Task[] {
  return tasks.map((task) => (task.id === id ? { ...task, status } : task));
}
