# Research for #29: task removal safeguard

TL;DR: Two design guidelines agree: confirm before a delete that cannot be undone, or make the delete undoable for a while and then skip the confirmation. Neither guideline recommends "no safeguard".
Whether removing a task gets a confirmation or an undo is a product choice, so it needs the owner.

## Q1: For a permanent, irreversible delete of a single item in a browser app, what do established usability guidelines recommend to prevent accidental loss (confirmation step, undo for a short time, or neither)?

- Answer:
  - A confirmation is appropriate when an action has significant consequences or cannot be easily undone (practice: https://github.com/MicrosoftDocs/win32/blob/docs/desktop-src/uxguide/mess-confirm.md; https://primer.style/product/components/confirmation-dialog/guidelines/, read 2026-10-23).
  - Providing undo (the ability to revert an action) is an alternative to a confirmation. Both guidelines advise against a confirmation for an action that can be easily undone or is low risk (practice: https://github.com/MicrosoftDocs/win32/blob/docs/desktop-src/uxguide/mess-confirm.md; https://primer.style/product/scenario-patterns/delete/, read 2026-10-23).
  - Frequent or routine confirmations lose their value because users learn to dismiss them without reading. Primer says a confirmation should not be used for frequent actions (practice: https://github.com/MicrosoftDocs/win32/blob/docs/desktop-src/uxguide/mess-confirm.md; https://primer.style/product/components/confirmation-dialog/guidelines/, read 2026-10-23).
  - Primer recommends "an undo window for actions you can reverse, instead of a prompt that blocks everyone up front". It lists as a "Don't": "Gate a low-stakes, recoverable action behind a confirmation dialog when a brief undo would do the same job" (standard: https://primer.style/product/scenario-patterns/delete/, read 2026-10-23).
  - Primer recommends a simple confirmation dialog when a single resource is deleted permanently, and reserves type-to-confirm (typing the item's name) for "irreversible actions with wide blast radius" (standard: https://primer.style/product/scenario-patterns/delete/, read 2026-10-23).
  - Undo alone is not sufficient if users do not notice their mistake. The outcome must be made obvious with feedback (standard: https://github.com/MicrosoftDocs/win32/blob/docs/desktop-src/uxguide/mess-confirm.md, read 2026-10-23).
  - If a confirmation is used, its buttons should name the action, for example "Delete repository", not "Yes", "OK" or "Confirm". Primer asks for a specific question as the title, not "Are you sure?" (practice: https://primer.style/product/scenario-patterns/delete/; https://primer.style/product/components/confirmation-dialog/guidelines/, read 2026-10-23). Microsoft also forbids OK/Cancel for confirmations, but it allows Yes/No when the reason for the confirmation is not obvious (standard: https://github.com/MicrosoftDocs/win32/blob/docs/desktop-src/uxguide/mess-confirm.md, read 2026-10-23).
  - Primer says that when a deletion removes the focused item, focus should be set on purpose, not left to fall back to the page. It suggests the previous equivalent control or a stable parent such as the list (standard: https://primer.style/product/scenario-patterns/delete/, read 2026-10-23).
  - Neither guideline supports removing an item that cannot be recovered with no confirmation and no undo (practice: https://github.com/MicrosoftDocs/win32/blob/docs/desktop-src/uxguide/mess-confirm.md; https://primer.style/product/scenario-patterns/delete/, read 2026-10-23).
- Options for the owner (the spec writer turns the chosen one into acceptance criteria):
  - A. **Confirmation:** removing a task first asks a specific question, such as "Remove task?", with a button that names the action. After confirmation, the task is gone for good. This fits the guidance for a delete that cannot be undone. It adds one step to every removal, and that step loses its value if tasks are removed often.
  - B. **Undo window, no confirmation:** the task disappears at once, a message says it was removed and offers Undo for a short time, and after that it is gone for good. This fits Primer's preference for an undo window over a blocking prompt. The removal is only reversible during the window, and the spec must set how long the window lasts and what happens if the page is closed during it.
  - C. **Both:** this is the heaviest option. Primer advises against a confirmation when a brief undo would do the same job.
- Status: needs owner: the guidelines allow either A or B, depending on how valuable a task is to the owner and how often tasks are removed, and only the owner knows that.

## Research, not confirmed

- Nielsen Norman Group ("Confirmation Dialogs Can Prevent User Errors — If Not Overused", https://www.nngroup.com/articles/confirmation-dialog/) is said to recommend confirmations for actions that cannot be undone, and to recommend offering undo even then (unconfirmed: page refused the connection from this environment, only search snippets seen).
- Aza Raskin's essay "Never Use a Warning When You Mean Undo" (A List Apart, 2007) is said to argue that undo is better than warnings because people click warnings out of habit (unconfirmed: page not read, only search snippets seen). It does not contradict the confirmed guidance, which also prefers undo when the action can be made reversible.
- Smashing Magazine (2024, https://www.smashingmagazine.com/2024/09/how-manage-dangerous-actions-user-interfaces/) is said to describe undo as smoother than a confirmation modal (unconfirmed: page could not be fetched).

## Open questions

- Researcher's own reading, not a source: removing a single task in a single-user TODO app looks like a frequent, fairly low-stakes action, which points towards option B. A task that holds valuable details would point towards A. (why it matters: it decides what the user sees when removing a task)
