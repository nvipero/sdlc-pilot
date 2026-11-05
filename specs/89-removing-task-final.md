# 89: As a user I want removing a task to be final

> **TL;DR:** Removing a task takes it away at once and for good: no message, no Undo, and it stays gone after a reload.
> Removal still works with the keyboard alone, and focus moves to the next sensible remove action or the swimlane heading.

## Problem and why

The owner, the only user of the app (context: Users), removes tasks they no longer need from the swimlanes Todo, Doing and Done (context: Purpose; glossary: Swimlane).
Today every removal shows a message that offers Undo for 5 seconds (`specs/29-remove-task-no-longer-needed.md` AC-4 to AC-6).
When the owner cleans up several tasks in a row, that message gets in the way, and the owner always means to remove the task they remove, so the Undo has no value to them (issue: #89).
Making removal final, with no message and no Undo, makes cleaning up faster and keeps the view clean (context: Purpose).
The owner also asks that removing keeps working with the keyboard alone and that focus goes somewhere sensible after a removal (issue: #89).
The context still lists "can a task be deleted?" as an open question (context: Open questions); spec 29 traced removal to the owner's answer on #29, and this story settles that removal is final (issue: #89).

## Scope

- Removing a task takes effect at once and for good, without a confirmation step and without an undo window.
- No message and no Undo action after a removal.
- A removed task stays removed after a page reload and after the browser is closed and the app opened again, also when the reload comes right after the removal.
- Removing tasks with the keyboard alone, and moving keyboard focus on purpose after each removal.
- Supersedes `specs/29-remove-task-no-longer-needed.md` AC-4, AC-5, AC-6, AC-8, AC-9, AC-10, AC-11 and AC-12, and its scope items about the message, Undo, the undo window and focus after Undo or after the message disappears. Changes spec 29 AC-7: a removed task stays removed after a reload at any time after the removal, not only after the undo window has ended. Spec 29 AC-1, AC-2 and AC-3 stay in force.

## Out of scope

- A confirmation dialog before removal (issue: #89 asks for removal at once).
- An archive, trash or "recently removed" view, or any other way to get a removed task back.
- Removing several tasks at once, or clearing a whole swimlane.
- What happens when saving a removal fails because browser storage is unavailable or blocked; `specs/31-tasks-cannot-be-saved.md` covers adding a task and changing a status only.
- Undo for any other action.
- Updating `docs/product-context.md` and `docs/glossary.md` (researcher's files).

## Acceptance criteria

- AC-1: When the user activates a task's remove action, the task immediately stops appearing in its swimlane, without any confirmation step, and every other task keeps its swimlane, title, status and order.
- AC-2: After a task is removed, no Undo action is offered anywhere in the page and no message about the removal is shown, neither right after the removal nor during the 10 seconds after it, nor after a page reload.
- AC-3: A removed task does not appear in any swimlane after the page is reloaded, also when the reload happens right after the removal (within 1 second), and after the browser is closed and the app is opened again.
- AC-4: When the user removes several tasks in quick succession (each remove action activated within 100 ms of the previous one), none of the removed tasks appears in any swimlane, also after a page reload, and every task that was not removed keeps its swimlane, title, status and order.
- AC-5: Using only the keyboard, the user can move focus to a task's remove action and activate it with Enter or Space, and the task is removed as in AC-1. No step needs a mouse, and no step needs keys to be pressed within a time limit.
- AC-6: After a task is removed with its remove action, keyboard focus is on:
  - the remove action of the task that followed the removed task in the same swimlane, if there is one;
  - otherwise, the remove action of the task that preceded the removed task in the same swimlane, if there is one;
  - otherwise (the swimlane is now empty), the heading of that swimlane (the heading that shows its status, Todo, Doing or Done).
- AC-7: A keyboard user can remove several tasks of one swimlane in a row by pressing Enter repeatedly, without moving focus between removals: each press removes the task whose remove action has focus, as AC-6 places it.

## Assumptions

- No message of any kind is shown after a removal, not only no Undo (AC-2). (why it is safe: the owner says the message gets in the way when cleaning up several tasks (issue: #89), and the removed task disappearing from its swimlane already shows the outcome)
- Focus goes first to the next task's remove action, then to the previous one, then to the swimlane heading (AC-6). (why it is safe: when a deletion removes the focused item, focus should be set on purpose, to an equivalent control or a stable parent such as a list heading (docs: https://primer.style/product/scenario-patterns/delete/, read 2026-10-23, as recorded in `docs/research/29-task-removal-safeguard.md`). That page prefers the previous equivalent control; taking the next task first is this spec's own choice, because it lets the owner clean up several tasks in a row from the top of a swimlane down (issue: #89))
- Focus stays in the swimlane the task was removed from and does not jump to another swimlane. (why it is safe: the swimlane heading is the stable parent spec 29 AC-12 already uses as a focus target)
- The swimlane heading can receive focus. (why it is safe: spec 29 AC-12 already requires it)
- AC-6 applies to removal with a mouse as well as with the keyboard. (why it is safe: it only decides where focus goes; it does not change what a mouse user can do)
- Repeated Enter can remove tasks quickly (AC-7) without a safeguard. (why it is safe: the owner always means to remove the task they remove, and asks for no Undo (issue: #89))
- The remove action keeps the accessible name from spec 29 AC-1, with the word "Remove" and the task's title. (why it is safe: this story does not change the remove action itself)

## Open questions
