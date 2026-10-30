# 29: Remove a task I no longer need

TL;DR: The user can remove a task from any swimlane. The task disappears at once, a message offers Undo for 5 seconds,
and after that (or if the page is closed or reloaded) the task is gone for good.

## Problem and why

The owner, who is the only user of the app (context: Users), keeps tasks in swimlanes, one per status (context: Purpose).
Today a task can only be added and moved between statuses, so finished or abandoned tasks stay in the swimlanes forever
and the view gets cluttered (owner, issue #29). The app must look clean (context: Purpose), and a cluttered view works
against that. Removing a task lets the swimlanes show only work that still matters.

The context lists "can a task be deleted?" as an open question (context: Open questions), and the glossary entry for
Done still says so. The owner answered it in issue #29: tasks can be removed (owner, comment on #29, 2026-10-23).
The context files were not updated; this spec traces removal to that answer.

Removing a task by accident would lose it, so the removal needs a safeguard. Two design guidelines agree that an undo
window is an alternative to a confirmation, and advise against a blocking confirmation when a brief undo would do the
same job (practice: https://github.com/MicrosoftDocs/win32/blob/docs/desktop-src/uxguide/mess-confirm.md;
https://primer.style/product/scenario-patterns/delete/, read 2026-10-23; see `docs/research/29-task-removal-safeguard.md`).
The owner chose an undo window of about 5 seconds and no confirmation (owner, answer to Q1 for #29).

## Scope

- A remove action on every task, in every swimlane (Todo, Doing and Done).
- Removing a task without a confirmation step.
- A message that says the task was removed and offers Undo for 5 seconds.
- Undo, which puts the task back as it was.
- Permanent removal after the undo window ends, or when the page is closed or reloaded during the window.
- Keeping a removed task removed across page reloads and browser sessions.
- Moving focus on purpose after a removal and after an undo. When the message disappears without Undo, focus moves to
  the heading of the swimlane the task was removed from only if focus was on the Undo action; focus elsewhere is not
  moved.

## Out of scope

- A confirmation dialog before removal (the owner chose undo instead).
- An archive, trash or "recently removed" view; there is no way to get a task back after the undo window.
- Removing several tasks at once, or clearing a whole swimlane.
- Undo for any action other than removal, such as a status change.
- Behaviour when browser storage is unavailable or blocked; this is still an open question in the context
  (context: Open questions).
- Editing a task.
- Updating `docs/product-context.md` and `docs/glossary.md` (researcher's files).

## Acceptance criteria

- AC-1: Every task shown in any swimlane (Todo, Doing or Done) offers a remove action. The action has an accessible name
  that includes the word "Remove" and the task's title.
- AC-2: When the user activates the remove action of a task, the task immediately stops appearing in its swimlane,
  without any confirmation step.
- AC-3: Removing a task does not change any other task: every other task stays in the same swimlane, with the same
  title, status and order.
- AC-4: Right after a task is removed, a message is shown that says the task was removed, names the task's title and
  offers an Undo action.
- AC-5: If the user activates Undo within 5 seconds of the removal, the task appears again in the swimlane it was
  removed from, with the same title and status, at the same position among the tasks of that swimlane, and the message
  disappears.
- AC-6: If the user does not activate Undo, the message and its Undo action disappear 5 seconds after the removal, and
  the task does not appear in any swimlane. The 5 seconds run without pause, also while the Undo action has keyboard
  focus or the pointer is over it.
- AC-7: After the undo window has ended, the removed task does not appear in any swimlane after a page reload, or after
  the browser is closed and the app is opened again.
- AC-8: If the page is reloaded or closed while the Undo action is still offered, the task is removed for good: after
  the app is opened again it does not appear in any swimlane, and no Undo is offered.
- AC-9: A task restored with Undo still appears in its swimlane after a page reload.
- AC-10: If the user removes a second task while the message for a first removal is still shown, the first removal
  becomes permanent at once, and the message now names the second task and its Undo restores only the second task.
- AC-11: The message is announced to assistive technology when it appears (for example as a status message), so a
  screen reader user learns that the task was removed.
- AC-12: After a task is removed with its remove action, keyboard focus is on the Undo action in the message. After Undo
  is activated, keyboard focus is on the restored task's remove action. If focus is on the Undo action when the message
  disappears without Undo, focus moves to the heading of the swimlane the task was removed from (the heading that shows
  the swimlane's status, Todo, Doing or Done). If focus is elsewhere when the message disappears, it does not move.

## Assumptions

- Removal is permanent; there is no archive. (why it is safe: stated to the owner, who did not object)
- A task can be removed from any swimlane, not only Done. (why it is safe: stated to the owner, who did not object;
  the issue mentions both finished and abandoned tasks)
- A removed task stays removed after a page reload. (why it is safe: stated to the owner, who did not object; tasks
  are stored in the browser, context: Constraints)
- The owner's "about 5 seconds" is set to exactly 5 seconds; tests may allow a tolerance of up to 1 second either way.
  (why it is safe: the owner gave an approximate value, and a fixed value is needed for a testable criterion)
- Removing a second task during the undo window makes the first removal final and replaces the message (AC-10).
  (why it is safe: it keeps one message and one Undo at a time, which matches the owner's "Undo for a short time" and
  the rare case does not change the main flow)
- A restored task goes back to its original position in its swimlane. (why it is safe: Undo means putting things back
  as they were; the order of tasks in a swimlane is not otherwise defined)
- The message makes the outcome obvious and is announced to assistive technology (AC-4, AC-11). (why it is safe: undo
  alone is not enough if users do not notice the outcome, so it must be made obvious with feedback, standard:
  https://github.com/MicrosoftDocs/win32/blob/docs/desktop-src/uxguide/mess-confirm.md, read 2026-10-23)
- Focus is moved on purpose after removal (AC-12). (why it is safe: when a deletion removes the focused item, focus
  should be set on purpose, not left to fall back to the page, and a stable parent is a suitable target, standard:
  https://primer.style/product/scenario-patterns/delete/, read 2026-10-23, as recorded in
  `docs/research/29-task-removal-safeguard.md`; the swimlane heading is the stable parent chosen here)
- Each swimlane shows a heading with its status (Todo, Doing or Done), and that heading can receive focus when AC-12
  moves focus to it. (why it is safe: a swimlane shows the tasks of one status, context: Purpose, so naming the status
  is expected; it gives AC-12 a single, testable focus target)
- Focus is moved to the swimlane heading only when it is still on the Undo action; focus the user moved elsewhere
  during the 5 seconds, for example into the add-task field, is left alone. (why it is safe: moving focus
  unconditionally would take it away from where the user is working)
- The 5-second undo window is fixed and does not pause on focus or hover (AC-6). (why it is safe: AC-12 puts focus on
  Undo right after every removal, so pausing on focus would stop the window from ending unless the user moved focus
  away; the owner chose a short window)
- The remove action's accessible name includes the task's title (AC-1). (why it is safe: it lets a test and a screen
  reader user tell the remove actions of different tasks apart; it does not change what the user can do)

## Open questions
