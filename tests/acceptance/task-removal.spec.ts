import { test, expect, type Page, type Locator } from '@playwright/test';

type Status = 'Todo' | 'Doing' | 'Done';
const STATUSES: Status[] = ['Todo', 'Doing', 'Done'];

// Clear storage once per test, before the first page load only (not on reloads).
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
});

const lane = (page: Page, status: Status): Locator => page.getByRole('region', { name: status });
const tasksIn = (page: Page, status: Status): Locator => lane(page, status).getByRole('listitem');
const taskIn = (page: Page, status: Status, title: string): Locator =>
  tasksIn(page, status).filter({ hasText: title });
const removeButton = (page: Page, status: Status, title: string): Locator =>
  taskIn(page, status, title).getByRole('button', { name: new RegExp(`Remove.*${title}`) });
// The message that announces the removal: a status message (or an alert).
const message = (page: Page): Locator => page.getByRole('status').or(page.getByRole('alert'));
const undo = (page: Page): Locator => page.getByRole('button', { name: 'Undo' });

async function addTask(page: Page, title: string) {
  await page.getByRole('textbox', { name: 'Title' }).fill(title);
  await page.getByRole('button', { name: 'Add task' }).click();
}

async function moveTask(page: Page, from: Status, title: string, to: Status) {
  await taskIn(page, from, title).getByRole('button', { name: `Move to ${to}` }).click();
}

async function titles(page: Page, status: Status): Promise<string[]> {
  const items = await tasksIn(page, status).allTextContents();
  return items.map((t) => t.replace(/Remove.*$|Move to.*$/s, '').trim());
}

async function expectCounts(page: Page, counts: Record<Status, number>) {
  for (const s of STATUSES) await expect(tasksIn(page, s)).toHaveCount(counts[s]);
}

async function expectNowhere(page: Page, title: string) {
  for (const s of STATUSES) await expect(taskIn(page, s, title)).toHaveCount(0);
}

// Waits until the message and its Undo are gone, allowing the 5 s window plus 1 s tolerance.
async function waitUndoWindowEnd(page: Page) {
  await expect(undo(page)).toBeHidden({ timeout: 7000 });
}

for (const status of STATUSES) {
  test(`every task in ${status} offers a remove action named with its title`, { tag: '@issue-29-ac-1' }, async ({ page }) => {
    await addTask(page, 'Alpha');
    await addTask(page, 'Beta');
    if (status !== 'Todo') {
      await moveTask(page, 'Todo', 'Alpha', status);
      await moveTask(page, 'Todo', 'Beta', status);
    }
    await expect(removeButton(page, status, 'Alpha')).toHaveCount(1);
    await expect(removeButton(page, status, 'Beta')).toHaveCount(1);
  });

  test(`a task removed from ${status} disappears at once without confirmation`, { tag: '@issue-29-ac-2' }, async ({ page }) => {
    await addTask(page, 'Gone');
    if (status !== 'Todo') await moveTask(page, 'Todo', 'Gone', status);
    await expect(taskIn(page, status, 'Gone')).toHaveCount(1);
    page.on('dialog', (d) => {
      throw new Error(`unexpected dialog: ${d.message()}`);
    });
    await removeButton(page, status, 'Gone').click();
    await expect(taskIn(page, status, 'Gone')).toHaveCount(0);
    await expectNowhere(page, 'Gone');
  });
}

test('removing a task leaves every other task in place, with title, status and order', { tag: '@issue-29-ac-3' }, async ({ page }) => {
  for (const t of ['One', 'Two', 'Three', 'Four']) await addTask(page, t);
  await moveTask(page, 'Todo', 'Four', 'Doing');
  await moveTask(page, 'Todo', 'Three', 'Done');
  await addTask(page, 'Five');
  const before = { Todo: await titles(page, 'Todo'), Doing: await titles(page, 'Doing'), Done: await titles(page, 'Done') };
  await removeButton(page, 'Todo', 'Two').click();
  await expect(taskIn(page, 'Todo', 'Two')).toHaveCount(0);
  expect(await titles(page, 'Todo')).toEqual(before.Todo.filter((t) => t !== 'Two'));
  expect(await titles(page, 'Doing')).toEqual(before.Doing);
  expect(await titles(page, 'Done')).toEqual(before.Done);
});

