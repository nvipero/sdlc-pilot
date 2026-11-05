import { test, expect, type Page, type Locator } from '@playwright/test';

type Status = 'Todo' | 'Doing' | 'Done';
const STATUSES: Status[] = ['Todo', 'Doing', 'Done'];

declare global {
  interface Window {
    __failSaves?: boolean;
  }
}

// The browser's local clock is fixed to 5 Nov 2026, noon, so "today" and "late" are the same in every run.
const NOW = new Date(2026, 10, 5, 12, 0, 0);
const TODAY = { iso: '2026-11-05', shown: 'Due 5 Nov 2026' };
const YESTERDAY = { iso: '2026-11-04', shown: 'Due 4 Nov 2026' };
const TOMORROW = { iso: '2026-11-06', shown: 'Due 6 Nov 2026' };
const LATER = { iso: '2026-12-24', shown: 'Due 24 Dec 2026' };
const LONG_AGO = { iso: '2025-01-02', shown: 'Due 2 Jan 2025' };

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Opens the app with the clock fixed. Each test runs in a fresh browser context, so storage starts empty.
async function openApp(page: Page, now: Date = NOW) {
  await page.clock.install({ time: now });
  await page.goto('/');
}

const lane = (page: Page, status: Status): Locator => page.getByRole('region', { name: status });
const tasksIn = (page: Page, status: Status): Locator => lane(page, status).getByRole('listitem');
const taskIn = (page: Page, status: Status, title: string): Locator =>
  tasksIn(page, status).filter({ hasText: title });

// The deadline action's name has the word "deadline" and the task's title, in any order.
const deadlineButton = (page: Page, status: Status, title: string): Locator =>
  lane(page, status).getByRole('button', {
    name: new RegExp(`^(?=.*deadline)(?=.*${escape(title)})`, 'i'),
  });
const editButton = (page: Page, status: Status, title: string): Locator =>
  lane(page, status).getByRole('button', { name: new RegExp(`\\bEdit\\b.*${escape(title)}`) });

const anyDateField = (page: Page): Locator => page.getByLabel('Deadline', { exact: true });
const editingItem = (page: Page): Locator =>
  page.getByRole('listitem').filter({ has: page.getByLabel('Deadline', { exact: true }) });
const dateField = (page: Page): Locator => editingItem(page).getByLabel('Deadline', { exact: true });
const saveButton = (page: Page): Locator => editingItem(page).getByRole('button', { name: /Save/ });
const cancelButton = (page: Page): Locator => editingItem(page).getByRole('button', { name: /Cancel/ });
const clearButton = (page: Page): Locator => editingItem(page).getByRole('button', { name: 'Clear deadline' });
const anyTitleField = (page: Page): Locator =>
  page.getByRole('listitem').getByRole('textbox', { name: /title/i });
const notSavedMessage = (page: Page): Locator => page.getByText(/cannot be saved/i);

const dueText = (task: Locator): Locator => task.getByText(/\bDue\b/);
const lateText = (task: Locator): Locator => task.getByText(/\bLate\b/);

async function addTask(page: Page, title: string) {
  await page.getByRole('textbox', { name: 'Title' }).fill(title);
  await page.getByRole('button', { name: 'Add task' }).click();
}

async function addTaskIn(page: Page, title: string, status: Status) {
  await addTask(page, title);
  if (status !== 'Todo') {
    await taskIn(page, 'Todo', title).last().getByRole('button', { name: `Move to ${status}` }).click();
  }
  await expect(taskIn(page, status, title)).not.toHaveCount(0);
}

async function moveTask(page: Page, from: Status, title: string, to: Status) {
  await taskIn(page, from, title).getByRole('button', { name: `Move to ${to}` }).click();
  await expect(taskIn(page, to, title)).toHaveCount(1);
}

async function openDeadline(page: Page, status: Status, title: string, index = 0) {
  await deadlineButton(page, status, title).nth(index).click();
  await expect(dateField(page)).toBeVisible();
}

async function setDeadline(page: Page, status: Status, title: string, iso: string, index = 0) {
  await openDeadline(page, status, title, index);
  await dateField(page).fill(iso);
  await saveButton(page).click();
  await expect(anyDateField(page)).toHaveCount(0);
}

// The task shows no Due and no Late text. The field is waited for to be gone first, so the check
// of the texts is done once, after the action took effect.
async function expectNoMarks(task: Locator, page: Page) {
  await expect(anyDateField(page)).toHaveCount(0);
  expect(await dueText(task).count()).toBe(0);
  expect(await lateText(task).count()).toBe(0);
}

async function expectTitlesAt(page: Page, status: Status, expected: string[]) {
  await expect(tasksIn(page, status)).toHaveCount(expected.length);
  for (let i = 0; i < expected.length; i++) {
    await expect(tasksIn(page, status).nth(i)).toContainText(expected[i]);
  }
}

async function expectCounts(page: Page, counts: Record<Status, number>) {
  for (const s of STATUSES) await expect(tasksIn(page, s)).toHaveCount(counts[s]);
}

