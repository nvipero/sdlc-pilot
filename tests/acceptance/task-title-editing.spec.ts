import { test, expect, type Page, type Locator } from '@playwright/test';

type Status = 'Todo' | 'Doing' | 'Done';
const STATUSES: Status[] = ['Todo', 'Doing', 'Done'];

declare global {
  interface Window {
    __failSaves?: boolean;
  }
}

// Each test runs in a fresh browser context, so storage starts empty without clearing it.
test.beforeEach(async ({ page }) => {
  await page.goto('/');
});

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const lane = (page: Page, status: Status): Locator => page.getByRole('region', { name: status });
const tasksIn = (page: Page, status: Status): Locator => lane(page, status).getByRole('listitem');
const taskIn = (page: Page, status: Status, title: string): Locator =>
  tasksIn(page, status).filter({ hasText: title });
const editButton = (page: Page, status: Status, title: string): Locator =>
  lane(page, status).getByRole('button', { name: new RegExp(`\\bEdit\\b.*${escape(title)}`) });
// While a task is edited its title is in the text field, so the task is found by the field.
const editingItem = (page: Page): Locator =>
  page.getByRole('listitem').filter({ has: page.getByRole('textbox', { name: /title/i }) });
const field = (page: Page): Locator => editingItem(page).getByRole('textbox', { name: /title/i });
const saveButton = (page: Page): Locator => editingItem(page).getByRole('button', { name: /Save/ });
const cancelButton = (page: Page): Locator => editingItem(page).getByRole('button', { name: /Cancel/ });
const anyField = (page: Page): Locator =>
  page.getByRole('listitem').getByRole('textbox', { name: /title/i });
const notSavedMessage = (page: Page): Locator => page.getByText(/cannot be saved/i);

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

async function startEdit(page: Page, status: Status, title: string, index = 0) {
  await editButton(page, status, title).nth(index).click();
  await expect(field(page)).toBeVisible();
}

async function expectCounts(page: Page, counts: Record<Status, number>) {
  for (const s of STATUSES) await expect(tasksIn(page, s)).toHaveCount(counts[s]);
}

async function expectNowhere(page: Page, title: string) {
  for (const s of STATUSES) await expect(taskIn(page, s, title)).toHaveCount(0);
}

// The edit actions' accessible names in top-to-bottom order: the order of the tasks in the swimlane.
async function orderOf(page: Page, status: Status): Promise<string[]> {
  const snapshot = await lane(page, status).ariaSnapshot();
  return [...snapshot.matchAll(/button "([^"]*\bEdit\b[^"]*)"/g)].map((m) => m[1]);
}

async function expectOrder(page: Page, status: Status, expected: string[]) {
  await expect.poll(() => orderOf(page, status)).toEqual(expected);
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
  await page.goto('/');
}

const failSaves = (page: Page, fail: boolean) => page.evaluate((f) => { window.__failSaves = f; }, fail);

for (const status of STATUSES) {
  test(`every task in ${status} offers an edit action named with its title`, { tag: '@issue-87-ac-1' }, async ({ page }) => {
    await addTaskIn(page, 'Alpha', status);
    await addTaskIn(page, 'Beta', status);
    await expect(editButton(page, status, 'Alpha')).toHaveCount(1);
    await expect(editButton(page, status, 'Beta')).toHaveCount(1);
  });
}

for (const status of STATUSES) {
  test(`editing a task in ${status} shows a focused title field with the current title, Save and Cancel`, { tag: '@issue-87-ac-2' }, async ({ page }) => {
    await addTaskIn(page, 'Alpha', status);
    await editButton(page, status, 'Alpha').click();
    await expect(field(page)).toBeVisible();
    await expect(field(page)).toHaveValue('Alpha');
    await expect(field(page)).toBeFocused();
    await expect(saveButton(page)).toBeVisible();
    await expect(cancelButton(page)).toBeVisible();
    await expect(editingItem(page)).toHaveCount(1);
  });
}

for (const status of STATUSES) {
  test(`a saved title in ${status} keeps the swimlane, status and position`, { tag: '@issue-87-ac-3' }, async ({ page }) => {
    await addTaskIn(page, 'Alpha', status);
    await addTaskIn(page, 'Beta', status);
    await addTaskIn(page, 'Gamma', status);
    const before = await orderOf(page, status);
    expect(before).toHaveLength(3);
    await startEdit(page, status, 'Beta');
    await field(page).fill('Beta renamed');
    await saveButton(page).click();
    await expect(anyField(page)).toHaveCount(0);
    await expect(taskIn(page, status, 'Beta renamed')).toHaveCount(1);
    await expectOrder(page, status, before.map((n) => n.replace('Beta', 'Beta renamed')));
    const others = STATUSES.filter((s) => s !== status);
    for (const s of others) await expect(tasksIn(page, s)).toHaveCount(0);
    await expect(tasksIn(page, status)).toHaveCount(3);
  });
}