test('removing one of two tasks with the same title leaves the other', { tag: '@issue-29-ac-3' }, async ({ page }) => {
  await addTask(page, 'Twin');
  await addTask(page, 'Twin');
  await removeButton(page, 'Todo', 'Twin').first().click();
  await expect(taskIn(page, 'Todo', 'Twin')).toHaveCount(1);
});

test('a message says the task was removed, names its title and offers Undo', { tag: '@issue-29-ac-4' }, async ({ page }) => {
  await addTask(page, 'Pay rent');
  await removeButton(page, 'Todo', 'Pay rent').click();
  await expect(message(page)).toBeVisible();
  await expect(message(page)).toContainText(/removed/i);
  await expect(message(page)).toContainText('Pay rent');
  await expect(undo(page)).toBeVisible();
});

test('Undo restores the task at its position with its title and status, and hides the message', { tag: '@issue-29-ac-5' }, async ({ page }) => {
  for (const t of ['A1', 'B2', 'C3']) await addTask(page, t);
  await moveTask(page, 'Todo', 'C3', 'Doing');
  await addTask(page, 'D4');
  // Todo: A1, B2, D4. Remove the first, middle and last in turn.
  for (const t of ['A1', 'B2', 'D4']) {
    const before = await titles(page, 'Todo');
    await removeButton(page, 'Todo', t).click();
    await expect(taskIn(page, 'Todo', t)).toHaveCount(0);
    await undo(page).click();
    await expect(taskIn(page, 'Todo', t)).toHaveCount(1);
    expect(await titles(page, 'Todo')).toEqual(before);
    await expect(undo(page)).toHaveCount(0);
    await expect(message(page).filter({ hasText: /removed/i })).toHaveCount(0);
  }
  expect(await titles(page, 'Doing')).toEqual(['C3']);
});

test('Undo restores a task to the Done swimlane', { tag: '@issue-29-ac-5' }, async ({ page }) => {
  await addTask(page, 'Finished');
  await moveTask(page, 'Todo', 'Finished', 'Done');
  await removeButton(page, 'Done', 'Finished').click();
  await undo(page).click();
  await expect(taskIn(page, 'Done', 'Finished')).toHaveCount(1);
  await expect(taskIn(page, 'Todo', 'Finished')).toHaveCount(0);
});

test('without Undo the message disappears after about 5 seconds and the task stays gone', { tag: '@issue-29-ac-6' }, async ({ page }) => {
  await addTask(page, 'Fading');
  await removeButton(page, 'Todo', 'Fading').click();
  await expect(undo(page)).toBeVisible();
  // Still offered well before the 5 s mark (tolerance 1 s).
  await page.waitForTimeout(3000);
  await expect(undo(page)).toBeVisible();
  await waitUndoWindowEnd(page);
  await expect(message(page).filter({ hasText: 'Fading' })).toHaveCount(0);
  await expectNowhere(page, 'Fading');
});

test('the 5 seconds do not pause while the pointer is over Undo', { tag: '@issue-29-ac-6' }, async ({ page }) => {
  await addTask(page, 'Hovered');
  await removeButton(page, 'Todo', 'Hovered').click();
  await undo(page).hover();
  await waitUndoWindowEnd(page);
  await expectNowhere(page, 'Hovered');
});

test('the 5 seconds do not pause while Undo has keyboard focus', { tag: '@issue-29-ac-6' }, async ({ page }) => {
  await addTask(page, 'Focused');
  await removeButton(page, 'Todo', 'Focused').click();
  await expect(undo(page)).toBeFocused();
  await waitUndoWindowEnd(page);
  await expectNowhere(page, 'Focused');
});

test('a removed task stays removed after a reload and in a new browser session', { tag: '@issue-29-ac-7' }, async ({ page, browser, baseURL }) => {
  await addTask(page, 'Kept');
  await addTask(page, 'Dropped');
  await removeButton(page, 'Todo', 'Dropped').click();
  await waitUndoWindowEnd(page);
  await page.reload();
  await expect(taskIn(page, 'Todo', 'Kept')).toHaveCount(1);
  await expectNowhere(page, 'Dropped');
  // A new browser session starts with the stored data only.
  const state = await page.context().storageState();
  const context = await browser.newContext({ storageState: state, baseURL });
  const fresh = await context.newPage();
  await fresh.goto('/');
  await expect(taskIn(fresh, 'Todo', 'Kept')).toHaveCount(1);
  await expectNowhere(fresh, 'Dropped');
  await context.close();
});