// Storage that works until the test sets window.__failSaves; then every write fails.
async function makeSavesFailable(page: Page) {
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (this: Storage, ...args: [string, string]) {
      if (window.__failSaves) {
        throw new DOMException('QuotaExceededError: localStorage is full', 'QuotaExceededError');
      }
      return original.apply(this, args);
    };
  });
}
const failSaves = (page: Page, fail: boolean) => page.evaluate((f) => { window.__failSaves = f; }, fail);

// ---- AC-1 ----

for (const status of STATUSES) {
  test(`every task in ${status} offers a deadline action named with its title`, { tag: '@issue-93-ac-1' }, async ({ page }) => {
    await openApp(page);
    await addTaskIn(page, 'Alpha', status);
    await addTaskIn(page, 'Beta', status);
    await expect(deadlineButton(page, status, 'Alpha')).toHaveCount(1);
    await expect(deadlineButton(page, status, 'Beta')).toHaveCount(1);
    for (const title of ['Alpha', 'Beta']) {
      const name = (await deadlineButton(page, status, title).getAttribute('aria-label')) ??
        (await deadlineButton(page, status, title).innerText());
      expect(name).not.toMatch(/\bEdit\b|\bRemove\b/i);
    }
  });
}

// ---- AC-2 ----

for (const status of STATUSES) {
  test(`the deadline action in ${status} shows a focused empty date field with Save and Cancel`, { tag: '@issue-93-ac-2' }, async ({ page }) => {
    await openApp(page);
    await addTaskIn(page, 'Alpha', status);
    await deadlineButton(page, status, 'Alpha').click();
    await expect(dateField(page)).toBeVisible();
    await expect(dateField(page)).toHaveValue('');
    await expect(dateField(page)).toBeFocused();
    await expect(saveButton(page)).toBeVisible();
    await expect(cancelButton(page)).toBeVisible();
    await expect(editingItem(page)).toHaveCount(1);
    await expect(editingItem(page)).toContainText('Alpha');
  });
}

test('the date field of a task with a deadline holds that deadline', { tag: '@issue-93-ac-2' }, async ({ page }) => {
  await openApp(page);
  await addTask(page, 'Alpha');
  await setDeadline(page, 'Todo', 'Alpha', LATER.iso);
  await openDeadline(page, 'Todo', 'Alpha');
  await expect(dateField(page)).toHaveValue(LATER.iso);
  await expect(dateField(page)).toBeFocused();
});

// ---- AC-3 ----

for (const status of STATUSES) {
  test(`a saved deadline in ${status} is shown as "Due <date>" and the task keeps swimlane and position`, { tag: '@issue-93-ac-3' }, async ({ page }) => {
    await openApp(page);
    await addTaskIn(page, 'Alpha', status);
    await addTaskIn(page, 'Beta', status);
    await addTaskIn(page, 'Gamma', status);
    await openDeadline(page, status, 'Beta');
    await dateField(page).fill(LATER.iso);
    await saveButton(page).click();
    await expect(anyDateField(page)).toHaveCount(0);
    await expect(taskIn(page, status, 'Beta').getByText(LATER.shown)).toBeVisible();
    await expectTitlesAt(page, status, ['Alpha', 'Beta', 'Gamma']);
    for (const s of STATUSES.filter((x) => x !== status)) await expect(tasksIn(page, s)).toHaveCount(0);
  });
}

test('a deadline is shown as day, three-letter English month and four-digit year', { tag: '@issue-93-ac-3' }, async ({ page }) => {
  await openApp(page);
  await addTask(page, 'Alpha');
  await setDeadline(page, 'Todo', 'Alpha', '2027-03-09');
  await expect(taskIn(page, 'Todo', 'Alpha').getByText('Due 9 Mar 2027')).toBeVisible();
});

// ---- AC-4 ----

test('a changed deadline replaces the old one', { tag: '@issue-93-ac-4' }, async ({ page }) => {
  await openApp(page);
  await addTask(page, 'Alpha');
  await setDeadline(page, 'Todo', 'Alpha', LATER.iso);
  await expect(taskIn(page, 'Todo', 'Alpha').getByText(LATER.shown)).toBeVisible();
  await setDeadline(page, 'Todo', 'Alpha', TOMORROW.iso);
  const task = taskIn(page, 'Todo', 'Alpha');
  await expect(task.getByText(TOMORROW.shown)).toBeVisible();
  expect(await task.getByText(LATER.shown).count()).toBe(0);
  expect(await dueText(task).count()).toBe(1);
});

// ---- AC-5 ----

test('Clear deadline is shown for a task with a deadline and removes it', { tag: '@issue-93-ac-5' }, async ({ page }) => {
  await openApp(page);
  await addTask(page, 'Alpha');
  await setDeadline(page, 'Todo', 'Alpha', YESTERDAY.iso);
  await expect(lateText(taskIn(page, 'Todo', 'Alpha'))).toBeVisible();
  await openDeadline(page, 'Todo', 'Alpha');
  await expect(clearButton(page)).toBeVisible();
  await clearButton(page).click();
  await expectNoMarks(taskIn(page, 'Todo', 'Alpha'), page);
  await expect(taskIn(page, 'Todo', 'Alpha')).toHaveCount(1);
});

