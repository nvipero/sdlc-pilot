# Product context

TL;DR: A browser-based TODO app where tasks move between Todo, Doing and Done, shown as one swimlane per status.
It has a single user, the owner, so there is no user management, and data stays in the browser.

## Purpose
- The product is a TODO app where the user can add tasks, change a task's status and follow the tasks' progress (owner).
- It is used in a web browser and must look clean (owner).
- A task has one of three statuses: Todo, Doing or Done (owner).
- Tasks are shown in swimlanes, one swimlane per status, and each task appears in the swimlane of its current status (owner).

## Users
- The owner is the only user (owner).
- Because there is a single user, the app needs no user management: no accounts, no login (owner).

## Constraints
- Tasks are stored in the browser, and no server is needed (owner).
- Data does not move from one device or browser to another (owner).
- Technology, programming language and runtime are not decided yet. Specs and implementation choose them (owner).
- Browser `localStorage` keeps data across browser sessions with no expiration time, separately per protocol of the document, so HTTP and HTTPS versions of a site do not share it (standard: https://github.com/mdn/content/blob/main/files/en-us/web/api/window/localstorage/index.md, read 2026-10-23).
- In a private or incognito session, `localStorage` data is cleared when the last private tab is closed (standard: https://github.com/mdn/content/blob/main/files/en-us/web/api/window/localstorage/index.md, read 2026-10-23).
- Accessing `localStorage` throws `SecurityError` when the origin is not a valid scheme/host/port tuple (for example `file:` or `data:` URLs) or when the user has set the browser to block the page from persisting data (standard: https://github.com/mdn/content/blob/main/files/en-us/web/api/window/localstorage/index.md, read 2026-10-23).

## Non-goals
- User management (owner).
- Projects, for now (owner).
- Syncing between devices (owner).
- A mobile (native) app. The app runs in the browser only (owner).
- Sharing or collaboration (owner).
- Reminders, notifications and deadlines (owner).

## Practices and standards
- WCAG 2.2 success criterion 1.4.3 requires a contrast ratio of at least 4.5:1 for normal text and 3:1 for large-scale text (standard: https://w3c.github.io/wcag/guidelines/22/, read 2026-10-23; this is the W3C Editor's Draft, not the published Recommendation, which could not be reached).
- Documentation in this repository is written in English (owner).

## Research, not confirmed
- The WHATWG HTML Web Storage section (https://html.spec.whatwg.org/multipage/webstorage.html), the normative source for `localStorage`, may let browsers limit storage per origin and throw `QuotaExceededError` (unconfirmed: the page could not be reached from this environment; from model knowledge, not checked).
- In common Kanban usage, statuses are shown as columns, and "swimlanes" are horizontal rows that group cards by another dimension (unconfirmed: from model knowledge, not checked). In this project, "swimlane" means one lane per status, as the owner defined it (see glossary).

## Open questions
- Should the app meet a stated accessibility level such as WCAG 2.2 AA? (why it matters: "looks clean" is not testable, and a named standard would give specs measurable criteria such as contrast)
- What should the app do when browser storage is unavailable or blocked, for example a `SecurityError` or private browsing? (why it matters: otherwise tasks could disappear without the user being told)
- Besides a title and a status, what does a task contain, and can a task be edited or deleted? (why it matters: "add" and "change status" are the only confirmed operations)
- Can a task move between any two statuses, or only forward (Todo → Doing → Done)? (why it matters: it decides the allowed status transitions in specs and tests)
- Which browsers must be supported? (why it matters: it limits which browser APIs specs may assume)
