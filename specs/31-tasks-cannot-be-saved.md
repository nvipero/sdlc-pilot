# 31: Tell me when my tasks cannot be saved

TL;DR: When the browser cannot store the user's tasks, the app shows a plain-language message saying so.
The message appears when storage is unavailable at opening or when saving a change fails, and goes away once saving works again.

## Problem and why

The owner keeps all tasks in the app, and the app keeps them only in the browser, with no server (context: Constraints). The owner is the only user (context: Users), so there is no copy anywhere else to fall back on. Browser storage can be unavailable: accessing it fails when the user has set the browser to block the page from persisting data, or when the page is opened from an address that is not a normal web origin, such as a `file:` URL (context: Constraints). If that happens and the app says nothing, the owner keeps adding tasks and changing their status, and loses all of it when the page is closed, without ever knowing. The context lists "What should the app do when browser storage is unavailable or blocked" as an open question for exactly this reason (context: Open questions); this story, written by the owner, answers it: the app must tell the user.

## Scope

- Detecting, when the app opens, that browser storage cannot be used.
- Detecting that saving a change to the tasks (adding a task, changing a task's status) failed.
- Showing the user a message in the app when either happens.
- Removing the message once a later save succeeds.
- Keeping the app usable for the open page after a failure, so the user can still see and change tasks.

## Out of scope

- Warning about private or incognito sessions, where storage works but is cleared when the last private tab closes (context: Constraints). Saving succeeds there, so this story does not treat it as "cannot be saved".
- Recovering lost tasks, exporting tasks, or keeping a backup elsewhere.
- Retrying a failed save automatically on a timer.
- Handling stored task data that can be read but is damaged or in an unexpected form.
- Browser or system notifications outside the page (context: Non-goals: reminders, notifications).
- Letting the user dismiss the message.
- A stated accessibility level for the message; that is still an open question in the context.

## Acceptance criteria

- AC-1: When the app opens and browser storage cannot be used (for example because the browser blocks the page from storing data), the app shows a message saying that tasks cannot be saved in this browser and will be lost when the page is closed.
- AC-2: When the app opened with working storage, and saving fails after the user adds a task, the app shows the message from AC-1 right after that action.
- AC-3: When the app opened with working storage, and saving fails after the user changes a task's status, the app shows the message from AC-1 right after that action.
- AC-4: After a failed save, the task the user added, or the status the user set, is still shown in the open page, in the swimlane of its current status.
- AC-5: While the message is shown, the user can still add tasks and change a task's status in the open page, and the message stays visible.
- AC-6: When a later save succeeds after a failure, the message is no longer shown.
- AC-7: At most one such message is shown at a time, however many saves fail.
- AC-8: When storage works and every save succeeds, no such message is shown.
- AC-9: The message is in English and does not contain technical error names, such as "SecurityError", "QuotaExceededError" or "localStorage".

## Assumptions

- Adding a task and changing a task's status are the only actions that change saved tasks, and other stories build them. (why it is safe: the context confirms only these two operations; if editing or deleting is added later, the same message applies and that story can extend these criteria)
- The app keeps working in the open page after a failure instead of blocking the user. (why it is safe: the story's goal is to inform the user so they do not lose work unknowingly; blocking would not save anything and would stop the user from, for example, copying their tasks elsewhere)
- Every reason storage fails is treated the same, whether it is blocked access or, possibly, a full storage. (why it is safe: the user's situation is the same, tasks are not saved; full storage as a cause is unconfirmed in the context, but the criteria do not depend on the cause)
- The message is shown inside the page, not as a browser dialog that stops the user. (why it is safe: notifications outside the page are a non-goal, and a blocking dialog would conflict with AC-5)
- The exact wording of the message is left to the implementer, within AC-1 and AC-9. (why it is safe: the criteria fix what it must say; wording does not change behaviour)
- The message stays until saving works again and cannot be dismissed. (why it is safe: as long as tasks are not saved, the risk the story is about still exists; dismissal can be a later story)

## Open questions