test('saving an edited title changes no other task, including one with the same old title', { tag: '@issue-87-ac-4' }, async ({ page }) => {
  await addTaskIn(page, 'Same', 'Todo');
  await addTaskIn(page, 'Same', 'Todo');
  await addTaskIn(page, 'Other', 'Todo');
  await addTaskIn(page, 'Doing one', 'Doing');
  await addTaskIn(page, 'Done one', 'Done');
  const todoBefore = await orderOf(page, 'Todo');
  const doingBefore = await orderOf(page, 'Doing');
  const doneBefore = await orderOf(page, 'Done');
  await startEdit(page, 'Todo', 'Same', 1);
  await field(page).fill('Changed');
  await saveButton(page).click();
  await expect(taskIn(page, 'Todo', 'Changed')).toHaveCount(1);
  await expect(taskIn(page, 'Todo', 'Same')).toHaveCount(1);
  const expectedTodo = [...todoBefore];
  const secondSame = expectedTodo.map((n, i) => ({ n, i })).filter((x) => /Same/.test(x.n))[1];
  expectedTodo[secondSame.i] = secondSame.n.replace('Same', 'Changed');
  await expectOrder(page, 'Todo', expectedTodo);
  await expectOrder(page, 'Doing', doingBefore);
  await expectOrder(page, 'Done', doneBefore);
});

for (const status of STATUSES) {
  test(`a saved title in ${status} is still shown after a reload`, { tag: '@issue-87-ac-5' }, async ({ page }) => {
    await addTaskIn(page, 'Old title', status);
    await startEdit(page, status, 'Old title');
    await field(page).fill('New title');
    await saveButton(page).click();
    await expect(taskIn(page, status, 'New title')).toHaveCount(1);
    await page.reload();
    await expect(taskIn(page, status, 'New title')).toHaveCount(1);
    await expectNowhere(page, 'Old title');
    await expect(tasksIn(page, status)).toHaveCount(1);
  });
}

test('whitespace around an edited title is not saved', { tag: '@issue-87-ac-6' }, async ({ page }) => {
  await addTask(page, 'Milk');
  await startEdit(page, 'Todo', 'Milk');
  await field(page).fill('  Buy oat milk  ');
  await saveButton(page).click();
  await expect(anyField(page)).toHaveCount(0);
  await expect(editButton(page, 'Todo', 'Buy oat milk')).toHaveCount(1);
  await page.reload();
  await expect(taskIn(page, 'Todo', 'Buy oat milk')).toHaveCount(1);
  expect(await orderOf(page, 'Todo')).toHaveLength(1);
  expect((await orderOf(page, 'Todo'))[0]).not.toMatch(/\s{2}Buy oat milk|Buy oat milk\s{2}/);
});

for (const [name, text] of [['empty', ''], ['whitespace-only', '   ']] as const) {
  for (const how of ['Save action', 'Enter'] as const) {
    test(`saving ${name} title with ${how} keeps the old title and ends the edit`, { tag: '@issue-87-ac-7' }, async ({ page }) => {
      await addTask(page, 'Keep me');
      await addTask(page, 'Another');
      await startEdit(page, 'Todo', 'Keep me');
      await field(page).fill(text);
      if (how === 'Enter') await field(page).press('Enter');
      else {
        const save = saveButton(page);
        if (await save.isEnabled()) await save.click();
      }
      await expect(anyField(page)).toHaveCount(0);
      await expect(taskIn(page, 'Todo', 'Keep me')).toHaveCount(1);
      await expectCounts(page, { Todo: 2, Doing: 0, Done: 0 });
      await page.reload();
      await expect(taskIn(page, 'Todo', 'Keep me')).toHaveCount(1);
      await expectCounts(page, { Todo: 2, Doing: 0, Done: 0 });
    });
  }
}

for (const how of ['Cancel action', 'Escape'] as const) {
  test(`cancelling with ${how} shows the old title and stores nothing`, { tag: '@issue-87-ac-8' }, async ({ page }) => {
    await addTask(page, 'Original');
    await startEdit(page, 'Todo', 'Original');
    await field(page).fill('Changed text');
    if (how === 'Escape') await field(page).press('Escape');
    else await cancelButton(page).click();
    await expect(anyField(page)).toHaveCount(0);
    await expect(taskIn(page, 'Todo', 'Original')).toHaveCount(1);
    await expectNowhere(page, 'Changed text');
    await page.reload();
    await expect(taskIn(page, 'Todo', 'Original')).toHaveCount(1);
    await expectNowhere(page, 'Changed text');
  });
}

