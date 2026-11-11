import { useEffect, useRef, useState, type FocusEvent, type FormEvent, type KeyboardEvent } from 'react';
import {
  STATUSES,
  addTask,
  dropTask,
  focusAfterRemoval,
  formatDeadline,
  isLate,
  localDate,
  moveTask,
  removeTask,
  renameTask,
  setDeadline,
  type FocusTarget,
  type Status,
  type Task,
} from './tasks';
import { loadTasks, openStorage, saveTasks } from './storage';
import { PrivateNotes } from './PrivateNotes';

/** How far (in pixels) the pointer must move while pressed before a press becomes a drag. */
const DRAG_THRESHOLD_PX = 4;

/** How often today's date is re-read, so a task turns late within a minute after midnight. */
const TODAY_CHECK_MS = 30_000;

/** Which field of a task is being edited. */
type EditKind = 'title' | 'deadline';

/** A task's field being edited, with the text in it. */
interface Editing {
  kind: EditKind;
  id: string;
  draft: string;
}

/** A task being dragged, and the swimlane under the pointer (null when over no swimlane). */
interface Drag {
  id: string;
  from: Status;
  over: Status | null;
}

/** The status of the swimlane at a point on the page, or null when the point is outside every swimlane. */
function laneAt(x: number, y: number): Status | null {
  const section = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-status]');
  return (section?.dataset.status as Status | undefined) ?? null;
}

