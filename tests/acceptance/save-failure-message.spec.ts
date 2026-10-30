import { test, expect, type Page, type Locator } from '@playwright/test';

type Status = 'Todo' | 'Doing' | 'Done';
const STATUSES: Status[] = ['Todo', 'Doing', 'Done'];

declare global {
  interface Window {
    __failSaves?: boolean;
  }
}

// Storage that cannot be used at all, as when the browser blocks the page from storing data.
// The error text carries technical names so that a message leaking them is caught (AC-11).
async function blockStorage(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() {
        throw new DOMException('SecurityError: localStorage is blocked', 'SecurityError');
      },
    });
  });
}

// Storage that works until the test sets window.__failSaves; then every write fails.
// The flag is per page load, so a reload starts with working storage.
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

const lane = (page: Page, status: Status): Locator => page.getByRole('region', { name: status });
const tasksIn = (page: Page, status: Status): Locator => lane(page, status).getByRole('listitem');
const taskIn = (page: Page, status: Status, title: string): Locator =>
  tasksIn(page, status).filter({ hasText: title });

// The message is found by its words from the spec; its role and exact wording are the implementer's.
const notSavedMessage = (page: Page): Locator => page.getByText(/cannot be saved/i);

async function addTask(page: Page, title: string) {
  await page.getByRole('textbox', { name: 'Title' }).fill(title);
  await page.getByRole('button', { name: 'Add task' }).click();
}

// Tries to add a task the way a user would; a disabled or hidden control means nothing is added.
async function tryAddTask(page: Page, title: string) {
  const box = page.getByRole('textbox', { name: 'Title' });
  if (await box.isVisible() && await box.isEnabled()) {
    await box.fill(title);
    const button = page.getByRole('button', { name: 'Add task' });
    if (await button.isVisible() && await button.isEnabled()) await button.click();
  }
}

async function moveTask(page: Page, from: Status, title: string, to: Status) {
  await taskIn(page, from, title).getByRole('button', { name: `Move to ${to}` }).click();
}

async function expectCounts(page: Page, counts: Record<Status, number>) {
  for (const s of STATUSES) await expect(tasksIn(page, s)).toHaveCount(counts[s]);
}

async function expectFullMessage(page: Page) {
  await expect(page.getByText(/cannot be saved/i)).toBeVisible();
  await expect(page.getByText(/lost/i)).toBeVisible();
  await expect(page.getByText(/cannot be added/i)).toBeVisible();
}

test('the message is shown when the app opens and browser storage cannot be used', { tag: '@issue-31-ac-1' }, async ({ page }) => {
  await blockStorage(page);
  await page.goto('/');
  await expectFullMessage(page);
});

test('a failed save after adding a task shows the message', { tag: '@issue-31-ac-2' }, async ({ page }) => {
  await makeSavesFailable(page);
  await page.goto('/');
  await expect(notSavedMessage(page)).toHaveCount(0);
  await failSaves(page, true);
  await addTask(page, 'Write report');
  await expectFullMessage(page);
});

test('a failed save after changing a status shows the message', { tag: '@issue-31-ac-3' }, async ({ page }) => {
  await makeSavesFailable(page);
  await page.goto('/');
  await addTask(page, 'Write report');
  await expect(taskIn(page, 'Todo', 'Write report')).toHaveCount(1);
  await expect(notSavedMessage(page)).toHaveCount(0);
  await failSaves(page, true);
  await moveTask(page, 'Todo', 'Write report', 'Doing');
  await expectFullMessage(page);
});

test('a task whose adding could not be saved is still shown in Todo', { tag: '@issue-31-ac-4' }, async ({ page }) => {
  await makeSavesFailable(page);
  await page.goto('/');
  await failSaves(page, true);
  await addTask(page, 'Unsaved task');
  await expect(notSavedMessage(page)).toBeVisible();
  await expect(taskIn(page, 'Todo', 'Unsaved task')).toHaveCount(1);
  await expectCounts(page, { Todo: 1, Doing: 0, Done: 0 });
});

test('a status whose change could not be saved is still shown in its new swimlane', { tag: '@issue-31-ac-4' }, async ({ page }) => {
  await makeSavesFailable(page);
  await page.goto('/');
  await addTask(page, 'Mover');
  await failSaves(page, true);
  await moveTask(page, 'Todo', 'Mover', 'Doing');
  await expect(notSavedMessage(page)).toBeVisible();
  await expect(taskIn(page, 'Doing', 'Mover')).toHaveCount(1);
  await expectCounts(page, { Todo: 0, Doing: 1, Done: 0 });
});

test('while the message is shown, adding a task creates no task and the message stays', { tag: '@issue-31-ac-5' }, async ({ page }) => {
  await makeSavesFailable(page);
  await page.goto('/');
  await failSaves(page, true);
  await addTask(page, 'First');
  await expect(notSavedMessage(page)).toBeVisible();
  await tryAddTask(page, 'Second');
  await expectCounts(page, { Todo: 1, Doing: 0, Done: 0 });
  await expect(taskIn(page, 'Todo', 'Second')).toHaveCount(0);
  await expect(notSavedMessage(page)).toBeVisible();
});

test('when storage is blocked at opening, adding a task creates no task and the message stays', { tag: '@issue-31-ac-5' }, async ({ page }) => {
  await blockStorage(page);
  await page.goto('/');
  await expect(notSavedMessage(page)).toBeVisible();
  await tryAddTask(page, 'Blocked');
  await expectCounts(page, { Todo: 0, Doing: 0, Done: 0 });
  await expect(notSavedMessage(page)).toBeVisible();
});

