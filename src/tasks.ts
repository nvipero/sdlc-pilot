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

/** Removes the task with the given id for good. Returns the same array for an unknown id. */
export function removeTask(tasks: Task[], id: string): Task[] {
  const index = tasks.findIndex((task) => task.id === id);
  if (index === -1) return tasks;
  return [...tasks.slice(0, index), ...tasks.slice(index + 1)];
}

/** Where keyboard focus goes after a removal: another task's remove action, or a swimlane heading. */
export type FocusTarget = { removeOf: string } | { heading: Status };

/**
 * Decides, from the list before the removal, where focus goes when the task with the given id is
 * removed: the next task in its swimlane, else the previous one, else the swimlane's heading.
 * Returns null for an unknown id.
 */
export function focusAfterRemoval(tasks: Task[], id: string): FocusTarget | null {
  const task = tasks.find((t) => t.id === id);
  if (task === undefined) return null;
  const lane = tasks.filter((t) => t.status === task.status);
  const at = lane.indexOf(task);
  const neighbour = lane[at + 1] ?? lane[at - 1];
  return neighbour === undefined ? { heading: task.status } : { removeOf: neighbour.id };
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