// ---- AC-6 ----

test('saving an empty date field removes the deadline', { tag: '@issue-93-ac-6' }, async ({ page }) => {
  await openApp(page);
  await addTask(page, 'Alpha');
  await setDeadline(page, 'Todo', 'Alpha', YESTERDAY.iso);
  await openDeadline(page, 'Todo', 'Alpha');
  await dateField(page).fill('');
  await saveButton(page).click();
  await expectNoMarks(taskIn(page, 'Todo', 'Alpha'), page);
});

test('saving an incomplete date removes the deadline', { tag: '@issue-93-ac-6' }, async ({ page }) => {
  await openApp(page);
  await addTask(page, 'Alpha');
  await setDeadline(page, 'Todo', 'Alpha', YESTERDAY.iso);
  await openDeadline(page, 'Todo', 'Alpha');
  await dateField(page).fill('');
  await page.keyboard.type('5');
  await saveButton(page).click();
  await expectNoMarks(taskIn(page, 'Todo', 'Alpha'), page);
});

test('saving an empty date field of a task without a deadline leaves it without one', { tag: '@issue-93-ac-6' }, async ({ page }) => {
  await openApp(page);
  await addTask(page, 'Alpha');
  await openDeadline(page, 'Todo', 'Alpha');
  await saveButton(page).click();
  await expectNoMarks(taskIn(page, 'Todo', 'Alpha'), page);
});

// ---- AC-7 ----

for (const how of ['Cancel action', 'Escape'] as const) {
  test(`cancelling with ${how} keeps the old deadline and stores nothing`, { tag: '@issue-93-ac-7' }, async ({ page }) => {
    await openApp(page);
    await addTask(page, 'Alpha');
    await setDeadline(page, 'Todo', 'Alpha', LATER.iso);
    await openDeadline(page, 'Todo', 'Alpha');
    await dateField(page).fill(TOMORROW.iso);
    if (how === 'Escape') await dateField(page).press('Escape');
    else await cancelButton(page).click();
    await expect(anyDateField(page)).toHaveCount(0);
    const task = taskIn(page, 'Todo', 'Alpha');
    await expect(task.getByText(LATER.shown)).toBeVisible();
    expect(await task.getByText(TOMORROW.shown).count()).toBe(0);
    await page.reload();
    await expect(taskIn(page, 'Todo', 'Alpha').getByText(LATER.shown)).toBeVisible();
    expect(await taskIn(page, 'Todo', 'Alpha').getByText(TOMORROW.shown).count()).toBe(0);
  });

  test(`cancelling with ${how} on a task without a deadline leaves it without one`, { tag: '@issue-93-ac-7' }, async ({ page }) => {
    await openApp(page);
    await addTask(page, 'Alpha');
    await openDeadline(page, 'Todo', 'Alpha');
    await dateField(page).fill(TOMORROW.iso);
    if (how === 'Escape') await dateField(page).press('Escape');
    else await cancelButton(page).click();
    await expectNoMarks(taskIn(page, 'Todo', 'Alpha'), page);
    await page.reload();
    await expect(taskIn(page, 'Todo', 'Alpha')).toHaveCount(1);
    await expectNoMarks(taskIn(page, 'Todo', 'Alpha'), page);
  });
}

// ---- AC-8 ----

test('setting, changing and removing a deadline changes no other task, including one with the same title', { tag: '@issue-93-ac-8' }, async ({ page }) => {
  await openApp(page);
  await addTaskIn(page, 'Same', 'Todo');
  await addTaskIn(page, 'Same', 'Todo');
  await addTaskIn(page, 'Other', 'Todo');
  await addTaskIn(page, 'Doing one', 'Doing');
  await addTaskIn(page, 'Done one', 'Done');
  await setDeadline(page, 'Doing', 'Doing one', LATER.iso);
  await setDeadline(page, 'Todo', 'Other', TOMORROW.iso);

  const check = async (sameSecond: string | null) => {
    await expectTitlesAt(page, 'Todo', ['Same', 'Same', 'Other']);
    await expectTitlesAt(page, 'Doing', ['Doing one']);
    await expectTitlesAt(page, 'Done', ['Done one']);
    await expect(tasksIn(page, 'Todo').nth(2).getByText(TOMORROW.shown)).toBeVisible();
    await expect(tasksIn(page, 'Doing').nth(0).getByText(LATER.shown)).toBeVisible();
    expect(await dueText(tasksIn(page, 'Done').nth(0)).count()).toBe(0);
    expect(await dueText(tasksIn(page, 'Todo').nth(0)).count()).toBe(0);
    if (sameSecond) await expect(tasksIn(page, 'Todo').nth(1).getByText(sameSecond)).toBeVisible();
    else expect(await dueText(tasksIn(page, 'Todo').nth(1)).count()).toBe(0);
  };

  await setDeadline(page, 'Todo', 'Same', LATER.iso, 1);
  await check(LATER.shown);
  await setDeadline(page, 'Todo', 'Same', TODAY.iso, 1);
  await check(TODAY.shown);
  await openDeadline(page, 'Todo', 'Same', 1);
  await clearButton(page).click();
  await expect(anyDateField(page)).toHaveCount(0);
  await check(null);
});

