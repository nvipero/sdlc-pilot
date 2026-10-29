# 31: Tell me when my tasks cannot be saved

TL;DR: When the browser cannot store the user's tasks, the app shows a plain-language message and stops the user adding new tasks until saving works again.
Saving counts as working again when a later status change is saved; that save also stores everything still unsaved, and then the message goes away and adding works again.

## Problem and why

The owner keeps all tasks in the app, and the app keeps them only in the browser, with no server (context: Constraints). The owner is the only user (context: Users), so there is no copy anywhere else to fall back on. Browser storage can be unavailable: accessing it fails when the user has set the browser to block the page from persisting data, or when the page is opened from an address that is not a normal web origin, such as a `file:` URL (context: Constraints). If that happens and the app says nothing, the owner keeps adding tasks and changing their status, and loses all of it when the page is closed, without ever knowing. The context lists "What should the app do when browser storage is unavailable or blocked" as an open question for exactly this reason (context: Open questions); this story, written by the owner, answers it: the app must tell the user (issue: #31), and it must not let the user add new tasks until saving works again, so that no more new work piles up unsaved (issue: #31, owner comment 2026-10-29).

## Scope

- Detecting, when the app opens, that browser storage cannot be used.
- Detecting that saving a change to the tasks (adding a task, changing a task's status) failed.
- Showing the user a message in the app when either happens.
- Not letting the user add new tasks while saving does not work.
- Still letting the user change a task's status while saving does not work, and trying to save each such change.
- Treating a later successful save as "saving works again": it stores all tasks as shown in the open page, removes the message and lets the user add tasks again.

## Out of scope

- Warning about private or incognito sessions, where storage works but is cleared when the last private tab closes (context: Constraints). Saving succeeds there, so this story does not treat it as "cannot be saved".
- Recovering lost tasks, exporting tasks, or keeping a backup elsewhere.
- Retrying a failed save automatically on a timer.
- A separate "try again" control for checking whether saving works.
- Handling stored task data that can be read but is damaged or in an unexpected form.
- Browser or system notifications outside the page (context: Non-goals: reminders, notifications).
- Letting the user dismiss the message.
- A stated accessibility level for the message; that is still an open question in the context.

## Acceptance criteria

- AC-1: When the app opens and browser storage cannot be used (for example because the browser blocks the page from storing data), the app shows a message saying that tasks cannot be saved in this browser, that unsaved changes will be lost when the page is closed, and that new tasks cannot be added until saving works again.
- AC-2: When the app opened with working storage, and saving fails after the user adds a task, the app shows the message from AC-1 right after that action.
- AC-3: When the app opened with working storage, and saving fails after the user changes a task's status, the app shows the message from AC-1 right after that action.
- AC-4: After a failed save, the task the user added, or the status the user set, is still shown in the open page, in the swimlane of its current status.
- AC-5: While the message is shown, the user cannot add a task: trying to add one does not create a new task, and the message stays visible.
- AC-6: While the message is shown, the user can still change a task's status in the open page, and the task moves to the swimlane of its new status.
- AC-7: When, while the message is shown, the user changes a task's status and that change is saved successfully, the message is no longer shown and the user can add tasks again.
- AC-8: When a save succeeds after earlier failures, all tasks as shown in the open page are stored, including tasks added and statuses changed while saving failed; after the page is closed and opened again, they are shown in the swimlanes of their current statuses.
- AC-9: At most one such message is shown at a time, however many saves fail.
- AC-10: When storage works and every save succeeds, no such message is shown and the user can add tasks.
- AC-11: The message is in English and does not contain technical error names, such as "SecurityError", "QuotaExceededError" or "localStorage".

## Assumptions

- Adding a task and changing a task's status are the only actions that change saved tasks, and other stories build them. (why it is safe: the context confirms only these two operations; if editing or deleting is added later, the same message applies and that story can extend these criteria)
- Only adding is blocked; changing a task's status stays possible while saving fails. (why it is safe: the owner's comment names only adding; a status change is the only remaining action that tries to save, so it is how the app finds out that saving works again)
- Saving works again is detected only by a later save attempt, that is a status change, or by opening the app again with working storage (AC-10). (why it is safe: automatic retries and a separate "try again" control are out of scope; if there are no tasks to change, closing and opening the page re-checks storage, and nothing unsaved is lost because adding was blocked)
- A successful save stores the whole set of tasks shown in the open page, not only the latest change. (why it is safe: the story's goal is that the user does not lose work; storing only the latest change would silently drop earlier unsaved work)
- Every reason storage fails is treated the same, whether it is blocked access or, possibly, a full storage. (why it is safe: the user's situation is the same, tasks are not saved; full storage as a cause is unconfirmed in the context, but the criteria do not depend on the cause)
- The message is shown inside the page, not as a browser dialog that stops the user. (why it is safe: notifications outside the page are a non-goal, and a blocking dialog would conflict with AC-6)
- How adding is prevented (for example a disabled or hidden add control) and the exact wording of the message are left to the implementer, within AC-1, AC-5 and AC-11. (why it is safe: the criteria fix what the user can do and what the message must say; the form does not change behaviour)
- The message stays until saving works again and cannot be dismissed. (why it is safe: as long as tasks are not saved, the risk the story is about still exists; dismissal can be a later story)

## Open questions
