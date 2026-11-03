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
  return items.map((t) => t.replace(/Edit.*$|Remove.*$|Move to.*$/s, '').trim());
}

async function expectCounts(page: Page, counts: Record<Status, number>) {
  for (const s of STATUSES) await expect(tasksIn(page, s)).toHaveCount(counts[s]);
}

async function expectNowhere(page: Page, title: string) {
  for (const s of STATUSES) await expect(taskIn(page, s, title)).toHaveCount(0);
}

// No Undo and no message about the removal anywhere in the page.
async function expectNoRemovalMessage(page: Page) {
  await expect(undo(page)).toHaveCount(0);
  await expect(page.getByText(/removed/i)).toHaveCount(0);
  await expect(message(page).filter({ hasText: /\S/ })).toHaveCount(0);
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

  test(`a task removed from ${status} disappears at once without confirmation`, { tag: ['@issue-29-ac-2', '@issue-89-ac-1'] }, async ({ page }) => {
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

test('removing a task leaves every other task in place, with title, status and order', { tag: ['@issue-29-ac-3', '@issue-87-ac-1', '@issue-89-ac-1'] }, async ({ page }) => {
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

test('removing one of two tasks with the same title leaves the other', { tag: ['@issue-29-ac-3', '@issue-89-ac-1'] }, async ({ page }) => {
  await addTask(page, 'Twin');
  await addTask(page, 'Twin');
  await removeButton(page, 'Todo', 'Twin').first().click();
  await expect(taskIn(page, 'Todo', 'Twin')).toHaveCount(1);
});

for (const status of STATUSES) {
  test(`removing a task from ${status} shows no message and offers no Undo`, { tag: '@issue-89-ac-2' }, async ({ page }) => {
    await addTask(page, 'Pay rent');
    if (status !== 'Todo') await moveTask(page, 'Todo', 'Pay rent', status);
    await removeButton(page, status, 'Pay rent').click();
    await expect(taskIn(page, status, 'Pay rent')).toHaveCount(0);
    await expectNoRemovalMessage(page);
  });
}

test('no message or Undo appears during the 10 seconds after a removal or after a reload', { tag: '@issue-89-ac-2' }, async ({ page }) => {
  test.setTimeout(30000);
  await addTask(page, 'Quiet');
  await addTask(page, 'Other');
  await removeButton(page, 'Todo', 'Quiet').click();
  for (let i = 0; i < 10; i++) {
    await expectNoRemovalMessage(page);
    await page.waitForTimeout(1000);
  }
  await expectNoRemovalMessage(page);
  await page.reload();
  await expect(taskIn(page, 'Todo', 'Other')).toHaveCount(1);
  await expectNoRemovalMessage(page);
});

test('a removed task stays removed after a reload and in a new browser session', { tag: ['@issue-29-ac-7', '@issue-89-ac-3'] }, async ({ page, browser, baseURL }) => {
  await addTask(page, 'Kept');
  await addTask(page, 'Dropped');
  await removeButton(page, 'Todo', 'Dropped').click();
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

test('a reload right after a removal does not bring the task back', { tag: '@issue-89-ac-3' }, async ({ page }) => {
  await addTask(page, 'Stays');
  await addTask(page, 'Reloaded');
  await removeButton(page, 'Todo', 'Reloaded').click();
  await page.reload();
  await expect(taskIn(page, 'Todo', 'Stays')).toHaveCount(1);
  await expectNowhere(page, 'Reloaded');
  await expectNoRemovalMessage(page);
});

test('closing the page right after a removal does not bring the task back', { tag: '@issue-89-ac-3' }, async ({ page }) => {
  await addTask(page, 'Stays');
  await addTask(page, 'Closed');
  await removeButton(page, 'Todo', 'Closed').click();
  const context = page.context();
  await page.close({ runBeforeUnload: true });
  const next = await context.newPage();
  await next.goto('/');
  await expect(taskIn(next, 'Todo', 'Stays')).toHaveCount(1);
  await expectNowhere(next, 'Closed');
  await expectNoRemovalMessage(next);
});

test('removing several tasks in quick succession removes them all, also after a reload', { tag: '@issue-89-ac-4' }, async ({ page }) => {
  for (const t of ['T1', 'T2', 'T3', 'T4', 'T5']) await addTask(page, t);
  await moveTask(page, 'Todo', 'T5', 'Doing');
  await addTask(page, 'T6');
  await moveTask(page, 'Todo', 'T6', 'Done');
  await addTask(page, 'T7');
  const doing = await titles(page, 'Doing');
  const done = await titles(page, 'Done');
  // Todo: T1 T2 T3 T4 T7. Activate the remove actions with no wait between them.
  const targets = ['T1', 'T2', 'T4'];
  const buttons = targets.map((t) => removeButton(page, 'Todo', t));
  for (const b of buttons) {
    await b.dispatchEvent('click');
  }
  for (const t of targets) await expectNowhere(page, t);
  expect(await titles(page, 'Todo')).toEqual(['T3', 'T7']);
  await page.reload();
  for (const t of targets) await expectNowhere(page, t);
  expect(await titles(page, 'Todo')).toEqual(['T3', 'T7']);
  expect(await titles(page, 'Doing')).toEqual(doing);
  expect(await titles(page, 'Done')).toEqual(done);
});

test('a task is removed using only the keyboard, with Enter', { tag: '@issue-89-ac-5' }, async ({ page }) => {
  await addTask(page, 'Keys');
  await addTask(page, 'Other');
  await removeButton(page, 'Todo', 'Keys').focus();
  await expect(removeButton(page, 'Todo', 'Keys')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(taskIn(page, 'Todo', 'Keys')).toHaveCount(0);
  await expect(taskIn(page, 'Todo', 'Other')).toHaveCount(1);
});

test('a task is removed using only the keyboard, with Space', { tag: '@issue-89-ac-5' }, async ({ page }) => {
  await addTask(page, 'Keys');
  await addTask(page, 'Other');
  await removeButton(page, 'Todo', 'Keys').focus();
  await page.keyboard.press('Space');
  await expect(taskIn(page, 'Todo', 'Keys')).toHaveCount(0);
  await expect(taskIn(page, 'Todo', 'Other')).toHaveCount(1);
});

test('the remove action can be reached with Tab alone', { tag: '@issue-89-ac-5' }, async ({ page }) => {
  await addTask(page, 'Only');
  await page.getByRole('button', { name: 'Add task' }).focus();
  const target = removeButton(page, 'Todo', 'Only');
  for (let i = 0; i < 20 && !(await target.evaluate((el) => el === document.activeElement)); i++) {
    await page.keyboard.press('Tab');
  }
  await expect(target).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(taskIn(page, 'Todo', 'Only')).toHaveCount(0);
});

test('after removing a task, focus goes to the remove action of the next task in the swimlane', { tag: '@issue-89-ac-6' }, async ({ page }) => {
  for (const t of ['A', 'B', 'C']) await addTask(page, t);
  await removeButton(page, 'Todo', 'B').click();
  await expect(taskIn(page, 'Todo', 'B')).toHaveCount(0);
  await expect(removeButton(page, 'Todo', 'C')).toBeFocused();
});

test('after removing the first task, focus goes to the next one, also in Doing and Done', { tag: '@issue-89-ac-6' }, async ({ page }) => {
  for (const s of ['Doing', 'Done'] as const) {
    await addTask(page, `${s}1`);
    await addTask(page, `${s}2`);
    await moveTask(page, 'Todo', `${s}1`, s);
    await moveTask(page, 'Todo', `${s}2`, s);
    await removeButton(page, s, `${s}1`).click();
    await expect(removeButton(page, s, `${s}2`)).toBeFocused();
  }
});

test('after removing the last task of a swimlane, focus goes to the previous task', { tag: '@issue-89-ac-6' }, async ({ page }) => {
  for (const t of ['A', 'B', 'C']) await addTask(page, t);
  await removeButton(page, 'Todo', 'C').click();
  await expect(taskIn(page, 'Todo', 'C')).toHaveCount(0);
  await expect(removeButton(page, 'Todo', 'B')).toBeFocused();
});

for (const status of STATUSES) {
  test(`after removing the only task of ${status}, focus goes to the ${status} heading`, { tag: '@issue-89-ac-6' }, async ({ page }) => {
    await addTask(page, 'Lonely');
    if (status !== 'Todo') await moveTask(page, 'Todo', 'Lonely', status);
    await removeButton(page, status, 'Lonely').click();
    await expect(taskIn(page, status, 'Lonely')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: status })).toBeFocused();
  });
}

test('focus stays in the swimlane of the removed task', { tag: '@issue-89-ac-6' }, async ({ page }) => {
  await addTask(page, 'Left');
  await addTask(page, 'Right');
  await moveTask(page, 'Todo', 'Right', 'Doing');
  await removeButton(page, 'Todo', 'Left').click();
  await expect(page.getByRole('heading', { name: 'Todo' })).toBeFocused();
});

test('pressing Enter repeatedly removes the tasks of a swimlane one after another', { tag: '@issue-89-ac-7' }, async ({ page }) => {
  for (const t of ['R1', 'R2', 'R3', 'R4']) await addTask(page, t);
  await removeButton(page, 'Todo', 'R1').focus();
  await page.keyboard.press('Enter');
  await expect(taskIn(page, 'Todo', 'R1')).toHaveCount(0);
  await page.keyboard.press('Enter');
  await expect(taskIn(page, 'Todo', 'R2')).toHaveCount(0);
  await page.keyboard.press('Enter');
  await expect(taskIn(page, 'Todo', 'R3')).toHaveCount(0);
  await expect(taskIn(page, 'Todo', 'R4')).toHaveCount(1);
  await page.keyboard.press('Enter');
  await expectCounts(page, { Todo: 0, Doing: 0, Done: 0 });
  await expect(page.getByRole('heading', { name: 'Todo' })).toBeFocused();
  await expectNoRemovalMessage(page);
});