// ---- AC-9 ----

test('a set, changed or removed deadline is as last saved after a reload', { tag: '@issue-93-ac-9' }, async ({ page }) => {
  await openApp(page);
  await addTask(page, 'Alpha');
  await setDeadline(page, 'Todo', 'Alpha', LATER.iso);
  await page.reload();
  await expect(taskIn(page, 'Todo', 'Alpha').getByText(LATER.shown)).toBeVisible();

  await setDeadline(page, 'Todo', 'Alpha', TOMORROW.iso);
  await page.reload();
  await expect(taskIn(page, 'Todo', 'Alpha').getByText(TOMORROW.shown)).toBeVisible();
  expect(await taskIn(page, 'Todo', 'Alpha').getByText(LATER.shown).count()).toBe(0);

  await openDeadline(page, 'Todo', 'Alpha');
  await clearButton(page).click();
  await expectNoMarks(taskIn(page, 'Todo', 'Alpha'), page);
  await page.reload();
  await expect(taskIn(page, 'Todo', 'Alpha')).toHaveCount(1);
  await expectNoMarks(taskIn(page, 'Todo', 'Alpha'), page);
});

test('a deadline removed by saving an empty field stays removed after a reload', { tag: '@issue-93-ac-9' }, async ({ page }) => {
  await openApp(page);
  await addTask(page, 'Alpha');
  await setDeadline(page, 'Todo', 'Alpha', LATER.iso);
  await openDeadline(page, 'Todo', 'Alpha');
  await dateField(page).fill('');
  await saveButton(page).click();
  await expectNoMarks(taskIn(page, 'Todo', 'Alpha'), page);
  await page.reload();
  await expect(taskIn(page, 'Todo', 'Alpha')).toHaveCount(1);
  await expectNoMarks(taskIn(page, 'Todo', 'Alpha'), page);
});

// ---- AC-10 ----

for (const status of ['Todo', 'Doing'] as const) {
  test(`a task in ${status} with a deadline before today shows "Late" besides "Due"`, { tag: '@issue-93-ac-10' }, async ({ page }) => {
    await openApp(page);
    await addTaskIn(page, 'Alpha', status);
    await setDeadline(page, status, 'Alpha', YESTERDAY.iso);
    const task = taskIn(page, status, 'Alpha');
    await expect(task.getByText(YESTERDAY.shown)).toBeVisible();
    await expect(lateText(task)).toBeVisible();
  });

  test(`a task in ${status} with a deadline today or later shows no "Late"`, { tag: '@issue-93-ac-10' }, async ({ page }) => {
    await openApp(page);
    await addTaskIn(page, 'Today task', status);
    await addTaskIn(page, 'Tomorrow task', status);
    await setDeadline(page, status, 'Today task', TODAY.iso);
    await setDeadline(page, status, 'Tomorrow task', TOMORROW.iso);
    await expect(taskIn(page, status, 'Today task').getByText(TODAY.shown)).toBeVisible();
    await expect(taskIn(page, status, 'Tomorrow task').getByText(TOMORROW.shown)).toBeVisible();
    expect(await lateText(taskIn(page, status, 'Today task')).count()).toBe(0);
    expect(await lateText(taskIn(page, status, 'Tomorrow task')).count()).toBe(0);
  });
}

test('"Late" is still shown after a reload', { tag: '@issue-93-ac-10' }, async ({ page }) => {
  await openApp(page);
  await addTask(page, 'Alpha');
  await setDeadline(page, 'Todo', 'Alpha', LONG_AGO.iso);
  await page.reload();
  await expect(taskIn(page, 'Todo', 'Alpha').getByText(LONG_AGO.shown)).toBeVisible();
  await expect(lateText(taskIn(page, 'Todo', 'Alpha'))).toBeVisible();
});

// ---- AC-11 ----

test('a task in Done shows no "Late" whatever its deadline', { tag: '@issue-93-ac-11' }, async ({ page }) => {
  await openApp(page);
  await addTaskIn(page, 'Alpha', 'Done');
  await setDeadline(page, 'Done', 'Alpha', YESTERDAY.iso);
  await expect(taskIn(page, 'Done', 'Alpha').getByText(YESTERDAY.shown)).toBeVisible();
  expect(await lateText(taskIn(page, 'Done', 'Alpha')).count()).toBe(0);
  await page.reload();
  await expect(taskIn(page, 'Done', 'Alpha').getByText(YESTERDAY.shown)).toBeVisible();
  expect(await lateText(taskIn(page, 'Done', 'Alpha')).count()).toBe(0);
});

