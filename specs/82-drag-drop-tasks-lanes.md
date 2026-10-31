# 82: As a user I want to drag and drop tasks from one lane to another

> **TL;DR:** The user can drag a task with the mouse and drop it on another swimlane, which changes its status to that swimlane's status.
> While a task is dragged, the swimlanes it can be dropped on are visibly marked; the existing move controls keep working.

## Problem and why

The owner, the only user of the app (context: Users), follows the progress of tasks by moving them between the statuses Todo, Doing and Done, and each task is shown in the swimlane of its current status (context: Purpose; glossary: Status, Swimlane).
Today a task changes status only through a separate move control on the task. The owner wants to move a task more directly, by dragging it from one swimlane and dropping it on another, because that is easier (issue: #82).
For dragging to be usable, the user must see where a task can be dropped while dragging it (issue: #82).

## Scope

- Dragging a task with a mouse (or another pointer in a desktop browser) from its swimlane and dropping it on another swimlane.
- A drop on a swimlane changes the task's status to that swimlane's status, exactly like the existing move to that status.
- A visible mark on the swimlanes the dragged task can be dropped on, shown only while a task is being dragged.
- Leaving the task unchanged when it is dropped on its own swimlane or outside any swimlane.
- Storing the new status like any other status change, so it survives a page reload (context: Constraints).

## Out of scope

- Ordering or reordering tasks inside a swimlane, by dragging or otherwise; the position of a dropped task inside its new swimlane is not specified (as in spec 28).
- Dragging with touch on phones or tablets (context: Non-goals: mobile app; supported browsers are an open question in the context).
- A keyboard way to drag; the existing move controls stay as the non-dragging way to change a status.
- Dragging several tasks at once.
- Dragging a task to remove it.
- Undo for a status change.
- A stated accessibility level (context: Open questions).

## Acceptance criteria

- AC-1: The user can press the mouse on a task in any swimlane (Todo, Doing or Done), drag it onto either of the two other swimlanes and release it there; the task then appears in the swimlane it was dropped on and no longer in its old swimlane.
- AC-2: Releasing the task anywhere inside the target swimlane, including on its heading, on an empty part of it, or on top of another task in it, counts as a drop on that swimlane.
- AC-3: A task can be dropped on a swimlane that has no tasks.
- AC-4: Moving a task by drag and drop does not change the status, title or swimlane of any other task, including another task with the same title.
- AC-5: When a task is dropped on its own swimlane, or released outside every swimlane, it stays in its swimlane with the same status, and no other task changes.
- AC-6: While a task is being dragged, each of the two other swimlanes is visibly marked as a place where the task can be dropped (for example with a changed outline or background), and the task's own swimlane is not marked that way.
- AC-7: While a task is being dragged over a swimlane it can be dropped on, that swimlane is marked visibly differently from the other swimlane the task can be dropped on, so the user can see where the task will land if released now.
- AC-8: When no task is being dragged, no swimlane shows the marks from AC-6 or AC-7; the marks are gone after a drop on a swimlane and after a release that does not move the task.
- AC-9: After a task has been moved by drag and drop and the page is reloaded, the task is shown in the swimlane it was dropped on.
- AC-10: The existing way to move a task to another status without dragging still works for every task, before and after tasks have been moved by drag and drop.

## Assumptions

- A dropped task can move between any two statuses, forward or backward. (why it is safe: spec 28 already allows moves between any two statuses, and the story gives no restriction)
- A move by drag and drop is a status change like any other, so the save-failure behaviour of spec 31 applies to it unchanged. (why it is safe: it changes the same stored data as the existing move; spec 31's criteria cover every status change)
- Only pointer dragging in a desktop browser is required; touch dragging is not. (why it is safe: the story does not mention touch, a native mobile app is a non-goal, and supported browsers are still open in the context; touch can be its own story)
- The existing move controls stay, and they are the way to change a status without dragging. (why it is safe: the story adds a way to move tasks and asks to remove nothing; keeping them also leaves a way that does not need dragging)
- The look of the drop marks (colour, outline, shading) is left to the implementation within AC-6 to AC-8. (why it is safe: the story asks that drop places are visible, not for a particular design)
- Dragging is started by pressing on the task itself, not on a separate handle, and pressing a task's buttons still activates them. (why it is safe: the story does not ask for a handle; this does not change any other criterion)

## Open questions
