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

/**
 * Applies a drag-and-drop release: `target` is the status of the swimlane the task was dropped on,
 * or null when it was released outside every swimlane. Returns the same array when nothing changes
 * (outside, its own swimlane, or an unknown id), so no save is needed.
 */
export function dropTask(tasks: Task[], id: string, target: Status | null): Task[] {
  const task = tasks.find((t) => t.id === id);
  if (target === null || task === undefined || task.status === target) return tasks;
  return moveTask(tasks, id, target);
}

/** A removed task and its index in the task list, so Undo can put it back where it was. */
export interface RemovedTask {
  task: Task;
  index: number;
}

/** Removes the task with the given id. Returns the same array and `removed: null` for an unknown id. */
export function removeTask(tasks: Task[], id: string): { tasks: Task[]; removed: RemovedTask | null } {
  const index = tasks.findIndex((task) => task.id === id);
  if (index === -1) return { tasks, removed: null };
  return { tasks: [...tasks.slice(0, index), ...tasks.slice(index + 1)], removed: { task: tasks[index], index } };
}

/**
 * Puts a removed task back at its index (or at the end if the list has become shorter).
 * Returns the same array when a task with that id is already present.
 */
export function restoreTask(tasks: Task[], { task, index }: RemovedTask): Task[] {
  if (tasks.some((t) => t.id === task.id)) return tasks;
  const at = Math.min(index, tasks.length);
  return [...tasks.slice(0, at), task, ...tasks.slice(at)];
}

/**
 * Gives the task with the given id a new, trimmed title; its status and position stay.
 * Returns the same array when the trimmed title is empty or the id is unknown, so nothing is saved.
 */
export function renameTask(tasks: Task[], id: string, title: string): Task[] {
  const trimmed = title.trim();
  if (trimmed === '' || !tasks.some((task) => task.id === id)) return tasks;
  return tasks.map((task) => (task.id === id ? { ...task, title: trimmed } : task));
}