for (const back of ['Todo', 'Doing'] as const) {
  test(`a late task stops showing "Late" in Done and shows it again when moved to ${back}`, { tag: '@issue-93-ac-11' }, async ({ page }) => {
    await openApp(page);
    await addTask(page, 'Alpha');
    await setDeadline(page, 'Todo', 'Alpha', YESTERDAY.iso);
    await expect(lateText(taskIn(page, 'Todo', 'Alpha'))).toBeVisible();
    await moveTask(page, 'Todo', 'Alpha', 'Done');
    await expect(taskIn(page, 'Done', 'Alpha').getByText(YESTERDAY.shown)).toBeVisible();
    expect(await lateText(taskIn(page, 'Done', 'Alpha')).count()).toBe(0);
    await moveTask(page, 'Done', 'Alpha', back);
    await expect(lateText(taskIn(page, back, 'Alpha'))).toBeVisible();
  });
}

test('a task moved from Done to Todo with a deadline not yet passed shows no "Late"', { tag: '@issue-93-ac-11' }, async ({ page }) => {
  await openApp(page);
  await addTaskIn(page, 'Alpha', 'Done');
  await setDeadline(page, 'Done', 'Alpha', TOMORROW.iso);
  await moveTask(page, 'Done', 'Alpha', 'Todo');
  await expect(taskIn(page, 'Todo', 'Alpha').getByText(TOMORROW.shown)).toBeVisible();
  expect(await lateText(taskIn(page, 'Todo', 'Alpha')).count()).toBe(0);
});

// ---- AC-12 ----

test('a deadline in the past can be set and the task shows "Late" right after saving', { tag: '@issue-93-ac-12' }, async ({ page }) => {
  await openApp(page);
  await addTask(page, 'Alpha');
  await openDeadline(page, 'Todo', 'Alpha');
  await dateField(page).fill(LONG_AGO.iso);
  await saveButton(page).click();
  await expect(anyDateField(page)).toHaveCount(0);
  await expect(taskIn(page, 'Todo', 'Alpha').getByText(LONG_AGO.shown)).toBeVisible();
  await expect(lateText(taskIn(page, 'Todo', 'Alpha'))).toBeVisible();
});

// ---- AC-13 ----

test('a task whose deadline day ends shows "Late" within a minute after midnight without a reload', { tag: '@issue-93-ac-13' }, async ({ page }) => {
  await openApp(page, new Date(2026, 10, 5, 23, 59, 50));
  await addTask(page, 'Alpha');
  await setDeadline(page, 'Todo', 'Alpha', TODAY.iso);
  await expect(taskIn(page, 'Todo', 'Alpha').getByText(TODAY.shown)).toBeVisible();
  expect(await lateText(taskIn(page, 'Todo', 'Alpha')).count()).toBe(0);
  // 70 seconds later it is one minute past midnight.
  await page.clock.runFor(70_000);
  await expect(lateText(taskIn(page, 'Todo', 'Alpha'))).toBeVisible();
});

test('a task in Done does not show "Late" after midnight', { tag: '@issue-93-ac-13' }, async ({ page }) => {
  await openApp(page, new Date(2026, 10, 5, 23, 59, 50));
  await addTaskIn(page, 'Alpha', 'Done');
  await addTask(page, 'Beta');
  await setDeadline(page, 'Done', 'Alpha', TODAY.iso);
  await setDeadline(page, 'Todo', 'Beta', TODAY.iso);
  await page.clock.runFor(70_000);
  await expect(lateText(taskIn(page, 'Todo', 'Beta'))).toBeVisible();
  expect(await lateText(taskIn(page, 'Done', 'Alpha')).count()).toBe(0);
});

// ---- AC-14 ----

test('a task keeps its deadline when moved with the move actions', { tag: '@issue-93-ac-14' }, async ({ page }) => {
  await openApp(page);
  await addTask(page, 'Alpha');
  await setDeadline(page, 'Todo', 'Alpha', LATER.iso);
  await moveTask(page, 'Todo', 'Alpha', 'Doing');
  await expect(taskIn(page, 'Doing', 'Alpha').getByText(LATER.shown)).toBeVisible();
  await moveTask(page, 'Doing', 'Alpha', 'Done');
  await expect(taskIn(page, 'Done', 'Alpha').getByText(LATER.shown)).toBeVisible();
  await moveTask(page, 'Done', 'Alpha', 'Todo');
  await expect(taskIn(page, 'Todo', 'Alpha').getByText(LATER.shown)).toBeVisible();
  await page.reload();
  await expect(taskIn(page, 'Todo', 'Alpha').getByText(LATER.shown)).toBeVisible();
});

test('a task keeps its deadline when moved by drag and drop', { tag: '@issue-93-ac-14' }, async ({ page }) => {
  await openApp(page);
  await addTask(page, 'Alpha');
  await setDeadline(page, 'Todo', 'Alpha', LATER.iso);
  const centre = async (l: Locator) => {
    const box = await l.boundingBox();
    if (!box) throw new Error('element has no bounding box');
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  };
  const from = await centre(taskIn(page, 'Todo', 'Alpha').getByText('Alpha', { exact: true }));
  const to = await centre(lane(page, 'Doing'));
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + 8, from.y + 8, { steps: 3 });
  await page.mouse.move(to.x, to.y, { steps: 8 });
  await page.mouse.up();
  await expect(taskIn(page, 'Doing', 'Alpha')).toHaveCount(1);
  await expect(taskIn(page, 'Doing', 'Alpha').getByText(LATER.shown)).toBeVisible();
});

