# 106: As a user I want private notes that only I can see

> **TL;DR:** A one-off exception to the product context: on the board's page a person can sign up and sign in with an email and a password, add short notes, and see only their own notes again later, also from another browser.
> Notes are stored in the database; the task board itself stays as it is, in the browser and without accounts. The story is removed with the Supabase components.

## Problem and why

A person who uses the board wants to keep short personal reminders next to it without everyone else who uses the board seeing them (issue: #106).
They sign up with an email and a password, write notes, and find their own notes again after signing in later; nobody else sees them (issue: #106).

The product context says the owner is the only user, there are no accounts or login, user management is a non-goal, and data stays in the browser with no server (context: Users; context: Constraints; context: Non-goals).
The owner settled this contradiction for this story only: the story stands as a one-off exception, the product context stays as it is, and the story exists to verify the factory's Supabase support and is removed afterwards together with the Supabase components (issue: #106, owner comment 6793092749).
So everything below applies to notes only; the task board keeps following the context.

Terms used here, not in the glossary because of the exception:
- **Account:** an email address and password that a person signs up with.
- **Note:** a short piece of text that a signed-in person adds; it belongs to that person's account.

## Scope

- Signing up with an email and a password, which signs the person in at once.
- Signing in and signing out.
- Staying signed in across page reloads until signing out.
- Adding a note while signed in, and listing the signed-in person's own notes.
- Storing notes in the database, per account, so they are found again from another browser (issue: #106).
- Showing the sign-up, sign-in and notes on the same page as the task board.

## Out of scope

- Any change to tasks or the board: tasks stay in the browser, are not tied to an account, and look and work the same signed in or not (context: Constraints; issue: #106, owner comment 6793092749).
- Updating `docs/product-context.md` or `docs/glossary.md` (issue: #106, owner comment 6793092749).
- Editing or deleting notes, note titles, formatting, sorting or searching.
- Sharing notes with another account.
- Email confirmation, password reset, changing the email or password, deleting an account, and sign-in with other providers.
- A rule for password strength beyond what the sign-up form enforces (see Assumptions).

## Acceptance criteria

- AC-1: When nobody is signed in, the page shows, next to the board, a form with a text field labelled "Email", a password field labelled "Password", a "Sign up" button and a "Sign in" button, and shows no notes and no field for adding a note. The board's three swimlanes are shown as before.
- AC-2: Entering an email address that has no account and a password, then activating "Sign up", signs the person in without any further step: the sign-up form is gone, the page shows the text "Signed in as " followed by that email address, a "Sign out" button, a text field labelled "Note", an "Add note" button, and a list named "Notes", which is empty for a new account.
- AC-3: Activating "Sign up" with an email address that already has an account shows a visible error message, and the person is not signed in and sees no notes.
- AC-4: Activating "Sign in" with the email and password of an existing account signs that person in, showing what AC-2 describes, with that account's notes in the "Notes" list.
- AC-5: Activating "Sign in" with a wrong password, or with an email address that has no account, shows a visible error message, and the person is not signed in and sees no notes.
- AC-6: While signed in, entering text in the "Note" field and activating "Add note" (or pressing Enter in the field) adds a note with that text as the last item of the "Notes" list and empties the field.
- AC-7: Adding a note whose text is empty or only white space adds nothing to the "Notes" list.
- AC-8: The "Notes" list shows the signed-in account's notes in the order they were added, oldest first, each with its full text.
- AC-9: After a page reload, the person is still signed in and the "Notes" list shows the same notes in the same order.
- AC-10: Activating "Sign out" signs the person out: the page shows what AC-1 describes and none of that account's notes, also after a page reload.
- AC-11: After signing out and signing in again with the same email and password, the "Notes" list shows all notes added before, in the same order.
- AC-12: Signing in with the same email and password in a different browser, which shares no stored data with the first one, shows the same notes in the same order.
- AC-13: A different account never sees another account's notes: signed in as a second account, in the same browser after the first account signed out or in another browser, the "Notes" list shows only the second account's own notes, and none of the first account's notes.
- AC-14: Signing up, signing in, signing out and adding notes do not change the tasks on the board: every task keeps its title, status, swimlane, order and deadline, and the board can be used the same way whether anyone is signed in or not.

## Choices

- AC-1, AC-2, AC-4: proposal: the labels "Email", "Password", "Sign up", "Sign in", "Sign out", "Note", "Add note" and the list name "Notes" are plain names a person expects; they give the tests fixed names to find.
- AC-2: extends: (issue: #106) "I am signed in afterwards", read as no email confirmation step before the first sign-in.
- AC-3, AC-5: proposal: a failed sign-up or sign-in must tell the person, otherwise the form seems to do nothing; the message wording is left open so it can follow what the sign-in service reports.
- AC-7: proposal: an empty note carries no reminder, and adding nothing matches how the board treats an empty task title (main: tests/acceptance/task-board.spec.ts).
- AC-8: proposal: oldest first matches the order of tasks within a swimlane and keeps a newly added note where the person just added it, at the end.
- AC-9: extends: (issue: #106) "listed after a page reload", which requires the person to stay signed in across the reload.
- AC-12: extends: (issue: #106) "stored in the database, not in the browser"; a different browser with no shared data is the observable proof.
- AC-13: extends: (issue: #106) "Another user does not see my notes", in the same browser and in another.
- AC-14: extends: (issue: #106, owner comment 6793092749) the context stays as it is, so the board keeps its single-user, in-browser behaviour.

## Assumptions

- The minimum password length and any other password rule are those of the sign-in service's default settings, and the form shows that service's error when a password is rejected. (why it is safe: the issue sets no rule, the story is throwaway, and AC-3 and AC-5 already require a visible error)
- Only the account that owns a note can read it from the database, enforced by the database and not only by the page. (why it is safe: this is how AC-13 holds for anyone calling the database directly; it changes no criterion and is checked in code review)
- An email address is compared without regard to letter case, as the sign-in service does. (why it is safe: no criterion depends on it, and tests use one spelling per account)
- There is no limit on note length beyond what the field and database accept. (why it is safe: the issue says "short" without a limit, and no criterion depends on long notes)
- A failure to save a note, for example while offline, is not covered by a criterion. (why it is safe: the issue does not ask for it, and the story is removed after verifying the Supabase stack)

## Open questions
