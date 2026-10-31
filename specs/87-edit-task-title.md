# 87: As a user I want to edit a task's title

> **TL;DR:** The user can change the title of an existing task in any swimlane and save it, with the mouse or with the keyboard alone.
> The task keeps its status and position, and the new title is still shown after a page reload.

## Problem and why

The owner, the only user of the app (context: Users), adds tasks by their title and follows them through the swimlanes Todo, Doing and Done (context: Purpose; glossary: Task, Swimlane).
Today a title cannot be changed once a task is added. To fix a typo or reword a task, the owner has to remove the task and add it again, and the new task then starts in Todo and loses the place and status the old one had (issue: #87).
Editing the title in place keeps the task where it is, so the swimlanes keep showing the owner's real progress (context: Purpose).
The context still lists "can a task be edited?" as an open question (context: Open questions); this story, written by the owner, answers it for the title (issue: #87).
The owner also asks that editing works with the keyboard alone, under WCAG 2.2 success criterion 2.1.1 Keyboard (issue: #87).

## Scope

- An edit action on every task, in every swimlane (Todo, Doing and Done).
- Changing the task's title and saving it, or cancelling the edit.
- Doing all of this with the keyboard alone, as well as with a mouse.
- Keeping the task's status and position in its swimlane when its title changes.
- Storing the new title in the browser so it is still shown after a page reload (context: Constraints).
- Applying the save-failure behaviour of `specs/31-tasks-cannot-be-saved.md` to a saved title. This extends spec 31 AC-7: a successful save of an edited title also counts as saving working again.

## Out of scope

- Editing anything other than the title, such as the status in the same form, a description or a deadline (context: Non-goals for deadlines).
- Undo for an edit after it has been saved.
- An edit history, or showing when a task was last changed.
- Editing several tasks at once.
- Reordering tasks inside a swimlane.
- A stated accessibility level for the whole app (context: Open questions); this story covers keyboard operation of editing only.
- Updating `docs/product-context.md` and `docs/glossary.md` (researcher's files).

## Acceptance criteria

- AC-1: Every task shown in any swimlane (Todo, Doing or Done) offers an edit action. The action has an accessible name that includes the word "Edit" and the task's title.
- AC-2: When the user activates a task's edit action, a text field labelled for the title appears for that task, contains the task's current title, and has keyboard focus. While the task is being edited, a visible save action with an accessible name that includes the word "Save" and a visible cancel action with an accessible name that includes the word "Cancel" are shown for that task.
- AC-3: When the user changes the text in the field and saves, the task is shown with the new title, in the same swimlane, with the same status, at the same position among the tasks of that swimlane, and the text field is gone.
- AC-4: Saving an edited title does not change any other task: every other task keeps its title, status, swimlane and order, including another task with the same old title.
- AC-5: After a title has been saved and the page is reloaded, the task is shown with the new title, in the swimlane of its status, and no task with the old title appears in its place.
- AC-6: Leading and trailing whitespace in the edited title is not part of the saved title; for example, saving "  Buy oat milk  " shows the task as "Buy oat milk".
- AC-7: When the user tries to save a title that is empty or contains only whitespace, the title is not saved: the edit ends as if it was cancelled (AC-8), the text field is gone, the task is shown with the title it had before the edit, and no task is removed.
- AC-8: When the user cancels an edit, the task is shown with the title it had before the edit, even if the text in the field was changed, and nothing is stored for that edit.
- AC-9: A task can be given a title that another task already has; both are then shown as separate tasks.
- AC-10: Using only the keyboard, the user can move focus to a task's edit action, activate it with Enter or Space, change the text, save with Enter, and cancel with Escape. No step needs a mouse, and no step needs keys to be pressed within a time limit.
- AC-11: After an edit is saved or cancelled, keyboard focus is on the edited task's edit action.
- AC-12: With a mouse, the user can click a task's edit action, change the text in the field, and click the Save action to save the title, or click the Cancel action to cancel the edit, without using the keyboard for anything other than typing the text.
- AC-13: When saving an edited title fails, the message from spec 31 AC-1 is shown, and the task is still shown with the new title in the open page. When a later save of an edited title succeeds while that message is shown, everything as shown in the open page is stored and the message is no longer shown, as spec 31 AC-7 and AC-8 describe for a status change.
- AC-14: While a task is being edited, pressing the mouse in its title text field and moving the mouse onto another swimlane before releasing it does not move the task: the task stays in its swimlane with its status.

## Assumptions

- Only the title can be edited in this story. (why it is safe: the story's goal names only the title)
- Empty or whitespace-only titles are rejected and the old title is kept, and whitespace is trimmed, as when adding a task. (why it is safe: spec 28 AC-5 and AC-6 already set these rules for titles; using the same rules keeps titles consistent)
- The user can cancel an edit with Escape (AC-8, AC-10). (why it is safe: it adds a way out without changing what a saved edit does; without it a keyboard user who opened the edit by mistake could only save)
- Saving and cancelling with the mouse are done through visible actions named "Save" and "Cancel" (AC-2, AC-12); their look and placement are left to the implementation. (why it is safe: the owner decided that a named Save action is required (issue: #87, owner comment 6548352468); a named Cancel action gives mouse users the same way out as Escape)
- What happens when focus leaves the text field without saving or cancelling, for example by clicking elsewhere, is left to the implementation, as long as it either saves (by AC-3 and AC-6 rules) or cancels (by AC-8 rules). (why it is safe: the story does not ask for it, both outcomes keep the task in place, and no criterion depends on it)
- Only one task is edited at a time; starting to edit another task ends the first edit in the same way as leaving the field. (why it is safe: the story is about changing one task's title, and one open field keeps keyboard focus clear)
- An edit that has not been saved is lost if the page is reloaded or closed. (why it is safe: AC-5 only requires saved titles to survive a reload; a draft was never saved)
- Focus returns to the edited task's edit action after save or cancel (AC-11). (why it is safe: it lets a keyboard user continue from the same task instead of from the top of the page; it does not change what is saved)
- The edit action's accessible name includes the task's title (AC-1). (why it is safe: it lets a test and a screen reader user tell the edit actions of different tasks apart, as spec 29 AC-1 does for removal)
- Editing stays possible while saving fails, like status changes in spec 31, and a successful save of an edit clears the message (AC-13). (why it is safe: spec 31 blocks only adding so that no new work piles up; editing adds no new task, and its own assumption expects later stories that change tasks to extend its criteria)
- Pressing the mouse in the title text field does not start a drag of the task (spec 82, AC-14). (why it is safe: selecting text while editing must work, and dragging still starts from the task when it is not being edited)
- The position of a task among the tasks of its swimlane (AC-3, AC-4) is its top-to-bottom order on the page, which is the order of the tasks in the document. (why it is safe: spec 28 leaves the order inside a swimlane undefined, and spec 29 AC-3 and AC-5 rely on the shown order in the same way)
- There is no maximum title length. (why it is safe: spec 28 sets none for adding, and a limit can be added later for both)

## Open questions