test('a task keeps its deadline when its title is edited', { tag: '@issue-93-ac-14' }, async ({ page }) => {
  await openApp(page);
  await addTask(page, 'Alpha');
  await setDeadline(page, 'Todo', 'Alpha', LATER.iso);
  await editButton(page, 'Todo', 'Alpha').click();
  await anyTitleField(page).fill('Alpha renamed');
  await page.getByRole('listitem').getByRole('button', { name: /Save/ }).click();
  await expect(taskIn(page, 'Todo', 'Alpha renamed')).toHaveCount(1);
  await expect(taskIn(page, 'Todo', 'Alpha renamed').getByText(LATER.shown)).toBeVisible();
  await page.reload();
  await expect(taskIn(page, 'Todo', 'Alpha renamed').getByText(LATER.shown)).toBeVisible();
});

// ---- AC-15 ----

test('tasks stored before deadlines existed are shown without "Due" or "Late"', { tag: '@issue-93-ac-15' }, async ({ page }) => {
  await page.addInitScript(() => {
    if (window.localStorage.getItem('tasks') === null) {
      window.localStorage.setItem('tasks', JSON.stringify([
        { id: 'a', title: 'Old todo', status: 'Todo' },
        { id: 'b', title: 'Old doing', status: 'Doing' },
        { id: 'c', title: 'Old done', status: 'Done' },
      ]));
    }
  });
  await openApp(page);
  await expectTitlesAt(page, 'Todo', ['Old todo']);
  await expectTitlesAt(page, 'Doing', ['Old doing']);
  await expectTitlesAt(page, 'Done', ['Old done']);
  for (const s of STATUSES) {
    expect(await dueText(tasksIn(page, s)).count()).toBe(0);
    expect(await lateText(tasksIn(page, s)).count()).toBe(0);
  }
  await expect(deadlineButton(page, 'Todo', 'Old todo')).toHaveCount(1);
});

// ---- AC-16 ----

test('a keyboard alone can reach, open, set, save, cancel and clear a deadline', { tag: '@issue-93-ac-16' }, async ({ page }) => {
  await openApp(page);
  await addTask(page, 'Alpha');
  await addTask(page, 'Beta');
  const target = () => deadlineButton(page, 'Todo', 'Beta');

  async function tabTo(locator: () => Locator, label: string) {
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press('Tab');
      if (await locator().evaluate((el) => el === document.activeElement)) return;
    }
    throw new Error(`${label} cannot be reached with Tab`);
  }

  // Enter opens, a date is entered, Enter saves.
  await page.locator('body').click({ position: { x: 1, y: 1 } });
  await tabTo(target, 'the deadline action');
  await expect(target()).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(dateField(page)).toBeFocused();
  await dateField(page).fill(LATER.iso);
  await page.keyboard.press('Enter');
  await expect(taskIn(page, 'Todo', 'Beta').getByText(LATER.shown)).toBeVisible();
  await expect(anyDateField(page)).toHaveCount(0);
  await expect(target()).toBeFocused();

  // Space opens, Escape cancels.
  await page.keyboard.press('Space');
  await expect(dateField(page)).toBeFocused();
  await dateField(page).fill(TOMORROW.iso);
  await page.keyboard.press('Escape');
  await expect(anyDateField(page)).toHaveCount(0);
  await expect(taskIn(page, 'Todo', 'Beta').getByText(LATER.shown)).toBeVisible();
  await expect(target()).toBeFocused();

  // Clear deadline is reached with Tab from the field and activated with Enter.
  await page.keyboard.press('Enter');
  await expect(dateField(page)).toBeFocused();
  await tabTo(() => clearButton(page), 'Clear deadline');
  await page.keyboard.press('Enter');
  await expectNoMarks(taskIn(page, 'Todo', 'Beta'), page);
  await expect(target()).toBeFocused();

  // Clear deadline can also be activated with Space.
  await page.keyboard.press('Enter');
  await dateField(page).fill(LATER.iso);
  await page.keyboard.press('Enter');
  await expect(taskIn(page, 'Todo', 'Beta').getByText(LATER.shown)).toBeVisible();
  await page.keyboard.press('Enter');
  await tabTo(() => clearButton(page), 'Clear deadline');
  await page.keyboard.press('Space');
  await expectNoMarks(taskIn(page, 'Todo', 'Beta'), page);
  await expect(target()).toBeFocused();
});