test('a title another task already has can be saved, and both tasks are shown', { tag: '@issue-87-ac-9' }, async ({ page }) => {
  await addTask(page, 'Alpha');
  await addTask(page, 'Beta');
  await startEdit(page, 'Todo', 'Beta');
  await field(page).fill('Alpha');
  await saveButton(page).click();
  await expect(anyField(page)).toHaveCount(0);
  await expect(taskIn(page, 'Todo', 'Alpha')).toHaveCount(2);
  await expect(tasksIn(page, 'Todo')).toHaveCount(2);
  await expectNowhere(page, 'Beta');
  await page.reload();
  await expect(taskIn(page, 'Todo', 'Alpha')).toHaveCount(2);
});

test('a keyboard alone can reach, open, change, save and cancel an edit', { tag: '@issue-87-ac-10' }, async ({ page }) => {
  await addTask(page, 'Alpha');
  await addTask(page, 'Beta');
  const target = editButton(page, 'Todo', 'Beta');

  async function tabToTarget() {
    await page.locator('body').click({ position: { x: 1, y: 1 } });
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press('Tab');
      if (await target.evaluate((el) => el === document.activeElement)) return;
    }
    throw new Error('the edit action cannot be reached with Tab');
  }

  // Enter opens, typing changes, Enter saves.
  await tabToTarget();
  await expect(target).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(field(page)).toBeFocused();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type('Beta by keys');
  await page.keyboard.press('Enter');
  await expect(taskIn(page, 'Todo', 'Beta by keys')).toHaveCount(1);
  await expect(anyField(page)).toHaveCount(0);

  // Space opens, Escape cancels.
  const renamed = editButton(page, 'Todo', 'Beta by keys');
  await renamed.focus();
  await page.keyboard.press('Space');
  await expect(field(page)).toBeFocused();
  await page.keyboard.press('ControlOrMeta+a');
  await page.keyboard.type('Never saved');
  await page.keyboard.press('Escape');
  await expect(anyField(page)).toHaveCount(0);
  await expect(taskIn(page, 'Todo', 'Beta by keys')).toHaveCount(1);
  await expectNowhere(page, 'Never saved');
});

for (const how of ['Enter', 'Escape', 'Save action', 'Cancel action'] as const) {
  test(`after ${how} focus is on the edited task's edit action`, { tag: '@issue-87-ac-11' }, async ({ page }) => {
    await addTask(page, 'Alpha');
    await addTask(page, 'Beta');
    await startEdit(page, 'Todo', 'Beta');
    const saves = how === 'Enter' || how === 'Save action';
    await field(page).fill(saves ? 'Beta new' : 'Beta discarded');
    if (how === 'Enter') await field(page).press('Enter');
    else if (how === 'Escape') await field(page).press('Escape');
    else if (how === 'Save action') await saveButton(page).click();
    else await cancelButton(page).click();
    await expect(anyField(page)).toHaveCount(0);
    await expect(editButton(page, 'Todo', saves ? 'Beta new' : 'Beta')).toBeFocused();
  });
}

test('with a mouse a title can be changed and saved with the Save action', { tag: '@issue-87-ac-12' }, async ({ page }) => {
  await addTask(page, 'Alpha');
  await editButton(page, 'Todo', 'Alpha').click();
  await field(page).fill('Alpha mouse');
  await saveButton(page).click();
  await expect(anyField(page)).toHaveCount(0);
  await expect(taskIn(page, 'Todo', 'Alpha mouse')).toHaveCount(1);
});

test('with a mouse an edit can be cancelled with the Cancel action', { tag: '@issue-87-ac-12' }, async ({ page }) => {
  await addTask(page, 'Alpha');
  await editButton(page, 'Todo', 'Alpha').click();
  await field(page).fill('Alpha mouse');
  await cancelButton(page).click();
  await expect(anyField(page)).toHaveCount(0);
  await expect(taskIn(page, 'Todo', 'Alpha')).toHaveCount(1);
  await expectNowhere(page, 'Alpha mouse');
});

