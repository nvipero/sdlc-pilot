export type Status = 'Todo' | 'Doing' | 'Done';

export const STATUSES: readonly Status[] = ['Todo', 'Doing', 'Done'];

export interface Task {
  id: string;
  title: string;
  status: Status;
  /** A date without a time, as YYYY-MM-DD; absent when the task has no deadline. */
  deadline?: string;
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

/**
 * Returns the value when it is a complete date that exists, as YYYY-MM-DD, or null otherwise.
 */
export function parseDeadline(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match === null) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  const exists = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  return exists ? value : null;
}

/**
 * Sets the deadline of the task with the given id. An empty, incomplete or impossible date removes
 * the deadline. Returns the same array for an unknown id.
 */
export function setDeadline(tasks: Task[], id: string, value: string): Task[] {
  if (!tasks.some((task) => task.id === id)) return tasks;
  const deadline = parseDeadline(value);
  return tasks.map((task) => {
    if (task.id !== id) return task;
    const { id: taskId, title, status } = task;
    return deadline === null ? { id: taskId, title, status } : { id: taskId, title, status, deadline };
  });
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Shows a YYYY-MM-DD deadline as day, English three-letter month and year, e.g. "5 Nov 2026". */
export function formatDeadline(deadline: string): string {
  const [year, month, day] = deadline.split('-').map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

/** The calendar date of a moment in the browser's local time, as YYYY-MM-DD. */
export function localDate(now: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** A task is late when it is not Done and its deadline day is before today (both YYYY-MM-DD). */
export function isLate(task: Task, today: string): boolean {
  return task.status !== 'Done' && task.deadline !== undefined && task.deadline < today;
}