for (const how of ['Save action', 'Cancel action'] as const) {
  test(`after the ${how} focus is on the task's deadline action`, { tag: '@issue-93-ac-16' }, async ({ page }) => {
    await openApp(page);
    await addTask(page, 'Alpha');
    await addTask(page, 'Beta');
    await openDeadline(page, 'Todo', 'Beta');
    await dateField(page).fill(LATER.iso);
    if (how === 'Save action') await saveButton(page).click();
    else await cancelButton(page).click();
    await expect(anyDateField(page)).toHaveCount(0);
    await expect(deadlineButton(page, 'Todo', 'Beta')).toBeFocused();
  });
}

test('after the Clear deadline action clicked with a mouse focus is on the task\'s deadline action', { tag: '@issue-93-ac-16' }, async ({ page }) => {
  await openApp(page);
  await addTask(page, 'Beta');
  await setDeadline(page, 'Todo', 'Beta', LATER.iso);
  await openDeadline(page, 'Todo', 'Beta');
  await clearButton(page).click();
  await expect(anyDateField(page)).toHaveCount(0);
  await expect(deadlineButton(page, 'Todo', 'Beta')).toBeFocused();
});

// ---- AC-17 ----

test('a failed save of a deadline shows the message, the new deadline and "Late"', { tag: '@issue-93-ac-17' }, async ({ page }) => {
  await makeSavesFailable(page);
  await openApp(page);
  await addTask(page, 'Alpha');
  await expect(notSavedMessage(page)).toHaveCount(0);
  await failSaves(page, true);
  await setDeadline(page, 'Todo', 'Alpha', YESTERDAY.iso);
  await expect(notSavedMessage(page)).toBeVisible();
  await expect(page.getByText(/lost/i)).toBeVisible();
  await expect(page.getByText(/cannot be added/i)).toBeVisible();
  await expect(taskIn(page, 'Todo', 'Alpha').getByText(YESTERDAY.shown)).toBeVisible();
  await expect(lateText(taskIn(page, 'Todo', 'Alpha'))).toBeVisible();
});

test('a later successful save of a deadline clears the message and stores everything shown', { tag: '@issue-93-ac-17' }, async ({ page }) => {
  await makeSavesFailable(page);
  await openApp(page);
  await addTask(page, 'Alpha');
  await addTask(page, 'Beta');
  await failSaves(page, true);
  await setDeadline(page, 'Todo', 'Alpha', LATER.iso);
  await expect(notSavedMessage(page)).toBeVisible();
  await failSaves(page, false);
  await setDeadline(page, 'Todo', 'Beta', TOMORROW.iso);
  await expect(taskIn(page, 'Todo', 'Beta').getByText(TOMORROW.shown)).toBeVisible();
  await expect(notSavedMessage(page)).toHaveCount(0);
  await expect(taskIn(page, 'Todo', 'Alpha').getByText(LATER.shown)).toBeVisible();
  await page.reload();
  await expect(taskIn(page, 'Todo', 'Alpha').getByText(LATER.shown)).toBeVisible();
  await expect(taskIn(page, 'Todo', 'Beta').getByText(TOMORROW.shown)).toBeVisible();
});

test('a deadline can still be set while the message is shown, and the message stays when saving keeps failing', { tag: '@issue-93-ac-17' }, async ({ page }) => {
  await makeSavesFailable(page);
  await openApp(page);
  await addTask(page, 'Alpha');
  await failSaves(page, true);
  await setDeadline(page, 'Todo', 'Alpha', LATER.iso);
  await expect(notSavedMessage(page)).toBeVisible();
  await setDeadline(page, 'Todo', 'Alpha', TOMORROW.iso);
  await expect(taskIn(page, 'Todo', 'Alpha').getByText(TOMORROW.shown)).toBeVisible();
  await expect(notSavedMessage(page)).toBeVisible();
});

// ---- AC-18 ----

test('clicking outside the deadline field cancels it and stores nothing', { tag: '@issue-93-ac-18' }, async ({ page }) => {
  await openApp(page);
  await addTask(page, 'Alpha');
  await setDeadline(page, 'Todo', 'Alpha', LATER.iso);
  await openDeadline(page, 'Todo', 'Alpha');
  await dateField(page).fill(TOMORROW.iso);
  await page.getByRole('heading', { level: 1 }).click();
  await expect(anyDateField(page)).toHaveCount(0);
  await expect(taskIn(page, 'Todo', 'Alpha').getByText(LATER.shown)).toBeVisible();
  expect(await taskIn(page, 'Todo', 'Alpha').getByText(TOMORROW.shown).count()).toBe(0);
  await page.reload();
  await expect(taskIn(page, 'Todo', 'Alpha').getByText(LATER.shown)).toBeVisible();
});

test('clicking in the field, Save or Cancel area does not count as outside', { tag: '@issue-93-ac-18' }, async ({ page }) => {
  await openApp(page);
  await addTask(page, 'Alpha');
  await openDeadline(page, 'Todo', 'Alpha');
  await dateField(page).fill(LATER.iso);
  await dateField(page).click();
  await expect(dateField(page)).toBeVisible();
  await expect(dateField(page)).toHaveValue(LATER.iso);
  await saveButton(page).click();
  await expect(taskIn(page, 'Todo', 'Alpha').getByText(LATER.shown)).toBeVisible();
});