test('reloading during the undo window removes the task for good and offers no Undo', { tag: '@issue-29-ac-8' }, async ({ page }) => {
  await addTask(page, 'Stays');
  await addTask(page, 'Reloaded');
  await removeButton(page, 'Todo', 'Reloaded').click();
  await expect(undo(page)).toBeVisible();
  await page.reload();
  await expect(taskIn(page, 'Todo', 'Stays')).toHaveCount(1);
  await expectNowhere(page, 'Reloaded');
  await expect(undo(page)).toHaveCount(0);
});

test('closing the page during the undo window removes the task for good', { tag: '@issue-29-ac-8' }, async ({ page }) => {
  await addTask(page, 'Stays');
  await addTask(page, 'Closed');
  await removeButton(page, 'Todo', 'Closed').click();
  await expect(undo(page)).toBeVisible();
  const context = page.context();
  await page.close({ runBeforeUnload: true });
  const next = await context.newPage();
  await next.goto('/');
  await expect(taskIn(next, 'Todo', 'Stays')).toHaveCount(1);
  await expectNowhere(next, 'Closed');
  await expect(undo(next)).toHaveCount(0);
});

test('a task restored with Undo is still there after a reload', { tag: '@issue-29-ac-9' }, async ({ page }) => {
  await addTask(page, 'Back');
  await moveTask(page, 'Todo', 'Back', 'Doing');
  await removeButton(page, 'Doing', 'Back').click();
  await undo(page).click();
  await expect(taskIn(page, 'Doing', 'Back')).toHaveCount(1);
  await page.reload();
  await expectCounts(page, { Todo: 0, Doing: 1, Done: 0 });
  await expect(taskIn(page, 'Doing', 'Back')).toHaveCount(1);
});

test('removing a second task makes the first removal final; Undo restores only the second', { tag: '@issue-29-ac-10' }, async ({ page }) => {
  await addTask(page, 'First');
  await addTask(page, 'Second');
  await addTask(page, 'Third');
  await removeButton(page, 'Todo', 'First').click();
  await expect(message(page)).toContainText('First');
  await removeButton(page, 'Todo', 'Second').click();
  await expect(message(page)).toContainText('Second');
  await expect(message(page)).not.toContainText('First');
  await expect(undo(page)).toHaveCount(1);
  await undo(page).click();
  await expect(taskIn(page, 'Todo', 'Second')).toHaveCount(1);
  await expect(taskIn(page, 'Todo', 'Third')).toHaveCount(1);
  await expectNowhere(page, 'First');
  await page.reload();
  await expect(taskIn(page, 'Todo', 'Second')).toHaveCount(1);
  await expectNowhere(page, 'First');
});

test('the removal message is announced as a status message', { tag: '@issue-29-ac-11' }, async ({ page }) => {
  await addTask(page, 'Announced');
  // The live region must exist before the change for screen readers to announce it, so
  // it is checked by role once the message has appeared.
  await removeButton(page, 'Todo', 'Announced').click();
  const live = message(page).filter({ hasText: 'Announced' });
  await expect(live).toBeVisible();
  await expect(live).toContainText(/removed/i);
});

test('after removal focus is on Undo; after Undo it is on the restored remove action', { tag: '@issue-29-ac-12' }, async ({ page }) => {
  await addTask(page, 'Focus me');
  await removeButton(page, 'Todo', 'Focus me').click();
  await expect(undo(page)).toBeFocused();
  await undo(page).click();
  await expect(removeButton(page, 'Todo', 'Focus me')).toBeFocused();
});

for (const status of STATUSES) {
  test(`focus on Undo moves to the ${status} heading when the message disappears`, { tag: '@issue-29-ac-12' }, async ({ page }) => {
    await addTask(page, 'Lane focus');
    if (status !== 'Todo') await moveTask(page, 'Todo', 'Lane focus', status);
    await removeButton(page, status, 'Lane focus').click();
    await expect(undo(page)).toBeFocused();
    await waitUndoWindowEnd(page);
    await expect(page.getByRole('heading', { name: status })).toBeFocused();
  });
}

test('focus the user moved elsewhere is not moved when the message disappears', { tag: '@issue-29-ac-12' }, async ({ page }) => {
  await addTask(page, 'Elsewhere');
  await removeButton(page, 'Todo', 'Elsewhere').click();
  const title = page.getByRole('textbox', { name: 'Title' });
  await title.focus();
  await expect(title).toBeFocused();
  await waitUndoWindowEnd(page);
  await expect(title).toBeFocused();
});
