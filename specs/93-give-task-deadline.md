# 93: As a user I want to give a task a deadline

> **TL;DR:** The user can set, change and remove a deadline date on any task; the task shows it as "Due <date>".
> A task that is not Done and whose deadline day has passed shows the word "Late", so it is recognisable without colour. No reminders or notifications.

## Problem and why

The owner, the only user of the app (context: Users), follows tasks through the swimlanes Todo, Doing and Done (context: Purpose; glossary: Task, Swimlane).
Today a task has only a title and a status, so the owner cannot record when a task should be finished, and must keep dates elsewhere and check each one by hand to notice work that has slipped (issue: #93).
With a deadline on the task and late tasks marked on the board, the owner sees at a glance which tasks have been let slip, in time to act (issue: #93).
The context lists "Reminders, notifications and deadlines" as a non-goal (context: Non-goals). The owner settled this for this story: deadlines and showing late tasks become part of the product, while reminders and notifications stay non-goals (issue: #93, owner comment 6670433467).
The owner also asks that a late task is recognisable without relying on colour alone (issue: #93).

## Scope

- A deadline action on every task, in every swimlane, that opens a date field for that task.
- Setting a deadline, changing it, and removing it.
- Showing a task's deadline on the task.
- Marking a task as late, with visible text, when its deadline day has passed and the task is not Done.
- Doing all of this with the keyboard alone, as well as with a mouse.
- Storing the deadline in the browser so it is still shown after a page reload (context: Constraints).
- Applying the save-failure behaviour of `specs/31-tasks-cannot-be-saved.md` to a saved deadline. This extends spec 31 AC-7 as spec 87 AC-13 does for a title: a successful save of a deadline also counts as saving working again.

## Out of scope

- Reminders, alerts and notifications of any kind, inside or outside the page, for a deadline that is near or has passed (issue: #93, owner comment 6670433467).
- A time of day on a deadline; a deadline is a date only.
- Recurring deadlines, start dates, or durations.
- Sorting or filtering tasks by deadline, or a separate list or count of late tasks.
- Marking tasks whose deadline is near ("due soon").
- Setting a deadline while adding a task, or in the title edit form of spec 87.
- A stated accessibility level for the whole app (context: Open questions); this story covers keyboard operation of deadlines and the non-colour late marking only.
- Updating `docs/product-context.md` and `docs/glossary.md` (researcher's files; the owner updates the context).

## Acceptance criteria

- AC-1: Every task shown in any swimlane (Todo, Doing or Done) offers a deadline action. Its accessible name includes the word "deadline" (in any letter case) and the task's title, and does not include the words "Edit" or "Remove".
- AC-2: When the user activates a task's deadline action, a date field labelled "Deadline" appears for that task and has keyboard focus. It contains the task's current deadline, or is empty when the task has none. While it is shown, a visible save action with an accessible name that includes the word "Save" and a visible cancel action with an accessible name that includes the word "Cancel" are shown for that task.
- AC-3: When the user enters a date in the field and saves, the date field is gone and the task shows the text "Due " followed by the date as day, English three-letter month and four-digit year, for example "Due 5 Nov 2026" for 5 November 2026. The task keeps its title, swimlane, status and position among the tasks of its swimlane.
- AC-4: When the user opens the deadline field of a task that has a deadline, enters a different date and saves, the task shows only the new deadline.
- AC-5: While the deadline field of a task that has a deadline is shown, a visible action with the accessible name "Clear deadline" is shown for that task. Activating it removes the deadline: the date field is gone, the task shows no "Due" text and no "Late" text.
- AC-6: Saving while the date field is empty, or does not hold a complete date, leaves the task without a deadline: a deadline it had is removed, and the task shows no "Due" text and no "Late" text.
- AC-7: When the user cancels with the cancel action or Escape, the date field is gone and the task shows the deadline it had before, or none, even if the date in the field was changed, and nothing is stored for that change.
- AC-8: Setting, changing or removing a deadline does not change any other task: every other task keeps its title, status, swimlane, order and deadline, including another task with the same title.
- AC-9: After a deadline has been set, changed or removed and the page is reloaded, the task shows the deadline as it was last saved, or no deadline if it was removed.
- AC-10: A task that is not in Done and whose deadline is earlier than today's date shows the visible text "Late" as part of the task, in addition to its "Due" text. A task whose deadline is today or later shows no "Late" text.
- AC-11: A task in Done shows no "Late" text, whatever its deadline. When a late task is moved to Done it stops showing "Late"; when it is moved from Done to Todo or Doing and its deadline has passed, it shows "Late" again.
- AC-12: A deadline earlier than today's date can be set; the task then shows "Late" right after saving, unless it is in Done.
- AC-13: While the page stays open, a task whose deadline day ends starts showing "Late" within one minute after midnight in the browser's local time, without a reload or any user action.
- AC-14: A task keeps its deadline when it is moved to another status (with the move actions or by drag and drop) and when its title is edited.
- AC-15: Tasks stored before this story, which have no deadline, are still shown after this story, with their titles and statuses, and without "Due" or "Late" text.
- AC-16: Using only the keyboard, the user can move focus to a task's deadline action, activate it with Enter or Space, enter a date, save with Enter, cancel with Escape, and reach and activate the "Clear deadline" action. No step needs a mouse, and no step needs keys to be pressed within a time limit. After saving, cancelling or clearing, keyboard focus is on that task's deadline action.
- AC-17: When saving a deadline fails, the message from spec 31 AC-1 is shown, and the task still shows the new deadline (and "Late" if AC-10 applies) in the open page. When a later save of a deadline succeeds while that message is shown, everything as shown in the open page is stored and the message is no longer shown, as spec 31 AC-7 and AC-8 describe for a status change.
- AC-18: While a task's deadline field is shown, clicking anywhere outside the field and its Save, Cancel and "Clear deadline" actions, or pressing Tab or Shift+Tab so that keyboard focus leaves them, cancels as Escape does (AC-7). Moving focus between the field and those actions with Tab or Shift+Tab does not end it. Starting a title edit or opening another task's deadline field also cancels it, and only one date field or title field is shown at a time.

## Choices

- AC-1, AC-2, AC-5, AC-16: proposal: a separate deadline action with its own field, Save, Cancel and "Clear deadline", mirroring the title edit of spec 87 so it works the same with keyboard and mouse; the names avoid "Edit" and "Remove" so they cannot be confused with the edit and remove actions of specs 87 and 29.
- AC-3: proposal: a deadline is a date without a time, shown as "Due 5 Nov 2026"; this reads the same in every locale and cannot be mistaken for a day/month or month/day order.
- AC-5, AC-6: extends: (issue: #93) "remove it", with an explicit "Clear deadline" action and an empty field as two ways to remove.
- AC-10: extends: (issue: #93) "shown as late" and "without relying on colour alone": the visible text "Late" marks the task; a deadline counts as passed only after its whole day has passed, so a task due today is not late.
- AC-11: proposal: a Done task is finished, so it cannot have slipped; marking it late would add noise to the board the owner uses to spot slipped work (issue: #93).
- AC-13: proposal: the owner keeps the page open for long periods, and a late task should not need a reload to show; one minute is well below what the owner would notice.
- AC-14: extends: AC-9; a deadline belongs to the task, not to its status or title.
- AC-16: proposal: the same keyboard operation and focus return the owner asked for when editing a title (issue: #87, as recorded in `specs/87-edit-task-title.md` AC-10 and AC-11).
- AC-17: extends: (main: tests/acceptance/task-title-editing.spec.ts) the save-failure behaviour applied to title edits by spec 87 AC-13.
- AC-18: extends: (issue: #87, owner comment 6548428983) a click outside cancels a title edit, applied to the deadline field, as spec 87 AC-16 applies it to leaving with Tab.

## Assumptions

- Today's date and midnight are those of the browser's local time zone. (why it is safe: the app runs only in the browser and has no server (context: Constraints), so the browser's clock is the only clock there is)
- How the date is entered (a native date picker or typed text) and where the "Due" and "Late" texts sit in the task are left to the implementation, within AC-2, AC-3 and AC-10. (why it is safe: the criteria fix what the user sees and can do, not the control)
- The task may also use colour for a late task, as long as the "Late" text is shown. (why it is safe: the issue forbids relying on colour alone, not using colour)
- A removed task's deadline is removed with it. (why it is safe: spec 89 removes the task for good, and nothing refers to a deadline without its task)
- Adding is still blocked while saving fails, and setting a deadline stays possible, as for title edits. (why it is safe: spec 31 blocks only adding so no new work piles up; a deadline adds no new task)
- There is no earliest or latest allowed deadline beyond what the date field accepts. (why it is safe: the issue sets no limit, and AC-12 already covers past dates)

## Open questions