// Presses Tab or Shift+Tab until focus is outside the field and its actions. While focus is inside
// that group (a date field can have several tab stops) the field must stay shown.
async function tabOutOfDeadline(page: Page, key: 'Tab' | 'Shift+Tab') {
  const group = dateField(page).or(saveButton(page)).or(cancelButton(page)).or(clearButton(page));
  const focusedInGroup = page.locator(':focus').and(group);
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press(key);
    if ((await focusedInGroup.count()) === 0) return;
    await expect(dateField(page)).toBeVisible();
  }
  throw new Error('keyboard focus never left the deadline field');
}

for (const key of ['Tab', 'Shift+Tab'] as const) {
  test(`${key} out of the deadline field cancels it and stores nothing`, { tag: '@issue-93-ac-18' }, async ({ page }) => {
    await openApp(page);
    await addTask(page, 'Alpha');
    await addTask(page, 'Beta');
    await addTask(page, 'Gamma');
    await setDeadline(page, 'Todo', 'Beta', LATER.iso);
    await openDeadline(page, 'Todo', 'Beta');
    await dateField(page).fill(TOMORROW.iso);
    await tabOutOfDeadline(page, key);
    await expect(anyDateField(page)).toHaveCount(0);
    await expect(taskIn(page, 'Todo', 'Beta').getByText(LATER.shown)).toBeVisible();
    expect(await taskIn(page, 'Todo', 'Beta').getByText(TOMORROW.shown).count()).toBe(0);
    await page.reload();
    await expect(taskIn(page, 'Todo', 'Beta').getByText(LATER.shown)).toBeVisible();
  });
}

test('Tab between the field and its actions does not end the deadline entry', { tag: '@issue-93-ac-18' }, async ({ page }) => {
  await openApp(page);
  await addTask(page, 'Alpha');
  await openDeadline(page, 'Todo', 'Alpha');
  await dateField(page).fill(LATER.iso);
  const group = dateField(page).or(saveButton(page)).or(cancelButton(page)).or(clearButton(page));
  // Tab to the Save action, which stays inside the group.
  let reached = false;
  for (let i = 0; i < 10 && !reached; i++) {
    await page.keyboard.press('Tab');
    reached = await saveButton(page).evaluate((el) => el === document.activeElement);
    if (!reached) await expect(page.locator(':focus').and(group)).toHaveCount(1);
  }
  expect(reached).toBe(true);
  await expect(dateField(page)).toBeVisible();
  await expect(dateField(page)).toHaveValue(LATER.iso);
  await page.keyboard.press('Shift+Tab');
  await expect(dateField(page)).toBeVisible();
  await saveButton(page).click();
  await expect(taskIn(page, 'Todo', 'Alpha').getByText(LATER.shown)).toBeVisible();
});

test('opening another task\'s deadline field cancels the first and leaves one field', { tag: '@issue-93-ac-18' }, async ({ page }) => {
  await openApp(page);
  await addTask(page, 'Alpha');
  await addTask(page, 'Beta');
  await openDeadline(page, 'Todo', 'Alpha');
  await dateField(page).fill(LATER.iso);
  await deadlineButton(page, 'Todo', 'Beta').click();
  await expect(anyDateField(page)).toHaveCount(1);
  await expect(editingItem(page)).toContainText('Beta');
  await expect(dateField(page)).toHaveValue('');
  expect(await taskIn(page, 'Todo', 'Alpha').getByText(LATER.shown).count()).toBe(0);
  await expect(anyDateField(page)).toHaveCount(1);
});

test('starting a title edit cancels the deadline field and only one field is shown', { tag: '@issue-93-ac-18' }, async ({ page }) => {
  await openApp(page);
  await addTask(page, 'Alpha');
  await addTask(page, 'Beta');
  await openDeadline(page, 'Todo', 'Alpha');
  await dateField(page).fill(LATER.iso);
  await editButton(page, 'Todo', 'Beta').click();
  await expect(anyTitleField(page)).toHaveCount(1);
  await expect(anyDateField(page)).toHaveCount(0);
  expect(await taskIn(page, 'Todo', 'Alpha').getByText(LATER.shown).count()).toBe(0);
  await page.reload();
  expect(await dueText(taskIn(page, 'Todo', 'Alpha')).count()).toBe(0);
});

test('opening a deadline field cancels a title edit and only one field is shown', { tag: '@issue-93-ac-18' }, async ({ page }) => {
  await openApp(page);
  await addTask(page, 'Alpha');
  await addTask(page, 'Beta');
  await editButton(page, 'Todo', 'Alpha').click();
  await expect(anyTitleField(page)).toHaveCount(1);
  await anyTitleField(page).fill('Alpha changed');
  await deadlineButton(page, 'Todo', 'Beta').click();
  await expect(anyDateField(page)).toHaveCount(1);
  await expect(anyTitleField(page)).toHaveCount(0);
  await expect(taskIn(page, 'Todo', 'Alpha')).toHaveCount(1);
  expect(await taskIn(page, 'Todo', 'Alpha changed').count()).toBe(0);
});
