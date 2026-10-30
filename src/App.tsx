import { useEffect, useRef, useState, type FormEvent } from 'react';
import { STATUSES, addTask, moveTask, removeTask, restoreTask, type RemovedTask, type Status, type Task } from './tasks';
import { loadTasks, openStorage, saveTasks } from './storage';

/** How long Undo is offered after a removal. */
const UNDO_WINDOW_MS = 5000;

export function App() {
  // Accessing window.localStorage throws when the browser blocks the page from storing data.
  const [storage] = useState(() => openStorage(() => window.localStorage));
  const [tasks, setTasks] = useState<Task[]>(() => loadTasks(storage));
  // True while the last save failed. Every change (add, move, remove, Undo) saves the whole list,
  // so a later successful save also stores what was not saved before.
  const [saveFailed, setSaveFailed] = useState(storage === null);
  const [title, setTitle] = useState('');
  // The last removal while Undo is offered. The removal is saved at once, so it is final
  // when the window ends, another task is removed, or the page is closed or reloaded.
  const [pending, setPending] = useState<RemovedTask | null>(null);
  const [focusRemoveOf, setFocusRemoveOf] = useState<string | null>(null);
  const undoRef = useRef<HTMLButtonElement>(null);
  const headingRefs = useRef(new Map<Status, HTMLHeadingElement>());
  const removeRefs = useRef(new Map<string, HTMLButtonElement>());

  useEffect(() => {
    setSaveFailed(!saveTasks(storage, tasks));
  }, [storage, tasks]);

  useEffect(() => {
    if (pending === null) return;
    undoRef.current?.focus();
    const timer = window.setTimeout(() => {
      if (document.activeElement === undoRef.current) {
        headingRefs.current.get(pending.task.status)?.focus();
      }
      setPending(null);
    }, UNDO_WINDOW_MS);
    return () => window.clearTimeout(timer);
  }, [pending]);

  useEffect(() => {
    if (focusRemoveOf === null) return;
    removeRefs.current.get(focusRemoveOf)?.focus();
    setFocusRemoveOf(null);
  }, [focusRemoveOf]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Adding is blocked while saving does not work, so no more new work piles up unsaved.
    if (saveFailed || title.trim() === '') return;
    setTasks((current) => addTask(current, title, crypto.randomUUID()));
    setTitle('');
  }

  function handleRemove(id: string) {
    const result = removeTask(tasks, id);
    if (result.removed === null) return;
    setTasks(result.tasks);
    setPending(result.removed);
  }

  function handleUndo() {
    if (pending === null) return;
    setTasks((current) => restoreTask(current, pending));
    setFocusRemoveOf(pending.task.id);
    setPending(null);
  }

  return (
    <main>
      <h1>Tasks</h1>
      {saveFailed && (
        <p role="alert" className="save-failed">
          Your tasks cannot be saved in this browser. Changes that are not saved will be lost when you
          close this page. New tasks cannot be added until saving works again.
        </p>
      )}
      <form onSubmit={handleSubmit}>
        <label htmlFor="task-title">Title</label>
        <input
          id="task-title"
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          disabled={saveFailed}
        />
        <button type="submit" disabled={saveFailed}>
          Add task
        </button>
      </form>
      <div className="removal">
        <p role="status">{pending && `Removed “${pending.task.title}”.`}</p>
        {pending && (
          <button ref={undoRef} type="button" onClick={handleUndo}>
            Undo
          </button>
        )}
      </div>
      <div className="swimlanes">
        {STATUSES.map((status) => {
          const headingId = `lane-${status}`;
          return (
            <section key={status} aria-labelledby={headingId}>
              <h2
                id={headingId}
                tabIndex={-1}
                ref={(el) => {
                  if (el) headingRefs.current.set(status, el);
                  else headingRefs.current.delete(status);
                }}
              >
                {status}
              </h2>
              <ul>
                {tasks
                  .filter((task) => task.status === status)
                  .map((task) => (
                    <li key={task.id}>
                      <span>{task.title}</span>
                      {STATUSES.filter((s) => s !== status).map((target) => (
                        <button
                          key={target}
                          type="button"
                          onClick={() => setTasks((current) => moveTask(current, task.id, target))}
                        >
                          Move to {target}
                        </button>
                      ))}
                      <button
                        type="button"
                        aria-label={`Remove ${task.title}`}
                        ref={(el) => {
                          if (el) removeRefs.current.set(task.id, el);
                          else removeRefs.current.delete(task.id);
                        }}
                        onClick={() => handleRemove(task.id)}
                      >
                        Remove
                      </button>
                    </li>
                  ))}
              </ul>
            </section>
          );
        })}
      </div>
    </main>
  );
}