export function App() {
  // Accessing window.localStorage throws when the browser blocks the page from storing data.
  const [storage] = useState(() => openStorage(() => window.localStorage));
  const [tasks, setTasks] = useState<Task[]>(() => loadTasks(storage));
  // True while the last save failed. Every change (add, move, rename, remove) saves the whole list,
  // so a later successful save also stores what was not saved before.
  const [saveFailed, setSaveFailed] = useState(storage === null);
  const [title, setTitle] = useState('');
  // Where focus goes once a removal has been rendered.
  const [focusAfterRemove, setFocusAfterRemove] = useState<FocusTarget | null>(null);
  const headingRefs = useRef(new Map<Status, HTMLHeadingElement>());
  const removeRefs = useRef(new Map<string, HTMLButtonElement>());
  // A pressed task that has not moved far enough yet to count as a drag.
  const pressRef = useRef<{ id: string; from: Status; x: number; y: number } | null>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  // The task whose title or deadline is being edited, with the text in its field.
  // Only one field (title or deadline) is shown at a time.
  const [editing, setEditing] = useState<Editing | null>(null);
  const editFormRef = useRef<HTMLFormElement>(null);
  const editRefs = useRef(new Map<string, HTMLButtonElement>());
  const deadlineRefs = useRef(new Map<string, HTMLButtonElement>());
  // The action that gets focus back once an edit has ended.
  const [focusAfterEdit, setFocusAfterEdit] = useState<{ kind: EditKind; id: string } | null>(null);
  // Today's date in local time, re-read on a timer so a deadline turns late after midnight.
  const [today, setToday] = useState(() => localDate(new Date()));
  const pointerDownRef = useRef(false);
  const pressedOutsideRef = useRef(false);

  function updateDrag(next: Drag | null) {
    dragRef.current = next;
    setDrag(next);
  }

  // Dragging uses pointer events on the window, so the drag follows the pointer anywhere on the page.
  useEffect(() => {
    function handleMove(event: PointerEvent) {
      const press = pressRef.current;
      if (press === null) return;
      const current = dragRef.current;
      if (current === null && Math.hypot(event.clientX - press.x, event.clientY - press.y) < DRAG_THRESHOLD_PX) return;
      const over = laneAt(event.clientX, event.clientY);
      if (current === null || current.over !== over) updateDrag({ id: press.id, from: press.from, over });
    }
    function handleUp(event: PointerEvent) {
      const current = dragRef.current;
      pressRef.current = null;
      if (current === null) return;
      const target = laneAt(event.clientX, event.clientY);
      setTasks((tasks) => dropTask(tasks, current.id, target));
      updateDrag(null);
    }
    function handleCancel() {
      pressRef.current = null;
      updateDrag(null);
    }
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleCancel);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleCancel);
    };
  }, []);

  useEffect(() => {
    setSaveFailed(!saveTasks(storage, tasks));
  }, [storage, tasks]);

  useEffect(() => {
    if (focusAfterRemove === null) return;
    if ('removeOf' in focusAfterRemove) removeRefs.current.get(focusAfterRemove.removeOf)?.focus();
    else headingRefs.current.get(focusAfterRemove.heading)?.focus();
    setFocusAfterRemove(null);
  }, [focusAfterRemove]);

  useEffect(() => {
    if (focusAfterEdit === null) return;
    const refs = focusAfterEdit.kind === 'title' ? editRefs : deadlineRefs;
    refs.current.get(focusAfterEdit.id)?.focus();
    setFocusAfterEdit(null);
  }, [focusAfterEdit]);

  useEffect(() => {
    const timer = setInterval(() => setToday(localDate(new Date())), TODAY_CHECK_MS);
    return () => clearInterval(timer);
  }, []);

  // A click whose press started outside the edit's field, Save and Cancel cancels the edit, and the
  // click then does what it would do anyway. A press that starts in the field and ends elsewhere is
  // not outside. The edit ends on the click, not on the press, so the page does not change under the
  // pointer before the click lands.
  useEffect(() => {
    if (editing === null) return;
    const { kind, id } = editing;
    pointerDownRef.current = false;
    pressedOutsideRef.current = false;
    function handlePointerDown(event: PointerEvent) {
      pointerDownRef.current = true;
      pressedOutsideRef.current = !editFormRef.current?.contains(event.target as Node);
    }
    function handlePointerUp() {
      pointerDownRef.current = false;
    }
    function handleClick() {
      if (pressedOutsideRef.current) {
        setEditing((current) => (current?.kind === kind && current.id === id ? null : current));
      }
      pressedOutsideRef.current = false;
    }
    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('pointerup', handlePointerUp, true);
    document.addEventListener('click', handleClick, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('pointerup', handlePointerUp, true);
      document.removeEventListener('click', handleClick, true);
    };
  }, [editing?.kind, editing?.id]);

  function endEdit(kind: EditKind, id: string) {
    setEditing(null);
    setFocusAfterEdit({ kind, id });
  }

  function handleEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (editing === null) return;
    const { kind, id, draft } = editing;
    // An empty or whitespace-only title is not saved: renameTask leaves the list as it is,
    // and the edit ends as if it was cancelled. An empty or incomplete date removes the deadline.
    setTasks((current) => (kind === 'title' ? renameTask(current, id, draft) : setDeadline(current, id, draft)));
    endEdit(kind, id);
  }

  function handleClearDeadline(id: string) {
    setTasks((current) => setDeadline(current, id, ''));
    endEdit('deadline', id);
  }

  function handleEditKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key !== 'Escape' || editing === null) return;
    event.preventDefault();
    endEdit(editing.kind, editing.id);
  }

  // Moving focus with Tab out of the field and its actions cancels the edit, as a click outside does.
  // Focus moved by a pointer press is left to the click.
  function handleEditBlur(event: FocusEvent<HTMLFormElement>) {
    const next = event.relatedTarget;
    if (pointerDownRef.current || next === null || event.currentTarget.contains(next)) return;
    setEditing(null);
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Adding is blocked while saving does not work, so no more new work piles up unsaved.
    if (saveFailed || title.trim() === '') return;
    setTasks((current) => addTask(current, title, crypto.randomUUID()));
    setTitle('');
  }

  // Removal is final: no confirmation, no message and no Undo. It is saved like every other change.
  function handleRemove(id: string) {
    const target = focusAfterRemoval(tasks, id);
    if (target === null) return;
    setTasks(removeTask(tasks, id));
    setFocusAfterRemove(target);
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
      <div className="swimlanes">
        {STATUSES.map((status) => {
          const headingId = `lane-${status}`;
          // While a task is dragged, every swimlane other than its own is a drop place;
          // the one under the pointer is marked more strongly.
          const dropClass =
            drag === null || drag.from === status ? undefined : drag.over === status ? 'drop-place drop-over' : 'drop-place';
          return (
            <section key={status} aria-labelledby={headingId} data-status={status} className={dropClass}>
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
                    <li
                      key={task.id}
                      className="task"
                      onPointerDown={(event) => {
                        // Only the primary button on the task itself starts a drag; its buttons keep working.
                        // The title field is left out too, so text in it can be selected by dragging.
                        if (event.button !== 0 || (event.target as Element).closest('button, input')) return;
                        event.preventDefault(); // no text selection while dragging
                        pressRef.current = { id: task.id, from: status, x: event.clientX, y: event.clientY };
                      }}
                    >
                      {editing?.kind === 'title' && editing.id === task.id ? (
                        <form
                          ref={editFormRef}
                          className="edit"
                          noValidate
                          onSubmit={handleEditSubmit}
                          onKeyDown={handleEditKeyDown}
                          onBlur={handleEditBlur}
                        >
                          <label htmlFor={`edit-title-${task.id}`} className="visually-hidden">
                            Title
                          </label>
                          <input
                            id={`edit-title-${task.id}`}
                            type="text"
                            autoFocus
                            value={editing.draft}
                            onChange={(event) => setEditing({ kind: 'title', id: task.id, draft: event.target.value })}
                          />
                          <button type="submit">Save</button>
                          <button type="button" onClick={() => endEdit('title', task.id)}>
                            Cancel
                          </button>
                        </form>
                      ) : (
                        <>
                          <span>{task.title}</span>
                          <button
                            type="button"
                            aria-label={`Edit ${task.title}`}
                            ref={(el) => {
                              if (el) editRefs.current.set(task.id, el);
                              else editRefs.current.delete(task.id);
                            }}
                            onClick={() => setEditing({ kind: 'title', id: task.id, draft: task.title })}
                          >
                            Edit
                          </button>
                        </>
                      )}{' '}
                      {editing?.kind === 'deadline' && editing.id === task.id ? (
                        <form
                          ref={editFormRef}
                          className="edit"
                          noValidate
                          onSubmit={handleEditSubmit}
                          onKeyDown={handleEditKeyDown}
                          onBlur={handleEditBlur}
                        >
                          <label htmlFor={`edit-deadline-${task.id}`} className="visually-hidden">
                            Deadline
                          </label>
                          <input
                            id={`edit-deadline-${task.id}`}
                            type="date"
                            autoFocus
                            onClick={(event) => {
                              // The calendar button is hidden (see index.css), so a click opens the calendar.
                              // showPicker throws where the browser does not allow it; typing still works.
                              try {
                                event.currentTarget.showPicker();
                              } catch {
                                // Typing the date is still possible.
                              }
                            }}
                            value={editing.draft}
                            onChange={(event) => setEditing({ kind: 'deadline', id: task.id, draft: event.target.value })}
                          />
                          <button type="submit">Save</button>
                          <button type="button" onClick={() => endEdit('deadline', task.id)}>
                            Cancel
                          </button>
                          {task.deadline !== undefined && (
                            <button type="button" onClick={() => handleClearDeadline(task.id)}>
                              Clear deadline
                            </button>
                          )}
                        </form>
                      ) : (
                        <>
                          {task.deadline !== undefined && <span className="due">Due {formatDeadline(task.deadline)}</span>}{' '}
                          {/* Late is marked with text, so it does not rely on colour alone. */}
                          {isLate(task, today) && <strong className="late">Late</strong>}{' '}
                          <button
                            type="button"
                            aria-label={`Deadline for ${task.title}`}
                            ref={(el) => {
                              if (el) deadlineRefs.current.set(task.id, el);
                              else deadlineRefs.current.delete(task.id);
                            }}
                            onClick={() => setEditing({ kind: 'deadline', id: task.id, draft: task.deadline ?? '' })}
                          >
                            Deadline
                          </button>
                        </>
                      )}
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
              {/* Keeps the page text of neighbouring swimlanes apart ("Remove Doing", not "RemoveDoing"). */}
              {' '}
            </section>
          );
        })}
      </div>
      <PrivateNotes />
    </main>
  );
}
