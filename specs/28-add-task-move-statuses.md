# 28: Add a task and move it between statuses

TL;DR: The user adds a task by its title, it appears in the Todo swimlane, and the user can move it to any other status.
Tasks and their statuses are stored in the browser, so they are still there after a page reload.

## Problem and why

The owner, who is the only user of the app (context: Users), wants to keep track of which work is not started, which is in progress and which is finished, using nothing but a web browser (context: Purpose; context: Constraints).
Today there is no way to put a task into the app or to change its status, so the core promise of the product, adding tasks, changing their status and following their progress (context: Purpose), cannot be kept.
Each task has exactly one of the statuses Todo, Doing or Done and is shown in the swimlane of its current status (context: Purpose; glossary: Status, Swimlane), so seeing a task change swimlanes is how the owner sees progress.
Tasks must survive a page reload, because the app keeps tasks in the browser and has no server (context: Constraints); without that, the tracking would be lost every time the page is reloaded.

## Scope

- A view in the browser with three swimlanes, one per status: Todo, Doing and Done (context: Purpose; glossary: Swimlane).
- Adding a task by entering a title. A new task has the status Todo.
- Moving a task from its current status to either of the two other statuses.
- Storing tasks, with their titles and statuses, in the browser so that they are still shown after the page is reloaded (context: Constraints).

## Out of scope

- Editing a task's title, and deleting a task (context: Open questions; not asked for by this story).
- Any task content beyond a title and a status, such as a description or a deadline (context: Open questions; context: Non-goals for deadlines).
- Ordering or reordering tasks inside a swimlane, by the user or by rule.
- What the app does when browser storage is unavailable or blocked, for example in private browsing or when the browser blocks the page from storing data (context: Open questions). This needs an owner decision and belongs in its own story.
- Syncing tasks between devices or browsers (context: Non-goals).
- Accounts, login or any user management (context: Users; context: Non-goals).
- A stated accessibility level or visual design rules beyond what the acceptance criteria say (context: Open questions).

## Acceptance criteria

- AC-1: When the app is opened with no stored tasks, it shows three swimlanes labelled Todo, Doing and Done, and each of them is empty.
- AC-2: The three swimlanes are shown even when one or more of them contains no tasks.
- AC-3: When the user enters a title and adds the task, a task with that title appears in the Todo swimlane and in no other swimlane.
- AC-4: When the user adds a task, the tasks already shown stay in their swimlanes, unchanged.
- AC-5: When the user tries to add a task whose title is empty or contains only whitespace, no task is added and the swimlanes do not change.
- AC-6: Leading and trailing whitespace in an entered title is not part of the shown title; for example, entering "  Buy milk  " adds a task shown as "Buy milk".
- AC-7: Two tasks with the same title can both be added, and both are shown as separate tasks.
- AC-8: For a task in any status, the user can move it to either of the two other statuses. After the move, the task appears in the swimlane of the new status and no longer in the swimlane of its old status.
- AC-9: Moving one task does not change the status or the swimlane of any other task, including another task with the same title.
- AC-10: A task can be moved more than once, both forward and backward; for example Todo to Done, then Done to Doing, then Doing to Todo, and after each move it appears only in the swimlane of its latest status.
- AC-11: After the page is reloaded, every task added before the reload is shown again with the same title and in the swimlane of the status it had just before the reload.
- AC-12: After the page is reloaded, no task appears that was not added before the reload, and no task appears twice.

## Assumptions

- A task can move from any status to any other status, not only forward. (why it is safe: the story's acceptance criterion says "move a task to another status" with no restriction (owner, issue #28); the context lists this as an open question, and if the owner later wants forward-only moves, that only narrows AC-8 and AC-10.)
- The user is not offered a move to the status the task already has. (why it is safe: the story speaks of moving to "another status"; offering a no-op move adds nothing for the user.)
- An empty or whitespace-only title is rejected without an error message. (why it is safe: a task without a title cannot be told apart from others; whether to show a message does not change what is stored or shown in the swimlanes.)
- There is no maximum title length in this story. (why it is safe: the owner set no limit, and a limit can be added later without changing the other criteria.)
- Order of tasks inside a swimlane is not specified. (why it is safe: none of the story's criteria depends on order, and tests can find tasks by title.)
- How the user moves a task (for example a button, a menu or drag and drop) is left to the implementation, as long as it can be done in the browser. (why it is safe: the story asks for the outcome, not the control, and technology is not decided yet (context: Constraints).)
- Tasks are stored in the browser's storage for the page's origin, and a reload of the same page in the same browser shows them. (why it is safe: the owner requires browser storage with no server (context: Constraints), and `localStorage` keeps data across sessions with no expiry (context: Constraints, standard: MDN localStorage, read 2026-10-23); which mechanism is used is left to the implementation.)

## Open questions