test('a failed save of an edited title shows the message and the new title', { tag: '@issue-87-ac-13' }, async ({ page }) => {
  await makeSavesFailable(page);
  await addTask(page, 'Alpha');
  await expect(notSavedMessage(page)).toHaveCount(0);
  await failSaves(page, true);
  await startEdit(page, 'Todo', 'Alpha');
  await field(page).fill('Alpha edited');
  await saveButton(page).click();
  await expect(notSavedMessage(page)).toBeVisible();
  await expect(page.getByText(/lost/i)).toBeVisible();
  await expect(page.getByText(/cannot be added/i)).toBeVisible();
  await expect(taskIn(page, 'Todo', 'Alpha edited')).toHaveCount(1);
  await expect(anyField(page)).toHaveCount(0);
});

test('a later successful save of an edit clears the message and stores everything shown', { tag: '@issue-87-ac-13' }, async ({ page }) => {
  await makeSavesFailable(page);
  await addTask(page, 'Alpha');
  await addTask(page, 'Beta');
  await failSaves(page, true);
  await startEdit(page, 'Todo', 'Alpha');
  await field(page).fill('Alpha edited');
  await saveButton(page).click();
  await expect(notSavedMessage(page)).toBeVisible();
  // Editing stays possible while saving fails; a successful save follows.
  await failSaves(page, false);
  await startEdit(page, 'Todo', 'Beta');
  await field(page).fill('Beta edited');
  await saveButton(page).click();
  await expect(notSavedMessage(page)).toHaveCount(0);
  await expect(taskIn(page, 'Todo', 'Alpha edited')).toHaveCount(1);
  await expect(taskIn(page, 'Todo', 'Beta edited')).toHaveCount(1);
  await page.reload();
  await expect(taskIn(page, 'Todo', 'Alpha edited')).toHaveCount(1);
  await expect(taskIn(page, 'Todo', 'Beta edited')).toHaveCount(1);
  await expectCounts(page, { Todo: 2, Doing: 0, Done: 0 });
});

test('pressing in the title field and releasing over another swimlane does not move the task', { tag: '@issue-87-ac-14' }, async ({ page }) => {
  await addTask(page, 'Alpha');
  await startEdit(page, 'Todo', 'Alpha');
  const box = await field(page).boundingBox();
  const target = await lane(page, 'Doing').boundingBox();
  if (!box || !target) throw new Error('no bounding box');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 8, box.y + box.height / 2 + 8, { steps: 3 });
  await page.mouse.move(target.x + target.width / 2, target.y + target.height - 6, { steps: 10 });
  await page.mouse.up();
  await expectCounts(page, { Todo: 1, Doing: 0, Done: 0 });
  await page.keyboard.press('Escape');
  await expect(anyField(page)).toHaveCount(0);
  await expect(taskIn(page, 'Todo', 'Alpha')).toHaveCount(1);
  await expectCounts(page, { Todo: 1, Doing: 0, Done: 0 });
  await page.reload();
  await expect(taskIn(page, 'Todo', 'Alpha')).toHaveCount(1);
});

test('clicking outside the edit cancels it and stores nothing', { tag: '@issue-87-ac-15' }, async ({ page }) => {
  await addTask(page, 'Alpha');
  await startEdit(page, 'Todo', 'Alpha');
  await field(page).fill('Alpha changed');
  await page.getByRole('heading', { level: 1 }).click();
  await expect(anyField(page)).toHaveCount(0);
  await expect(taskIn(page, 'Todo', 'Alpha')).toHaveCount(1);
  await expectNowhere(page, 'Alpha changed');
  await page.reload();
  await expect(taskIn(page, 'Todo', 'Alpha')).toHaveCount(1);
  await expectNowhere(page, 'Alpha changed');
});

test('starting to edit another task cancels the first edit', { tag: '@issue-87-ac-15' }, async ({ page }) => {
  await addTask(page, 'Alpha');
  await addTask(page, 'Beta');
  await startEdit(page, 'Todo', 'Alpha');
  await field(page).fill('Alpha changed');
  await editButton(page, 'Todo', 'Beta').click();
  await expect(anyField(page)).toHaveCount(1);
  await expect(field(page)).toHaveValue('Beta');
  await expect(taskIn(page, 'Todo', 'Alpha')).toHaveCount(1);
  await expectNowhere(page, 'Alpha changed');
});

test('clicking inside the field, Save or Cancel area does not count as outside', { tag: '@issue-87-ac-15' }, async ({ page }) => {
  await addTask(page, 'Alpha');
  await startEdit(page, 'Todo', 'Alpha');
  await field(page).fill('Alpha kept');
  await field(page).click();
  await expect(field(page)).toBeVisible();
  await expect(field(page)).toHaveValue('Alpha kept');
  await saveButton(page).click();
  await expect(taskIn(page, 'Todo', 'Alpha kept')).toHaveCount(1);
});