test('while the message is shown, a task can still be moved to another swimlane', { tag: '@issue-31-ac-6' }, async ({ page }) => {
  await makeSavesFailable(page);
  await page.goto('/');
  await failSaves(page, true);
  await addTask(page, 'Traveller');
  await expect(notSavedMessage(page)).toBeVisible();
  await moveTask(page, 'Todo', 'Traveller', 'Doing');
  await expect(taskIn(page, 'Doing', 'Traveller')).toHaveCount(1);
  await moveTask(page, 'Doing', 'Traveller', 'Done');
  await expect(taskIn(page, 'Done', 'Traveller')).toHaveCount(1);
  await expectCounts(page, { Todo: 0, Doing: 0, Done: 1 });
});

test('a successful save after a failure removes the message and lets the user add tasks again', { tag: '@issue-31-ac-7' }, async ({ page }) => {
  await makeSavesFailable(page);
  await page.goto('/');
  await addTask(page, 'Task A');
  await failSaves(page, true);
  await moveTask(page, 'Todo', 'Task A', 'Doing');
  await expect(notSavedMessage(page)).toBeVisible();
  await failSaves(page, false);
  await moveTask(page, 'Doing', 'Task A', 'Done');
  await expect(notSavedMessage(page)).toHaveCount(0);
  await addTask(page, 'Task B');
  await expect(taskIn(page, 'Todo', 'Task B')).toHaveCount(1);
  await expect(notSavedMessage(page)).toHaveCount(0);
});

test('a failed status change keeps the message and adding blocked', { tag: '@issue-31-ac-7' }, async ({ page }) => {
  await makeSavesFailable(page);
  await page.goto('/');
  await addTask(page, 'Task A');
  await failSaves(page, true);
  await moveTask(page, 'Todo', 'Task A', 'Doing');
  await moveTask(page, 'Doing', 'Task A', 'Done');
  await expect(notSavedMessage(page)).toBeVisible();
  await tryAddTask(page, 'Task B');
  await expect(taskIn(page, 'Todo', 'Task B')).toHaveCount(0);
});

test('after saving works again, all tasks including unsaved ones are shown after reopening the page', { tag: '@issue-31-ac-8' }, async ({ page }) => {
  await makeSavesFailable(page);
  await page.goto('/');
  await addTask(page, 'Task A');
  await addTask(page, 'Task C');
  await failSaves(page, true);
  await addTask(page, 'Task B');
  await expect(notSavedMessage(page)).toBeVisible();
  await moveTask(page, 'Todo', 'Task A', 'Doing');
  await failSaves(page, false);
  await moveTask(page, 'Todo', 'Task B', 'Done');
  await expect(notSavedMessage(page)).toHaveCount(0);
  await page.reload();
  await expectCounts(page, { Todo: 1, Doing: 1, Done: 1 });
  await expect(taskIn(page, 'Doing', 'Task A')).toHaveCount(1);
  await expect(taskIn(page, 'Done', 'Task B')).toHaveCount(1);
  await expect(taskIn(page, 'Todo', 'Task C')).toHaveCount(1);
  await expect(notSavedMessage(page)).toHaveCount(0);
});

test('at most one message is shown however many saves fail', { tag: '@issue-31-ac-9' }, async ({ page }) => {
  await makeSavesFailable(page);
  await page.goto('/');
  await addTask(page, 'Task A');
  await failSaves(page, true);
  await addTask(page, 'Task B');
  await expect(notSavedMessage(page)).toHaveCount(1);
  await moveTask(page, 'Todo', 'Task A', 'Doing');
  await moveTask(page, 'Doing', 'Task A', 'Done');
  await moveTask(page, 'Todo', 'Task B', 'Doing');
  await expect(taskIn(page, 'Doing', 'Task B')).toHaveCount(1);
  await expect(notSavedMessage(page)).toHaveCount(1);
});

test('when storage is blocked at opening, exactly one message is shown', { tag: '@issue-31-ac-9' }, async ({ page }) => {
  await blockStorage(page);
  await page.goto('/');
  await expect(notSavedMessage(page)).toHaveCount(1);
});

test('when every save succeeds, no message is shown and tasks can be added', { tag: '@issue-31-ac-10' }, async ({ page }) => {
  await makeSavesFailable(page);
  await page.goto('/');
  await expect(notSavedMessage(page)).toHaveCount(0);
  await addTask(page, 'First');
  await addTask(page, 'Second');
  await moveTask(page, 'Todo', 'First', 'Doing');
  await expectCounts(page, { Todo: 1, Doing: 1, Done: 0 });
  await expect(notSavedMessage(page)).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Add task' })).toBeEnabled();
});

test('the message is in plain English without technical error names', { tag: '@issue-31-ac-11' }, async ({ page }) => {
  const technical = /SecurityError|QuotaExceededError|localStorage/i;
  await blockStorage(page);
  await page.goto('/');
  await expectFullMessage(page);
  expect(await page.locator('body').innerText()).not.toMatch(technical);

  const second = await page.context().newPage();
  await makeSavesFailable(second);
  await second.goto('/');
  await failSaves(second, true);
  await addTask(second, 'Task');
  await expectFullMessage(second);
  expect(await second.locator('body').innerText()).not.toMatch(technical);
});
